import {
  canonicalPersistedIconPath,
  createPersistedIconReference,
  matchPersistedIconReference,
  type PersistedIconMatchKind,
  type PersistedIconReference,
  persistedReferencesEqual,
} from "./persisted-identity";
import type { IconEntry } from "./types";

export const PERSISTENCE_KEY = "cloud-arch-icon-browser:state";
export const PERSISTENCE_SCHEMA_VERSION = 1 as const;
export const RECENT_ICON_LIMIT = 50;
export const RECENT_SEARCH_LIMIT = 10;

export type ThemePreference = "system" | "light" | "dark";
export type ViewPreference = "grid" | "compact";

export interface PersistedPreferences {
  readonly theme: ThemePreference;
  readonly view: ViewPreference;
  readonly sidebarCollapsed: boolean;
}

export interface FavoriteRecord extends PersistedIconReference {
  readonly savedAt: number;
}

export interface RecentIconRecord extends PersistedIconReference {
  readonly openedAt: number;
}

export interface PersistedStateV1 {
  readonly schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION;
  readonly preferences: PersistedPreferences;
  readonly favorites: readonly FavoriteRecord[];
  readonly recentIcons: readonly RecentIconRecord[];
  readonly recentSearches: readonly string[];
}

export type PersistedState = PersistedStateV1;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface MatchedPersistedIcon<TRecord extends PersistedIconReference> {
  readonly record: TRecord;
  readonly icon: IconEntry;
  readonly matchedBy: PersistedIconMatchKind;
}

export interface ReconciledPersistedState {
  readonly state: PersistedState;
  readonly matchedFavorites: readonly MatchedPersistedIcon<FavoriteRecord>[];
  readonly matchedRecentIcons: readonly MatchedPersistedIcon<RecentIconRecord>[];
  readonly changed: boolean;
}

const DEFAULT_PREFERENCES: PersistedPreferences = Object.freeze({
  theme: "system",
  view: "grid",
  sidebarCollapsed: false,
});

export function createDefaultPersistedState(): PersistedState {
  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    preferences: { ...DEFAULT_PREFERENCES },
    favorites: [],
    recentIcons: [],
    recentSearches: [],
  };
}

export function parsePersistedState(raw: string | null): PersistedState {
  if (raw === null) return createDefaultPersistedState();

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return createDefaultPersistedState();
  }

  if (!isRecord(value) || value.schemaVersion !== PERSISTENCE_SCHEMA_VERSION) {
    return createDefaultPersistedState();
  }

  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    preferences: parsePreferences(value.preferences),
    favorites: parseFavoriteRecords(value.favorites),
    recentIcons: parseRecentIconRecords(value.recentIcons),
    recentSearches: parseRecentSearches(value.recentSearches),
  };
}

export function loadPersistedState(storage: StorageLike): PersistedState {
  try {
    return parsePersistedState(storage.getItem(PERSISTENCE_KEY));
  } catch {
    return createDefaultPersistedState();
  }
}

