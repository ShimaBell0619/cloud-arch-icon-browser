import { expect, test } from "@playwright/test";

const fixture =
  process.env.E2E_PERF_FIXTURE ??
  "/tmp/cloud-arch-icon-browser-preview-performance-fixture.zip";
const EXPECTED_ICON_COUNT = 160;

test.use({ viewport: { width: 1280, height: 720 } });

async function waitForViewportPreviews(page) {
  await page.waitForFunction(
    () => {
      const hosts = Array.from(
        document.querySelectorAll("[data-preview-icon-id]"),
      );
      const visible = hosts.filter((host) => {
        const rect = host.getBoundingClientRect();
        return rect.bottom >= 0 && rect.top <= window.innerHeight;
      });
      return (
        visible.length > 0 &&
        visible.every((host) => host.dataset.previewStatus === "ready")
      );
    },
    undefined,
    { timeout: 15_000 },
  );
}

test("records release preview readiness and scroll-ahead measurements", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  const startedAt = Date.now();
  await page.getByLabel("Choose icon package ZIP").setInputFiles(fixture);
  await page.getByRole("searchbox", { name: "Search icons" }).waitFor();
  const workspaceReadyMs = Date.now() - startedAt;

  await page.locator('[data-preview-status="ready"]').first().waitFor();
  const firstPreviewReadyMs = Date.now() - startedAt;

  await waitForViewportPreviews(page);
  const firstViewportReadyMs = Date.now() - startedAt;

  const previewHosts = page.locator("[data-preview-icon-id]");
  const totalPreviews = await previewHosts.count();
  const readyAfterFirstViewport = await page
    .locator('[data-preview-status="ready"]')
    .count();

  expect(totalPreviews).toBe(EXPECTED_ICON_COUNT);
  expect(readyAfterFirstViewport).toBeLessThan(totalPreviews);

  const scrollTarget = previewHosts.nth(Math.floor(totalPreviews * 0.75));
  const scrollStartedAt = Date.now();
  await scrollTarget.scrollIntoViewIfNeeded();
  await waitForViewportPreviews(page);
  const scrollViewportReadyMs = Date.now() - scrollStartedAt;

  const metrics = {
    fixtureIcons: totalPreviews,
    workspaceReadyMs,
    firstPreviewReadyMs,
    firstViewportReadyMs,
    readyAfterFirstViewport,
    scrollViewportReadyMs,
  };

  expect(firstPreviewReadyMs).toBeLessThan(10_000);
  expect(firstViewportReadyMs).toBeLessThan(15_000);
  expect(scrollViewportReadyMs).toBeLessThan(10_000);

  console.log(`PREVIEW_PERF_METRICS ${JSON.stringify(metrics)}`);
  await testInfo.attach("preview-performance.json", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
});
