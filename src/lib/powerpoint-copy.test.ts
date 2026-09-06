import { describe, expect, it } from "vitest";
import {
  isCanonicalPowerPointBridgeOrigin,
  MAX_POWERPOINT_COPY_OBJECTS,
} from "./powerpoint-copy";

describe("PowerPoint Copy all client guards", () => {
  it("accepts only the canonical packaged localhost origin", () => {
    expect(isCanonicalPowerPointBridgeOrigin("http://127.0.0.1:41731")).toBe(
      true,
    );
    expect(isCanonicalPowerPointBridgeOrigin("http://localhost:41731")).toBe(
      false,
    );
    expect(isCanonicalPowerPointBridgeOrigin("https://example.com")).toBe(false);
  });

  it("keeps the experimental object limit bounded", () => {
    expect(MAX_POWERPOINT_COPY_OBJECTS).toBe(36);
  });
});