export function savePersistedState(
  storage: StorageLike,
  state: PersistedState,
): boolean {
  try {
    storage.setItem(PERSISTENCE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function setPersistedPreferences(
  state: PersistedState,
  preferences: Partial<PersistedPreferences>,
): PersistedState {
  return {
    ...state,
    preferences: {
      ...state.preferences,
      ...preferences,
    },
  };
}

export function addFavorite(
  state: PersistedState,
  icon: IconEntry,
  savedAt = Date.now(),
): PersistedState {
  const reference = createPersistedIconReference(icon);
  const record: FavoriteRecord = { ...reference, savedAt };
  return {
    ...state,
    favorites: [
      record,
      ...state.favorites.filter(
        (favorite) => favorite.canonicalPath !== reference.canonicalPath,
      ),
    ],
  };
}

export function removeFavorite(
  state: PersistedState,
  icon: IconEntry,
): PersistedState {
  const canonicalPath = createPersistedIconReference(icon).canonicalPath;
  return {
    ...state,
    favorites: state.favorites.filter(
      (favorite) => favorite.canonicalPath !== canonicalPath,
    ),
  };
}

export function recordRecentIcon(
  state: PersistedState,
  icon: IconEntry,
  openedAt = Date.now(),
): PersistedState {
  const reference = createPersistedIconReference(icon);
  const record: RecentIconRecord = { ...reference, openedAt };
  const remaining = state.recentIcons.filter(
    (recent) => recent.canonicalPath !== reference.canonicalPath,
  );
  return {
    ...state,
    recentIcons: [record, ...remaining].slice(0, RECENT_ICON_LIMIT),
  };
}

export function recordRecentSearch(
  state: PersistedState,
  input: string,
): PersistedState {
  const query = input.trim();
  if (!query) return state;

  const key = normalizeRecentSearchKey(query);
  const remaining = state.recentSearches.filter(
    (existing) => normalizeRecentSearchKey(existing) !== key,
  );
  return {
    ...state,
    recentSearches: [query, ...remaining].slice(0, RECENT_SEARCH_LIMIT),
  };
}

export function reconcilePersistedStateWithIcons(
  state: PersistedState,
  icons: readonly IconEntry[],
): ReconciledPersistedState {
  const favorites = reconcileRecords(state.favorites, icons);
  const recentIcons = reconcileRecords(state.recentIcons, icons);
  const changed = favorites.changed || recentIcons.changed;

  return {
    state: changed
      ? {
          ...state,
          favorites: favorites.records,
          recentIcons: recentIcons.records,
        }
      : state,
    matchedFavorites: favorites.matches,
    matchedRecentIcons: recentIcons.matches,
    changed,
  };
}

function reconcileRecords<TRecord extends PersistedIconReference>(
  records: readonly TRecord[],
  icons: readonly IconEntry[],
): {
  records: readonly TRecord[];
  matches: readonly MatchedPersistedIcon<TRecord>[];
  changed: boolean;
} {
  let changed = false;
  const nextRecords: TRecord[] = [];
  const matches: MatchedPersistedIcon<TRecord>[] = [];

  for (const record of records) {
    const match = matchPersistedIconReference(record, icons);
    if (!match) {
      nextRecords.push(record);
      continue;
    }

    const healed = persistedReferencesEqual(record, match.healedReference)
      ? record
      : ({ ...record, ...match.healedReference } as TRecord);
    if (healed !== record) changed = true;
    nextRecords.push(healed);
    matches.push({
      record: healed,
      icon: match.icon,
      matchedBy: match.matchedBy,
    });
  }

  return { records: nextRecords, matches, changed };
}

function parsePreferences(value: unknown): PersistedPreferences {
  if (!isRecord(value)) return { ...DEFAULT_PREFERENCES };
  return {
    theme: isThemePreference(value.theme)
      ? value.theme
      : DEFAULT_PREFERENCES.theme,
    view: isViewPreference(value.view) ? value.view : DEFAULT_PREFERENCES.view,
    sidebarCollapsed:
      typeof value.sidebarCollapsed === "boolean"
        ? value.sidebarCollapsed
        : DEFAULT_PREFERENCES.sidebarCollapsed,
  };
}

function parseFavoriteRecords(value: unknown): readonly FavoriteRecord[] {
  if (!Array.isArray(value)) return [];
  const records = value.flatMap((item) => {
    const reference = parseIconReference(item);
    if (!reference || !isRecord(item) || !isTimestamp(item.savedAt)) return [];
    return [{ ...reference, savedAt: item.savedAt }];
  });
  return dedupeByCanonicalPath(records);
}

function parseRecentIconRecords(value: unknown): readonly RecentIconRecord[] {
  if (!Array.isArray(value)) return [];
  const records = value.flatMap((item) => {
    const reference = parseIconReference(item);
    if (!reference || !isRecord(item) || !isTimestamp(item.openedAt)) return [];
    return [{ ...reference, openedAt: item.openedAt }];
  });
  return dedupeByCanonicalPath(records).slice(0, RECENT_ICON_LIMIT);
}

function parseRecentSearches(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const query = item.trim();
    if (!query) continue;
    const key = normalizeRecentSearchKey(query);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(query);
    if (result.length >= RECENT_SEARCH_LIMIT) break;
  }
  return result;
}

function parseIconReference(value: unknown): PersistedIconReference | null {
  if (!isRecord(value)) return null;
  const { canonicalPath, originalFilename, displayName, categoryPath } = value;
  if (
    typeof canonicalPath !== "string" ||
    typeof originalFilename !== "string" ||
    typeof displayName !== "string" ||
    typeof categoryPath !== "string" ||
    !canonicalPath ||
    !originalFilename
  ) {
    return null;
  }
  if (
    canonicalPath !== canonicalPersistedIconPath(categoryPath, originalFilename)
  ) {
    return null;
  }
  return { canonicalPath, originalFilename, displayName, categoryPath };
}

function dedupeByCanonicalPath<TRecord extends PersistedIconReference>(
  records: readonly TRecord[],
): readonly TRecord[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    if (seen.has(record.canonicalPath)) return false;
    seen.add(record.canonicalPath);
    return true;
  });
}

function normalizeRecentSearchKey(query: string): string {
  return query.normalize("NFKC").toLocaleLowerCase("en-US");
}

function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function isViewPreference(value: unknown): value is ViewPreference {
  return value === "grid" || value === "compact";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
