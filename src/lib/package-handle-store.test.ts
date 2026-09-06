import { describe, expect, it, vi } from "vitest";
import {
  type PackageHandleStorage,
  type PersistableFileHandle,
  resolveRememberedPackageFile,
} from "./package-handle-store";

function storageFor(handle: PersistableFileHandle | null): PackageHandleStorage {
  return {
    get: vi.fn(async () => handle),
    set: vi.fn(async () => undefined),
    clear: vi.fn(async () => undefined),
  };
}

function handleWith(options: {
  permission: PermissionState;
  requestedPermission?: PermissionState;
  file?: File;
  getFileError?: Error;
}): PersistableFileHandle {
  return {
    name: options.file?.name ?? "icons.zip",
    queryPermission: vi.fn(async () => options.permission),
    requestPermission: vi.fn(
      async () => options.requestedPermission ?? options.permission,
    ),
    getFile: vi.fn(async () => {
      if (options.getFileError) throw options.getFileError;
      return options.file ?? new File(["zip"], "icons.zip");
    }),
  };
}

describe("resolveRememberedPackageFile", () => {
  it("opens a remembered file when read permission is already granted", async () => {
    const file = new File(["zip"], "icons.zip");
    const handle = handleWith({ permission: "granted", file });

    await expect(
      resolveRememberedPackageFile(storageFor(handle), false),
    ).resolves.toBe(file);
    expect(handle.requestPermission).not.toHaveBeenCalled();
  });

  it("does not request prompt permission without an explicit user gesture", async () => {
    const handle = handleWith({
      permission: "prompt",
      requestedPermission: "granted",
    });

    await expect(
      resolveRememberedPackageFile(storageFor(handle), false),
    ).resolves.toBeNull();
    expect(handle.requestPermission).not.toHaveBeenCalled();
    expect(handle.getFile).not.toHaveBeenCalled();
  });

  it("requests permission when explicitly allowed", async () => {
    const file = new File(["zip"], "icons.zip");
    const handle = handleWith({
      permission: "prompt",
      requestedPermission: "granted",
      file,
    });

    await expect(
      resolveRememberedPackageFile(storageFor(handle), true),
    ).resolves.toBe(file);
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: "read" });
  });

  it("clears a stale handle whose file can no longer be read", async () => {
    const handle = handleWith({
      permission: "granted",
      getFileError: new Error("missing"),
    });
    const storage = storageFor(handle);

    await expect(
      resolveRememberedPackageFile(storage, true),
    ).resolves.toBeNull();
    expect(storage.clear).toHaveBeenCalledTimes(1);
  });
});
