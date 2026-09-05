export type PackageErrorCode =
  | "INVALID_ZIP"
  | "UNSAFE_PATH"
  | "DUPLICATE_PATH"
  | "PATH_CONFLICT"
  | "ENCRYPTED_ENTRY"
  | "INVALID_METADATA"
  | "UNSUPPORTED_ENTRY"
  | "NO_SVG_ENTRIES"
  | "EXTRACTION_FAILED"
  | "UNSAFE_PREVIEW"
  | "UNKNOWN_ICON"
  | "SESSION_DISPOSED";

export interface PackageProblem {
  readonly code: PackageErrorCode;
  readonly phase: "validation" | "extraction" | "preview" | "session";
  readonly message: string;
  readonly action: string;
  readonly path?: string;
}

export class PackageError extends Error {
  constructor(
    readonly problem: PackageProblem,
    options?: ErrorOptions,
  ) {
    super(problem.message, options);
    this.name = "PackageError";
  }
}

export function invalidPackage(
  code: PackageErrorCode,
  message: string,
  path?: string,
): PackageError {
  return new PackageError({
    code,
    phase: "validation",
    message,
    action:
      "Select an unmodified, unencrypted icon ZIP with safe, unique paths.",
    ...(path === undefined ? {} : { path }),
  });
}
