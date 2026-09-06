const DATABASE_NAME = "cloud-arch-icon-browser";
const DATABASE_VERSION = 1;
const STORE_NAME = "package-handles";
const PREVIOUS_PACKAGE_KEY = "previous-package";

export interface PersistableFileHandle {
  readonly name: string;
  getFile(): Promise<File>;
  queryPermission(options?: { mode?: "read" }): Promise<PermissionState>;
  requestPermission(options?: { mode?: "read" }): Promise<PermissionState>;
}

export interface PackageHandleStorage {
  get(): Promise<PersistableFileHandle | null>;
  set(handle: PersistableFileHandle): Promise<void>;
  clear(): Promise<void>;
}

const pendingHandles = new WeakMap<File, PersistableFileHandle>();
let browserStorage: PackageHandleStorage | null | undefined;

export function associateSelectedPackageHandle(
  file: File,
  handle: PersistableFileHandle,
): void {
  pendingHandles.set(file, handle);
}

export async function commitSelectedPackageHandle(file: File): Promise<void> {
  const handle = pendingHandles.get(file);
  pendingHandles.delete(file);
  if (!handle) return;
  const storage = getBrowserStorage();
  if (!storage) return;
  try {
    await storage.set(handle);
  } catch {
    // Remembering the handle is an optional convenience and must not fail a load.
  }
}

export async function hasRememberedPackageHandle(): Promise<boolean> {
  const storage = getBrowserStorage();
  if (!storage) return false;
  try {
    return (await storage.get()) !== null;
  } catch {
    return false;
  }
}

export async function openRememberedPackageFile(options: {
  requestPermission: boolean;
}): Promise<File | null> {
  const storage = getBrowserStorage();
  if (!storage) return null;
  return resolveRememberedPackageFile(storage, options.requestPermission);
}

export async function forgetRememberedPackageHandle(): Promise<void> {
  const storage = getBrowserStorage();
  if (!storage) return;
  try {
    await storage.clear();
  } catch {
    // Forget is best-effort; storage failures must not block normal file picking.
  }
}

export async function resolveRememberedPackageFile(
  storage: PackageHandleStorage,
  requestPermission: boolean,
): Promise<File | null> {
  let handle: PersistableFileHandle | null;
  try {
    handle = await storage.get();
  } catch {
    return null;
  }
  if (!handle) return null;

  try {
    let permission = await handle.queryPermission({ mode: "read" });
    if (permission === "prompt" && requestPermission) {
      permission = await handle.requestPermission({ mode: "read" });
    }
    if (permission !== "granted") return null;
    return await handle.getFile();
  } catch {
    try {
      await storage.clear();
    } catch {
      // A stale handle is already unusable; failure to clear it is non-fatal.
    }
    return null;
  }
}

function getBrowserStorage(): PackageHandleStorage | null {
  if (browserStorage !== undefined) return browserStorage;
  if (typeof indexedDB === "undefined") {
    browserStorage = null;
    return browserStorage;
  }
  browserStorage = createIndexedDbStorage();
  return browserStorage;
}

function createIndexedDbStorage(): PackageHandleStorage {
  return {
    async get() {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(STORE_NAME, "readonly");
        const request = transaction.objectStore(STORE_NAME).get(PREVIOUS_PACKAGE_KEY);
        const value = await requestResult<unknown>(request);
        await transactionDone(transaction);
        return isPersistableFileHandle(value) ? value : null;
      } finally {
        database.close();
      }
    },
    async set(handle) {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).put(handle, PREVIOUS_PACKAGE_KEY);
        await transactionDone(transaction);
      } finally {
        database.close();
      }
    },
    async clear() {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).delete(PREVIOUS_PACKAGE_KEY);
        await transactionDone(transaction);
      } finally {
        database.close();
      }
    },
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed."));
    request.onblocked = () => reject(new Error("IndexedDB open was blocked."));
  });
}

function requestResult<T>(request: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

function isPersistableFileHandle(value: unknown): value is PersistableFileHandle {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "getFile" in value &&
    typeof value.getFile === "function" &&
    "queryPermission" in value &&
    typeof value.queryPermission === "function" &&
    "requestPermission" in value &&
    typeof value.requestPermission === "function"
  );
}
