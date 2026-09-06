import { describe, expect, it } from "vitest";
import { entryMetadata } from "../test/package-fixtures";
import { parsePackageMetadata } from "./metadata";
import { IconSearchIndex, normalizeSearch } from "./search";

const paths = [
  "Dummy/Compute/1-icon-service-App-Service.svg",
  "Dummy/Compute/2-icon-service-App-Service-Plan.svg",
  "Dummy/Compute/Nested/3-icon-service-My-App-Service.svg",
  "Dummy/Compute/4-icon-service-App-Servixe.svg",
  "Dummy/Other/5-icon-service-Zebra.svg",
  "Dummy/Other/6-icon-service-SQL-Database.svg",
];

describe("icon search", () => {
  const icons = parsePackageMetadata(
    paths.map((path) => entryMetadata(path)),
    4096,
  ).icons;
  const index = new IconSearchIndex(icons);

  it.each([
    "app service",
    "APP-SERVICE",
    "appservice",
    " Ａｐｐ　Ｓｅｒｖｉｃｅ ",
    "app\tservice",
  ])("normalizes %j consistently", (query) => {
    expect(normalizeSearch(query)).toBe("appservice");
    expect(
      index.search(query).map(({ icon, match }) => [icon.displayName, match]),
    ).toEqual([
      ["App Service", "exact"],
      ["App Service Plan", "prefix"],
      ["My App Service", "substring"],
      ["App Servixe", "fuzzy"],
    ]);
  });

  it("uses deterministic tiers for original filename and category path", () => {
    expect(index.search("5-icon-service-Zebra.svg")[0]).toMatchObject({
      match: "exact",
      icon: { displayName: "Zebra" },
    });
    expect(
      index.search("Other").map(({ icon, match }) => [icon.displayName, match]),
    ).toEqual([
      ["SQL Database", "exact"],
      ["Zebra", "exact"],
    ]);
  });

  it("uses weighted Fuse matches for typos, filename and category fields", () => {
    expect(index.search("apservce")[0]).toMatchObject({
      match: "fuzzy",
      icon: { displayName: "App Service" },
    });
    expect(index.search("5-icon-service-Zebra.svg")[0]?.icon.displayName).toBe(
      "Zebra",
    );
    expect(index.search("Nested")[0]?.icon.displayName).toBe("My App Service");
    expect(index.search("other").map(({ icon }) => icon.displayName)).toEqual([
      "SQL Database",
      "Zebra",
    ]);
    expect(index.search("zzzzqqqqxxxxx")).toEqual([]);
  });

  it("restricts every ranking tier to a parent category subtree", () => {
    expect(index.search("appservice", "Dummy/Compute")).toHaveLength(4);
    expect(index.search("appservice", "Dummy/Compute/Nested")).toMatchObject([
      { icon: { displayName: "My App Service" }, match: "substring" },
    ]);
    expect(index.search("appservice", "Dummy/Comp")).toEqual([]);
    expect(index.search("appservice", "Dummy/Other")).toEqual([]);
    expect(index.search("", "Dummy/Compute")).toHaveLength(4);
    expect(index.search("other", "Dummy/Compute")).toEqual([]);
  });

  it("deduplicates identical original filenames only in global scope", () => {
    const duplicateIcons = parsePackageMetadata(
      [
        "Dummy/Shared/A/7-icon-service-Shared.svg",
        "Dummy/Shared/B/7-icon-service-Shared.svg",
      ].map((path) => entryMetadata(path)),
      4096,
    ).icons;
    const duplicateIndex = new IconSearchIndex(duplicateIcons);

    expect(duplicateIndex.search("")).toHaveLength(1);
    expect(duplicateIndex.search("shared")).toHaveLength(1);
    expect(duplicateIndex.search("")[0]?.icon.id).toBe(
      "Dummy/Shared/A/7-icon-service-Shared.svg",
    );
    expect(duplicateIndex.search("", "Dummy/Shared")).toHaveLength(2);
    expect(duplicateIndex.search("shared", "Dummy/Shared")).toHaveLength(2);
  });

  it("returns all icons alphabetically for empty/separator-only queries without a result cap", () => {
    expect(index.search(" - \t").map(({ icon }) => icon.displayName)).toEqual([
      "App Service",
      "App Service Plan",
      "App Servixe",
      "My App Service",
      "SQL Database",
      "Zebra",
    ]);
    const large = new IconSearchIndex(
      parsePackageMetadata(
        Array.from({ length: 160 }, (_, i) =>
          entryMetadata(`Group${i}/${i}-icon-service-Same-Resource-${i}.svg`),
        ),
        4096,
      ).icons,
    );
    expect(large.search("same")).toHaveLength(160);
    expect(large.search("sameresorce")).toHaveLength(160);
    expect(large.search("")[0]?.icon.id).toBe(
      "Group0/0-icon-service-Same-Resource-0.svg",
    );
    expect(new IconSearchIndex([]).search("x")).toEqual([]);
  });
});
