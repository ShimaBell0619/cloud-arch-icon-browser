import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../cli/index.js", import.meta.url));
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
  const url = await waitForUrl();
  const response = await fetch(url);
  assert(response.status === 200, `GET / returned ${response.status}`);
  assert(
    response.headers
      .get("content-security-policy")
      ?.includes("script-src 'self'"),
    "GET / did not include the expected CSP",
  );

  const postResponse = await fetch(url, { method: "POST" });
  assert(
    postResponse.status === 405,
    `POST / returned ${postResponse.status} instead of 405`,
  );

  child.kill("SIGINT");
  const exit = await waitForExit();
  assert(exit.code === 0, `CLI exited with ${exit.code}; stderr: ${stderr}`);
  assert(exit.signal === null, `CLI exited from signal ${exit.signal}`);
  completed = true;
  console.log(`CLI server smoke check passed at ${url}`);
} finally {
  if (!completed && child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
  }
}

async function waitForUrl() {
  const deadline = Date.now() + 10_000;
  const pattern = /http:\/\/127\.0\.0\.1:\d+\//;

  while (Date.now() < deadline) {
    const match = stdout.match(pattern);
    if (match) return match[0];
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `CLI exited before printing a URL. stdout: ${stdout} stderr: ${stderr}`,
      );
    }
    await delay(25);
  }

  throw new Error(`Timed out waiting for CLI URL. stderr: ${stderr}`);
}

function waitForExit() {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }

  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => {
      rejectPromise(new Error("Timed out waiting for CLI shutdown."));
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
