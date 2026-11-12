/**
 * Backend configuration.
 *
 * Every value here is read from the process environment only. Nothing in this
 * file may ever be imported by the SPA: secrets and paths must stay server-side.
 */

import { existsSync, readFileSync } from 'node:fs';
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
 * The Clan repository root (optional in declarative CI/CD production).
 * Resolved server-side only. Does not assume server-side git repositories.
 */
function readClanDir(): string | null {
  const raw = process.env.CLAN_DIR?.trim();
  if (raw && raw.length > 0 && existsSync(raw)) {
    return resolve(raw);
  }
  const candidates = [
    resolve(process.cwd(), '../fastfree_os'),
    resolve(process.cwd(), 'apps/fastfree_os'),
    '/etc/clan',
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Bootstrap bearer token. Optional: when absent the backend relies on the
 * trusted reverse proxy to enforce authentication.
 */
function readBootstrapToken(): string | null {
  const raw = process.env.CLAN_PANEL_TOKEN?.trim();
  return raw && raw.length > 0 ? raw : null;
}

/**
 * Read GitHub token from environment or `/etc/fastfree/github-token`.
 */
function readGithubToken(): string | null {
  const envToken = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();
  if (envToken && envToken.length > 0) {
    return envToken;
  }
  try {
    const tokenPath = '/etc/fastfree/github-token';
    if (existsSync(tokenPath)) {
      const content = readFileSync(tokenPath, 'utf8').trim();
      if (content.length > 0) {
        return content;
      }
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

/**
 * Read GitHub repository owner & name.
 */
function readGithubRepo(): { owner: string; repo: string } {
  const envRepo = process.env.GITHUB_REPOSITORY?.trim() || process.env.FASTFREE_GITHUB_REPO?.trim();
  if (envRepo && envRepo.includes('/')) {
    const [owner, repo] = envRepo.split('/');
    if (owner && repo) {
      return { owner, repo };
    }
  }
  return { owner: 'FastFreeCloud', repo: 'fastfree' };
}

export const config = {
  host: readHost(),
  port: readPort(),

  clanDir: readClanDir(),
  clanConfigured: true,
  bootstrapToken: readBootstrapToken(),

  githubToken: readGithubToken(),
  githubRepo: readGithubRepo(),

  /** Ceiling on captured `clan` stdout+stderr bytes, to bound memory use. */
  maxOutputBytes: readPositiveInt('CLAN_PANEL_MAX_OUTPUT_BYTES', DEFAULT_MAX_OUTPUT_BYTES),
  /** Hard wall-clock limit per `clan` invocation. */
  commandTimeoutMs: readPositiveInt('CLAN_PANEL_COMMAND_TIMEOUT_MS', DEFAULT_COMMAND_TIMEOUT_MS),
  /** Max simultaneously running read-only Clan commands. */
  maxConcurrency: readPositiveInt('CLAN_PANEL_MAX_CONCURRENCY', 4),
} as const;

export type Config = typeof config;
