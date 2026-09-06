import { execFile, spawn } from "node:child_process";
import { access, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";

const execFileAsync = promisify(execFile);
const delay = (milliseconds) =>
  new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

const zipInput = process.env.AZURE_ICON_ZIP;
if (!zipInput) {
  throw new Error(
    "AZURE_ICON_ZIP is required. Point it at a maintainer-downloaded official Azure Architecture Icons ZIP.",
  );
}

const zipPath = resolve(zipInput);
await access(zipPath);

const outputPath = resolve(
  process.env.DOCS_DEMO_OUTPUT ?? "docs/assets/demo.gif",
);
const query = process.env.DOCS_DEMO_QUERY ?? "functions";
const externalBaseUrl = process.env.DOCS_DEMO_BASE_URL;
const baseUrl = externalBaseUrl ?? "http://127.0.0.1:4173/";
const temporaryDirectory = resolve(".tmp/readme-demo");
const videoDirectory = resolve(temporaryDirectory, "video");

await assertFfmpeg();
await rm(temporaryDirectory, { recursive: true, force: true });
await mkdir(videoDirectory, { recursive: true });
await mkdir(dirname(outputPath), { recursive: true });

let devServer;
let browser;
let context;

try {
  if (!externalBaseUrl) {
    devServer = startDevServer();
    await waitForServer(baseUrl, devServer);
  }

  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
    permissions: ["clipboard-read", "clipboard-write"],
    recordVideo: {
      dir: videoDirectory,
      size: { width: 1440, height: 900 },
    },
  });

  const recordingStartedAt = Date.now();
  const page = await context.newPage();
  const video = page.video();
  if (!video) throw new Error("Playwright video recording was not initialized.");

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByLabel("Choose icon package ZIP").setInputFiles(zipPath);

  const search = page.getByRole("searchbox", { name: "Search icons" });
  await search.waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(500);

  // Trim package loading from the final GIF while keeping a short establishing shot.
  const trimStartSeconds = Math.max(
    0,
    (Date.now() - recordingStartedAt) / 1000 - 0.35,
  );
  const demoStartedAt = Date.now();

  await page.waitForTimeout(900);
  await search.click();
  await search.pressSequentially(query, { delay: 90 });
  await page.waitForTimeout(900);
  await search.press("ArrowDown");
  await page.waitForTimeout(250);
  await search.press("Enter");

  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(1_200);

  const copyImage = dialog.getByRole("button", { name: "Copy image" });
  await copyImage.click();

  const copiedStatus = dialog
    .getByRole("status")
    .filter({ hasText: "Copied 512×512 PNG image." });

  try {
    await copiedStatus.waitFor({ state: "visible", timeout: 5_000 });
  } catch (error) {
    const alert = dialog.getByRole("alert");
    const alertText = (await alert.textContent().catch(() => null))?.trim();
    throw new Error(
      `Copy image did not succeed during demo recording${
        alertText ? `: ${alertText}` : "."
      }`,
      { cause: error },
    );
  }

  await page.waitForTimeout(1_600);
  const demoDurationSeconds = (Date.now() - demoStartedAt) / 1000 + 0.2;

  await context.close();
  context = undefined;
  const videoPath = await video.path();

  await convertVideoToGif({
    inputPath: videoPath,
    outputPath,
    trimStartSeconds,
    durationSeconds: demoDurationSeconds,
  });

  console.log(`README demo written to ${outputPath}`);
} finally {
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  if (devServer && devServer.exitCode === null) devServer.kill();
  await rm(temporaryDirectory, { recursive: true, force: true });
}

function startDevServer() {
  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawn(
    npmExecutable,
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
    {
      stdio: ["ignore", "inherit", "inherit"],
      env: process.env,
    },
  );
}

async function waitForServer(url, server) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Vite exited before the demo could be recorded (${server.exitCode}).`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The development server may still be starting.
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for the development server at ${url}.`);
}

async function assertFfmpeg() {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
  } catch (error) {
    throw new Error(
      "ffmpeg is required to generate docs/assets/demo.gif. Install ffmpeg and rerun npm run docs:demo.",
      { cause: error },
    );
  }
}

async function convertVideoToGif({
  inputPath,
  outputPath: gifPath,
  trimStartSeconds,
  durationSeconds,
}) {
  const filter =
    "fps=12,scale=1024:-1:flags=lanczos,split[s0][s1];" +
    "[s0]palettegen=max_colors=128:stats_mode=diff[p];" +
    "[s1][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle";

  await execFileAsync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      trimStartSeconds.toFixed(3),
      "-t",
      durationSeconds.toFixed(3),
      "-i",
      inputPath,
      "-vf",
      filter,
      "-loop",
      "0",
      gifPath,
    ],
    { maxBuffer: 10 * 1024 * 1024 },
  );
}
