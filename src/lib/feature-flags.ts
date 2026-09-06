export const POWERPOINT_COPY_ALL_FLAG_KEY =
  "cloud-arch-icon-browser:feature:powerpoint-copy-all";

const POWERPOINT_COPY_ALL_DEFAULT = true;

export function isExperimentalPowerPointCopyAllEnabled(): boolean {
  if (typeof window === "undefined") return POWERPOINT_COPY_ALL_DEFAULT;
  try {
    const override = window.localStorage.getItem(POWERPOINT_COPY_ALL_FLAG_KEY);
    if (override === "off") return false;
    if (override === "on") return true;
  } catch {
    // Storage is optional. Keep the built-in feature default when unavailable.
  }
  return POWERPOINT_COPY_ALL_DEFAULT;
}
