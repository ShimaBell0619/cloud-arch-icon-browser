import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const zipPath = process.argv[2];
if (!zipPath) {
  console.error("Usage: npm run verify:official -- /path/to/official-icons.zip");
  process.exit(1);
}

const resolvedZip = path.resolve(zipPath);
if (!existsSync(resolvedZip)) {
  console.error(`Official ZIP was not found: ${resolvedZip}`);
  process.exit(1);
}

const vitest = fileURLToPath(
  new URL("../node_modules/vitest/vitest.mjs", import.meta.url),
);

const result = spawnSync(
  process.execPath,
  [vitest, "run", "--config", "vitest.verify.config.ts"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      VERIFY_OFFICIAL_ZIP: resolvedZip,
    },
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
