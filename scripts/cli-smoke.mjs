import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../cli/index.js", import.meta.url));
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

const help = runCli("--help");
assert(help.status === 0, `--help exited with ${help.status}`);
assert(
  help.stdout.includes("Usage:"),
  "--help did not print the expected usage text",
);

const version = runCli("--version");
assert(version.status === 0, `--version exited with ${version.status}`);
assert(
  version.stdout.trim() === packageJson.version,
  "--version did not match package.json",
);

const unknown = runCli("--definitely-unknown");
assert(unknown.status === 1, `unknown option exited with ${unknown.status}`);
assert(
  unknown.stderr.includes("Unsupported arguments"),
  "unknown option did not report an error",
);

console.log("CLI argument smoke checks passed.");

function runCli(...args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    timeout: 10_000,
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
