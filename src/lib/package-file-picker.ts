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
    return await handle.getFile();
  } catch (error) {
    if (isAbortError(error)) return null;
    fallbackInput?.click();
    return null;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}
