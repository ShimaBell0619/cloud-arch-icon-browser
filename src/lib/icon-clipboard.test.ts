import { describe, expect, it } from "vitest";
import {
  ClipboardImageError,
  COPY_IMAGE_SIZE,
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
    expect(fitImageIntoSquare(120, 360)).toEqual({
      x: 170.66666666666669,
      y: 0,
      width: 170.66666666666666,
      height: COPY_IMAGE_SIZE,
    });
  });

  it("keeps square SVG content square", () => {
    expect(fitImageIntoSquare(64, 64)).toEqual({
      x: 0,
      y: 0,
      width: COPY_IMAGE_SIZE,
      height: COPY_IMAGE_SIZE,
    });
  });

  it("rejects invalid source dimensions", () => {
    expect(() => fitImageIntoSquare(0, 64)).toThrow(ClipboardImageError);
    expect(() => fitImageIntoSquare(64, Number.NaN)).toThrow(
      ClipboardImageError,
    );
  });
});
