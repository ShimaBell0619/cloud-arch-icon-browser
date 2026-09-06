import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.UI_REVIEW_BASE_URL ?? "http://127.0.0.1:5173/";
const fixture = process.env.UI_REVIEW_FIXTURE ?? "/tmp/ui-review-fixture.zip";
const output = process.env.UI_REVIEW_OUTPUT ?? "/tmp/ui-review-captures";

await mkdir(output, { recursive: true });

const browser = await chromium.launch();

async function loadPackage(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByLabel("Choose icon package ZIP").setInputFiles(fixture);
  await page.getByRole("searchbox", { name: "Search icons" }).waitFor();
  await page.waitForTimeout(250);
}

try {
  const desktop = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await desktop.goto(baseUrl, { waitUntil: "networkidle" });
  await desktop.screenshot({
    path: `${output}/01-unloaded-desktop.png`,
    fullPage: true,
  });

  await desktop.getByLabel("Choose icon package ZIP").setInputFiles(fixture);
  await desktop.getByRole("searchbox", { name: "Search icons" }).waitFor();
  await desktop.waitForTimeout(250);
  await desktop.screenshot({
    path: `${output}/02-loaded-desktop.png`,
    fullPage: true,
  });

  await desktop
    .getByRole("button", { name: "Open App Service details, Compute" })
    .click();
  await desktop.getByRole("dialog").waitFor();
  await desktop.screenshot({
    path: `${output}/03-details-dialog-desktop.png`,
    fullPage: true,
  });

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await loadPackage(mobile);
  await mobile.screenshot({
    path: `${output}/04-loaded-mobile.png`,
    fullPage: true,
  });

  await mobile.getByRole("button", { name: "Open navigation" }).click();
  await mobile.getByRole("dialog", { name: "Navigation" }).waitFor();
  await mobile.screenshot({
    path: `${output}/05-navigation-mobile.png`,
    fullPage: true,
  });

  const dark = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "dark",
  });
  await loadPackage(dark);
  await dark.screenshot({
    path: `${output}/06-loaded-desktop-dark.png`,
    fullPage: true,
  });
} finally {
  await browser.close();
}
