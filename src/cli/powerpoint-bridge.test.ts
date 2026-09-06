/** @vitest-environment node */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPowerPointBridge,
  MAX_POWERPOINT_OBJECTS,
  parseCopyPayload,
  type PowerPointCopyRunner,
} from "./powerpoint-bridge.js";
import { startStaticServer, type RunningStaticServer } from "./server.js";

interface Fixture {
  rootDirectory: string;
  server: RunningStaticServer;
}

const fixtures: Fixture[] = [];
const SYNTHETIC_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]).toString("base64");

afterEach(async () => {
  while (fixtures.length > 0) {
    const fixture = fixtures.pop();
    if (!fixture) continue;
    await fixture.server.close();
    await rm(fixture.rootDirectory, { recursive: true, force: true });
  }
});

describe("PowerPoint localhost bridge", () => {
  it("exposes a token only for the injected Windows capability", async () => {
    const runner = vi.fn<PowerPointCopyRunner>(async () => undefined);
    const { server } = await createFixture(runner);
    const response = await fetch(`${server.url}__bridge/powerpoint/capability`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      available: true,
      experimental: true,
      maxObjects: MAX_POWERPOINT_OBJECTS,
      capability: "test-capability",
    });
  });

  it("requires canonical Origin and the per-process capability", async () => {
    const runner = vi.fn<PowerPointCopyRunner>(async () => undefined);
    const { server } = await createFixture(runner);
    const payload = JSON.stringify({
      items: [{ pngBase64: SYNTHETIC_PNG, quantity: 2 }],
    });

    const missingOrigin = await fetch(
      `${server.url}__bridge/powerpoint/copy-all`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cloud-arch-capability": "test-capability",
        },
        body: payload,
      },
    );
    expect(missingOrigin.status).toBe(403);

    const wrongToken = await fetch(`${server.url}__bridge/powerpoint/copy-all`, {
      method: "POST",
      headers: {
        Origin: `http://127.0.0.1:${server.port}`,
        "Content-Type": "application/json",
        "x-cloud-arch-capability": "wrong",
      },
      body: payload,
    });
    expect(wrongToken.status).toBe(403);

    const accepted = await fetch(`${server.url}__bridge/powerpoint/copy-all`, {
      method: "POST",
      headers: {
        Origin: `http://127.0.0.1:${server.port}`,
        "Content-Type": "application/json",
        "x-cloud-arch-capability": "test-capability",
      },
      body: payload,
    });
    expect(accepted.status).toBe(200);
    await expect(accepted.json()).resolves.toMatchObject({
      ok: true,
      objectCount: 2,
    });
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it("rejects non-PNG data and more than the bounded object count", () => {
    expect(() =>
      parseCopyPayload({ items: [{ pngBase64: "YWJjZA==", quantity: 1 }] }),
    ).toThrow("PNG images only");

    expect(() =>
      parseCopyPayload({
        items: [
          { pngBase64: SYNTHETIC_PNG, quantity: MAX_POWERPOINT_OBJECTS },
          { pngBase64: SYNTHETIC_PNG, quantity: 1 },
        ],
      }),
    ).toThrow(`at most ${MAX_POWERPOINT_OBJECTS} objects`);
  });
});

async function createFixture(runner: PowerPointCopyRunner): Promise<Fixture> {
  const rootDirectory = await mkdtemp(join(tmpdir(), "cloud-arch-ppt-bridge-"));
  await writeFile(
    join(rootDirectory, "index.html"),
    "<!doctype html><title>fixture</title>",
    "utf8",
  );
  const bridge = createPowerPointBridge({
    platform: "win32",
    capabilityToken: "test-capability",
    runner,
  });
  const server = await startStaticServer({
    rootDirectory,
    port: 0,
    powerPointBridge: bridge,
  });
  const fixture = { rootDirectory, server };
  fixtures.push(fixture);
  return fixture;
}
