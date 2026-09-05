import { describe, expect, it } from "vitest";
import { entryMetadata } from "../test/package-fixtures";
import { PACKAGE_STRUCTURE_LIMITS, parsePackageMetadata } from "./metadata";

const ARCHIVE_SIZE = 10_000_000;

describe("package structural plausibility", () => {
  it("keeps generous headroom above the measured V24 SVG count", () => {
    const entries = Array.from(
      { length: PACKAGE_STRUCTURE_LIMITS.maxBrowsableSvgs },
      (_, index) =>
        entryMetadata(
          `Wrapper/Category/${index}-icon-service-Dummy-${index}.svg`,
        ),
    );

    expect(parsePackageMetadata(entries, ARCHIVE_SIZE).summary.iconCount).toBe(
      PACKAGE_STRUCTURE_LIMITS.maxBrowsableSvgs,
    );
  });

  it("rejects an implausible number of browsable SVGs", () => {
    const entries = Array.from(
      { length: PACKAGE_STRUCTURE_LIMITS.maxBrowsableSvgs + 1 },
      (_, index) => entryMetadata(`${index}-icon-service-Dummy-${index}.svg`),
    );

    expect(() => parsePackageMetadata(entries, ARCHIVE_SIZE)).toThrowError(
      expect.objectContaining({
        problem: expect.objectContaining({
          code: "INVALID_METADATA",
          message: expect.stringContaining("implausible number of SVG icons"),
        }),
      }),
    );
  });

  it("rejects an implausible total ZIP entry count before indexing", () => {
    const entries = Array.from(
      { length: PACKAGE_STRUCTURE_LIMITS.maxEntries + 1 },
      (_, index) => entryMetadata(`metadata-${index}.txt`),
    );

    expect(() => parsePackageMetadata(entries, ARCHIVE_SIZE)).toThrowError(
      expect.objectContaining({
        problem: expect.objectContaining({
          code: "INVALID_METADATA",
          message: expect.stringContaining("implausible number of entries"),
        }),
      }),
    );
  });
});
