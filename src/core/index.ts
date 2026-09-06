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
  IconUsageRecord,
  ImportedSavedSet,
  MatchedPersistedIcon,
  PersistedPreferences,
  PersistedState,
  PersistedStateV1,
  PersistedStateV2,
  RecentIconRecord,
  ReconciledPersistedState,
  ResolvedSavedSet,
  ResolvedSavedSetItem,
  SavedSetItem,
  SavedSetRecord,
  SavedSetSourceItem,
  StorageLike,
  ThemePreference,
  ViewPreference,
} from "./persistence";
export {
  addFavorite,
  createDefaultPersistedState,
  createSavedSet,
  deleteSavedSet,
  getFrequentlyUsedIcons,
  ICON_USAGE_LIMIT,
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
  recordRecentIcon,
  recordRecentSearch,
  removeFavorite,
  resolveSavedSet,
  savePersistedState,
  SAVED_SET_NAME_LIMIT,
  serializeSavedSet,
  setPersistedPreferences,
  updateSavedSet,
} from "./persistence";
export { assertSafeSvgPreview } from "./preview";
export type { IconSearchResult, SearchMatch } from "./search";
export { IconSearchIndex, normalizeSearch } from "./search";
export type { PackageCandidate } from "./session";
export { IconPackageSession } from "./session";
export type { ReconciledTray, TrayItem } from "./tray";
export {
  addIconsToTray,
  addIconToTray,
  moveTrayItem,
  reconcileTrayWithIcons,
  removeTrayItem,
  setTrayItemQuantity,
  trayTotalQuantity,
} from "./tray";
export type {
  IconCategory,
  IconEntry,
  PackageEntryMetadata,
  PackageMetadata,
  PackageSummary,
} from "./types";
