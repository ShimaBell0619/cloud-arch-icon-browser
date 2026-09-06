import { readFile, readdir, realpath } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
  request as httpRequest,
} from "node:http";
import { extname, resolve, sep } from "node:path";
import {
  createPowerPointBridge,
  type PowerPointBridge,
} from "./powerpoint-bridge.js";

const LOOPBACK_HOST = "127.0.0.1";
export const CANONICAL_PORT = 41731;
export const APP_INSTANCE_HEADER = "X-Cloud-Arch-Icon-Browser-Instance";
const APP_INSTANCE_HEADER_VALUE = "1";
const EXISTING_INSTANCE_PROBE_TIMEOUT_MS = 750;

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
].join("; ");

const MIME_TYPES = new Map<string, string>([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".txt", "text/plain; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

interface StaticAsset {
  body: Buffer;
  contentType: string;
  cacheControl: string;
}

export interface StaticServerOptions {
  rootDirectory: string;
  /** Test-only/embedding override. Packaged runtime omits this and uses CANONICAL_PORT. */
  port?: number;
  /** Test-only bridge override. Packaged runtime creates a process-scoped bridge. */
  powerPointBridge?: PowerPointBridge;
}

export interface RunningStaticServer {
  port: number;
  url: string;
  reused: boolean;
  close: () => Promise<void>;
}

export async function startStaticServer(
  options: StaticServerOptions,
): Promise<RunningStaticServer> {
  const rootDirectory = await realpath(options.rootDirectory);
  const staticAssets = await loadStaticAssets(rootDirectory);
  const powerPointBridge =
    options.powerPointBridge ?? createPowerPointBridge();
  const requestedPort = options.port ?? CANONICAL_PORT;
  let selectedPort = requestedPort;

  const server = createServer((request, response) => {
    void handleRequest(
      request,
      response,
      staticAssets,
      powerPointBridge,
      selectedPort,
    ).catch(() => {
      if (!response.headersSent) {
        sendText(request, response, 500, "Internal Server Error\n");
        return;
      }
      response.destroy();
    });
  });

  server.on("clientError", (_error, socket) => {
    if (socket.writable) {
      socket.end(
        "HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n",
      );
    }
  });

  try {
    await listenOnPort(server, requestedPort);
  } catch (error) {
    if (requestedPort > 0 && isAddressInUseError(error)) {
      const reused = await probeExistingInstance(requestedPort);
      if (reused) {
        return {
          port: requestedPort,
          url: appUrl(requestedPort),
          reused: true,
          close: () => Promise.resolve(),
        };
      }
      throw new Error(
        `Port ${requestedPort} is already in use by another process. Stop that process and run cloud-arch-icon-browser again.`,
        { cause: error },
      );
    }
    throw error;
  }

  const address = server.address();
  if (address === null || typeof address === "string") {
    await closeServer(server);
    throw new Error("Unable to determine the localhost server port.");
  }

  selectedPort = address.port;
  const url = appUrl(selectedPort);
  let closePromise: Promise<void> | null = null;

  return {
    port: selectedPort,
    url,
    reused: false,
    close: () => {
      closePromise ??= closeServer(server);
      return closePromise;
    },
  };
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  staticAssets: ReadonlyMap<string, StaticAsset>,
  powerPointBridge: PowerPointBridge,
  port: number,
): Promise<void> {
  applySecurityHeaders(response);

  if (!isExpectedHost(request.headers.host, port)) {
    sendText(request, response, 403, "Forbidden\n");
    return;
  }

  if (powerPointBridge.matches(request.url)) {
    await powerPointBridge.handle(request, response, port);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    sendText(request, response, 405, "Method Not Allowed\n");
    return;
  }

  const relativePath = parseStaticPath(request.url);
  if (relativePath === null) {
    sendText(request, response, 400, "Bad Request\n");
    return;
  }

  const asset = staticAssets.get(relativePath);
  if (asset === undefined) {
    sendText(request, response, 404, "Not Found\n");
    return;
  }

  response.statusCode = 200;
  response.setHeader("Content-Type", asset.contentType);
  response.setHeader("Content-Length", String(asset.body.byteLength));
  response.setHeader("Cache-Control", asset.cacheControl);

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  response.end(asset.body);
}

async function loadStaticAssets(
  rootDirectory: string,
): Promise<Map<string, StaticAsset>> {
  const assets = new Map<string, StaticAsset>();
  await collectStaticAssets(rootDirectory, rootDirectory, [], assets);

  if (!assets.has("index.html")) {
    throw new Error("Static build output does not contain index.html.");
  }

  return assets;
}

async function collectStaticAssets(
  rootDirectory: string,
  currentDirectory: string,
  pathSegments: readonly string[],
  assets: Map<string, StaticAsset>,
): Promise<void> {
  const entries = await readdir(currentDirectory, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = resolve(currentDirectory, entry.name);
    if (!isWithinRoot(rootDirectory, absolutePath)) {
      throw new Error("Static build output escaped its configured root.");
    }

    const nextSegments = [...pathSegments, entry.name];

    if (entry.isSymbolicLink()) {
      throw new Error("Static build output must not contain symbolic links.");
    }

    if (entry.isDirectory()) {
      await collectStaticAssets(
        rootDirectory,
        absolutePath,
        nextSegments,
        assets,
      );
      continue;
    }

    if (!entry.isFile()) {
      throw new Error("Static build output contains an unsupported file type.");
    }

    const canonicalPath = await realpath(absolutePath);
    if (!isWithinRoot(rootDirectory, canonicalPath)) {
      throw new Error("Static build output escaped its configured root.");
    }

    const relativePath = nextSegments.join("/");
    const body = await readFile(canonicalPath);
    assets.set(relativePath, {
      body,
      contentType:
        MIME_TYPES.get(extname(canonicalPath).toLowerCase()) ??
        "application/octet-stream",
      cacheControl: cacheControlFor(relativePath),
    });
  }
}

function parseStaticPath(rawUrl: string | undefined): string | null {
  if (
    rawUrl === undefined ||
    !rawUrl.startsWith("/") ||
    rawUrl.startsWith("//")
  ) {
    return null;
  }

  const queryIndex = rawUrl.indexOf("?");
  const rawPath = queryIndex === -1 ? rawUrl : rawUrl.slice(0, queryIndex);

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return null;
  }

  if (decodedPath.includes("\0") || decodedPath.includes("\\")) {
    return null;
  }

  if (decodedPath.split("/").some((segment) => segment === "..")) {
    return null;
  }

  if (decodedPath === "/") {
    return "index.html";
  }

  const relativePath = decodedPath.slice(1);
  return relativePath.length > 0 ? relativePath : null;
}

function isExpectedHost(hostHeader: string | undefined, port: number): boolean {
  if (hostHeader === undefined) return false;

  const normalizedHost = hostHeader.trim().toLowerCase();
  return (
    normalizedHost === `${LOOPBACK_HOST}:${port}` ||
    normalizedHost === `localhost:${port}`
  );
}

function isWithinRoot(rootDirectory: string, candidatePath: string): boolean {
  return (
    candidatePath === rootDirectory ||
    candidatePath.startsWith(`${rootDirectory}${sep}`)
  );
}

function cacheControlFor(relativePath: string): string {
  if (relativePath === "index.html") {
    return "no-store";
  }

  if (/^assets\/.+-[A-Za-z0-9_-]{8,}\.[^/]+$/.test(relativePath)) {
    return "public, max-age=31536000, immutable";
  }

  return "no-cache";
}

function applySecurityHeaders(response: ServerResponse): void {
  response.setHeader(APP_INSTANCE_HEADER, APP_INSTANCE_HEADER_VALUE);
  response.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Permissions-Policy", permissionsPolicy());
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
}

function permissionsPolicy(): string {
  return [
    "accelerometer=()",
    "camera=()",
    "geolocation=()",
    "gyroscope=()",
    "magnetometer=()",
    "microphone=()",
    "payment=()",
    "serial=()",
    "usb=()",
  ].join(", ");
}

function sendText(
  request: IncomingMessage,
  response: ServerResponse,
  statusCode: number,
  body: string,
): void {
  applySecurityHeaders(response);
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Content-Length", String(Buffer.byteLength(body)));
  response.setHeader("Cache-Control", "no-store");

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  response.end(body);
}

function listenOnPort(
  server: ReturnType<typeof createServer>,
  port: number,
): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const handleError = (error: Error) => {
      server.off("listening", handleListening);
      rejectPromise(error);
    };
    const handleListening = () => {
      server.off("error", handleError);
      resolvePromise();
    };

    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen({ host: LOOPBACK_HOST, port });
  });
}

function probeExistingInstance(port: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    let settled = false;
    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      resolvePromise(result);
    };

    const clientRequest = httpRequest(
      {
        host: LOOPBACK_HOST,
        port,
        path: "/",
        method: "HEAD",
        headers: { Host: `${LOOPBACK_HOST}:${port}` },
      },
      (response) => {
        const header = response.headers[APP_INSTANCE_HEADER.toLowerCase()];
        response.resume();
        finish(header === APP_INSTANCE_HEADER_VALUE);
      },
    );

    clientRequest.setTimeout(EXISTING_INSTANCE_PROBE_TIMEOUT_MS, () => {
      clientRequest.destroy();
      finish(false);
    });
    clientRequest.on("error", () => finish(false));
    clientRequest.end();
  });
}

function isAddressInUseError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "EADDRINUSE"
  );
}

function appUrl(port: number): string {
  return `http://${LOOPBACK_HOST}:${port}/`;
}

function closeServer(server: ReturnType<typeof createServer>): Promise<void> {
  if (!server.listening) return Promise.resolve();

  return new Promise((resolvePromise, rejectPromise) => {
    server.close((error) => {
      if (error) {
        rejectPromise(error);
        return;
      }
      resolvePromise();
    });
  });
}
