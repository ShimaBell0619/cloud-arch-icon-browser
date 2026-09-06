import { describe, expect, it } from "vitest";
import {
  addFavorite,
  createDefaultPersistedState,
  createSavedSet,
  deleteSavedSet,
  getFrequentlyUsedIcons,
  importSavedSet,
  loadPersistedState,
  PERSISTENCE_KEY,
  PERSISTENCE_SCHEMA_VERSION,
  parsePersistedState,
  parseSavedSetShare,
  RECENT_ICON_LIMIT,
  RECENT_SEARCH_LIMIT,
  reconcilePersistedStateWithIcons,
  recordIconUsage,
  recordRecentSearch,
  removeFavorite,
  resolveSavedSet,
  type StorageLike,
  savePersistedState,
  serializeSavedSet,
  setPersistedPreferences,
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

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("persistence", () => {
  it("returns clean defaults for missing, malformed, and unknown schema data", () => {
    const defaults = createDefaultPersistedState();

    expect(parsePersistedState(null)).toEqual(defaults);
    expect(parsePersistedState("{")).toEqual(defaults);
    expect(parsePersistedState(JSON.stringify({ schemaVersion: 0 }))).toEqual(
      defaults,
    );
    expect(parsePersistedState(JSON.stringify({ schemaVersion: 99 }))).toEqual(
      defaults,
    );
  });

  it("migrates v1 while intentionally resetting details-open Recent history", () => {
    const old = icon(1);
    const parsed = parsePersistedState(
      JSON.stringify({
        schemaVersion: 1,
        preferences: {
          theme: "dark",
          view: "compact",
          sidebarCollapsed: true,
        },
        favorites: [
          {
            canonicalPath: `${old.categoryPath}/${old.originalFilename}`,
            originalFilename: old.originalFilename,
            displayName: old.displayName,
            categoryPath: old.categoryPath,
            savedAt: 10,
          },
        ],
        recentIcons: [
          {
            canonicalPath: `${old.categoryPath}/${old.originalFilename}`,
            originalFilename: old.originalFilename,
            displayName: old.displayName,
            categoryPath: old.categoryPath,
            openedAt: 20,
          },
        ],
        recentSearches: ["  App Service  ", "app service"],
      }),
    );

    expect(parsed.schemaVersion).toBe(PERSISTENCE_SCHEMA_VERSION);
    expect(parsed.preferences).toEqual({
      theme: "dark",
      view: "compact",
      sidebarCollapsed: true,
    });
    expect(parsed.favorites).toHaveLength(1);
    expect(parsed.recentIcons).toEqual([]);
    expect(parsed.iconUsage).toEqual([]);
    expect(parsed.savedSets).toEqual([]);
    expect(parsed.recentSearches).toEqual(["App Service"]);
  });

  it("defensively parses v2 data and defaults invalid preference fields", () => {
    const parsed = parsePersistedState(
      JSON.stringify({
        schemaVersion: PERSISTENCE_SCHEMA_VERSION,
        preferences: {
          theme: "dark",
          view: "wide",
          sidebarCollapsed: "yes",
        },
        favorites: [],
        recentIcons: [],
        recentSearches: ["  App Service  ", "app service", "", 42],
        savedSets: [],
        iconUsage: [],
      }),
    );

    expect(parsed.preferences).toEqual({
      theme: "dark",
      view: "grid",
      sidebarCollapsed: false,
    });
    expect(parsed.recentSearches).toEqual(["App Service"]);
  });

  it("round-trips through a storage-like boundary", () => {
    const storage = new MemoryStorage();
    const state = setPersistedPreferences(createDefaultPersistedState(), {
      theme: "dark",
      view: "compact",
      sidebarCollapsed: true,
    });

    expect(savePersistedState(storage, state)).toBe(true);
    expect(storage.values.has(PERSISTENCE_KEY)).toBe(true);
    expect(loadPersistedState(storage)).toEqual(state);
  });

  it("fails safe when storage access throws", () => {
    const throwingStorage: StorageLike = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("quota");
      },
    };

    expect(loadPersistedState(throwingStorage)).toEqual(
      createDefaultPersistedState(),
    );
    expect(
      savePersistedState(throwingStorage, createDefaultPersistedState()),
    ).toBe(false);
  });

  it("adds, refreshes, and removes Favorites without imposing a count limit", () => {
    let state = createDefaultPersistedState();
    for (let index = 0; index < 55; index += 1) {
      state = addFavorite(state, icon(index), index);
    }
    expect(state.favorites).toHaveLength(55);

    state = addFavorite(state, icon(3), 999);
    expect(state.favorites).toHaveLength(55);
    expect(state.favorites[0]?.savedAt).toBe(999);

    state = removeFavorite(state, icon(3));
    expect(state.favorites).toHaveLength(54);
    expect(state.favorites.some((favorite) => favorite.savedAt === 999)).toBe(
      false,
    );
  });

  it("records real usage as Recent and frequency counts", () => {
    let state = createDefaultPersistedState();
    for (let index = 0; index < RECENT_ICON_LIMIT + 5; index += 1) {
      state = recordIconUsage(state, icon(index), index);
    }

    expect(state.recentIcons).toHaveLength(RECENT_ICON_LIMIT);
    expect(state.recentIcons[0]?.usedAt).toBe(RECENT_ICON_LIMIT + 4);

    state = recordIconUsage(state, icon(10), 999);
    state = recordIconUsage(state, icon(10), 1000);
    expect(state.recentIcons[0]?.usedAt).toBe(1000);
    expect(
      state.recentIcons.filter((recent) => recent.displayName === "Service 10"),
    ).toHaveLength(1);
    expect(
      state.iconUsage.find((usage) => usage.displayName === "Service 10")
        ?.count,
    ).toBe(3);
  });

  it("returns frequently used icons without changing search state", () => {
    let state = createDefaultPersistedState();
    state = recordIconUsage(state, icon(1), 100);
    state = recordIconUsage(state, icon(2), 110);
    state = recordIconUsage(state, icon(2), 120);

    expect(
      getFrequentlyUsedIcons(state, [icon(1), icon(2)]).map(
        (entry) => entry.displayName,
      ),
    ).toEqual(["Service 2", "Service 1"]);
  });

  it("trims, case-folds, de-duplicates, and bounds Recent searches", () => {
    let state = createDefaultPersistedState();
    state = recordRecentSearch(state, "  App Service  ");
    state = recordRecentSearch(state, "APP SERVICE");
    state = recordRecentSearch(state, "   ");

    expect(state.recentSearches).toEqual(["APP SERVICE"]);

    for (let index = 0; index < RECENT_SEARCH_LIMIT + 3; index += 1) {
      state = recordRecentSearch(state, `query ${index}`);
    }

    expect(state.recentSearches).toHaveLength(RECENT_SEARCH_LIMIT);
    expect(state.recentSearches[0]).toBe(`query ${RECENT_SEARCH_LIMIT + 2}`);
  });

  it("creates, updates, deletes, and clipboard-round-trips Saved Sets", () => {
    let state = createDefaultPersistedState();
    state = createSavedSet(
      state,
      "  Web API  ",
      [
        { icon: icon(1), quantity: 2 },
        { icon: icon(2), quantity: 1 },
      ],
      { id: "set-1", now: 100 },
    );

    const created = state.savedSets[0];
    expect(created?.name).toBe("Web API");
    expect(created?.items.map((item) => item.quantity)).toEqual([2, 1]);

    state = updateSavedSet(
      state,
      "set-1",
      "Updated",
      [{ icon: icon(2), quantity: 3 }],
      200,
    );
    expect(state.savedSets[0]?.name).toBe("Updated");
    expect(state.savedSets[0]?.items[0]?.quantity).toBe(3);

    const updatedSet = state.savedSets[0];
    expect(updatedSet).toBeDefined();
    if (!updatedSet) throw new Error("Expected updated Saved Set.");
    const serialized = serializeSavedSet(updatedSet);
    expect(parseSavedSetShare(serialized)?.name).toBe("Updated");
    const imported = importSavedSet(state, serialized, {
      id: "set-2",
      now: 300,
    });
    expect(imported?.savedSets[0]?.id).toBe("set-2");
    expect(importSavedSet(state, "not json")).toBeNull();
    if (!imported) throw new Error("Expected imported Saved Set state.");

    state = deleteSavedSet(imported, "set-1");
    expect(state.savedSets.some((set) => set.id === "set-1")).toBe(false);
  });

  it("resolves valid Saved Set members while retaining unresolved metadata", () => {
    let state = createDefaultPersistedState();
    state = createSavedSet(
      state,
      "Mixed",
      [
        { icon: icon(1, "Old"), quantity: 2 },
        { icon: icon(2, "Removed"), quantity: 1 },
      ],
      { id: "mixed", now: 10 },
    );
    const original = icon(1, "Old");
    const moved: IconEntry = {
      ...original,
      id: "Azure_Public_Service_Icons/New/99999-icon-service-Service-1.svg",
      originalPath:
        "Azure_Public_Service_Icons/New/99999-icon-service-Service-1.svg",
      originalFilename: "99999-icon-service-Service-1.svg",
      categoryId: "Azure_Public_Service_Icons/New",
      categoryPath: "New",
    };

    const savedSet = state.savedSets[0];
    expect(savedSet).toBeDefined();
    if (!savedSet) throw new Error("Expected Saved Set to resolve.");
    const resolved = resolveSavedSet(savedSet, [moved]);
    expect(resolved.matchedItems).toHaveLength(1);
    expect(resolved.matchedItems[0]?.item.quantity).toBe(2);
    expect(resolved.unresolvedItems).toHaveLength(1);
  });

  it("self-heals matched persisted identities without deleting unmatched records", () => {
    const old = icon(1, "Old");
    const missing = icon(2, "Removed");
    let state = createDefaultPersistedState();
    state = addFavorite(state, old, 10);
    state = addFavorite(state, missing, 20);
    state = recordIconUsage(state, old, 30);
    state = createSavedSet(state, "Old set", [{ icon: old, quantity: 2 }], {
      id: "set-old",
      now: 40,
    });

    const moved: IconEntry = {
      ...old,
      id: "Azure_Public_Service_Icons/New/99999-icon-service-Service-1.svg",
      originalPath:
        "Azure_Public_Service_Icons/New/99999-icon-service-Service-1.svg",
      originalFilename: "99999-icon-service-Service-1.svg",
      categoryId: "Azure_Public_Service_Icons/New",
      categoryPath: "New",
    };

    const reconciled = reconcilePersistedStateWithIcons(state, [moved]);

    expect(reconciled.changed).toBe(true);
    expect(reconciled.matchedFavorites).toHaveLength(1);
    expect(reconciled.matchedRecentIcons).toHaveLength(1);
    expect(reconciled.matchedUsageIcons).toHaveLength(1);
    expect(reconciled.matchedFavorites[0]?.matchedBy).toBe("canonical-name");
    expect(reconciled.state.favorites).toHaveLength(2);
    expect(reconciled.state.savedSets[0]?.items[0]?.canonicalPath).toBe(
      "New/99999-icon-service-Service-1.svg",
    );
  });
});
