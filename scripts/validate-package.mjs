import { execFileSync } from "node:child_process";
import path from "node:path";

const output = execFileSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["pack", "--dry-run", "--json"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);

const reports = JSON.parse(output);
if (!Array.isArray(reports) || reports.length !== 1) {
  throw new Error("npm pack returned an unexpected report shape.");
}

const files = reports[0]?.files;
if (!Array.isArray(files)) {
  throw new Error("npm pack report did not include a file list.");
}

const allowedTopLevel = new Set([
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "cli",
  "dist",
  "package.json",
]);

const forbiddenSegments = new Set([
  ".github",
  "coverage",
  "fixtures",
  "node_modules",
  "playwright-report",
  "scripts",
  "src",
  "test-results",
  "tests",
]);

const violations = [];
for (const file of files) {
  if (!file || typeof file.path !== "string") {
    violations.push("npm pack reported an entry without a valid path.");
    continue;
  }

  const normalized = file.path.replaceAll("\\", "/");
  const segments = normalized.split("/").filter(Boolean);
  const topLevel = segments[0];

  if (!topLevel || !allowedTopLevel.has(topLevel)) {
    violations.push(`${normalized}: top-level path is not allowlisted`);
  }

  if (segments.some((segment) => forbiddenSegments.has(segment))) {
    violations.push(`${normalized}: development/test content must not be published`);
  }

  const extension = path.posix.extname(normalized).toLowerCase();
  if (extension === ".zip" || extension === ".svg") {
    violations.push(`${normalized}: ZIP/SVG assets must not be published`);
  }

  if (/azure[_-]public[_-]service[_-]icons|architecture[_-]icons/i.test(normalized)) {
    violations.push(`${normalized}: looks like an official Microsoft icon-package asset`);
  }
}

if (violations.length > 0) {
  console.error("npm package validation failed:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`npm package validation passed (${files.length} files).`);
for (const file of files) console.log(`- ${file.path}`);
