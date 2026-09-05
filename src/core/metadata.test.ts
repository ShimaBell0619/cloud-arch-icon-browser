import { describe, expect, it } from "vitest";
import { entryMetadata } from "../test/package-fixtures";
import { findCommonRoot } from "./categories";
import { PackageError } from "./errors";
import { parsePackageMetadata } from "./metadata";
import { parseDisplayName } from "./names";
import { isInCategory, normalizeZipPath } from "./paths";

describe("ZIP metadata", () => {
  it("builds recursive alphabetical folders from SVG paths and hides just one common root", () => {
    const metadata = parsePackageMetadata(
      [
        entryMetadata("Dummy/Compute/Deep/1-icon-service-App-Service.svg"),
        entryMetadata("Dummy/Compute/2-icon-service-Worker.svg"),
        entryMetadata("Dummy/AI/3-icon-service-AI-Tools.svg"),
        entryMetadata("Dummy/4-icon-service-SQL.svg"),
        entryMetadata("Elsewhere/readme.txt"),
        entryMetadata("Empty/", { directory: true, uncompressedSize: 0 }),
      ],
      4096,
    );
    expect(metadata.summary).toEqual({
      entryCount: 6,
      iconCount: 4,
      categoryCount: 3,
      namingConventionMatches: 4,
      hiddenRoot: "Dummy",
    });
    expect(metadata.categories).toEqual([
      { id: "Dummy/AI", name: "AI", path: "AI", children: [], iconCount: 1 },
      {
        id: "Dummy/Compute",
        name: "Compute",
        path: "Compute",
        iconCount: 2,
        children: [
          {
            id: "Dummy/Compute/Deep",
            name: "Deep",
            path: "Compute/Deep",
            iconCount: 1,
            children: [],
          },
        ],
      },
    ]);
    expect(metadata.icons.map((icon) => icon.displayName)).toEqual([
      "AI Tools",
      "App Service",
      "SQL",
      "Worker",
    ]);
    expect(
      metadata.icons.find((icon) => icon.displayName === "SQL"),
    ).toMatchObject({ categoryId: null, categoryPath: "" });
    expect(
      metadata.icons.filter((icon) => isInCategory(icon, "Dummy/Compute")),
    ).toHaveLength(2);
    expect(
      metadata.icons.filter((icon) => isInCategory(icon, "Dummy/Comp")),
    ).toHaveLength(0);
    expect(
      metadata.icons.filter((icon) => isInCategory(icon, null)),
    ).toHaveLength(4);
    expect(Object.isFrozen(metadata.icons)).toBe(true);
    expect(Object.isFrozen(metadata.categories[1]?.children)).toBe(true);
  });

  it("does not collapse more than one root or invent categories for root-level SVGs", () => {
    const one = parsePackageMetadata(
      [entryMetadata("Wrap/Only/Deeper/a.svg")],
      1000,
    );
    expect(one.categories[0]).toMatchObject({
      name: "Only",
      children: [{ name: "Deeper" }],
    });
    const multiple = parsePackageMetadata(
      [entryMetadata("Two/B.svg"), entryMetadata("One/A.svg")],
      1000,
    );
    expect(multiple.summary.hiddenRoot).toBeNull();
    expect(multiple.categories.map((node) => node.name)).toEqual([
      "One",
      "Two",
    ]);
    const mixed = parsePackageMetadata(
      [entryMetadata("a.svg"), entryMetadata("One/b.svg")],
      1000,
    );
    expect(mixed.summary.hiddenRoot).toBeNull();
    expect(mixed.icons[0]).toMatchObject({
      id: "a.svg",
      categoryId: null,
      categoryPath: "",
    });
    expect(findCommonRoot([])).toBeNull();
    expect(findCommonRoot(["a.svg"])).toBeNull();
  });

  it("preserves original path, filename and casing while normalizing only separators", () => {
    const path = "Wrapper\\Data\\42-icon-service-SQL-IoT-AI.svg";
    const metadata = parsePackageMetadata([entryMetadata(path)], 1000);
    expect(metadata.icons[0]).toMatchObject({
      id: "Wrapper/Data/42-icon-service-SQL-IoT-AI.svg",
      originalPath: path,
      originalFilename: "42-icon-service-SQL-IoT-AI.svg",
      displayName: "SQL IoT AI",
      categoryPath: "Data",
    });
  });

  it("sorts sibling categories and duplicate display names deterministically", () => {
    const metadata = parsePackageMetadata(
      ["B/Z/same.svg", "A/z/same.svg", "A/a/same.svg", "A/Z/Same.svg"].map(
        (path) => entryMetadata(path),
      ),
      1000,
    );
    expect(metadata.categories[0]?.children.map((node) => node.name)).toEqual([
      "a",
      "Z",
      "z",
    ]);
    expect(metadata.icons.map((icon) => icon.id)).toEqual([
      "A/Z/Same.svg",
      "A/a/same.svg",
      "A/z/same.svg",
      "B/Z/same.svg",
    ]);
  });

  it.each([
    ["1-icon-service-SQL-Database.svg", "SQL Database", true],
    ["002-icon-service-AI-IoT.svg", "AI IoT", true],
    ["my-SQL-AI-IoT.svg", "my SQL AI IoT", false],
    ["7-icon-service-.svg", "7 icon service ", false],
    ["New-icon.SVG", "New icon", false],
    ["résumé-東京.svg", "résumé 東京", false],
  ])(
    "parses %s without changing case",
    (name, displayName, matchesNamingConvention) => {
      expect(parseDisplayName(name)).toEqual({
        displayName,
        matchesNamingConvention,
      });
    },
  );

  it.each([
    "",
    "/a.svg",
    "\\a.svg",
    "C:/a.svg",
    "C:a.svg",
    "\\\\host\\a.svg",
    "a/../b.svg",
    "a\\..\\b.svg",
    "a/./b.svg",
    "a//b.svg",
    "a.svg/",
    "a\u0000.svg",
    "a\n.svg",
    "a/ b.svg",
    "a /b.svg",
    "a./b.svg",
    "a/%2e%2e/b.svg",
    "a%2Fb.svg",
    "a%5cb.svg",
    "a%00.svg",
    "a\ufffd.svg",
    "a\u202e.svg",
    "a.svg:stream",
  ])("rejects unsafe or ambiguous path %j", (path) => {
    expect(() => normalizeZipPath(path)).toThrowError(
      expect.objectContaining({
        problem: expect.objectContaining({ code: "UNSAFE_PATH", path }),
      }),
    );
  });

  it("accepts ordinary Unicode, spaces, backslash separators and explicit directories", () => {
    expect(normalizeZipPath("wrap\\Data Lake\\東京.svg")).toBe(
      "wrap/Data Lake/東京.svg",
    );
    expect(normalizeZipPath("wrap/Data/", true)).toBe("wrap/Data");
    expect(normalizeZipPath("wrap\\Data\\", true)).toBe("wrap/Data");
    expect(normalizeZipPath("Data", true)).toBe("Data");
    expect(normalizeZipPath("a%20b.svg")).toBe("a%20b.svg");
  });

  it.each([
    ["DUPLICATE_PATH", [entryMetadata("a/b.svg"), entryMetadata("a\\b.svg")]],
    [
      "DUPLICATE_PATH",
      [
        entryMetadata("a", { directory: true }),
        entryMetadata("a/", { directory: true }),
      ],
    ],
    ["PATH_CONFLICT", [entryMetadata("a/b/c.svg"), entryMetadata("a/b")]],
    [
      "ENCRYPTED_ENTRY",
      [entryMetadata("a.svg"), entryMetadata("notes.txt", { encrypted: true })],
    ],
    [
      "NO_SVG_ENTRIES",
      [
        entryMetadata("readme.txt"),
        entryMetadata("x.svg/", { directory: true }),
      ],
    ],
    ["NO_SVG_ENTRIES", []],
    ["INVALID_METADATA", [entryMetadata("a.svg", { uncompressedSize: 0 })]],
    ["UNSUPPORTED_ENTRY", [entryMetadata("a.svg", { compressionMethod: 99 })]],
  ])("returns an actionable %s error", (code, entries) => {
    try {
      parsePackageMetadata(entries, 1000);
      expect.unreachable("Expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(PackageError);
      expect(error).toMatchObject({
        problem: {
          code,
          phase: "validation",
          message: expect.any(String),
          action: expect.any(String),
        },
      });
    }
  });

  it.each([
    { compressedSize: -1 },
    { compressedSize: 1001 },
    { compressedSize: 0.5 },
    { compressedSize: Number.NaN },
    { uncompressedSize: -1 },
    { uncompressedSize: Number.POSITIVE_INFINITY },
    { uncompressedSize: Number.MAX_SAFE_INTEGER + 1 },
  ])("rejects invalid size metadata %j", (overrides) => {
    expect(() =>
      parsePackageMetadata([entryMetadata("a.svg", overrides)], 1000),
    ).toThrowError(
      expect.objectContaining({
        problem: expect.objectContaining({ code: "INVALID_METADATA" }),
      }),
    );
  });
});
