/// <reference types="node" />
import { Blob as NodeBlob } from "node:buffer";
import {
  ERR_INVALID_UNCOMPRESSED_SIZE,
  type FileEntry,
  ZipReader,
} from "@zip.js/zip.js/lib/zip-core-native.js";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import {
  createZip,
  DUMMY_BYTES,
  DUMMY_SVG,
  headerOffsets,
} from "../test/package-fixtures";
import { IconPackageSession, PackageError } from "./index";

const firstPath = "Dummy/Compute/1-icon-service-App-Service.svg";
const secondPath = "Dummy/Other/2-icon-service-SQL-IoT-AI.svg";
const sessions: IconPackageSession[] = [];
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}
let createUrl: Mock<(blob: Blob) => string>;
let revokeUrl: Mock<(url: string) => void>;

beforeEach(() => {
  // jsdom supplies XML DOM APIs; Node supplies standards-compatible Blob streams.
  vi.stubGlobal("Blob", NodeBlob);
  createUrl = vi
    .fn<(blob: Blob) => string>()
    .mockImplementation(() => `blob:dummy-${createUrl.mock.calls.length}`);
  revokeUrl = vi.fn();
  vi.stubGlobal(
    "URL",
    class extends URL {
      static override createObjectURL = createUrl;
      static override revokeObjectURL = revokeUrl;
    },
  );
});

