import { expect, test } from "@playwright/test";

const fixture =
  process.env.E2E_FIXTURE ?? "/tmp/cloud-arch-icon-browser-e2e-fixture.zip";

async function loadPackage(page) {
  await page.goto("/");
  await page.getByLabel("Choose icon package ZIP").setInputFiles(fixture);
  await page.getByRole("searchbox", { name: "Search icons" }).waitFor();
  await page.waitForTimeout(300);
}

test("initial package screen", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Open your architecture icon package" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("initial-package.png", {
    fullPage: true,
  });
});

test("loaded icon grid", async ({ page }) => {
  await loadPackage(page);
  await expect(page.getByRole("status")).toContainText("12 icons");
  await expect(page).toHaveScreenshot("loaded-grid.png", { fullPage: true });
});

test("icon details dialog", async ({ page }) => {
  await loadPackage(page);
  await page.getByRole("button", { name: "App Service, Compute" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveScreenshot("details-dialog.png", { fullPage: true });
});
