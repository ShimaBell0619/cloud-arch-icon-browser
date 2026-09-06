import { describe, expect, it, vi } from "vitest";
import {
  createDefaultPersistedState,
  createSavedSet,
  deleteSavedSet,
  getFrequentlyUsedIcons,
  importSavedSet,
  parsePersistedState,
  parseSavedSetShare,
  recordIconUsage,
  recordRecentIcon,
  resolveSavedSet,
  serializeSavedSet,
  updateSavedSet,
} from "./persistence";
import type { IconEntry } from "./types";

function icon(index: number, categoryPath = "Compute"): IconEntry {
  const originalFilename = `${10000 + index}-icon-service-Service-${index}.svg`;
  const visiblePath = `${categoryPath}/${originalFilename}`;
  return {
    id: `Azure_Public_Service_Icons/${visiblePath}`,
    originalPath: `Azure_Public_Service_Icons/${visiblePath}`,
    originalFilename,
    displayName: `Service ${index}`,
    matchesNamingConvention: true,
    categoryId: `Azure_Public_Service_Icons/${categoryPath}`,
    categoryPath,
    uncompressedSize: 123,
  };
}

function reference(entry: IconEntry) {
  return {
    canonicalPath: `${entry.categoryPath}/${entry.originalFilename}`,
    originalFilename: entry.originalFilename,
    displayName: entry.displayName,
    categoryPath: entry.categoryPath,
  };
}

