/** @vitest-environment node */

import { describe, expect, it, vi } from "vitest";
import { version as packageVersion } from "../../package.json";
import {
  attemptBrowserOpen,
  parseCliArguments,
  readPackageVersion,
} from "./cli.js";

describe("parseCliArguments", () => {
  it("starts with no arguments", () => {
    expect(parseCliArguments([])).toEqual({ kind: "start" });
  });

  it.each(["-h", "--help"])("accepts the help option %s", (argument) => {
    expect(parseCliArguments([argument])).toEqual({ kind: "help" });
  });

  it.each(["-v", "--version"])(
    "accepts the version option %s",
    (argument) => {
      expect(parseCliArguments([argument])).toEqual({ kind: "version" });
    },
  );

  it("rejects unknown, positional, and combined arguments", () => {
    expect(parseCliArguments(["--port", "8080"]).kind).toBe("invalid");
    expect(parseCliArguments(["icons.zip"]).kind).toBe("invalid");
    expect(parseCliArguments(["--help", "--version"]).kind).toBe("invalid");
  });
});

describe("readPackageVersion", () => {
  it("reads the version from the package manifest", async () => {
    await expect(readPackageVersion()).resolves.toBe(packageVersion);
  });
});

describe("attemptBrowserOpen", () => {
  it("reports browser launch failure without rejecting", async () => {
    const warn = vi.fn();
    const opener = async () => {
      throw new Error("browser unavailable");
    };

    await expect(
      attemptBrowserOpen("http://127.0.0.1:43210/", opener, warn),
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("browser unavailable"),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("http://127.0.0.1:43210/"),
    );
  });
});
