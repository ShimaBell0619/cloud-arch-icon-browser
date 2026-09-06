import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const POWERPOINT_CAPABILITY_PATH = "/__bridge/powerpoint/capability";
export const POWERPOINT_COPY_ALL_PATH = "/__bridge/powerpoint/copy-all";
export const POWERPOINT_CAPABILITY_HEADER = "x-cloud-arch-capability";
export const MAX_POWERPOINT_OBJECTS = 36;

const MAX_UNIQUE_IMAGES = 36;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const POWERPOINT_TIMEOUT_MS = 20_000;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface PowerPointCopyItem {
  readonly png: Buffer;
  readonly quantity: number;
}

export type PowerPointCopyRunner = (
  items: readonly PowerPointCopyItem[],
) => Promise<void>;

export interface PowerPointBridge {
  matches: (rawUrl: string | undefined) => boolean;
  handle: (
    request: IncomingMessage,
    response: ServerResponse,
    port: number,
  ) => Promise<void>;
}

export interface PowerPointBridgeOptions {
  platform?: NodeJS.Platform;
  capabilityToken?: string;
  runner?: PowerPointCopyRunner;
}

class PowerPointAutomationError extends Error {
  constructor(
    message: string,
    readonly kind:
      | "not-installed"
      | "not-running"
      | "timeout"
      | "automation-failed",
  ) {
    super(message);
    this.name = "PowerPointAutomationError";
  }
}

export function createPowerPointBridge(
  options: PowerPointBridgeOptions = {},
): PowerPointBridge {
  const platform = options.platform ?? process.platform;
  const capabilityToken =
    options.capabilityToken ?? randomBytes(32).toString("base64url");
  const runner = options.runner ?? runPowerPointCopy;
  let busy = false;

  return {
    matches: (rawUrl) => {
      const pathname = requestPathname(rawUrl);
      return (
        pathname === POWERPOINT_CAPABILITY_PATH ||
        pathname === POWERPOINT_COPY_ALL_PATH
      );
    },
    handle: async (request, response, port) => {
      const pathname = requestPathname(request.url);
      if (pathname === POWERPOINT_CAPABILITY_PATH) {
        if (request.method !== "GET") {
          response.setHeader("Allow", "GET");
          sendJson(response, 405, { error: "Method Not Allowed" });
          return;
        }

        const available = platform === "win32";
        sendJson(response, 200, {
          available,
          experimental: true,
          maxObjects: MAX_POWERPOINT_OBJECTS,
          capability: available ? capabilityToken : null,
          reason: available ? null : "windows-npx-only",
        });
        return;
      }

      if (pathname !== POWERPOINT_COPY_ALL_PATH) {
        sendJson(response, 404, { error: "Not Found" });
        return;
      }

      if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        sendJson(response, 405, { error: "Method Not Allowed" });
        return;
      }

      if (platform !== "win32") {
        sendJson(response, 501, {
          error: "PowerPoint Copy all is available only in the Windows npx runtime.",
        });
        return;
      }

      const expectedOrigin = `http://127.0.0.1:${port}`;
      if (request.headers.origin !== expectedOrigin) {
        sendJson(response, 403, { error: "Forbidden" });
        return;
      }

      if (request.headers[POWERPOINT_CAPABILITY_HEADER] !== capabilityToken) {
        sendJson(response, 403, { error: "Forbidden" });
        return;
      }

      if (!isJsonContentType(request.headers["content-type"])) {
        sendJson(response, 415, { error: "Expected application/json." });
        return;
      }

      if (busy) {
        sendJson(response, 409, {
          error: "A PowerPoint copy operation is already in progress.",
        });
        return;
      }

      let items: readonly PowerPointCopyItem[];
      try {
        const raw = await readBoundedBody(request);
        items = parseCopyPayload(JSON.parse(raw));
      } catch (error) {
        if (error instanceof RequestTooLargeError) {
          sendJson(response, 413, { error: error.message });
          return;
        }
        sendJson(response, 400, {
          error:
            error instanceof Error ? error.message : "Invalid Copy all payload.",
        });
        return;
      }

      busy = true;
      try {
        await runner(items);
        sendJson(response, 200, {
          ok: true,
          objectCount: items.reduce((sum, item) => sum + item.quantity, 0),
        });
      } catch (error) {
        const message =
          error instanceof PowerPointAutomationError
            ? error.message
            : "PowerPoint automation failed. Try again with desktop PowerPoint available.";
        sendJson(response, 503, { error: message });
      } finally {
        busy = false;
      }
    },
  };
}

