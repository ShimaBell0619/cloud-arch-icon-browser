import {
  associateSelectedPackageHandle,
  type PersistableFileHandle,
} from "./package-handle-store";

interface FileHandleLike {
  getFile(): Promise<File>;
}

interface OpenFilePickerOptionsLike {
  multiple: boolean;
  excludeAcceptAllOption: boolean;
  types: readonly {
    description: string;
    accept: Readonly<Record<string, readonly string[]>>;
  }[];
}

interface PackagePickerWindow {
  readonly isSecureContext: boolean;
  showOpenFilePicker?: (
    options: OpenFilePickerOptionsLike,
  ) => Promise<readonly FileHandleLike[]>;
}

interface ChoosePackageFileOptions {
  fallbackInput: Pick<HTMLInputElement, "click"> | null;
  browserWindow?: PackagePickerWindow;
}

const ZIP_PICKER_OPTIONS: OpenFilePickerOptionsLike = {
  multiple: false,
  excludeAcceptAllOption: true,
  types: [
    {
      description: "ZIP archive",
      accept: {
        "application/zip": [".zip"],
      },
    },
  ],
};

export async function choosePackageFile({
  fallbackInput,
  browserWindow = window as unknown as PackagePickerWindow,
}: ChoosePackageFileOptions): Promise<File | null> {
  const openFilePicker = browserWindow.showOpenFilePicker;

  if (!browserWindow.isSecureContext || typeof openFilePicker !== "function") {
    fallbackInput?.click();
    return null;
  }

  try {
    const handles = await openFilePicker.call(
      browserWindow,
      ZIP_PICKER_OPTIONS,
    );
    const handle = handles[0];
    if (!handle) return null;
    const file = await handle.getFile();
    if (isPersistableFileHandle(handle)) {
      // Keep the handle only in memory until App confirms the ZIP candidate.
      // A failed replacement therefore cannot overwrite the last good handle.
      associateSelectedPackageHandle(file, handle);
    }
    return file;
  } catch (error) {
    if (isAbortError(error)) return null;
    fallbackInput?.click();
    return null;
  }
}

function isPersistableFileHandle(
  handle: FileHandleLike,
): handle is FileHandleLike & PersistableFileHandle {
  return (
    "name" in handle &&
    typeof handle.name === "string" &&
    "queryPermission" in handle &&
    typeof handle.queryPermission === "function" &&
    "requestPermission" in handle &&
    typeof handle.requestPermission === "function"
  );
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}
