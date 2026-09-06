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
export const PERSISTENCE_SCHEMA_VERSION = 2 as const;
export const RECENT_ICON_LIMIT = 50;
export const RECENT_SEARCH_LIMIT = 10;
export const ICON_USAGE_LIMIT = 200;
export const SAVED_SET_NAME_LIMIT = 80;

const SAVED_SET_SHARE_KIND = "cloud-arch-icon-browser/saved-set";
const SAVED_SET_SHARE_VERSION = 1 as const;

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
  readonly usedAt: number;
}

export interface IconUsageRecord extends PersistedIconReference {
  readonly count: number;
  readonly lastUsedAt: number;
}

export interface SavedSetItem extends PersistedIconReference {
  readonly quantity: number;
}

export interface SavedSetRecord {
  readonly id: string;
  readonly name: string;
  readonly items: readonly SavedSetItem[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface PersistedStateV1 {
  readonly schemaVersion: 1;
  readonly preferences: PersistedPreferences;
  readonly favorites: readonly FavoriteRecord[];
  readonly recentIcons: readonly (PersistedIconReference & {
    readonly openedAt: number;
  })[];
  readonly recentSearches: readonly string[];
}

export interface PersistedStateV2 {
  readonly schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION;
  readonly preferences: PersistedPreferences;
  readonly favorites: readonly FavoriteRecord[];
  readonly recentIcons: readonly RecentIconRecord[];
  readonly recentSearches: readonly string[];
  readonly savedSets: readonly SavedSetRecord[];
  readonly iconUsage: readonly IconUsageRecord[];
}

export type PersistedState = PersistedStateV2;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface MatchedPersistedIcon<TRecord extends PersistedIconReference> {
  readonly record: TRecord;
  readonly icon: IconEntry;
  readonly matchedBy: PersistedIconMatchKind;
}

export interface ResolvedSavedSetItem {
  readonly item: SavedSetItem;
  readonly icon: IconEntry;
  readonly matchedBy: PersistedIconMatchKind;
}

export interface ResolvedSavedSet {
  readonly set: SavedSetRecord;
  readonly matchedItems: readonly ResolvedSavedSetItem[];
  readonly unresolvedItems: readonly SavedSetItem[];
}

export interface ReconciledPersistedState {
  readonly state: PersistedState;
  readonly matchedFavorites: readonly MatchedPersistedIcon<FavoriteRecord>[];
  readonly matchedRecentIcons: readonly MatchedPersistedIcon<RecentIconRecord>[];
  readonly matchedUsageIcons: readonly MatchedPersistedIcon<IconUsageRecord>[];
  readonly changed: boolean;
}

export interface SavedSetSourceItem {
  readonly icon: IconEntry;
  readonly quantity: number;
}

export interface ImportedSavedSet {
  readonly name: string;
  readonly items: readonly SavedSetItem[];
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
    savedSets: [],
    iconUsage: [],
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

  if (!isRecord(value)) return createDefaultPersistedState();
  if (value.schemaVersion === 1) return migrateV1(value);
  if (value.schemaVersion !== PERSISTENCE_SCHEMA_VERSION) {
    return createDefaultPersistedState();
  }

  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    preferences: parsePreferences(value.preferences),
    favorites: parseFavoriteRecords(value.favorites),
    recentIcons: parseRecentIconRecords(value.recentIcons),
    recentSearches: parseRecentSearches(value.recentSearches),
    savedSets: parseSavedSetRecords(value.savedSets),
    iconUsage: parseIconUsageRecords(value.iconUsage),
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

export function recordIconUsage(
  state: PersistedState,
  icon: IconEntry,
  usedAt = Date.now(),
): PersistedState {
  const reference = createPersistedIconReference(icon);
  const recentRecord: RecentIconRecord = { ...reference, usedAt };
  const existingUsage = state.iconUsage.find(
    (usage) => usage.canonicalPath === reference.canonicalPath,
  );
  const usageRecord: IconUsageRecord = {
    ...reference,
    count: (existingUsage?.count ?? 0) + 1,
    lastUsedAt: usedAt,
  };

  const recentIcons = [
    recentRecord,
    ...state.recentIcons.filter(
      (recent) => recent.canonicalPath !== reference.canonicalPath,
    ),
  ].slice(0, RECENT_ICON_LIMIT);
  const iconUsage = [
    usageRecord,
    ...state.iconUsage.filter(
      (usage) => usage.canonicalPath !== reference.canonicalPath,
    ),
  ]
    .sort(
      (left, right) =>
        right.lastUsedAt - left.lastUsedAt || right.count - left.count,
    )
    .slice(0, ICON_USAGE_LIMIT);

  return { ...state, recentIcons, iconUsage };
}

/** @deprecated Use recordIconUsage for meaningful use events. */
export function recordRecentIcon(
  state: PersistedState,
  icon: IconEntry,
  usedAt = Date.now(),
): PersistedState {
  return recordIconUsage(state, icon, usedAt);
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

export function createSavedSet(
  state: PersistedState,
  name: string,
  items: readonly SavedSetSourceItem[],
  options: { readonly id?: string; readonly now?: number } = {},
): PersistedState {
  const normalizedName = normalizeSavedSetName(name);
  if (!normalizedName) return state;
  const savedItems = normalizeSavedSetSourceItems(items);
  if (savedItems.length === 0) return state;

  const now = options.now ?? Date.now();
  const id = options.id ?? createSavedSetId(now);
  const record: SavedSetRecord = {
    id,
    name: normalizedName,
    items: savedItems,
    createdAt: now,
    updatedAt: now,
  };
  return { ...state, savedSets: [record, ...state.savedSets] };
}

export function updateSavedSet(
  state: PersistedState,
  id: string,
  name: string,
  items: readonly SavedSetSourceItem[],
  updatedAt = Date.now(),
): PersistedState {
  const normalizedName = normalizeSavedSetName(name);
  const savedItems = normalizeSavedSetSourceItems(items);
  if (!normalizedName || savedItems.length === 0) return state;

  let changed = false;
  const savedSets = state.savedSets.map((set) => {
    if (set.id !== id) return set;
    changed = true;
    return { ...set, name: normalizedName, items: savedItems, updatedAt };
  });
  return changed ? { ...state, savedSets } : state;
}

export function renameSavedSet(
  state: PersistedState,
  id: string,
  name: string,
  updatedAt = Date.now(),
): PersistedState {
  const normalizedName = normalizeSavedSetName(name);
  if (!normalizedName) return state;

  let changed = false;
  const savedSets = state.savedSets.map((set) => {
    if (set.id !== id) return set;
    changed = true;
    return { ...set, name: normalizedName, updatedAt };
  });
  return changed ? { ...state, savedSets } : state;
}

export function deleteSavedSet(
  state: PersistedState,
  id: string,
): PersistedState {
  const savedSets = state.savedSets.filter((set) => set.id !== id);
  return savedSets.length === state.savedSets.length
    ? state
    : { ...state, savedSets };
}

export function serializeSavedSet(set: SavedSetRecord): string {
  return JSON.stringify({
    kind: SAVED_SET_SHARE_KIND,
    schemaVersion: SAVED_SET_SHARE_VERSION,
    set: {
      name: set.name,
      items: set.items,
    },
  });
}

export function parseSavedSetShare(raw: string): ImportedSavedSet | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !isRecord(value) ||
    value.kind !== SAVED_SET_SHARE_KIND ||
    value.schemaVersion !== SAVED_SET_SHARE_VERSION ||
    !isRecord(value.set)
  ) {
    return null;
  }

  const name = normalizeSavedSetName(value.set.name);
  const items = parseSavedSetItems(value.set.items);
  if (!name || items.length === 0) return null;
  return { name, items };
}

export function importSavedSet(
  state: PersistedState,
  raw: string,
  options: { readonly id?: string; readonly now?: number } = {},
): PersistedState | null {
  const imported = parseSavedSetShare(raw);
  if (!imported) return null;
  const now = options.now ?? Date.now();
  const id = options.id ?? createSavedSetId(now);
  const set: SavedSetRecord = {
    id,
    name: imported.name,
    items: imported.items,
    createdAt: now,
    updatedAt: now,
  };
  return { ...state, savedSets: [set, ...state.savedSets] };
}

export function resolveSavedSet(
  set: SavedSetRecord,
  icons: readonly IconEntry[],
): ResolvedSavedSet {
  const matchedItems: ResolvedSavedSetItem[] = [];
  const unresolvedItems: SavedSetItem[] = [];

  for (const item of set.items) {
    const match = matchPersistedIconReference(item, icons);
    if (!match) {
      unresolvedItems.push(item);
      continue;
    }
    matchedItems.push({
      item: { ...match.healedReference, quantity: item.quantity },
      icon: match.icon,
      matchedBy: match.matchedBy,
    });
  }

  return { set, matchedItems, unresolvedItems };
}

export function getFrequentlyUsedIcons(
  state: PersistedState,
  icons: readonly IconEntry[],
  limit = 6,
): readonly IconEntry[] {
  if (!Number.isSafeInteger(limit) || limit <= 0) return [];
  const sorted = [...state.iconUsage].sort(
    (left, right) =>
      right.count - left.count || right.lastUsedAt - left.lastUsedAt,
  );
  const result: IconEntry[] = [];
  const seen = new Set<string>();
  for (const usage of sorted) {
    const match = matchPersistedIconReference(usage, icons);
    if (!match || seen.has(match.icon.id)) continue;
    seen.add(match.icon.id);
    result.push(match.icon);
    if (result.length >= limit) break;
  }
  return result;
}

export function reconcilePersistedStateWithIcons(
  state: PersistedState,
  icons: readonly IconEntry[],
): ReconciledPersistedState {
  const favorites = reconcileRecords(state.favorites, icons);
  const recentIcons = reconcileRecords(state.recentIcons, icons);
  const usage = reconcileRecords(state.iconUsage, icons);
  const savedSets = reconcileSavedSets(state.savedSets, icons);
  const changed =
    favorites.changed ||
    recentIcons.changed ||
    usage.changed ||
    savedSets.changed;

  return {
    state: changed
      ? {
          ...state,
          favorites: favorites.records,
          recentIcons: recentIcons.records,
          iconUsage: usage.records,
          savedSets: savedSets.records,
        }
      : state,
    matchedFavorites: favorites.matches,
    matchedRecentIcons: recentIcons.matches,
    matchedUsageIcons: usage.matches,
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

function reconcileSavedSets(
  sets: readonly SavedSetRecord[],
  icons: readonly IconEntry[],
): { readonly records: readonly SavedSetRecord[]; readonly changed: boolean } {
  let changed = false;
  const records = sets.map((set) => {
    let setChanged = false;
    const items = set.items.map((item) => {
      const match = matchPersistedIconReference(item, icons);
      if (!match || persistedReferencesEqual(item, match.healedReference)) {
        return item;
      }
      setChanged = true;
      return { ...item, ...match.healedReference };
    });
    if (!setChanged) return set;
    changed = true;
    return { ...set, items };
  });
  return { records, changed };
}

function migrateV1(value: Record<string, unknown>): PersistedState {
  // V1 Recent represented details-open history. Do not relabel those records as
  // "used" during migration; start the new usage history cleanly instead.
  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    preferences: parsePreferences(value.preferences),
    favorites: parseFavoriteRecords(value.favorites),
    recentIcons: [],
    recentSearches: parseRecentSearches(value.recentSearches),
    savedSets: [],
    iconUsage: [],
  };
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
    if (!reference || !isRecord(item) || !isTimestamp(item.usedAt)) return [];
    return [{ ...reference, usedAt: item.usedAt }];
  });
  records.sort((left, right) => right.usedAt - left.usedAt);
  return dedupeByCanonicalPath(records).slice(0, RECENT_ICON_LIMIT);
}

function parseIconUsageRecords(value: unknown): readonly IconUsageRecord[] {
  if (!Array.isArray(value)) return [];
  const records = value.flatMap((item) => {
    const reference = parseIconReference(item);
    if (
      !reference ||
      !isRecord(item) ||
      !Number.isSafeInteger(item.count) ||
      typeof item.count !== "number" ||
      item.count <= 0 ||
      !isTimestamp(item.lastUsedAt)
    ) {
      return [];
    }
    return [{ ...reference, count: item.count, lastUsedAt: item.lastUsedAt }];
  });
  records.sort(
    (left, right) =>
      right.lastUsedAt - left.lastUsedAt || right.count - left.count,
  );
  return dedupeByCanonicalPath(records).slice(0, ICON_USAGE_LIMIT);
}

function parseSavedSetRecords(value: unknown): readonly SavedSetRecord[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  const result: SavedSetRecord[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !item.id ||
      ids.has(item.id) ||
      !isTimestamp(item.createdAt) ||
      !isTimestamp(item.updatedAt)
    ) {
      continue;
    }
    const name = normalizeSavedSetName(item.name);
    const items = parseSavedSetItems(item.items);
    if (!name || items.length === 0) continue;
    ids.add(item.id);
    result.push({
      id: item.id,
      name,
      items,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }
  result.sort((left, right) => right.updatedAt - left.updatedAt);
  return result;
}

function parseSavedSetItems(value: unknown): readonly SavedSetItem[] {
  if (!Array.isArray(value)) return [];
  const result: SavedSetItem[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const reference = parseIconReference(item);
    if (
      !reference ||
      !isRecord(item) ||
      !Number.isSafeInteger(item.quantity) ||
      typeof item.quantity !== "number" ||
      item.quantity <= 0 ||
      seen.has(reference.canonicalPath)
    ) {
      continue;
    }
    seen.add(reference.canonicalPath);
    result.push({ ...reference, quantity: item.quantity });
  }
  return result;
}

function normalizeSavedSetSourceItems(
  items: readonly SavedSetSourceItem[],
): readonly SavedSetItem[] {
  const result: SavedSetItem[] = [];
  const indexes = new Map<string, number>();
  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) continue;
    const reference = createPersistedIconReference(item.icon);
    const index = indexes.get(reference.canonicalPath);
    if (index === undefined) {
      indexes.set(reference.canonicalPath, result.length);
      result.push({ ...reference, quantity: item.quantity });
      continue;
    }
    const existing = result[index];
    if (existing) {
      result[index] = {
        ...existing,
        quantity: existing.quantity + item.quantity,
      };
    }
  }
  return result;
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

function normalizeSavedSetName(value: unknown): string {
  return typeof value === "string"
    ? value.trim().slice(0, SAVED_SET_NAME_LIMIT)
    : "";
}

function createSavedSetId(now: number): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `set-${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
