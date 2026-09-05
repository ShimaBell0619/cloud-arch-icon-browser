import { invalidPackage } from "./errors";

/** Normalize separators only; never repair traversal or ambiguous components. */
export function normalizeZipPath(
  originalPath: string,
  directory = false,
): string {
  const separated = originalPath.replaceAll("\\", "/");
  const path =
    directory && separated.endsWith("/") ? separated.slice(0, -1) : separated;
  const segments = path.split("/");
  if (
    // Control characters, bidi overrides, and decoding replacement characters
    // can hide the identity of a path from the user.
    /[\p{Cc}\u202a-\u202e\u2066-\u2069\ufffd]/u.test(path) ||
    /[:]/u.test(path) ||
    /%(?:2e|2f|5c|00)/iu.test(path) ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment !== segment.trim() ||
        segment.endsWith("."),
    )
  ) {
    throw invalidPackage(
      "UNSAFE_PATH",
      "The ZIP contains an unsafe or ambiguous entry path.",
      originalPath,
    );
  }
  return path;
}

export function isInCategory(
  icon: { readonly categoryId: string | null },
  categoryId: string | null,
): boolean {
  return (
    categoryId === null ||
    icon.categoryId === categoryId ||
    (icon.categoryId?.startsWith(`${categoryId}/`) ?? false)
  );
}
