import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const fixture =
  process.env.E2E_FIXTURE ?? "/tmp/cloud-arch-icon-browser-e2e-fixture.zip";

function resultStatus(page) {
  return page.locator("header").getByRole("status");
}

async function loadPackage(page) {
  await page.goto("/");
  await page.getByLabel("Choose icon package ZIP").setInputFiles(fixture);
  await page.getByRole("searchbox", { name: "Search icons" }).waitFor();
  await expect(resultStatus(page)).toContainText("12 icons");
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
            .map(
              (node) =>
                `  ${node.target.join(" ")}: ${node.failureSummary ?? ""}`,
            )
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
  await expect(resultStatus(page)).toContainText("4 icons");

  await page.getByRole("button", { name: "Change package" }).focus();
  await page.keyboard.press("/");
  await expect(search).toBeFocused();

  await search.fill("functions");
  await expect(resultStatus(page)).toContainText("1 icon");
  await expect(
    page.getByRole("button", { name: "Functions, Compute" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(search).toBeFocused();
  await expect(resultStatus(page)).toContainText("4 icons");

  const appService = page.getByRole("button", {
    name: "App Service, Compute",
  });
  await appService.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "App Service" }),
  ).toBeVisible();
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

test("workspace navigation preferences survive reload without reopening the package", async ({
  page,
}) => {
  await loadPackage(page);

  const navigation = page.getByRole("navigation", { name: "Workspace" });
  await expect(
    navigation.getByRole("button", { name: "All icons" }),
  ).toHaveAttribute("aria-current", "page");

  await navigation.getByRole("button", { name: "Favorites" }).click();
  await expect(page.getByRole("heading", { name: "Favorites" })).toBeVisible();
  await navigation.getByRole("button", { name: "Recent" }).click();
  await expect(page.getByRole("heading", { name: "Recent" })).toBeVisible();
  await navigation.getByRole("button", { name: "All icons" }).click();

  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(
    page.getByRole("button", { name: "Expand sidebar" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  const preferences = await page.evaluate(() => {
    const raw = localStorage.getItem("cloud-arch-icon-browser:state");
    return raw ? JSON.parse(raw).preferences : null;
  });
  expect(preferences).toMatchObject({ sidebarCollapsed: true, theme: "dark" });

  await page.reload();
  await expect(page.getByRole("button", { name: "Choose ZIP" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByLabel("Choose icon package ZIP").setInputFiles(fixture);
  await page.getByRole("searchbox", { name: "Search icons" }).waitFor();
  await expect(
    page.getByRole("button", { name: "Expand sidebar" }),
  ).toBeVisible();
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
