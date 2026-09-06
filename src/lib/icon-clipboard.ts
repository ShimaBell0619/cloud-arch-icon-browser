import type { IconEntry, IconPackageSession } from "@/core";

export const COPY_IMAGE_SIZE = 512;

export class ClipboardImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClipboardImageError";
  }
}

export interface FittedImageRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function fitImageIntoSquare(
  sourceWidth: number,
  sourceHeight: number,
  size = COPY_IMAGE_SIZE,
): FittedImageRect {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    !Number.isFinite(size) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    size <= 0
  ) {
    throw new ClipboardImageError("The SVG has invalid image dimensions.");
  }

  const scale = Math.min(size / sourceWidth, size / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (size - width) / 2,
    y: (size - height) / 2,
    width,
    height,
  };
}

export async function renderSvgBlobToPng(
  source: Blob,
  size = COPY_IMAGE_SIZE,
): Promise<Blob> {
  const url = URL.createObjectURL(source);
  try {
    const image = await loadImage(url);
    const rect = fitImageIntoSquare(
      image.naturalWidth,
      image.naturalHeight,
      size,
    );
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new ClipboardImageError(
        "This browser could not prepare the image for copying.",
      );
    }

    context.clearRect(0, 0, size, size);
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height);

    return await canvasToBlob(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function writePngToClipboard(
  png: Blob | Promise<Blob>,
): Promise<void> {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof navigator.clipboard.write !== "function" ||
    typeof ClipboardItem === "undefined"
  ) {
    throw new ClipboardImageError(
      "Image copy is not available in this browser. Use Download SVG instead.",
    );
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": png,
      }),
    ]);
  } catch (error) {
    if (error instanceof ClipboardImageError) throw error;
    if (isNotAllowedError(error)) {
      throw new ClipboardImageError(
        "Clipboard access was denied. Allow clipboard access and try again.",
      );
    }
    throw new ClipboardImageError(
      "The image could not be written to the clipboard. Try again or use Download SVG.",
    );
  }
}

export async function copyIconAsPng(
  session: IconPackageSession,
  icon: IconEntry,
): Promise<void> {
  // Start Clipboard.write synchronously from the click handler and supply a
  // Promise representation while the source is safely rendered. This retains
  // transient user activation on browsers that require it for clipboard writes.
  const png = (async () => {
    // getPreviewUrl performs the existing defense-in-depth SVG preview check.
    await session.getPreviewUrl(icon.id);
    const source = await session.getSvgBlob(icon.id);
    return renderSvgBlobToPng(source, COPY_IMAGE_SIZE);
  })();
  await writePngToClipboard(png);
}

export async function copySvgText(
  session: IconPackageSession,
  icon: IconEntry,
): Promise<void> {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof navigator.clipboard.writeText !== "function"
  ) {
    throw new ClipboardImageError(
      "SVG clipboard copy is not available in this browser.",
    );
  }

  try {
    const source = await session.getSvgBlob(icon.id);
    await navigator.clipboard.writeText(await source.text());
  } catch (error) {
    if (error instanceof ClipboardImageError) throw error;
    if (isNotAllowedError(error)) {
      throw new ClipboardImageError(
        "Clipboard access was denied. Allow clipboard access and try again.",
      );
    }
    throw new ClipboardImageError("The SVG could not be copied.");
  }
}

export function clipboardErrorMessage(error: unknown): string {
  return error instanceof ClipboardImageError
    ? error.message
    : "Copy failed. Try again or use Download SVG.";
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new ClipboardImageError(
          "The SVG could not be rendered for clipboard copy.",
        ),
      );
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else
        reject(
          new ClipboardImageError(
            "The browser could not encode the copied image as PNG.",
          ),
        );
    }, "image/png");
  });
}

function isNotAllowedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "NotAllowedError" || error.name === "SecurityError")
  );
}
