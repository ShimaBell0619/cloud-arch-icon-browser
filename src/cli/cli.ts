import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import open from "open";
import {
  startStaticServer,
  type RunningStaticServer,
} from "./server.js";

const HELP_TEXT = `Cloud Arch Icon Browser

Usage:
  cloud-arch-icon-browser
  cloud-arch-icon-browser --help
  cloud-arch-icon-browser --version

Options:
  -h, --help       Show this help message
  -v, --version    Show the package version
`;

type CliCommand =
  | { kind: "start" }
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "invalid"; arguments: readonly string[] };

type BrowserOpener = (target: string) => Promise<unknown>;
type MessageWriter = (message: string) => void;

export function parseCliArguments(args: readonly string[]): CliCommand {
  if (args.length === 0) {
    return { kind: "start" };
  }

  if (args.length === 1) {
    const argument = args[0];
    if (argument === "-h" || argument === "--help") {
      return { kind: "help" };
    }
    if (argument === "-v" || argument === "--version") {
      return { kind: "version" };
    }
  }

  return { kind: "invalid", arguments: [...args] };
}

export async function readPackageVersion(): Promise<string> {
  const packageJsonUrl = new URL("../../package.json", import.meta.url);
  const packageJsonText = await readFile(packageJsonUrl, "utf8");
  const packageJson: unknown = JSON.parse(packageJsonText);

  if (!isRecord(packageJson) || typeof packageJson.version !== "string") {
    throw new Error("package.json does not contain a valid version string.");
  }

  return packageJson.version;
}

export async function attemptBrowserOpen(
  url: string,
  opener: BrowserOpener = open,
  warn: MessageWriter = (message) => process.stderr.write(message),
): Promise<void> {
  try {
    await opener(url);
  } catch (error) {
    warn(
      `Unable to open the default browser automatically: ${formatError(error)}\n` +
        `Open ${url} manually to continue.\n`,
    );
  }
}

export async function runCli(args: readonly string[]): Promise<number> {
  const command = parseCliArguments(args);

  if (command.kind === "help") {
    process.stdout.write(HELP_TEXT);
    return 0;
  }

  if (command.kind === "version") {
    try {
      process.stdout.write(`${await readPackageVersion()}\n`);
      return 0;
    } catch (error) {
      process.stderr.write(`Unable to read package version: ${formatError(error)}\n`);
      return 1;
    }
  }

  if (command.kind === "invalid") {
    process.stderr.write(
      `Unsupported arguments: ${command.arguments.join(" ")}\n` +
        "Run cloud-arch-icon-browser --help for supported options.\n",
    );
    return 1;
  }

  let server: RunningStaticServer;
  try {
    const staticRoot = fileURLToPath(new URL("../", import.meta.url));
    server = await startStaticServer({ rootDirectory: staticRoot });
  } catch (error) {
    process.stderr.write(`Unable to start local server: ${formatError(error)}\n`);
    return 1;
  }

  process.stdout.write(`Cloud Arch Icon Browser: ${server.url}\n`);
  installShutdownHandlers(server);
  void attemptBrowserOpen(server.url);

  return 0;
}

function installShutdownHandlers(server: RunningStaticServer): void {
  let shuttingDown = false;

  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.off("SIGINT", handleSignal);
    process.off("SIGTERM", handleSignal);

    try {
      await server.close();
    } catch (error) {
      process.stderr.write(`Unable to stop local server cleanly: ${formatError(error)}\n`);
      process.exitCode = 1;
    }
  };

  const handleSignal = () => {
    void shutdown();
  };

  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
