export type { PackageErrorCode, PackageProblem } from "./errors";
export { PackageError } from "./errors";
export { parsePackageMetadata } from "./metadata";
export { parseDisplayName } from "./names";
export { isInCategory, normalizeZipPath } from "./paths";
export type {
  PersistedIconMatch,
  PersistedIconMatchKind,
  PersistedIconReference,
} from "./persisted-identity";
export {
  canonicalPersistedIconPath,
  createPersistedIconReference,
  matchPersistedIconReference,
  persistedReferencesEqual,
} from "./persisted-identity";
export type {
  FavoriteRecord,
  MatchedPersistedIcon,
  PersistedPreferences,
  PersistedState,
  PersistedStateV1,
  RecentIconRecord,
  ReconciledPersistedState,
  StorageLike,
  ThemePreference,
  ViewPreference,
} from "./persistence";
export {
  addFavorite,
  createDefaultPersistedState,
  loadPersistedState,
  PERSISTENCE_KEY,
  PERSISTENCE_SCHEMA_VERSION,
  parsePersistedState,
  RECENT_ICON_LIMIT,
  RECENT_SEARCH_LIMIT,
  reconcilePersistedStateWithIcons,
  recordRecentIcon,
  recordRecentSearch,
  removeFavorite,
  savePersistedState,
  setPersistedPreferences,
} from "./persistence";
export { assertSafeSvgPreview } from "./preview";
export type { IconSearchResult, SearchMatch } from "./search";
export { IconSearchIndex, normalizeSearch } from "./search";
export type { PackageCandidate } from "./session";
export { IconPackageSession } from "./session";
export type {
  IconCategory,
  IconEntry,
  PackageEntryMetadata,
  PackageMetadata,
  PackageSummary,
} from "./types";
