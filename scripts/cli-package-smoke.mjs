import { spawn, spawnSync } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const npmExecPath = process.env.npm_execpath;
const NPM_COMMAND_TIMEOUT_MS = 120_000;
const NPM_TARBALL_INSTALL_TIMEOUT_MS =
  process.platform === "win32" ? 300_000 : NPM_COMMAND_TIMEOUT_MS;

assert(typeof packageJson.name === "string", "package.json is missing name");
assert(
  typeof packageJson.version === "string",
  "package.json is missing version",
);
assert(
  packageJson.bin && typeof packageJson.bin === "object",
  "package.json is missing bin",
);
assert(
  npmExecPath,
  "npm_execpath is required; run this smoke check through npm",
);

const binEntries = Object.entries(packageJson.bin);
assert(
  binEntries.length === 1,
  "package.json must expose exactly one CLI binary",
);
const [binName, binRelativePath] = binEntries[0];
assert(
  typeof binRelativePath === "string",
  "package.json bin target must be a string",
);

const workspace = await mkdtemp(join(tmpdir(), "cloud-arch-package-smoke-"));

try {
  const packResult = runNpm(
    ["pack", "--json", "--pack-destination", workspace],
    repositoryRoot,
  );
  assertSuccess(packResult, "npm pack");

  const packOutput = JSON.parse(packResult.stdout);
  assert(
    Array.isArray(packOutput) && packOutput.length === 1,
    "npm pack did not return exactly one package",
  );

  const packed = packOutput[0];
  assert(
    packed && typeof packed.filename === "string",
    "npm pack did not report the tarball filename",
  );

  const packedFiles = new Set(
    Array.isArray(packed.files)
      ? packed.files.map((file) => file.path).filter(Boolean)
      : [],
  );
  for (const requiredPath of [
    "package.json",
    "cli/index.js",
    "dist/index.html",
    "README.md",
    "LICENSE",
    "THIRD_PARTY_NOTICES.md",
  ]) {
    assert(
      packedFiles.has(requiredPath),
      `packed package is missing ${requiredPath}`,
    );
  }
  assert(
    ![...packedFiles].some(
      (path) => path.startsWith("src/") || path.startsWith("scripts/"),
    ),
    "packed package unexpectedly contains source or test-support files",
  );

  const tarballPath = join(workspace, packed.filename);
  await access(tarballPath);

  const installRoot = join(workspace, "installed");
  await mkdir(installRoot);
  await writeFile(
    join(installRoot, "package.json"),
    `${JSON.stringify({ name: "cli-package-smoke", private: true }, null, 2)}\n`,
    "utf8",
  );

  // CI runs npm ci before this smoke check, so production dependencies are
  // already warm in npm's cache. Keep the isolated tarball install offline to
  // avoid registry latency, and allow extra time on Windows where extraction
  // and antivirus scanning can make the temporary install substantially slower.
  const installResult = runNpm(
    [
      "install",
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--no-package-lock",
      "--no-save",
      tarballPath,
    ],
    installRoot,
    NPM_TARBALL_INSTALL_TIMEOUT_MS,
  );
  assertSuccess(installResult, "installing packed CLI");

  const packageRoot = join(
    installRoot,
    "node_modules",
    ...packageJson.name.split("/"),
  );
  const installedManifest = JSON.parse(
    await readFile(join(packageRoot, "package.json"), "utf8"),
  );
  assert(
    installedManifest.version === packageJson.version,
    "installed package version does not match the source manifest",
  );

  const cliPath = resolve(packageRoot, binRelativePath);
  const distIndexPath = join(packageRoot, "dist", "index.html");
  await access(cliPath);
  await access(distIndexPath);

  const versionResult = runNpm(
    ["exec", "--offline", "--", binName, "--version"],
    installRoot,
  );
  assertSuccess(versionResult, "executing the installed package binary");
  assert(
    versionResult.stdout.trim() === packageJson.version,
    `installed package binary reported ${versionResult.stdout.trim()} instead of ${packageJson.version}`,
  );

  await smokeInstalledServer(cliPath);
  console.log(`Packaged CLI smoke check passed for ${packageJson.name}.`);
} finally {
  await rm(workspace, { recursive: true, force: true });
}

async function smokeInstalledServer(cliPath) {
  const child = spawn(process.execPath, [cliPath], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  let completed = false;

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  try {
    const url = await waitForUrl(
      child,
      () => stdout,
      () => stderr,
    );
    const response = await fetch(url);
    assert(
      response.status === 200,
      `packaged GET / returned ${response.status}`,
    );
    assert(
      response.headers
        .get("content-security-policy")
        ?.includes("script-src 'self'"),
      "packaged GET / did not include the expected CSP",
    );

    const postResponse = await fetch(url, { method: "POST" });
    assert(
      postResponse.status === 405,
      `packaged POST / returned ${postResponse.status} instead of 405`,
    );

    if (process.platform === "win32") {
      child.kill();
      await waitForExit(child, stderr);
    } else {
      child.kill("SIGINT");
      const exit = await waitForExit(child, stderr);
      assert(exit.code === 0, `packaged CLI exited with ${exit.code}`);
      assert(
        exit.signal === null,
        `packaged CLI exited from signal ${exit.signal}`,
      );
    }

    completed = true;
  } finally {
    if (!completed && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
    }
  }
}

function runNpm(args, cwd, timeout = NPM_COMMAND_TIMEOUT_MS) {
  return spawnSync(process.execPath, [npmExecPath, ...args], {
    cwd,
    encoding: "utf8",
    timeout,
  });
}

function assertSuccess(result, operation) {
  if (result.error) throw result.error;
  assert(
    result.status === 0,
    `${operation} failed with ${result.status}. stdout: ${result.stdout} stderr: ${result.stderr}`,
  );
}

async function waitForUrl(child, getStdout, getStderr) {
  const deadline = Date.now() + 10_000;
  const pattern = /http:\/\/127\.0\.0\.1:\d+\//;

  while (Date.now() < deadline) {
    const match = getStdout().match(pattern);
    if (match) return match[0];
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `Packaged CLI exited before printing a URL. stdout: ${getStdout()} stderr: ${getStderr()}`,
      );
    }
    await delay(25);
  }

  throw new Error(
    `Timed out waiting for packaged CLI URL. stderr: ${getStderr()}`,
  );
}

function waitForExit(child, stderr) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }

  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => {
      rejectPromise(
        new Error(`Timed out waiting for packaged CLI shutdown. ${stderr}`),
      );
    }, 10_000);

    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolvePromise({ code, signal });
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      rejectPromise(error);
    });
  });
}

function delay(milliseconds) {
  return new Promise((resolvePromise) =>
    setTimeout(resolvePromise, milliseconds),
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
