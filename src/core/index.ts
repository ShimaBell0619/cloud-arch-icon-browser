export type { PackageErrorCode, PackageProblem } from "./errors";
export { PackageError } from "./errors";
export { parsePackageMetadata } from "./metadata";
export { parseDisplayName } from "./names";
export { isInCategory, normalizeZipPath } from "./paths";
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
