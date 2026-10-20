/**
 * Parsers for the allowlisted `clan` commands.
 *
 * Every shape below was captured from clan-core 26.05 on this machine
 * (CLAN_DIR=apps/fastfree_os). Verified raw output:
 *
 *   $ clan machines list
 *   client1
 *   client2
 *   client3
 *
 *   $ clan show
 *   Name: fastfree
 *   Description: None
 *   Domain: fastfree.local
 *
 *   $ clan network overview
 *   wireguard [ONLINE]
 *
 *   $ clan network list
 *   Network       Priority  Module      Running   Peers
 *   ---------------------------------------------------
 *   wireguard     1000      direct      Yes       client2, client1, client3
 *
 *   $ clan secrets groups list
 *   (no output, exit 0)
 *
 * `clan` has no `--json` flag in 26.05 (`clan machines list --json` errors with
 * "unrecognized arguments"), so the parsers work on the text formats above.
 *
 * Every parser is tolerant: an unrecognised line is skipped, never thrown on, so
 * a cosmetic CLI change degrades the response instead of breaking the endpoint.
 * All parsers are pure functions of stdout and are unit-testable.
 */

import { MACHINE_NAME_PATTERN } from './exec.js';

/** Matches one real ANSI SGR sequence; `clan` emitted none here but this is cheap insurance. */
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\[[0-9;]*[A-Za-z]/g;

/** Remove ANSI decoration and trailing whitespace, then split into logical lines. */
export function toCleanLines(stdout: string): string[] {
  return stdout
    .replace(ANSI_PATTERN, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** The python/argparse spelling for "this field has no value". */
const NONE_LITERALS = new Set(['none', 'null', '']);

function nullIfNone(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return NONE_LITERALS.has(trimmed.toLowerCase()) ? null : trimmed;
}

export interface MachineSummary {
  /** Machine name exactly as printed by `clan machines list`. */
  name: string;
  /** Hostname or deploy target host. */
  hostname: string | null;
  /** Reachability / live status. */
  isOnline: boolean | null;
  roles?: string[];
  description?: string | null;
  targetHost?: string | null;
  buildHost?: string | null;
  machineClass?: string | null;
  installedAt?: string | null;
}

/**
 * `clan machines list` output is one bare machine name per line. A line is only
 * accepted when the *whole* line is a valid machine identifier, so warnings,
 * debug output and prose are skipped instead of being reported as machines.
 */
export function parseMachines(stdout: string): MachineSummary[] {
  const seen = new Set<string>();
  const machines: MachineSummary[] = [];

  for (const line of toCleanLines(stdout)) {
    if (!MACHINE_NAME_PATTERN.test(line)) {
      continue;
    }
    if (seen.has(line)) {
      continue;
    }
    seen.add(line);
    machines.push({ name: line, hostname: null, isOnline: null });
  }

  return machines;
}

export interface GlobalSummary {
  /** `clan show` -> "Name: fastfree". */
  name: string | null;
  /** `clan show` -> "Description: None" becomes null. */
  description: string | null;
  /** `clan show` -> "Domain: fastfree.local". */
  domain: string | null;
}

/**
 * `clan show` prints `Key: value` lines. Unknown keys are ignored so a future
 * field cannot break the endpoint, and the parser never throws.
 */
export function parseGlobalShow(stdout: string): GlobalSummary {
  let name: string | null = null;
  let description: string | null = null;
  let domain: string | null = null;

  for (const line of toCleanLines(stdout)) {
    const separator = line.indexOf(':');
    if (separator < 0) {
      continue;
    }
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1);

    if (key === 'name') {
      name = nullIfNone(value);
    } else if (key === 'description') {
      description = nullIfNone(value);
    } else if (key === 'domain') {
      domain = nullIfNone(value);
    }
  }

  return { name, description, domain };
}

export interface NetworkOverviewEntry {
  /** Network name, e.g. "wireguard". */
  network: string;
  /** Raw bracketed state token, e.g. "ONLINE". Kept verbatim, uppercased. */
  state: string;
}

/** `clan network overview` prints one `<network> [STATE]` line per network. */
export function parseNetworkOverview(stdout: string): NetworkOverviewEntry[] {
  const entries: NetworkOverviewEntry[] = [];
  const pattern = /^([A-Za-z0-9_.-]+)\s*\[\s*([A-Za-z0-9_ -]+?)\s*]$/;

  for (const line of toCleanLines(stdout)) {
    const match = pattern.exec(line);
    const network = match?.[1];
    const state = match?.[2];
    if (network === undefined || state === undefined) {
      continue;
    }
    entries.push({ network, state: state.toUpperCase() });
  }

  return entries;
}

export interface NetworkListRow {
  network: string;
  priority: number | null;
  module: string | null;
  running: boolean | null;
  peers: string[];
}

function parseRunning(token: string | undefined): boolean | null {
  if (token === undefined) {
    return null;
  }
  const value = token.trim().toLowerCase();
  if (value === 'yes' || value === 'true' || value === 'running') {
    return true;
  }
  if (value === 'no' || value === 'false' || value === 'stopped') {
    return false;
  }
  return null;
}

function parsePeers(token: string | undefined): string[] {
  if (token === undefined || token.trim().length === 0) {
    return [];
  }
  return token
    .split(',')
    .map((peer) => peer.trim())
    .filter((peer) => peer.length > 0);
}

/**
 * `clan network list` prints a fixed-width table: a header row, a dashed rule,
 * then the data rows. Column boundaries are taken from the header offsets so
 * values containing spaces survive; a dashed rule or unknown row is skipped.
 */
export function parseNetworkList(stdout: string): NetworkListRow[] {
  const lines = stdout
    .replace(ANSI_PATTERN, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => line.trim().length > 0);

  const headerIndex = lines.findIndex(
    (line) => /\bNetwork\b/.test(line) && /\bPeers\b/.test(line),
  );
  if (headerIndex < 0) {
    return [];
  }

  const header = lines[headerIndex];
  if (header === undefined) {
    return [];
  }

  const offsets: { key: 'network' | 'priority' | 'module' | 'running' | 'peers'; start: number }[] = [];
  for (const key of ['Network', 'Priority', 'Module', 'Running', 'Peers'] as const) {
    const start = header.indexOf(key);
    if (start >= 0) {
      offsets.push({ key: key.toLowerCase() as 'network', start });
    }
  }

  const rows: NetworkListRow[] = [];

  for (const line of lines.slice(headerIndex + 1)) {
    // Skip the dashed rule under the header.
    if (/^[\s-]+$/.test(line)) {
      continue;
    }

    const cells = new Map<string, string>();
    for (let index = 0; index < offsets.length; index += 1) {
      const current = offsets[index];
      const next = offsets[index + 1];
      if (current === undefined) {
        continue;
      }
      const end = next === undefined ? line.length : next.start;
      cells.set(current.key, line.slice(current.start, end).trim());
    }

    const network = cells.get('network');
    if (network === undefined || network.length === 0) {
      continue;
    }

    const priorityToken = cells.get('priority');
    const priority = priorityToken === undefined ? Number.NaN : Number.parseInt(priorityToken, 10);

    rows.push({
      network,
      priority: Number.isInteger(priority) ? priority : null,
      module: cells.get('module') ?? null,
      running: parseRunning(cells.get('running')),
      peers: parsePeers(cells.get('peers')),
    });
  }

  return rows;
}

export interface SecretsGroup {
  name: string;
}

/**
 * `clan secrets groups list` returns group names only, never values.
 *
 * UNVERIFIED FORMAT: the real repository has no secret groups, so the command
 * prints nothing and exits 0. The parser therefore accepts bare one-per-line
 * names (the same shape `clan machines list` uses) and skips anything else. It
 * never echoes a value even if the CLI ever changed shape.
 */
export function parseSecretsGroups(stdout: string): SecretsGroup[] {
  const groups: SecretsGroup[] = [];
  const seen = new Set<string>();

  for (const line of toCleanLines(stdout)) {
    if (!MACHINE_NAME_PATTERN.test(line)) {
      continue;
    }
    if (seen.has(line)) {
      continue;
    }
    seen.add(line);
    groups.push({ name: line });
  }

  return groups;
}