import { describe, expect, it } from "vitest";
import {
  ClipboardImageError,
  COPY_IMAGE_SIZE,
  findVisibleAlphaBounds,
  fitImageIntoSquare,
} from "./icon-clipboard";

describe("clipboard PNG geometry", () => {
  it("fits landscape SVG content into a centered 512 square without stretching", () => {
    expect(fitImageIntoSquare(400, 200)).toEqual({
      x: 0,
      y: 128,
      width: COPY_IMAGE_SIZE,
      height: 256,
    });
  });

  it("fits portrait SVG content into a centered 512 square without cropping", () => {
    const rect = fitImageIntoSquare(120, 360);
    expect(rect.x).toBeCloseTo(170.6667, 3);
    expect(rect.y).toBe(0);
    expect(rect.width).toBeCloseTo(170.6667, 3);
    expect(rect.height).toBe(COPY_IMAGE_SIZE);
  });

  it("keeps square SVG content square", () => {
    expect(fitImageIntoSquare(64, 64)).toEqual({
      x: 0,
      y: 0,
      width: COPY_IMAGE_SIZE,
      height: COPY_IMAGE_SIZE,
    });
  });

  it("finds visible alpha bounds while ignoring near-transparent pixels", () => {
    const data = new Uint8ClampedArray(4 * 3 * 4);
    data[(0 * 4 + 0) * 4 + 3] = 8;
    data[(0 * 4 + 1) * 4 + 3] = 255;
    data[(2 * 4 + 3) * 4 + 3] = 128;

    expect(findVisibleAlphaBounds(data, 4, 3)).toEqual({
      x: 1,
      y: 0,
      width: 3,
      height: 3,
    });
  });

  it("returns null when rendered pixels are fully transparent", () => {
    expect(findVisibleAlphaBounds(new Uint8ClampedArray(2 * 2 * 4), 2, 2)).toBe(
      null,
    );
  });

  it("rejects invalid source dimensions and pixel buffers", () => {
    expect(() => fitImageIntoSquare(0, 64)).toThrow(ClipboardImageError);
    expect(() => fitImageIntoSquare(64, Number.NaN)).toThrow(
      ClipboardImageError,
    );
    expect(() =>
      findVisibleAlphaBounds(new Uint8ClampedArray(3), 2, 2),
    ).toThrow(ClipboardImageError);
  });
});
