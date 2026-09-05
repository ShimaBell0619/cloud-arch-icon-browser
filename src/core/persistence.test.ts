import { describe, expect, it } from "vitest";
import {
  addFavorite,
  createDefaultPersistedState,
  loadPersistedState,
  parsePersistedState,
  PERSISTENCE_KEY,
  PERSISTENCE_SCHEMA_VERSION,
  RECENT_ICON_LIMIT,
  RECENT_SEARCH_LIMIT,
  reconcilePersistedStateWithIcons,
  recordRecentIcon,
  recordRecentSearch,
  removeFavorite,
  savePersistedState,
  setPersistedPreferences,
  type StorageLike,
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
    expect(parsePersistedState("{"))).toEqual(defaults);
    expect(parsePersistedState(JSON.stringify({ schemaVersion: 0 }))).toEqual(
      defaults,
    );
    expect(parsePersistedState(JSON.stringify({ schemaVersion: 99 }))).toEqual(
      defaults,
    );
  });

  it("defensively parses v1 data and defaults invalid preference fields", () => {
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

  it("bounds and de-duplicates Recent icons newest-first", () => {
    let state = createDefaultPersistedState();
    for (let index = 0; index < RECENT_ICON_LIMIT + 5; index += 1) {
      state = recordRecentIcon(state, icon(index), index);
    }

    expect(state.recentIcons).toHaveLength(RECENT_ICON_LIMIT);
    expect(state.recentIcons[0]?.openedAt).toBe(RECENT_ICON_LIMIT + 4);

    state = recordRecentIcon(state, icon(10), 999);
    expect(state.recentIcons).toHaveLength(RECENT_ICON_LIMIT);
    expect(state.recentIcons[0]?.openedAt).toBe(999);
    expect(
      state.recentIcons.filter((recent) => recent.displayName === "Service 10"),
    ).toHaveLength(1);
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

  it("keeps unmatched records while returning only current matched icons", () => {
    const old = icon(1, "Old");
    const missing = icon(2, "Removed");
    let state = createDefaultPersistedState();
    state = addFavorite(state, old, 10);
    state = addFavorite(state, missing, 20);
    state = recordRecentIcon(state, old, 30);

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
    expect(reconciled.matchedFavorites[0]?.matchedBy).toBe("canonical-name");
    expect(reconciled.state.favorites).toHaveLength(2);
    expect(reconciled.state.favorites[0]?.canonicalPath).toBe(
      "Removed/10002-icon-service-Service-2.svg",
    );
    expect(reconciled.state.favorites[1]?.canonicalPath).toBe(
      "New/99999-icon-service-Service-1.svg",
    );
  });
});
