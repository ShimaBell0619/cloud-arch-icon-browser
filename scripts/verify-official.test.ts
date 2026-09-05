import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { afterAll, expect, test } from "vitest";
import { IconPackageSession } from "../src/core/index";

const zipPath = process.env.VERIFY_OFFICIAL_ZIP;
if (!zipPath) {
  throw new Error(
    "VERIFY_OFFICIAL_ZIP is required. Use npm run verify:official -- <zip>.",
  );
}

let session: IconPackageSession | null = null;

afterAll(async () => {
  await session?.dispose();
});

test("official package passes the production parser and validator", async () => {
  const bytes = await readFile(zipPath);
  const candidate = await IconPackageSession.open(
    new Blob([new Uint8Array(bytes)], { type: "application/zip" }),
  );

  if (!candidate.ok) {
    throw new Error(
      `Official package verification failed [${candidate.error.code}]: ${candidate.error.message}`,
    );
  }

  session = candidate.session;
  const summary = session.metadata.summary;
  expect(summary.iconCount).toBeGreaterThan(0);
  expect(summary.categoryCount).toBeGreaterThan(0);

  const namingRate =
    summary.iconCount === 0
      ? 0
      : (summary.namingConventionMatches / summary.iconCount) * 100;

  const record = {
    verificationDate: new Date().toISOString().slice(0, 10),
    package: basename(zipPath),
    result: "PASS",
    archiveEntries: summary.entryCount,
    browsableSvgIcons: summary.iconCount,
    categories: summary.categoryCount,
    namingConventionMatchPercent: Number(namingRate.toFixed(1)),
    hiddenPackagingRoot: summary.hiddenRoot,
  };

  console.log("\nCompatibility verification record:\n");
  console.log(JSON.stringify(record, null, 2));
  console.log(
    "\nCopy the measured metadata into COMPATIBILITY.md before release.\n",
  );
});
