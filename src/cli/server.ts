import { readFile, realpath, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";

const LOOPBACK_HOST = "127.0.0.1";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
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

export interface StaticServerOptions {
  rootDirectory: string;
}

export interface RunningStaticServer {
  port: number;
  url: string;
  close: () => Promise<void>;
}

export async function startStaticServer(
  options: StaticServerOptions,
): Promise<RunningStaticServer> {
  const rootDirectory = await realpath(options.rootDirectory);
  let selectedPort = 0;

  const server = createServer((request, response) => {
    void handleRequest(request, response, rootDirectory, selectedPort).catch(
      () => {
        if (!response.headersSent) {
          sendText(request, response, 500, "Internal Server Error\n");
          return;
        }
        response.destroy();
      },
    );
  });

  server.on("clientError", (_error, socket) => {
    if (socket.writable) {
      socket.end(
        "HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n",
      );
    }
  });

  await listenOnAvailablePort(server);

  const address = server.address();
  if (address === null || typeof address === "string") {
    await closeServer(server);
    throw new Error("Unable to determine the localhost server port.");
  }

  selectedPort = address.port;
  const url = `http://${LOOPBACK_HOST}:${selectedPort}/`;
  let closePromise: Promise<void> | null = null;

  return {
    port: selectedPort,
    url,
    close: () => {
      closePromise ??= closeServer(server);
      return closePromise;
    },
  };
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  rootDirectory: string,
  port: number,
): Promise<void> {
  applySecurityHeaders(response);

  if (!isExpectedHost(request.headers.host, port)) {
    sendText(request, response, 403, "Forbidden\n");
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

  const candidatePath = resolve(rootDirectory, relativePath);
  if (!isWithinRoot(rootDirectory, candidatePath)) {
    sendText(request, response, 400, "Bad Request\n");
    return;
  }

  let filePath: string;
  let fileSize: number;

  try {
    const candidateStats = await stat(candidatePath);
    if (!candidateStats.isFile()) {
      sendText(request, response, 404, "Not Found\n");
      return;
    }

    filePath = await realpath(candidatePath);
    if (!isWithinRoot(rootDirectory, filePath)) {
      sendText(request, response, 400, "Bad Request\n");
      return;
    }

    fileSize = candidateStats.size;
  } catch (error) {
    if (isMissingPathError(error)) {
      sendText(request, response, 404, "Not Found\n");
      return;
    }
    throw error;
  }

  response.statusCode = 200;
  response.setHeader(
    "Content-Type",
    MIME_TYPES.get(extname(filePath).toLowerCase()) ??
      "application/octet-stream",
  );
  response.setHeader("Content-Length", String(fileSize));
  response.setHeader("Cache-Control", cacheControlFor(relativePath));

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  const body = await readFile(filePath);
  response.end(body);
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

function listenOnAvailablePort(
  server: ReturnType<typeof createServer>,
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
    server.listen({ host: LOOPBACK_HOST, port: 0 });
  });
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

function isMissingPathError(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) return false;
  return error.code === "ENOENT" || error.code === "ENOTDIR";
}
