import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const PORT = 41732;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "browser");

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
]);

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join("; ");

const server = createServer(async (request, response) => {
  applyHeaders(response);

  const expectedHosts = new Set([`${HOST}:${PORT}`, `localhost:${PORT}`]);
  if (!expectedHosts.has((request.headers.host ?? "").toLowerCase())) {
    send(
      response,
      403,
      "text/plain; charset=utf-8",
      "Forbidden\n",
      request.method,
    );
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    send(
      response,
      405,
      "text/plain; charset=utf-8",
      "Method Not Allowed\n",
      request.method,
    );
    return;
  }

  const path = resolveRequestPath(request.url);
  if (!path) {
    send(
      response,
      400,
      "text/plain; charset=utf-8",
      "Bad Request\n",
      request.method,
    );
    return;
  }

  try {
    const body = await readFile(join(ROOT, path));
    send(
      response,
      200,
      MIME_TYPES.get(extname(path)) ?? "application/octet-stream",
      body,
      request.method,
    );
  } catch {
    send(
      response,
      404,
      "text/plain; charset=utf-8",
      "Not Found\n",
      request.method,
    );
  }
});

server.listen({ host: HOST, port: PORT }, () => {
  console.log(
    `Office interoperability browser harness: http://${HOST}:${PORT}/`,
  );
  console.log(
    "Open that URL in current stable Edge and Chrome. Press Ctrl+C to stop.",
  );
});

server.on("error", (error) => {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "EADDRINUSE"
  ) {
    console.error(
      `Port ${PORT} is already in use. Stop that process and retry.`,
    );
    process.exitCode = 1;
    return;
  }
  throw error;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}

function resolveRequestPath(rawUrl) {
  if (!rawUrl?.startsWith("/") || rawUrl.startsWith("//")) return null;
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(rawUrl, `http://${HOST}:${PORT}`).pathname,
    );
  } catch {
    return null;
  }

  if (pathname.includes("\\") || pathname.includes("\0")) return null;
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const normalized = normalize(relative).replaceAll("\\", "/");
  if (normalized.startsWith("../") || normalized === "..") return null;
  if (!new Set(["index.html", "spike.js", "spike.css"]).has(normalized))
    return null;
  return normalized;
}

function applyHeaders(response) {
  response.setHeader("Content-Security-Policy", CSP);
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Cache-Control", "no-store");
}

function send(response, statusCode, contentType, body, method) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  response.statusCode = statusCode;
  response.setHeader("Content-Type", contentType);
  response.setHeader("Content-Length", String(buffer.byteLength));
  if (method === "HEAD") response.end();
  else response.end(buffer);
}
