/**
 * Backend configuration.
 *
 * Every value here is read from the process environment only. Nothing in this
 * file may ever be imported by the SPA: secrets and paths must stay server-side.
 */

import { resolve } from 'node:path';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 9099;
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;
const DEFAULT_COMMAND_TIMEOUT_MS = 20_000;

/** Loopback-only by default. Exposing this publicly requires an approved review. */
function readHost(): string {
  const raw = process.env.CLAN_PANEL_API_HOST?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_HOST;
}

function readPort(): number {
  const raw = process.env.CLAN_PANEL_API_PORT?.trim();
  if (!raw) {
    return DEFAULT_PORT;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid CLAN_PANEL_API_PORT: ${raw}`);
  }
  return parsed;
}

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}: ${raw}`);
  }
  return parsed;
}

/**
 * The Clan repository root. Resolved server-side only and never returned in any
 * API response. `null` means Clan access is not configured yet.
 */
import { existsSync } from 'node:fs';

function readClanDir(): string | null {
  const raw = process.env.CLAN_DIR?.trim();
  if (raw && raw.length > 0) {
    return resolve(raw);
  }
  const localSibling = resolve(process.cwd(), '../fastfree_os');
  if (existsSync(localSibling)) {
    return localSibling;
  }
  const rootSibling = resolve(process.cwd(), 'apps/fastfree_os');
  if (existsSync(rootSibling)) {
    return rootSibling;
  }
  return null;
}

/**
 * Bootstrap bearer token. Optional: when absent the backend relies on the
 * trusted reverse proxy to enforce authentication. It is compared in constant
 * time and never echoed back.
 */
function readBootstrapToken(): string | null {
  const raw = process.env.CLAN_PANEL_TOKEN?.trim();
  return raw && raw.length > 0 ? raw : null;
}

export const config = {
  host: readHost(),
  port: readPort(),

  clanDir: readClanDir(),
  bootstrapToken: readBootstrapToken(),

  /** Ceiling on captured `clan` stdout+stderr bytes, to bound memory use. */
  maxOutputBytes: readPositiveInt('CLAN_PANEL_MAX_OUTPUT_BYTES', DEFAULT_MAX_OUTPUT_BYTES),
  /** Hard wall-clock limit per `clan` invocation. */
  commandTimeoutMs: readPositiveInt('CLAN_PANEL_COMMAND_TIMEOUT_MS', DEFAULT_COMMAND_TIMEOUT_MS),
  /** Max simultaneously running read-only Clan commands. */
  maxConcurrency: readPositiveInt('CLAN_PANEL_MAX_CONCURRENCY', 4),
} as const;

export type Config = typeof config;