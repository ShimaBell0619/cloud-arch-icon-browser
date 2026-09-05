import {
  BlobReader,
  BlobWriter,
  ERR_AMBIGUOUS_ARCHIVE,
  ERR_ENCRYPTED_CENTRAL_DIRECTORY,
  ERR_UNSAFE_FILENAME,
  type FileEntry,
  WARNING_DUPLICATE_FILENAME,
  ZipReader,
} from "@zip.js/zip.js/lib/zip-core-native.js";
import { invalidPackage, PackageError, type PackageProblem } from "./errors";
import { parsePackageMetadata } from "./metadata";
import { normalizeZipPath } from "./paths";
import { assertSafeSvgPreview } from "./preview";
import { IconSearchIndex } from "./search";
import type { PackageMetadata } from "./types";

export type PackageCandidate =
  | { readonly ok: true; readonly session: IconPackageSession }
  | { readonly ok: false; readonly error: PackageProblem };

/** Owns one local ZIP. Callers validate a candidate before swapping their active session. */
export class IconPackageSession {
  #reader: ZipReader<Blob> | null;
  #metadata: PackageMetadata | null;
  #index: IconSearchIndex | null;
  readonly #entries: Map<string, FileEntry>;
  readonly #blobs = new Map<string, Promise<Blob>>();
  readonly #previews = new Map<string, Promise<string>>();
  readonly #urls = new Map<string, string>();
  readonly #abort = new AbortController();
  #disposal: Promise<void> | null = null;

  private constructor(
    reader: ZipReader<Blob>,
    metadata: PackageMetadata,
    entries: Map<string, FileEntry>,
  ) {
    this.#reader = reader;
    this.#metadata = metadata;
    this.#entries = entries;
    this.#index = new IconSearchIndex(metadata.icons);
  }

  static async open(blob: Blob): Promise<PackageCandidate> {
    // The native entry point bundles its JS fallback. Workers are disabled per
    // reader so no worker/WASM URL is fetched during package processing.
    const reader = new ZipReader(new BlobReader(blob), {
      strictness: "strict",
      useWebWorkers: false,
      checkCrc32: true,
      checkOverlappingEntry: true,
    });
    try {
      const entries = await reader.getEntries();
      if (entries.some((entry) => entry.symlink)) {
        throw invalidPackage(
          "UNSUPPORTED_ENTRY",
          "Symbolic links are not supported in an icon ZIP.",
        );
      }
      const metadata = parsePackageMetadata(entries, blob.size);
      const files = new Map<string, FileEntry>();
      const iconIds = new Set(metadata.icons.map((icon) => icon.id));
      for (const entry of entries) {
        if (!entry.directory) {
          const id = normalizeZipPath(entry.filename);
          if (iconIds.has(id)) files.set(id, entry);
        }
      }
      return {
        ok: true,
        session: new IconPackageSession(reader, metadata, files),
      };
    } catch (cause) {
      await reader.close();
      return {
        ok: false,
        error: validationProblem(cause),
      };
    }
  }