export function parseCopyPayload(value: unknown): readonly PowerPointCopyItem[] {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error("Copy all payload must contain an items array.");
  }
  if (value.items.length === 0 || value.items.length > MAX_UNIQUE_IMAGES) {
    throw new Error(`Copy all supports 1-${MAX_UNIQUE_IMAGES} unique images.`);
  }

  let total = 0;
  const parsed: PowerPointCopyItem[] = [];
  for (const item of value.items) {
    if (!isRecord(item)) throw new Error("Each Copy all item must be an object.");
    const keys = Object.keys(item).sort();
    if (keys.length !== 2 || keys[0] !== "pngBase64" || keys[1] !== "quantity") {
      throw new Error("Copy all items may contain only pngBase64 and quantity.");
    }
    if (
      typeof item.quantity !== "number" ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_POWERPOINT_OBJECTS
    ) {
      throw new Error("Copy all item quantity is invalid.");
    }
    if (typeof item.pngBase64 !== "string") {
      throw new Error("Copy all image must be base64 PNG data.");
    }

    const png = decodePng(item.pngBase64);
    total += item.quantity;
    if (total > MAX_POWERPOINT_OBJECTS) {
      throw new Error(`Copy all supports at most ${MAX_POWERPOINT_OBJECTS} objects.`);
    }
    parsed.push({ png, quantity: item.quantity });
  }

  return parsed;
}

async function runPowerPointCopy(
  items: readonly PowerPointCopyItem[],
): Promise<void> {
  const directory = await mkdtemp(
    join(tmpdir(), "cloud-arch-icon-browser-powerpoint-"),
  );

  try {
    const manifestItems: { path: string; quantity: number }[] = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (item === undefined) continue;
      const path = join(directory, `${String(index).padStart(2, "0")}.png`);
      await writeFile(path, item.png, { flag: "wx" });
      manifestItems.push({ path, quantity: item.quantity });
    }

    const manifestPath = join(directory, "manifest.json");
    await writeFile(
      manifestPath,
      JSON.stringify({
        total: items.reduce((sum, item) => sum + item.quantity, 0),
        items: manifestItems,
      }),
      { encoding: "utf8", flag: "wx" },
    );
    await invokePowerPointAutomation(manifestPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function invokePowerPointAutomation(manifestPath: string): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const encodedCommand = Buffer.from(POWERPOINT_COPY_SCRIPT, "utf16le").toString(
      "base64",
    );
    const child = spawn(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-EncodedCommand",
        encodedCommand,
      ],
      {
        windowsHide: true,
        stdio: ["ignore", "ignore", "pipe"],
        env: { ...process.env, CAB_POWERPOINT_MANIFEST: manifestPath },
      },
    );

    let stderr = "";
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) rejectPromise(error);
      else resolvePromise();
    };

    child.stderr.on("data", (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-8192);
    });
    child.once("error", (error) => {
      if ("code" in error && error.code === "ENOENT") {
        finish(
          new PowerPointAutomationError(
            "Windows PowerShell is unavailable, so PowerPoint Copy all cannot run.",
            "not-installed",
          ),
        );
        return;
      }
      finish(
        new PowerPointAutomationError(
          "PowerPoint automation could not be started.",
          "automation-failed",
        ),
      );
    });
    child.once("close", (code) => {
      if (code === 0) {
        finish();
        return;
      }
      if (stderr.includes("CAB_POWERPOINT_NOT_INSTALLED")) {
        finish(
          new PowerPointAutomationError(
            "Desktop Microsoft PowerPoint was not found. Install/open desktop PowerPoint and try again.",
            "not-installed",
          ),
        );
        return;
      }
      finish(
        new PowerPointAutomationError(
          "PowerPoint could not prepare the multi-object clipboard. Close modal dialogs in PowerPoint and try again.",
          "automation-failed",
        ),
      );
    });

    const timeout = setTimeout(() => {
      child.kill();
      finish(
        new PowerPointAutomationError(
          "PowerPoint Copy all timed out. Close PowerPoint dialogs and try again.",
          "timeout",
        ),
      );
    }, POWERPOINT_TIMEOUT_MS);
    timeout.unref();
  });
}

function decodePng(base64: string): Buffer {
  if (
    base64.length === 0 ||
    base64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)
  ) {
    throw new Error("Copy all image contains invalid base64 data.");
  }
  const png = Buffer.from(base64, "base64");
  if (png.length === 0 || png.length > MAX_IMAGE_BYTES) {
    throw new Error("Copy all PNG size is outside the allowed range.");
  }
  if (png.length < PNG_SIGNATURE.length || !png.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("Copy all accepts PNG images only.");
  }
  return png;
}