afterEach(async () => {
  await Promise.all(sessions.splice(0).map((session) => session.dispose()));
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function open(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<IconPackageSession> {
  const candidate = await IconPackageSession.open(new Blob([bytes]));
  if (!candidate.ok) throw new Error(JSON.stringify(candidate.error));
  sessions.push(candidate.session);
  return candidate.session;
}

function observeEntries() {
  const original = ZipReader.prototype.getEntries;
  const reads = new Map<string, Mock<FileEntry["getData"]>>();
  vi.spyOn(ZipReader.prototype, "getEntries").mockImplementation(
    async function (this: ZipReader<Blob>, options) {
      const entries = await original.call(this, options);
      for (const entry of entries) {
        if (!entry.directory)
          reads.set(entry.filename, vi.spyOn(entry, "getData"));
      }
      return entries;
    },
  );
  return reads;
}

describe("IconPackageSession", () => {
  it("enumerates only metadata, lazily extracts one SVG, and shares concurrent reads/URLs", async () => {
    const reads = observeEntries();
    const bytes = await createZip([
      { path: "Dummy/", options: { directory: true } },
      { path: firstPath, options: { level: 6 } },
      { path: secondPath },
      {
        path: "readme.txt",
        bytes: new TextEncoder().encode("Project-owned fixture"),
      },
    ]);
    const session = await open(bytes);
    expect(session.metadata.summary.iconCount).toBe(2);
    expect(session.search("APP-SERVICE")[0]?.icon.id).toBe(firstPath);
    expect(session.search("", "Dummy/Compute")).toHaveLength(1);
    for (const read of reads.values()) expect(read).not.toHaveBeenCalled();
    expect(createUrl).not.toHaveBeenCalled();

    const [left, right, preview, download] = await Promise.all([
      session.getSvgBlob(firstPath),
      session.getSvgBlob(firstPath),
      session.getPreviewUrl(firstPath),
      session.getDownload(firstPath),
    ]);
    expect(left).toBe(right);
    expect(left.type).toBe("image/svg+xml");
    expect(new Uint8Array(await left.arrayBuffer())).toEqual(DUMMY_BYTES);
    expect(download).toEqual({
      filename: "1-icon-service-App-Service.svg",
      url: preview,
    });
    expect(await session.getPreviewUrl(firstPath)).toBe(preview);
    expect(reads.get(firstPath)).toHaveBeenCalledTimes(1);
    expect(reads.get(secondPath)).not.toHaveBeenCalled();
    expect(reads.get("readme.txt")).not.toHaveBeenCalled();
    expect(createUrl).toHaveBeenCalledTimes(1);
  });

  it("preserves original filename, CRLF, UTF-8 BOM and all bytes for download", async () => {
    const original = new Uint8Array([0xef, 0xbb, 0xbf, ...DUMMY_BYTES]);
    const path = "Dummy\\Data\\42-icon-service-SQL-IoT-AI.svg";
    const session = await open(await createZip([{ path, bytes: original }]));
    const icon = session.metadata.icons[0];
    expect(icon).toMatchObject({
      originalPath: path,
      originalFilename: "42-icon-service-SQL-IoT-AI.svg",
      displayName: "SQL IoT AI",
    });
    const id = path.replaceAll("\\", "/");
    const result = await session.getDownload(id);
    expect(result.filename).toBe("42-icon-service-SQL-IoT-AI.svg");
    expect(
      new Uint8Array(await (await session.getSvgBlob(id)).arrayBuffer()),
    ).toEqual(original);
    const downloadBlob = createUrl.mock.calls[0]?.[0];
    if (!downloadBlob) throw new Error("Expected a download Blob");
    expect(new Uint8Array(await downloadBlob.arrayBuffer())).toEqual(original);
  });

  it("refuses unsafe preview but keeps the untouched original available for explicit download", async () => {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    const bytes = new Uint8Array(new TextEncoder().encode(source));
    const session = await open(await createZip([{ path: firstPath, bytes }]));
    // A prior download URL must not bypass preview validation.
    const download = await session.getDownload(firstPath);
    await expect(session.getPreviewUrl(firstPath)).rejects.toMatchObject({
      problem: { code: "UNSAFE_PREVIEW" },
    });
    expect(await session.getDownload(firstPath)).toEqual(download);
    expect(
      new Uint8Array(await (await session.getSvgBlob(firstPath)).arrayBuffer()),
    ).toEqual(bytes);
    expect(createUrl).toHaveBeenCalledTimes(1);
  });

  it("revokes every URL, closes once, and invalidates all access immediately on disposal", async () => {
    const close = vi.spyOn(ZipReader.prototype, "close");
    const session = await open(
      await createZip([{ path: firstPath }, { path: secondPath }]),
    );
    const first = await session.getPreviewUrl(firstPath);
    const second = await session.getDownload(secondPath);
    const cached = session.getPreviewUrl(firstPath);
    const cachedFailure = expect(cached).rejects.toMatchObject({
      problem: { code: "SESSION_DISPOSED" },
    });
    const disposal = session.dispose();
    expect(session.dispose()).toBe(disposal);
    expect(revokeUrl.mock.calls).toEqual([[first], [second.url]]);
    expect(() => session.metadata).toThrowError(
      expect.objectContaining({
        problem: expect.objectContaining({ code: "SESSION_DISPOSED" }),
      }),
    );
    expect(() => session.search("")).toThrowError(
      expect.objectContaining({
        problem: expect.objectContaining({ code: "SESSION_DISPOSED" }),
      }),
    );
    await expect(session.getSvgBlob(firstPath)).rejects.toMatchObject({
      problem: { code: "SESSION_DISPOSED" },
    });
    await expect(session.getPreviewUrl(firstPath)).rejects.toMatchObject({
      problem: { code: "SESSION_DISPOSED" },
    });
    await expect(session.getDownload(firstPath)).rejects.toMatchObject({
      problem: { code: "SESSION_DISPOSED" },
    });
    await disposal;
    await cachedFailure;
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("does not create a late object URL when disposed during an extraction", async () => {
    const reads = observeEntries();
    const session = await open(
      await createZip([{ path: firstPath, options: { level: 6 } }]),
    );
    const preview = session.getPreviewUrl(firstPath);
    const failure = expect(preview).rejects.toMatchObject({
      problem: { code: "SESSION_DISPOSED" },
    });
    await session.dispose();
    await failure;
    expect(reads.get(firstPath)).toHaveBeenCalledTimes(1);
    expect(createUrl).not.toHaveBeenCalled();
    expect(revokeUrl).not.toHaveBeenCalled();
  });

  it("does not create a late URL when disposed during preview text decoding", async () => {
    const session = await open(await createZip([{ path: firstPath }]));
    const blob = await session.getSvgBlob(firstPath);
    const started = deferred<void>();
    const text = deferred<string>();
    vi.spyOn(blob, "text").mockImplementation(() => {
      started.resolve();
      return text.promise;
    });
    const preview = session.getPreviewUrl(firstPath);
    const failure = expect(preview).rejects.toMatchObject({
      problem: { code: "SESSION_DISPOSED" },
    });
    await started.promise;
    const disposal = session.dispose();
    text.resolve(DUMMY_SVG);
    await disposal;
    await failure;
    expect(createUrl).not.toHaveBeenCalled();
  });

  it("preserves the active session for an invalid candidate, then supports swap-before-dispose", async () => {
    const first = await open(await createZip([{ path: firstPath }]));
    let active = first;
    const firstUrl = await active.getPreviewUrl(firstPath);
    const bad = await IconPackageSession.open(
      new Blob([await createZip([{ path: "../bad.svg" }])]),
    );
    expect(bad.ok).toBe(false);
    expect(active).toBe(first);
    expect(await active.getPreviewUrl(firstPath)).toBe(firstUrl);
    expect(revokeUrl).not.toHaveBeenCalled();

    const next = await open(await createZip([{ path: secondPath }]));
    const previous = active;
    active = next;
    await previous.dispose();
    expect(active.search("")[0]?.icon.id).toBe(secondPath);
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith(firstUrl);
    expect(await active.getPreviewUrl(secondPath)).not.toBe(firstUrl);
  });

  it.each([
    "../escape.svg",
    "/absolute.svg",
    "C:\\drive.svg",
    "folder\\..\\escape.svg",
    "folder//ambiguous.svg",
  ])("rejects generated unsafe ZIP %j", async (path) => {
    const close = vi.spyOn(ZipReader.prototype, "close");
    const candidate = await IconPackageSession.open(
      new Blob([await createZip([{ path }])]),
    );
    expect(candidate).toMatchObject({
      ok: false,
      error: {
        code: "UNSAFE_PATH",
        phase: "validation",
        message: expect.any(String),
        action: expect.any(String),
        path,
      },
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("rejects duplicate normalized paths in a real generated archive", async () => {
    const candidate = await IconPackageSession.open(
      new Blob([await createZip([{ path: "a/b.svg" }, { path: "a\\b.svg" }])]),
    );
    expect(candidate).toMatchObject({
      ok: false,
      error: { code: "DUPLICATE_PATH" },
    });
  });

  it("maps duplicate central-directory names to an actionable duplicate error", async () => {
    const bytes = await createZip([{ path: "a.svg" }, { path: "b.svg" }]);
    const central = headerOffsets(bytes, 0x02014b50)[1];
    if (central === undefined) throw new Error("Missing fixture header");
    bytes[central + 46] = "a".charCodeAt(0);
    const candidate = await IconPackageSession.open(new Blob([bytes]));
    expect(candidate).toMatchObject({
      ok: false,
      error: { code: "DUPLICATE_PATH" },
    });
  });

  it("rejects appended data and a truncated central directory without SVG extraction", async () => {
    const bytes = await createZip([{ path: firstPath }]);
    for (const input of [
      new Uint8Array([...bytes, 1, 2, 3]),
      bytes.slice(0, -10),
    ]) {
      const candidate = await IconPackageSession.open(new Blob([input]));
      expect(candidate).toMatchObject({
        ok: false,
        error: { code: "INVALID_ZIP" },
      });
    }
    expect(createUrl).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "rejects encryption including non-SVG entries (ZipCrypto: %j)",
    async (zipCrypto) => {
      const candidate = await IconPackageSession.open(
        new Blob([
          await createZip([
            { path: firstPath },
            {
              path: "secret.txt",
              options: { password: "test-only", zipCrypto },
            },
          ]),
        ]),
      );
      expect(candidate).toMatchObject({
        ok: false,
        error: { code: "ENCRYPTED_ENTRY", path: "secret.txt" },
      });
    },
  );

  it("rejects a symbolic link rather than interpreting its target as SVG bytes", async () => {
    const candidate = await IconPackageSession.open(
      new Blob([
        await createZip([{ path: firstPath, options: { unixMode: 0o120777 } }]),
      ]),
    );
    expect(candidate).toMatchObject({
      ok: false,
      error: { code: "UNSUPPORTED_ENTRY" },
    });
  });

  it("reports corrupt/empty/non-SVG candidates and closes failed readers", async () => {
    const close = vi.spyOn(ZipReader.prototype, "close");
    for (const blob of [
      new Blob(),
      new Blob(["not a ZIP"]),
      new Blob([await createZip([])]),
      new Blob([await createZip([{ path: "readme.txt" }])]),
    ]) {
      const candidate = await IconPackageSession.open(blob);
      expect(candidate).toMatchObject({
        ok: false,
        error: {
          phase: "validation",
          code: expect.stringMatching(/INVALID_ZIP|NO_SVG_ENTRIES/u),
          action: expect.any(String),
        },
      });
    }
    expect(close).toHaveBeenCalledTimes(4);
  });

  it("detects CRC corruption on demand without eagerly extracting other SVGs", async () => {
    const bytes = await createZip([{ path: firstPath }, { path: secondPath }]);
    const view = new DataView(bytes.buffer);
    const dataOffset = 30 + view.getUint16(26, true) + view.getUint16(28, true);
    bytes[dataOffset] = 0x21;
    const session = await open(bytes);
    expect(session.metadata.icons).toHaveLength(2);
    await expect(session.getSvgBlob(firstPath)).rejects.toMatchObject({
      problem: { code: "EXTRACTION_FAILED" },
    });
    await expect(session.getPreviewUrl(firstPath)).rejects.toMatchObject({
      problem: { code: "EXTRACTION_FAILED" },
    });
    expect(
      new Uint8Array(
        await (await session.getSvgBlob(secondPath)).arrayBuffer(),
      ),
    ).toEqual(DUMMY_BYTES);
    expect(createUrl).not.toHaveBeenCalled();
  });

  it("checks local-header/central-directory consistency when extracting", async () => {
    const bytes = await createZip([{ path: "a.svg" }]);
    bytes[30] = "b".charCodeAt(0);
    const session = await open(bytes);
    await expect(session.getSvgBlob("a.svg")).rejects.toMatchObject({
      problem: { code: "EXTRACTION_FAILED" },
    });
  });

  it("stops a stream that expands beyond its declared uncompressed size", async () => {
    const bytes = await createZip([{ path: "a.svg", options: { level: 6 } }]);
    const view = new DataView(bytes.buffer);
    view.setUint32(22, 1, true);
    const central = headerOffsets(bytes, 0x02014b50)[0];
    if (central === undefined) throw new Error("Missing fixture header");
    view.setUint32(central + 24, 1, true);
    const session = await open(bytes);
    const failure: unknown = await session
      .getSvgBlob("a.svg")
      .catch((error: unknown) => error);
    if (!(failure instanceof PackageError))
      throw new Error("Expected extraction error");
    expect(failure.problem.code).toBe("EXTRACTION_FAILED");
    expect(failure.cause).toMatchObject({
      message: ERR_INVALID_UNCOMPRESSED_SIZE,
    });
    expect(createUrl).not.toHaveBeenCalled();
  });

  it("rejects unknown IDs without allocating a URL or extracting entries", async () => {
    const reads = observeEntries();
    const session = await open(await createZip([{ path: firstPath }]));
    await expect(session.getSvgBlob("missing.svg")).rejects.toMatchObject({
      problem: { code: "UNKNOWN_ICON" },
    });
    await expect(session.getPreviewUrl("missing.svg")).rejects.toMatchObject({
      problem: { code: "UNKNOWN_ICON" },
    });
    expect(reads.get(firstPath)).not.toHaveBeenCalled();
    expect(createUrl).not.toHaveBeenCalled();
  });

  it("uses bundled ZIP code without runtime fetches or workers", async () => {
    const fetch = vi.fn(() => {
      throw new Error("Unexpected network request");
    });
    const worker = vi.fn(() => {
      throw new Error("Unexpected worker");
    });
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("Worker", worker);
    const session = await open(
      await createZip([{ path: firstPath, options: { level: 6 } }]),
    );
    expect(await (await session.getSvgBlob(firstPath)).text()).toBe(DUMMY_SVG);
    await session.getPreviewUrl(firstPath);
    await session.dispose();
    expect(fetch).not.toHaveBeenCalled();
    expect(worker).not.toHaveBeenCalled();
  });
});