describe("persistence edge cases", () => {
  it("defensively parses, sorts, de-duplicates, and bounds v2 collections", () => {
    const first = icon(1);
    const second = icon(2);
    const recentIcons = Array.from({ length: 55 }, (_, index) => {
      const entry = icon(index + 10);
      return { ...reference(entry), usedAt: index + 1 };
    });
    const usage = Array.from({ length: 205 }, (_, index) => {
      const entry = icon(index + 100);
      return {
        ...reference(entry),
        count: index % 2 === 0 ? 2 : 1,
        lastUsedAt: index + 1,
      };
    });

    const parsed = parsePersistedState(
      JSON.stringify({
        schemaVersion: 2,
        preferences: null,
        favorites: [
          { ...reference(first), savedAt: 1 },
          { ...reference(first), savedAt: 2 },
          { ...reference(second), savedAt: -1 },
          { ...reference(second), canonicalPath: "wrong", savedAt: 2 },
          null,
        ],
        recentIcons: [
          ...recentIcons,
          { ...reference(first), usedAt: -1 },
          { ...reference(second), usedAt: "bad" },
        ],
        recentSearches: [" API ", "api", "", 42, "Queue"],
        savedSets: [
          {
            id: "valid",
            name: "  Main set  ",
            createdAt: 1,
            updatedAt: 10,
            items: [
              { ...reference(first), quantity: 1 },
              { ...reference(first), quantity: 3 },
              { ...reference(second), quantity: 0 },
              { ...reference(second), quantity: 2 },
            ],
          },
          {
            id: "valid",
            name: "duplicate id",
            createdAt: 2,
            updatedAt: 11,
            items: [{ ...reference(first), quantity: 1 }],
          },
          {
            id: "",
            name: "bad id",
            createdAt: 1,
            updatedAt: 1,
            items: [{ ...reference(first), quantity: 1 }],
          },
          {
            id: "bad-date",
            name: "Bad date",
            createdAt: -1,
            updatedAt: 1,
            items: [{ ...reference(first), quantity: 1 }],
          },
          {
            id: "empty",
            name: "   ",
            createdAt: 1,
            updatedAt: 1,
            items: [],
          },
          null,
        ],
        iconUsage: [
          ...usage,
          { ...reference(first), count: 0, lastUsedAt: 1 },
          { ...reference(second), count: 1.5, lastUsedAt: 1 },
          { ...reference(second), count: 1, lastUsedAt: -1 },
        ],
      }),
    );

    expect(parsed.preferences).toEqual({
      theme: "system",
      view: "grid",
      sidebarCollapsed: false,
    });
    expect(parsed.favorites).toHaveLength(1);
    expect(parsed.recentIcons).toHaveLength(50);
    expect(parsed.recentIcons[0]?.usedAt).toBe(55);
    expect(parsed.iconUsage).toHaveLength(200);
    expect(parsed.iconUsage[0]?.lastUsedAt).toBe(205);
    expect(parsed.recentSearches).toEqual(["API", "Queue"]);
    expect(parsed.savedSets).toHaveLength(1);
    expect(parsed.savedSets[0]?.name).toBe("Main set");
    expect(parsed.savedSets[0]?.items).toHaveLength(2);
  });

  it("handles Saved Set no-op branches and aggregates duplicate source items", () => {
    const first = icon(1);
    let state = createDefaultPersistedState();

    expect(createSavedSet(state, "   ", [{ icon: first, quantity: 1 }])).toBe(
      state,
    );
    expect(createSavedSet(state, "Empty", [])).toBe(state);
    expect(
      createSavedSet(state, "Invalid", [{ icon: first, quantity: 0 }]),
    ).toBe(state);

    state = createSavedSet(
      state,
      "Aggregated",
      [
        { icon: first, quantity: 1 },
        { icon: first, quantity: 2 },
        { icon: icon(2), quantity: -1 },
      ],
      { id: "set-1", now: 10 },
    );
    expect(state.savedSets[0]?.items).toHaveLength(1);
    expect(state.savedSets[0]?.items[0]?.quantity).toBe(3);

    const beforeUpdate = state;
    expect(
      updateSavedSet(state, "missing", "Name", [{ icon: first, quantity: 1 }]),
    ).toBe(state);
    expect(
      updateSavedSet(state, "set-1", "   ", [{ icon: first, quantity: 1 }]),
    ).toBe(state);
    expect(updateSavedSet(state, "set-1", "Name", [])).toBe(state);
    expect(deleteSavedSet(state, "missing")).toBe(state);

    state = updateSavedSet(
      state,
      "set-1",
      "Updated",
      [{ icon: first, quantity: 4 }],
      20,
    );
    expect(state).not.toBe(beforeUpdate);
    expect(state.savedSets[0]?.updatedAt).toBe(20);
  });

  it("rejects malformed Saved Set clipboard payloads without mutating state", () => {
    const state = createDefaultPersistedState();
    const invalidPayloads = [
      "not json",
      JSON.stringify(null),
      JSON.stringify({ kind: "wrong", schemaVersion: 1, set: {} }),
      JSON.stringify({
        kind: "cloud-arch-icon-browser/saved-set",
        schemaVersion: 99,
        set: {},
      }),
      JSON.stringify({
        kind: "cloud-arch-icon-browser/saved-set",
        schemaVersion: 1,
        set: null,
      }),
      JSON.stringify({
        kind: "cloud-arch-icon-browser/saved-set",
        schemaVersion: 1,
        set: { name: "   ", items: [] },
      }),
      JSON.stringify({
        kind: "cloud-arch-icon-browser/saved-set",
        schemaVersion: 1,
        set: { name: "Valid", items: [{ quantity: 1 }] },
      }),
    ];

    for (const raw of invalidPayloads) {
      expect(parseSavedSetShare(raw)).toBeNull();
      expect(importSavedSet(state, raw)).toBeNull();
    }
  });

  it("round-trips a valid share and resolves matched plus unresolved items", () => {
    const first = icon(1, "Old");
    const second = icon(2, "Missing");
    let state = createDefaultPersistedState();
    state = createSavedSet(
      state,
      "Portable",
      [
        { icon: first, quantity: 2 },
        { icon: second, quantity: 1 },
      ],
      { id: "portable", now: 1 },
    );
    const set = state.savedSets[0];
    expect(set).toBeDefined();
    if (!set) return;

    const raw = serializeSavedSet(set);
    const imported = importSavedSet(state, raw, { id: "copy", now: 2 });
    expect(imported?.savedSets[0]?.id).toBe("copy");

    const moved: IconEntry = {
      ...first,
      id: "Azure_Public_Service_Icons/New/99999-icon-service-Service-1.svg",
      originalPath:
        "Azure_Public_Service_Icons/New/99999-icon-service-Service-1.svg",
      originalFilename: "99999-icon-service-Service-1.svg",
      categoryId: "Azure_Public_Service_Icons/New",
      categoryPath: "New",
    };
    const resolved = resolveSavedSet(set, [moved]);
    expect(resolved.matchedItems).toHaveLength(1);
    expect(resolved.unresolvedItems).toHaveLength(1);
  });

  it("handles frequency limits, unmatched usage, aliases, and count ties", () => {
    const first = icon(1);
    const second = icon(2);
    let state = createDefaultPersistedState();

    expect(getFrequentlyUsedIcons(state, [first], 0)).toEqual([]);
    expect(getFrequentlyUsedIcons(state, [first], 1.5)).toEqual([]);

    state = recordRecentIcon(state, first, 100);
    state = recordIconUsage(state, second, 100);
    state = recordIconUsage(state, second, 101);
    state = recordIconUsage(state, icon(99), 200);

    expect(getFrequentlyUsedIcons(state, [first, second], 1)).toEqual([second]);
    expect(getFrequentlyUsedIcons(state, [first, second], 10)).toEqual([
      second,
      first,
    ]);
  });

  it("uses generated identifiers when no Saved Set id is supplied", () => {
    vi.spyOn(Date, "now").mockReturnValue(1234);
    let state = createDefaultPersistedState();
    state = createSavedSet(state, "Generated", [
      { icon: icon(1), quantity: 1 },
    ]);
    expect(state.savedSets[0]?.id).toBeTruthy();
    expect(state.savedSets[0]?.createdAt).toBe(1234);
    vi.restoreAllMocks();
  });
});
