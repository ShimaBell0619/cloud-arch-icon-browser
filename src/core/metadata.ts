import { buildCategories, findCommonRoot } from "./categories";
import { invalidPackage } from "./errors";
import { compareNames, parseDisplayName } from "./names";
import { normalizeZipPath } from "./paths";
import type { IconEntry, PackageEntryMetadata, PackageMetadata } from "./types";

export function parsePackageMetadata(
  entries: readonly PackageEntryMetadata[],
  archiveSize: number,
): PackageMetadata {
  const paths = new Map<string, PackageEntryMetadata>();
  const svgEntries: { entry: PackageEntryMetadata; path: string }[] = [];
  for (const entry of entries) {
    const path = normalizeZipPath(entry.filename, entry.directory);
    if (paths.has(path)) {
      throw invalidPackage(
        "DUPLICATE_PATH",
        "Two ZIP entries have the same normalized path.",
        entry.filename,
      );
    }
    paths.set(path, entry);
    if (entry.encrypted) {
      throw invalidPackage(
        "ENCRYPTED_ENTRY",
        "Encrypted ZIP entries are not supported.",
        entry.filename,
      );
    }
    if (
      !Number.isSafeInteger(entry.compressedSize) ||
      !Number.isSafeInteger(entry.uncompressedSize) ||
      entry.compressedSize < 0 ||
      entry.uncompressedSize < 0 ||
      entry.compressedSize > archiveSize
    ) {
      throw invalidPackage(
        "INVALID_METADATA",
        "A ZIP entry declares invalid file sizes.",
        entry.filename,
      );
    }
    if (entry.directory || !/\.svg$/iu.test(path)) continue;
    if (entry.compressionMethod !== 0 && entry.compressionMethod !== 8) {
      throw invalidPackage(
        "UNSUPPORTED_ENTRY",
        "An SVG uses an unsupported ZIP compression method.",
        entry.filename,
      );
    }
    if (entry.uncompressedSize === 0) {
      throw invalidPackage(
        "INVALID_METADATA",
        "The ZIP contains an empty SVG file.",
        entry.filename,
      );
    }
    svgEntries.push({ entry, path });
  }
  for (const path of paths.keys()) {
    let end = path.indexOf("/");
    while (end !== -1) {
      const ancestor = paths.get(path.slice(0, end));
      if (ancestor && !ancestor.directory) {
        throw invalidPackage(
          "PATH_CONFLICT",
          "A ZIP path is used as both a file and a folder.",
          path,
        );
      }
      end = path.indexOf("/", end + 1);
    }
  }
  if (svgEntries.length === 0) {
    throw invalidPackage(
      "NO_SVG_ENTRIES",
      "The ZIP does not contain any browsable SVG files.",
    );
  }
  const hiddenRoot = findCommonRoot(svgEntries.map(({ path }) => path));
  const icons: IconEntry[] = svgEntries.map(({ entry, path }) => {
    const filenameStart = path.lastIndexOf("/") + 1;
    const originalFilename = entry.filename.slice(filenameStart);
    const folder = path.slice(0, Math.max(0, filenameStart - 1));
    const categoryPath =
      hiddenRoot === null ? folder : folder.slice(hiddenRoot.length + 1);
    return Object.freeze({
      id: path,
      originalPath: entry.filename,
      originalFilename,
      ...parseDisplayName(originalFilename),
      categoryId: categoryPath ? folder : null,
      categoryPath,
      uncompressedSize: entry.uncompressedSize,
    });
  });
  icons.sort(
    (a, b) =>
      compareNames(a.displayName, b.displayName) || compareNames(a.id, b.id),
  );
  const { categories, categoryCount } = buildCategories(icons, hiddenRoot);
  return Object.freeze({
    icons: Object.freeze(icons),
    categories,
    summary: Object.freeze({
      entryCount: entries.length,
      iconCount: icons.length,
      categoryCount,
      namingConventionMatches: icons.filter(
        (icon) => icon.matchesNamingConvention,
      ).length,
      hiddenRoot,
    }),
  });
}
