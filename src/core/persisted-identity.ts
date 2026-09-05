import type { IconEntry } from "./types";

export interface PersistedIconReference {
  readonly canonicalPath: string;
  readonly originalFilename: string;
  readonly displayName: string;
  readonly categoryPath: string;
}

export type PersistedIconMatchKind = "exact-path" | "canonical-name";

export interface PersistedIconMatch {
  readonly icon: IconEntry;
  readonly matchedBy: PersistedIconMatchKind;
  readonly healedReference: PersistedIconReference;
}

export function canonicalPersistedIconPath(
  categoryPath: string,
  originalFilename: string,
): string {
  const visiblePath = categoryPath
    ? `${categoryPath}/${originalFilename}`
    : originalFilename;
  return visiblePath.normalize("NFKC");
}

export function createPersistedIconReference(
  icon: IconEntry,
): PersistedIconReference {
  return Object.freeze({
    canonicalPath: canonicalPersistedIconPath(
      icon.categoryPath,
      icon.originalFilename,
    ),
    originalFilename: icon.originalFilename,
    displayName: icon.displayName,
    categoryPath: icon.categoryPath,
  });
}

export function matchPersistedIconReference(
  reference: PersistedIconReference,
  icons: readonly IconEntry[],
): PersistedIconMatch | null {
  const exactMatches = icons.filter(
    (icon) =>
      canonicalPersistedIconPath(icon.categoryPath, icon.originalFilename) ===
      reference.canonicalPath,
  );

  if (exactMatches.length === 1) {
    const icon = exactMatches[0];
    if (!icon) return null;
    return Object.freeze({
      icon,
      matchedBy: "exact-path" as const,
      healedReference: createPersistedIconReference(icon),
    });
  }

  if (exactMatches.length > 1) return null;

  const canonicalName = canonicalServiceName(reference.originalFilename);
  const fallbackMatches = icons.filter(
    (icon) => canonicalServiceName(icon.originalFilename) === canonicalName,
  );

  if (fallbackMatches.length !== 1) return null;
  const icon = fallbackMatches[0];
  if (!icon) return null;

  return Object.freeze({
    icon,
    matchedBy: "canonical-name" as const,
    healedReference: createPersistedIconReference(icon),
  });
}

export function persistedReferencesEqual(
  left: PersistedIconReference,
  right: PersistedIconReference,
): boolean {
  return (
    left.canonicalPath === right.canonicalPath &&
    left.originalFilename === right.originalFilename &&
    left.displayName === right.displayName &&
    left.categoryPath === right.categoryPath
  );
}

function canonicalServiceName(originalFilename: string): string {
  const match = /^\d+-icon-service-(.+)\.svg$/iu.exec(originalFilename);
  const source = match?.[1] ?? originalFilename.replace(/\.svg$/iu, "");
  return source.normalize("NFKC").toLocaleLowerCase("en-US");
}
