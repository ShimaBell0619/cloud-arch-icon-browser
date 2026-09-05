import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PAGE_URL = "https://learn.microsoft.com/en-us/azure/architecture/icons/";
const DEFAULT_BASELINE = fileURLToPath(
  new URL("../.github/microsoft-icons-watch.json", import.meta.url),
);

const writeIndex = process.argv.indexOf("--write-baseline");
const writeBaselinePath =
  writeIndex >= 0 ? process.argv[writeIndex + 1] ?? DEFAULT_BASELINE : null;

const response = await fetch(PAGE_URL, {
  headers: {
    accept: "text/html",
    "cache-control": "no-cache",
    "user-agent": "cloud-arch-icon-browser-maintenance-watcher/0.1",
  },
});
if (!response.ok) {
  throw new Error(`Microsoft Learn returned HTTP ${response.status}.`);
}

const html = await response.text();
const observed = observePage(html);

if (writeBaselinePath) {
  const baseline = {
    pageUrl: PAGE_URL,
    packageUrl: observed.packageUrl,
    packageFilename: observed.packageFilename,
    generalGuidelinesSha256: observed.generalGuidelinesSha256,
    iconTermsSha256: observed.iconTermsSha256,
  };
  await writeFile(
    path.resolve(writeBaselinePath),
    `${JSON.stringify(baseline, null, 2)}\n`,
    "utf8",
  );
  console.log(`Wrote watcher baseline to ${path.resolve(writeBaselinePath)}.`);
  process.exit(0);
}

const { readFile } = await import("node:fs/promises");
const baseline = JSON.parse(await readFile(DEFAULT_BASELINE, "utf8"));
const changes = [];

if (baseline.packageUrl !== observed.packageUrl) {
  changes.push(
    `Official ZIP link changed:\n  expected: ${baseline.packageUrl}\n  observed: ${observed.packageUrl}`,
  );
}
if (baseline.packageFilename !== observed.packageFilename) {
  changes.push(
    `Official ZIP filename changed: ${baseline.packageFilename} -> ${observed.packageFilename}`,
  );
}
if (baseline.generalGuidelinesSha256 !== observed.generalGuidelinesSha256) {
  changes.push("General guidelines text fingerprint changed.");
}
if (baseline.iconTermsSha256 !== observed.iconTermsSha256) {
  changes.push("Icon terms text fingerprint changed.");
}

const changed = changes.length > 0;
const reportPath = path.resolve(
  process.env.RUNNER_TEMP ?? "/tmp",
  "microsoft-icons-watch-report.md",
);
const report = changed
  ? [
      "The weekly maintenance watcher detected a change on the official Microsoft Azure Architecture Icons page.",
      "",
      ...changes.map((change) => `- ${change.replaceAll("\n", "\n  ")}`),
      "",
      `Official page: ${PAGE_URL}`,
      "",
      "Human review is required. Do not automatically change compatibility claims, legal guidance, or application code based on this alert.",
      "The watcher fetched only the Microsoft Learn HTML page; it did not download or store the icon ZIP/SVG assets.",
    ].join("\n")
  : "No tracked Microsoft icon page changes were detected.\n";

await writeFile(reportPath, report, "utf8");
writeGithubOutput("changed", String(changed));
writeGithubOutput("report_path", reportPath);

console.log(report);

function observePage(source) {
  const zipMatches = [
    ...source.matchAll(
      /https:\/\/arch-center\.azureedge\.net\/icons\/[^"'<>\s]+\.zip/giu,
    ),
  ].map((match) => decodeHtmlEntities(match[0]));
  const uniqueZips = [...new Set(zipMatches)];
  if (uniqueZips.length !== 1) {
    throw new Error(
      `Expected exactly one official Azure Architecture Icons ZIP link, found ${uniqueZips.length}.`,
    );
  }

  const packageUrl = uniqueZips[0];
  const packageFilename = decodeURIComponent(new URL(packageUrl).pathname.split("/").pop());
  const generalGuidelines = extractSectionText(source, "general-guidelines");
  const iconTerms = extractSectionText(source, "icon-terms");

  return {
    packageUrl,
    packageFilename,
    generalGuidelinesSha256: sha256(generalGuidelines),
    iconTermsSha256: sha256(iconTerms),
  };
}

function extractSectionText(source, id) {
  const heading = new RegExp(
    `<h2[^>]*\\bid=["']${escapeRegExp(id)}["'][^>]*>[\\s\\S]*?<\\/h2>`,
    "i",
  );
  const match = heading.exec(source);
  if (!match) throw new Error(`Could not find Microsoft Learn section #${id}.`);

  const start = match.index + match[0].length;
  const remaining = source.slice(start);
  const nextHeading = remaining.search(/<h2\b/i);
  const section = nextHeading >= 0 ? remaining.slice(0, nextHeading) : remaining;
  const text = normalizeHtmlText(section);
  if (!text) throw new Error(`Microsoft Learn section #${id} was empty.`);
  return text;
}

function normalizeHtmlText(source) {
  return decodeHtmlEntities(
    source
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/&#x([0-9a-f]+);/gi, (_, value) =>
      String.fromCodePoint(Number.parseInt(value, 16)),
    );
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function writeGithubOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  const { appendFileSync } = requireFsSync();
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, "utf8");
}

function requireFsSync() {
  // Keep the watcher ESM-only while avoiding a second top-level static fs import.
  return { appendFileSync: (file, data, encoding) => {
    const fd = process.getBuiltinModule("node:fs");
    fd.appendFileSync(file, data, encoding);
  } };
}