  get metadata(): PackageMetadata {
    this.#assertActive();
    if (!this.#metadata) throw this.#disposedError();
    return this.#metadata;
  }

  search(query: string, categoryId: string | null = null) {
    this.#assertActive();
    if (!this.#index) throw this.#disposedError();
    return this.#index.search(query, categoryId);
  }

  /** Returns immutable source bytes in a Blob, with no text round trip. */
  async getSvgBlob(id: string): Promise<Blob> {
    this.#assertActive();
    const entry = this.#entries.get(id);
    if (!entry) {
      throw new PackageError({
        code: "UNKNOWN_ICON",
        phase: "session",
        message: "This icon does not belong to the package.",
        action: "Select an icon from the current package.",
        path: id,
      });
    }
    let pending = this.#blobs.get(id);
    if (!pending) {
      pending = this.#extract(entry);
      this.#blobs.set(id, pending);
      // Failed reads can be retried; successful reads are shared by preview/download.
      void pending.catch(() => this.#blobs.delete(id));
    }
    const blob = await pending;
    this.#assertActive();
    return blob;
  }

  async #extract(entry: FileEntry): Promise<Blob> {
    try {
      // zip.js 2.11.1's CodecStream stops output above the declared size while
      // streaming; getData also checks final size and CRC before returning.
      return await entry.getData<Blob>(new BlobWriter("image/svg+xml"), {
        signal: this.#abort.signal,
      });
    } catch (cause) {
      this.#assertActive();
      throw new PackageError(
        {
          code: "EXTRACTION_FAILED",
          phase: "extraction",
          message:
            "The original SVG could not be extracted or failed ZIP integrity checks.",
          action: "Select a complete, unmodified icon ZIP and try again.",
          path: entry.filename,
        },
        { cause },
      );
    }
  }

  async getPreviewUrl(id: string): Promise<string> {
    this.#assertActive();
    let pending = this.#previews.get(id);
    if (!pending) {
      pending = (async () => {
        const blob = await this.getSvgBlob(id);
        assertSafeSvgPreview(await blob.text(), id);
        return this.#objectUrl(id, blob);
      })();
      this.#previews.set(id, pending);
      void pending.catch(() => this.#previews.delete(id));
    }
    const url = await pending;
    this.#assertActive();
    return url;
  }

  async getDownload(
    id: string,
  ): Promise<{ readonly filename: string; readonly url: string }> {
    const blob = await this.getSvgBlob(id);
    const icon = this.metadata.icons.find((icon) => icon.id === id);
    if (!icon) throw this.#disposedError();
    return { filename: icon.originalFilename, url: this.#objectUrl(id, blob) };
  }

  #objectUrl(id: string, blob: Blob): string {
    this.#assertActive();
    let url = this.#urls.get(id);
    if (!url) {
      url = URL.createObjectURL(blob);
      this.#urls.set(id, url);
    }
    return url;
  }

  /** Invalidates immediately; resolves after pending work settles and the reader closes. */
  dispose(): Promise<void> {
    if (this.#disposal) return this.#disposal;
    this.#abort.abort();
    for (const url of this.#urls.values()) URL.revokeObjectURL(url);
    this.#urls.clear();
    const pending = [...this.#blobs.values(), ...this.#previews.values()];
    const reader = this.#reader;
    this.#entries.clear();
    this.#blobs.clear();
    this.#previews.clear();
    this.#index = null;
    this.#metadata = null;
    this.#reader = null;
    this.#disposal = (async () => {
      await Promise.allSettled(pending);
      await reader?.close();
    })();
    return this.#disposal;
  }

  #assertActive(): void {
    if (this.#abort.signal.aborted) throw this.#disposedError();
  }

  #disposedError(): PackageError {
    return new PackageError({
      code: "SESSION_DISPOSED",
      phase: "session",
      message: "This package session has been disposed.",
      action: "Select an icon from the current package or load a new package.",
    });
  }
}

function validationProblem(cause: unknown): PackageProblem {
  if (cause instanceof PackageError) return cause.problem;
  if (cause instanceof Error) {
    const path =
      "filename" in cause && typeof cause.filename === "string"
        ? cause.filename
        : undefined;
    if (cause.message === ERR_UNSAFE_FILENAME) {
      return invalidPackage(
        "UNSAFE_PATH",
        "The ZIP contains an unsafe or ambiguous entry path.",
        path,
      ).problem;
    }
    if (cause.message === ERR_ENCRYPTED_CENTRAL_DIRECTORY) {
      return invalidPackage(
        "ENCRYPTED_ENTRY",
        "Encrypted ZIP directories are not supported.",
      ).problem;
    }
    if (
      cause.message === ERR_AMBIGUOUS_ARCHIVE &&
      "reason" in cause &&
      cause.reason === WARNING_DUPLICATE_FILENAME
    ) {
      return invalidPackage(
        "DUPLICATE_PATH",
        "Two ZIP entries have the same path.",
        path,
      ).problem;
    }
  }
  return invalidPackage(
    "INVALID_ZIP",
    "The ZIP is corrupt or has an ambiguous archive structure.",
  ).problem;
}
