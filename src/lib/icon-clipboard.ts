import type { IconEntry, IconPackageSession } from "@/core";

export const COPY_IMAGE_SIZE = 512;
const NORMALIZATION_PROBE_SIZE = 1024;
const NORMALIZED_CONTENT_PADDING = 48;

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

export interface AlphaBounds {
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

export function findVisibleAlphaBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold = 8,
): AlphaBounds | null {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    data.length < width * height * 4
  ) {
    throw new ClipboardImageError("The rendered image has invalid pixel data.");
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3] ?? 0;
      if (alpha <= alphaThreshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export async function renderSvgBlobToPng(
  source: Blob,
  size = COPY_IMAGE_SIZE,
): Promise<Blob> {
  const url = URL.createObjectURL(source);
  try {
    const image = await loadImage(url);
    return await renderImageToPng(image, size);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function renderSvgBlobToNormalizedPng(
  source: Blob,
  size = COPY_IMAGE_SIZE,
): Promise<Blob> {
  const url = URL.createObjectURL(source);
  try {
    const image = await loadImage(url);
    const probe = document.createElement("canvas");
    probe.width = NORMALIZATION_PROBE_SIZE;
    probe.height = NORMALIZATION_PROBE_SIZE;
    const probeContext = probe.getContext("2d");
    if (!probeContext) {
      throw new ClipboardImageError(
        "This browser could not inspect the image for normalized copying.",
      );
    }

    const probeRect = fitImageIntoSquare(
      image.naturalWidth,
      image.naturalHeight,
      NORMALIZATION_PROBE_SIZE,
    );
    probeContext.clearRect(0, 0, probe.width, probe.height);
    probeContext.drawImage(
      image,
      probeRect.x,
      probeRect.y,
      probeRect.width,
      probeRect.height,
    );
    const pixels = probeContext.getImageData(0, 0, probe.width, probe.height);
    const bounds = findVisibleAlphaBounds(
      pixels.data,
      probe.width,
      probe.height,
    );
    if (!bounds) return await renderImageToPng(image, size);

    const probeScale = probeRect.width / image.naturalWidth;
    const visibleSourceX = (bounds.x - probeRect.x) / probeScale;
    const visibleSourceY = (bounds.y - probeRect.y) / probeScale;
    const visibleSourceWidth = bounds.width / probeScale;
    const visibleSourceHeight = bounds.height / probeScale;
    const contentSize = Math.max(1, size - NORMALIZED_CONTENT_PADDING * 2);
    const finalScale = Math.min(
      contentSize / visibleSourceWidth,
      contentSize / visibleSourceHeight,
    );
    const visibleWidth = visibleSourceWidth * finalScale;
    const visibleHeight = visibleSourceHeight * finalScale;
    const visibleLeft = (size - visibleWidth) / 2;
    const visibleTop = (size - visibleHeight) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new ClipboardImageError(
        "This browser could not prepare the normalized image for copying.",
      );
    }
    context.clearRect(0, 0, size, size);
    context.drawImage(
      image,
      visibleLeft - visibleSourceX * finalScale,
      visibleTop - visibleSourceY * finalScale,
      image.naturalWidth * finalScale,
      image.naturalHeight * finalScale,
    );
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
  const png = (async () => {
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

async function renderImageToPng(
  image: HTMLImageElement,
  size: number,
): Promise<Blob> {
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