async function readBoundedBody(request: IncomingMessage): Promise<string> {
  const declared = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) {
    throw new RequestTooLargeError();
  }

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_REQUEST_BYTES) throw new RequestTooLargeError();
    chunks.push(buffer);
  }
  if (total === 0) throw new Error("Copy all payload is empty.");
  return Buffer.concat(chunks).toString("utf8");
}

class RequestTooLargeError extends Error {
  constructor() {
    super("Copy all payload is too large.");
    this.name = "RequestTooLargeError";
  }
}

function requestPathname(rawUrl: string | undefined): string | null {
  if (!rawUrl?.startsWith("/") || rawUrl.startsWith("//")) return null;
  const queryIndex = rawUrl.indexOf("?");
  return queryIndex === -1 ? rawUrl : rawUrl.slice(0, queryIndex);
}

function isJsonContentType(value: string | undefined): boolean {
  return value?.toLowerCase().split(";", 1)[0]?.trim() === "application/json";
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  value: Record<string, unknown>,
): void {
  const body = Buffer.from(JSON.stringify(value));
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", String(body.length));
  response.setHeader("Cache-Control", "no-store");
  response.end(body);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const POWERPOINT_COPY_SCRIPT = String.raw`
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$MsoFalse = 0
$MsoTrue = -1
$PpLayoutBlank = 12
$manifestPath = $env:CAB_POWERPOINT_MANIFEST
$application = $null
$presentation = $null
$slide = $null
$shapeRange = $null
$ownedApplication = $false

function Release-ComObject {
  param($Object)
  if ($null -ne $Object -and [Runtime.InteropServices.Marshal]::IsComObject($Object)) {
    try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Object) } catch {}
  }
}

try {
  if ([string]::IsNullOrWhiteSpace($manifestPath) -or -not (Test-Path -LiteralPath $manifestPath)) {
    throw "Missing internal Copy all manifest."
  }

  try {
    $application = [Runtime.InteropServices.Marshal]::GetActiveObject("PowerPoint.Application")
  }
  catch {
    try {
      $application = New-Object -ComObject PowerPoint.Application
      $ownedApplication = $true
    }
    catch {
      [Console]::Error.WriteLine("CAB_POWERPOINT_NOT_INSTALLED")
      exit 21
    }
  }

  $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $presentation = $application.Presentations.Add($MsoFalse)
  $slide = $presentation.Slides.Add(1, $PpLayoutBlank)
  $shapeNames = New-Object System.Collections.Generic.List[object]
  $columns = [Math]::Ceiling([Math]::Sqrt([double]$manifest.total))
  $index = 0

  foreach ($item in $manifest.items) {
    for ($copy = 0; $copy -lt [int]$item.quantity; $copy++) {
      $column = $index % $columns
      $row = [Math]::Floor($index / $columns)
      $left = 10 + ($column * 86)
      $top = 10 + ($row * 86)
      $shape = $slide.Shapes.AddPicture(
        [string]$item.path,
        $MsoFalse,
        $MsoTrue,
        [single]$left,
        [single]$top,
        [single]72,
        [single]72
      )
      try {
        $null = $shapeNames.Add([string]$shape.Name)
      }
      finally {
        Release-ComObject $shape
      }
      $index++
    }
  }

  $shapeRange = $slide.Shapes.Range([object[]]$shapeNames.ToArray())
  $shapeRange.Copy()
  Start-Sleep -Milliseconds 350
  $presentation.Saved = $MsoTrue
  $presentation.Close()
  Release-ComObject $shapeRange
  $shapeRange = $null
  Release-ComObject $slide
  $slide = $null
  Release-ComObject $presentation
  $presentation = $null

  if ($ownedApplication) {
    $application.Quit()
  }
  Release-ComObject $application
  $application = $null
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  exit 0
}
catch {
  [Console]::Error.WriteLine("CAB_POWERPOINT_AUTOMATION_FAILED")
  exit 22
}
finally {
  if ($null -ne $shapeRange) { Release-ComObject $shapeRange }
  if ($null -ne $slide) { Release-ComObject $slide }
  if ($null -ne $presentation) {
    try {
      $presentation.Saved = $MsoTrue
      $presentation.Close()
    } catch {}
    Release-ComObject $presentation
  }
  if ($null -ne $application) {
    if ($ownedApplication) { try { $application.Quit() } catch {} }
    Release-ComObject $application
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
`;
