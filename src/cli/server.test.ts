/** @vitest-environment node */

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  startStaticServer,
  type RunningStaticServer,
} from "./server.js";

interface Fixture {
  rootDirectory: string;
  server: RunningStaticServer;
}

interface RawResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

const fixtures: Fixture[] = [];

afterEach(async () => {
  while (fixtures.length > 0) {
    const fixture = fixtures.pop();
    if (fixture === undefined) continue;
    await fixture.server.close();
    await rm(fixture.rootDirectory, { recursive: true, force: true });
  }
});

describe("startStaticServer", () => {
  it("serves index.html only on loopback with hardened headers", async () => {
    const { server } = await createFixture();
    const response = await fetch(server.url);

    expect(server.url).toBe(`http://127.0.0.1:${server.port}/`);
    expect(server.port).toBeGreaterThan(0);
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("fixture app");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("cross-origin-opener-policy")).toBe(
      "same-origin",
    );

    const csp = response.headers.get("content-security-policy");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("unsafe-inline");
  });

  it("supports HEAD without returning a body", async () => {
    const { server } = await createFixture();
    const response = await fetch(server.url, { method: "HEAD" });

    expect(response.status).toBe(200);
    expect(Number(response.headers.get("content-length"))).toBeGreaterThan(0);
    await expect(response.text()).resolves.toBe("");
  });

  it("uses immutable caching for hashed Vite assets", async () => {
    const { server } = await createFixture();
    const response = await fetch(`${server.url}assets/index-AbCdEf12.js`);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    await expect(response.text()).resolves.toContain("fixture");
  });

  it("rejects unsupported methods", async () => {
    const { server } = await createFixture();
    const response = await fetch(server.url, { method: "POST" });

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
  });

  it("rejects missing or unexpected Host headers", async () => {
    const { server } = await createFixture();

    const unexpected = await rawRequest(server.port, "/", "evil.example");
    expect(unexpected.statusCode).toBe(403);

    const missing = await rawRequest(server.port, "/", null);
    expect(missing.statusCode).toBe(403);

    const localhost = await rawRequest(
      server.port,
      "/",
      `localhost:${server.port}`,
    );
    expect(localhost.statusCode).toBe(200);
  });

  it("rejects traversal and malformed static paths", async () => {
    const { server } = await createFixture();
    const expectedHost = `127.0.0.1:${server.port}`;

    const traversal = await rawRequest(
      server.port,
      "/%2e%2e/secret.txt",
      expectedHost,
    );
    expect(traversal.statusCode).toBe(400);

    const backslashTraversal = await rawRequest(
      server.port,
      "/%5c..%5csecret.txt",
      expectedHost,
    );
    expect(backslashTraversal.statusCode).toBe(400);

    const malformed = await rawRequest(server.port, "/%ZZ", expectedHost);
    expect(malformed.statusCode).toBe(400);
  });

  it("returns 404 instead of exposing application API routes", async () => {
    const { server } = await createFixture();
    const response = await fetch(`${server.url}api/icons`);

    expect(response.status).toBe(404);
  });
});

async function createFixture(): Promise<Fixture> {
  const rootDirectory = await mkdtemp(join(tmpdir(), "cloud-arch-server-"));
  await mkdir(join(rootDirectory, "assets"));
  await writeFile(
    join(rootDirectory, "index.html"),
    "<!doctype html><title>fixture app</title>",
    "utf8",
  );
  await writeFile(
    join(rootDirectory, "assets", "index-AbCdEf12.js"),
    "console.log('fixture');\n",
    "utf8",
  );

  const server = await startStaticServer({ rootDirectory });
  const fixture = { rootDirectory, server };
  fixtures.push(fixture);
  return fixture;
}

function rawRequest(
  port: number,
  path: string,
  hostHeader: string | null,
): Promise<RawResponse> {
  return new Promise((resolvePromise, rejectPromise) => {
    const headers = hostHeader === null ? {} : { Host: hostHeader };
    const clientRequest = request(
      {
        host: "127.0.0.1",
        port,
        path,
        method: "GET",
        headers,
        setHost: false,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          resolvePromise({
            statusCode: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    clientRequest.on("error", rejectPromise);
    clientRequest.end();
  });
}
