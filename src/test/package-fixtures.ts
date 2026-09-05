import {
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipWriter,
  type ZipWriterAddDataOptions,
} from "@zip.js/zip.js/lib/zip-core-native.js";
import type { PackageEntryMetadata } from "../core/types";

// Entirely project-owned artwork and package names, generated in memory.
export const DUMMY_SVG =
  '<?xml version="1.0" encoding="UTF-8"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><title>Test – 図</title><rect width="8" height="8" fill="#246"/></svg>\r\n';
export const DUMMY_BYTES = new Uint8Array(new TextEncoder().encode(DUMMY_SVG));

export function entryMetadata(
  filename: string,
  overrides: Partial<PackageEntryMetadata> = {},
): PackageEntryMetadata {
  return {
    filename,
    directory: false,
    encrypted: false,
    compressedSize: DUMMY_BYTES.length,
    uncompressedSize: DUMMY_BYTES.length,
    compressionMethod: 0,
    ...overrides,
  };
}

export interface FixtureEntry {
  path: string;
  bytes?: Uint8Array;
  options?: ZipWriterAddDataOptions;
}

export async function createZip(
  entries: readonly FixtureEntry[],
): Promise<Uint8Array<ArrayBuffer>> {
  const writer = new ZipWriter(new Uint8ArrayWriter(), {
    useWebWorkers: false,
    level: 0,
    dataDescriptor: false,
    extendedTimestamp: false,
    lastModDate: new Date(2026, 0, 1),
  });
  for (const entry of entries) {
    await writer.add(
      entry.path,
      new Uint8ArrayReader(entry.bytes ?? DUMMY_BYTES),
      entry.options,
    );
  }
  return new Uint8Array(await writer.close());
}

/** Locate format headers only in our generated fixtures, never in production code. */
export function headerOffsets(bytes: Uint8Array, signature: number): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const offsets: number[] = [];
  for (let offset = 0; offset <= bytes.byteLength - 4; offset++) {
    if (view.getUint32(offset, true) === signature) offsets.push(offset);
  }
  return offsets;
}
