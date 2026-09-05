import { describe, expect, it, vi } from "vitest";
import { choosePackageFile } from "./package-file-picker";

function browserWindow(
  overrides: Partial<{
    isSecureContext: boolean;
    showOpenFilePicker: (...args: unknown[]) => Promise<readonly unknown[]>;
  }> = {},
) {
  return {
    isSecureContext: true,
    ...overrides,
  };
}

describe("choosePackageFile", () => {
  it("returns the selected ZIP from File System Access API when supported", async () => {
    const file = new File(["zip"], "Azure_Public_Service_Icons_V24.zip", {
      type: "application/zip",
    });
    const getFile = vi.fn().mockResolvedValue(file);
    const showOpenFilePicker = vi.fn().mockResolvedValue([{ getFile }]);
    const fallbackClick = vi.fn();

    const result = await choosePackageFile({
      fallbackInput: { click: fallbackClick },
      browserWindow: browserWindow({ showOpenFilePicker }),
    });

    expect(result).toBe(file);
    expect(fallbackClick).not.toHaveBeenCalled();
    expect(getFile).toHaveBeenCalledOnce();
    expect(showOpenFilePicker).toHaveBeenCalledWith({
      multiple: false,
      excludeAcceptAllOption: true,
      types: [
        {
          description: "ZIP archive",
          accept: { "application/zip": [".zip"] },
        },
      ],
    });
  });

  it("silently ignores user cancellation without opening the fallback picker", async () => {
    const fallbackClick = vi.fn();
    const showOpenFilePicker = vi
      .fn()
      .mockRejectedValue(new DOMException("Cancelled", "AbortError"));

    await expect(
      choosePackageFile({
        fallbackInput: { click: fallbackClick },
        browserWindow: browserWindow({ showOpenFilePicker }),
      }),
    ).resolves.toBeNull();

    expect(fallbackClick).not.toHaveBeenCalled();
  });

  it.each([
    ["unsupported API", browserWindow()],
    ["insecure context", browserWindow({ isSecureContext: false })],
  ])("uses the input fallback for %s", async (_label, runtime) => {
    const fallbackClick = vi.fn();

    await expect(
      choosePackageFile({
        fallbackInput: { click: fallbackClick },
        browserWindow: runtime,
      }),
    ).resolves.toBeNull();

    expect(fallbackClick).toHaveBeenCalledOnce();
  });

  it("falls back when the native picker fails unexpectedly", async () => {
    const fallbackClick = vi.fn();
    const showOpenFilePicker = vi
      .fn()
      .mockRejectedValue(new Error("picker unavailable"));

    await expect(
      choosePackageFile({
        fallbackInput: { click: fallbackClick },
        browserWindow: browserWindow({ showOpenFilePicker }),
      }),
    ).resolves.toBeNull();

    expect(fallbackClick).toHaveBeenCalledOnce();
  });

  it("falls back when reading the selected file handle fails", async () => {
    const fallbackClick = vi.fn();
    const showOpenFilePicker = vi.fn().mockResolvedValue([
      {
        getFile: vi.fn().mockRejectedValue(new Error("provider failure")),
      },
    ]);

    await expect(
      choosePackageFile({
        fallbackInput: { click: fallbackClick },
        browserWindow: browserWindow({ showOpenFilePicker }),
      }),
    ).resolves.toBeNull();

    expect(fallbackClick).toHaveBeenCalledOnce();
  });
});
