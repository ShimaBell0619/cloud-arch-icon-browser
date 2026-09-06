import type { IconPackageSession, TrayItem } from "@/core";
import {
  COPY_IMAGE_SIZE,
  renderSvgBlobToNormalizedPng,
} from "@/lib/icon-clipboard";
import { isExperimentalPowerPointCopyAllEnabled } from "@/lib/feature-flags";

const CANONICAL_POWERPOINT_ORIGIN = "http://127.0.0.1:41731";
const CAPABILITY_PATH = "/__bridge/powerpoint/capability";
const COPY_ALL_PATH = "/__bridge/powerpoint/copy-all";
const CAPABILITY_HEADER = "x-cloud-arch-capability";
export const MAX_POWERPOINT_COPY_OBJECTS = 36;
export const POWERPOINT_EXPERIMENT_ACK_KEY =
  "cloud-arch-icon-browser:experimental-powerpoint-copy-all-ack";

export interface PowerPointCopyCapability {
  readonly available: boolean;
  readonly experimental: boolean;
  readonly maxObjects: number;
  readonly capability: string | null;
  readonly reason: string | null;
}

export class PowerPointCopyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PowerPointCopyError";
  }
}

export function isCanonicalPowerPointBridgeOrigin(origin: string): boolean {
  return origin === CANONICAL_POWERPOINT_ORIGIN;
}

export function trayPowerPointObjectCount(items: readonly TrayItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export async function getPowerPointCopyCapability(): Promise<PowerPointCopyCapability> {
  if (!isExperimentalPowerPointCopyAllEnabled()) {
    return unavailable("feature-disabled");
  }
  if (
    typeof window === "undefined" ||
    !isCanonicalPowerPointBridgeOrigin(window.location.origin)
  ) {
    return unavailable("windows-npx-only");
  }

  try {
    const response = await fetch(CAPABILITY_PATH, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return unavailable("bridge-unavailable");
    const value: unknown = await response.json();
    if (!isRecord(value)) return unavailable("bridge-unavailable");
    const available = value.available === true;
    const maxObjects =
      typeof value.maxObjects === "number" && Number.isSafeInteger(value.maxObjects)
        ? value.maxObjects
        : MAX_POWERPOINT_COPY_OBJECTS;
    return {
      available,
      experimental: value.experimental === true,
      maxObjects,
      capability:
        available && typeof value.capability === "string"
          ? value.capability
          : null,
      reason: typeof value.reason === "string" ? value.reason : null,
    };
  } catch {
    return unavailable("bridge-unavailable");
  }
}

export async function copyTrayToPowerPoint(
  session: IconPackageSession,
  items: readonly TrayItem[],
  capability: PowerPointCopyCapability,
): Promise<number> {
  const total = trayPowerPointObjectCount(items);
  if (total < 1) throw new PowerPointCopyError("Add icons to the Tray first.");
  if (total > Math.min(capability.maxObjects, MAX_POWERPOINT_COPY_OBJECTS)) {
    throw new PowerPointCopyError(
      `Experimental Copy all supports at most ${Math.min(capability.maxObjects, MAX_POWERPOINT_COPY_OBJECTS)} objects.`,
    );
  }
  if (!capability.available || !capability.capability) {
    throw new PowerPointCopyError(
      "Experimental Copy all is available only from the Windows npx runtime.",
    );
  }

  const rendered = await renderTrayItems(session, items);
  const response = await fetch(COPY_ALL_PATH, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      [CAPABILITY_HEADER]: capability.capability,
    },
    body: JSON.stringify({ items: rendered }),
  });

  const result = await readBridgeResponse(response);
  if (!response.ok) {
    throw new PowerPointCopyError(
      typeof result.error === "string"
        ? result.error
        : "PowerPoint Copy all failed. Try again with desktop PowerPoint available.",
    );
  }
  if (result.ok !== true || result.objectCount !== total) {
    throw new PowerPointCopyError(
      "PowerPoint Copy all returned an unexpected result. Reload the app and try again.",
    );
  }
  return total;
}

export function powerPointCopyErrorMessage(error: unknown): string {
  return error instanceof PowerPointCopyError
    ? error.message
    : "PowerPoint Copy all failed. Try again with desktop PowerPoint available.";
}

async function renderTrayItems(
  session: IconPackageSession,
  items: readonly TrayItem[],
): Promise<readonly { pngBase64: string; quantity: number }[]> {
  const results = new Array<{ pngBase64: string; quantity: number }>(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) continue;
      await session.getPreviewUrl(item.icon.id);
      const source = await session.getSvgBlob(item.icon.id);
      const png = await renderSvgBlobToNormalizedPng(source, COPY_IMAGE_SIZE);
      results[index] = {
        pngBase64: await blobToBase64(png),
        quantity: item.quantity,
      };
    }
  };

  const workerCount = Math.min(4, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      if (comma < 0) {
        reject(new PowerPointCopyError("Could not encode a Tray icon for Copy all."));
        return;
      }
      resolve(result.slice(comma + 1));
    };
    reader.onerror = () =>
      reject(new PowerPointCopyError("Could not encode a Tray icon for Copy all."));
    reader.readAsDataURL(blob);
  });
}

async function readBridgeResponse(
  response: Response,
): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

function unavailable(reason: string): PowerPointCopyCapability {
  return {
    available: false,
    experimental: true,
    maxObjects: MAX_POWERPOINT_COPY_OBJECTS,
    capability: null,
    reason,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
