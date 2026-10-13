/**
 * The only module that spawns `clan`. Everything goes through `execFile` with
 * an argument array — there is no shell anywhere in this file, so no value
 * that reaches it can be interpreted as shell syntax.
 */
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  getCommand,
  isValidMachineName,
  isValidSelector,
  resolveArgv,
  type CommandSpec,
} from "./allowlist.js";

export class ClanError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = "ClanError";
  }
}

type ExecOptions = {
  spec: CommandSpec;
  machine?: string;
  selector?: string;
  signal?: AbortSignal;
};

type ExecResult = {
  argv: string[];
  stdout: string;
  stderr: string;
  code: number;
  durationMs: number;
  timedOut: boolean;
};

/** `CLAN_DIR` points at the clan repository (the one holding clan.nix). */
function clanDir(): string {
  const dir = process.env["CLAN_DIR"];
  if (!dir) throw new ClanError("CLAN_DIR is not set", "config");
  return dir;
}

/** `clan` is not on the system PATH; the Nix devshell provides it. */
function clanBinary(): string {
  return process.env["CLAN_BINARY"] ?? "clan";
}

/** Cache the identity of the toolchain so the UI can show what it is talking to. */
let cachedVersion: string | null = null;

export async function clanVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;
  const result = await runClan({ spec: { argv: ["--version"], mutating: false, timeoutMs: 30_000 } });
  cachedVersion = result.stdout.trim().split("\n")[0] ?? "unknown";
  return cachedVersion;
}

/**
 * Run one allowlisted command and collect its output.
 *
 * Read commands are cached for a minute by the caller (see `clan-api.ts`),
 * because most of them evaluate the flake and would otherwise re-evaluate it
 * on every dashboard poll.
 */
export async function runClan(options: ExecOptions): Promise<ExecResult> {
  const { spec, machine, selector } = options;

  if (machine !== undefined && !isValidMachineName(machine)) {
    throw new ClanError(`invalid machine name: ${machine}`, "bad_machine");
  }
  if (selector !== undefined && !isValidSelector(selector)) {
    throw new ClanError("invalid selector", "bad_selector");
  }

  // exactOptionalPropertyTypes: an absent key and an explicit undefined are
  // different types, so build the object conditionally.
  const substitutions: { machine?: string; selector?: string } = {};
  if (machine !== undefined) substitutions.machine = machine;
  if (selector !== undefined) substitutions.selector = selector;

  const argv = resolveArgv(spec, substitutions);
  const cwd = clanDir();
  const started = Date.now();

  return await new Promise<ExecResult>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const child = execFile(
      clanBinary(),
      argv,
      {
        cwd,
        timeout: spec.timeoutMs,
        maxBuffer: 32 * 1024 * 1024,
        signal: options.signal,
        // No shell. `argv` is passed straight to execve.
        env: {
          ...process.env,
          // Keep sops decryption available to the commands that need it.
          SOPS_AGE_KEY_FILE: process.env["SOPS_AGE_KEY_FILE"] ?? join(clanDir(), ".age-key"),
        },
      },
      (error, out, err) => {
        stdout = out ?? "";
        stderr = err ?? "";
        const code =
          error && typeof (error as { code?: unknown }).code === "number"
            ? ((error as { code: number }).code)
            : error
              ? 1
              : 0;
        resolve({
          argv,
          stdout,
          stderr,
          code,
          durationMs: Date.now() - started,
          timedOut,
        });
      },
    );

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
  });
}

/** Convenience wrapper for the read-only paths used by the HTTP layer. */
export async function runRead(
  commandId: string,
  values: { machine?: string; selector?: string; signal?: AbortSignal } = {},
): Promise<ExecResult> {
  const spec = getCommand(commandId);
  if (spec.mutating) {
    throw new ClanError(`${commandId} is not a read command`, "not_read");
  }
  return await runClan({ spec, ...values });
}

/**
 * `clan select` emits JSON. Anything else is text and must be parsed by a
 * caller that has a verified fixture in docs/verified-outputs/.
 */
export function parseJsonOutput<T>(result: ExecResult): T {
  const text = result.stdout.trim();
  if (!text) {
    throw new ClanError("empty output", "empty_output", result.stderr.slice(0, 500));
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new ClanError(
      "output is not valid JSON",
      "bad_json",
      `${(error as Error).message}\n${text.slice(0, 500)}`,
    );
  }
}

/**
 * Read the age identity used to decrypt vars, if one is configured. Only the
 * path is ever returned — the file is never sent to the browser.
 */
export async function ageKeyPath(): Promise<string | null> {
  const candidate = process.env["SOPS_AGE_KEY_FILE"];
  if (!candidate) return null;
  try {
    await readFile(candidate);
    return candidate;
  } catch {
    return null;
  }
}