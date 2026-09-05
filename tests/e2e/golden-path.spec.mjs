import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const fixture =
  process.env.E2E_FIXTURE ?? "/tmp/cloud-arch-icon-browser-e2e-fixture.zip";

async function loadPackage(page) {
  await page.goto("/");
  await page.getByLabel("Choose icon package ZIP").setInputFiles(fixture);
  await page.getByRole("searchbox", { name: "Search icons" }).waitFor();
  await expect(page.getByRole("status")).toContainText("12 icons");
}

async function expectNoAxeViolations(page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(
    result.violations,
    result.violations
      .map(
        (violation) =>
          `${violation.id}: ${violation.help}\n${violation.nodes
            .map((node) => `  ${node.target.join(" ")}: ${node.failureSummary ?? ""}`)
            .join("\n")}`,
      )
      .join("\n\n"),
  ).toEqual([]);
}

test("loads a local package, browses, searches, opens details, and downloads original SVG bytes", async ({
  page,
}) => {
  await loadPackage(page);

  const search = page.getByRole("searchbox", { name: "Search icons" });
  await page.getByRole("button", { name: "Compute, 4 icons" }).click();
  await expect(page.getByRole("status")).toContainText("4 icons");

  await page.getByRole("button", { name: "Change package" }).focus();
  await page.keyboard.press("/");
  await expect(search).toBeFocused();

  await search.fill("functions");
  await expect(page.getByRole("status")).toContainText("1 icon");
  await expect(
    page.getByRole("button", { name: "Functions, Compute" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(search).toBeFocused();
  await expect(page.getByRole("status")).toContainText("4 icons");

  const appService = page.getByRole("button", {
    name: "App Service, Compute",
  });
  await appService.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "App Service" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close icon details" }),
  ).toBeFocused();

  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download SVG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("3-icon-service-App-Service.svg");

  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const downloaded = await readFile(downloadPath, "utf8");
  expect(downloaded).toContain('fill="#0ea5e9"');
  expect(downloaded).toContain('viewBox="0 0 64 64"');

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(appService).toBeFocused();
});

test("key screens have no automatically detectable WCAG A/AA violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Open your architecture icon package" }),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByLabel("Choose icon package ZIP").setInputFiles(fixture);
  await page.getByRole("searchbox", { name: "Search icons" }).waitFor();
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: "App Service, Compute" }).click();
  await page.getByRole("dialog").waitFor();
  await expectNoAxeViolations(page);
});
