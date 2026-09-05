/** Only central-directory metadata is needed to validate a candidate. */
export interface PackageEntryMetadata {
  readonly filename: string;
  readonly directory: boolean;
  readonly encrypted: boolean;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly compressionMethod: number;
}

export interface IconEntry {
  /** Full normalized ZIP path, including the hidden packaging root. */
  readonly id: string;
  readonly originalPath: string;
  readonly originalFilename: string;
  readonly displayName: string;
  readonly matchesNamingConvention: boolean;
  readonly categoryId: string | null;
  /** Visible folder path, excluding the single hidden packaging root. */
  readonly categoryPath: string;
  readonly uncompressedSize: number;
}

export interface IconCategory {
  /** Full normalized folder path, without a trailing slash. */
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly children: readonly IconCategory[];
  readonly iconCount: number;
}

export interface PackageSummary {
  readonly entryCount: number;
  readonly iconCount: number;
  readonly categoryCount: number;
  readonly namingConventionMatches: number;
  readonly hiddenRoot: string | null;
}

export interface PackageMetadata {
  readonly icons: readonly IconEntry[];
  readonly categories: readonly IconCategory[];
  readonly summary: PackageSummary;
}
