/**
 * Frozen allowlist of read-only `clan` commands.
 *
 * Rules (docs/spa-architecture.md, CLAUDE.md):
 *   - the browser may never choose a command or an arbitrary argument;
 *   - only the fixed argv templates below may ever be spawned;
 *   - state-changing commands are permanently forbidden and are additionally
 *     asserted by DENYLIST, so a template can never accidentally permit them.
 *
 * Every entry was verified against the real `clan <x> --help` of clan-core
 * 26.05 before being added:
 *   - `global show` does NOT exist in 26.05. The top-level command is `clan show`.
 *   - `clan services list` does NOT exist; clan 26.05 has no `services`
 *     subcommand at all. It is therefore intentionally absent here.
 */

import { ApiError } from '../http/errors.js';

export type ReadOnlyCommandId =
  | 'machines.list'
  | 'global.show'
  | 'network.overview'
  | 'network.list'
  | 'secrets.groups.list'
  | 'vars.list'
  | 'select.machines';

export type AllowedCommandId = ReadOnlyCommandId | 'machines.update';

export interface AllowedCommand {
  readonly id: AllowedCommandId;
  /** Exact argv, without the binary name. Compared token by token. */
  readonly argv: readonly string[];
  readonly description: string;
}

export type ReadOnlyCommand = AllowedCommand;

function template(
  id: ReadOnlyCommandId,
  argv: readonly string[],
  description: string,
): ReadOnlyCommand {
  return Object.freeze({ id, argv: Object.freeze([...argv]), description });
}

export const READ_ONLY_COMMANDS: { readonly [K in ReadOnlyCommandId]: ReadOnlyCommand } =
  Object.freeze({
    'machines.list': template(
      'machines.list',
      ['machines', 'list'],
      'List every machine managed by the Clan repository.',
    ),
    'global.show': template(
      'global.show',
      ['show'],
      'Show clan meta information: name, description and domain.',
    ),
    'network.overview': template(
      'network.overview',
      ['network', 'overview'],
      'Show the connectivity state of every configured network.',
    ),
    'network.list': template(
      'network.list',
      ['network', 'list'],
      'List configured networks with priority, module and peers.',
    ),
    'secrets.groups.list': template(
      'secrets.groups.list',
      ['secrets', 'groups', 'list'],
      'List secret group names only. Never exposes a secret value.',
    ),
    'vars.list': template(
      'vars.list',
      ['vars', 'list'],
      'List clan variables and their state.',
    ),
    'select.machines': template(
      'select.machines',
      ['select', 'machines'],
      'Query clan machines and metadata.',
    ),
  });

/**
 * Permanently forbidden argv prefixes.
 *
 * Each entry is matched as a *prefix*, so `machines install` also blocks
 * `machines install client1`. Verified to exist in clan-core 26.05 except
 * `update --no-check`, which has no top-level `clan update` in 26.05 at all;
 * it is kept so the rule also holds if that command returns later.
 */
export const DENYLIST: readonly (readonly string[])[] = Object.freeze([
  Object.freeze(['machines', 'install']),
  Object.freeze(['machines', 'delete']),
  Object.freeze(['machines', 'create']),
  Object.freeze(['machines', 'update-hardware-config']),
  Object.freeze(['machines', 'init-hardware-config']),
  Object.freeze(['flash', 'write']),
  Object.freeze(['backups', 'restore']),
  Object.freeze(['vars', 'get']),
  Object.freeze(['vars', 'set']),
  Object.freeze(['secrets', 'get']),
  Object.freeze(['secrets', 'set']),
  Object.freeze(['secrets', 'remove']),
  Object.freeze(['templates', 'apply']),
  Object.freeze(['update', '--no-check']),
]);

function startsWith(args: readonly string[], prefix: readonly string[]): boolean {
  if (prefix.length > args.length) {
    return false;
  }
  return prefix.every((token, index) => args[index] === token);
}

function sameArgv(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && startsWith(a, b);
}

/** The deny rule that matched, or `null`. Exposed for server-side logging only. */
export function denylistMatch(args: readonly string[]): readonly string[] | null {
  for (const rule of DENYLIST) {
    if (startsWith(args, rule)) {
      return rule;
    }
  }
  return null;
}

const MACHINE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/i;

/**
 * The single guard every spawn must pass.
 *
 * @throws ApiError FORBIDDEN when the argv is not an exact allowlist template
 *         or when it matches a denylist prefix. Never includes the argv itself
 *         in the message.
 */
export function assertAllowed(args: readonly string[]): AllowedCommand {
  if (denylistMatch(args) !== null) {
    throw new ApiError('FORBIDDEN', 'This command is permanently disabled.');
  }

  for (const command of Object.values(READ_ONLY_COMMANDS)) {
    if (sameArgv(args, command.argv)) {
      return command;
    }
  }

  // Handle parameterized 'machines update <machine>' command
  if (args[0] === 'machines' && args[1] === 'update') {
    const machine = args[2];
    if (!machine || !MACHINE_NAME_PATTERN.test(machine)) {
      throw ApiError.validation('Invalid machine name for update.', { field: 'name' });
    }
    if (args.length === 3) {
      return {
        id: 'machines.update',
        argv: Object.freeze([...args]),
        description: `Update Clan machine ${machine}.`,
      };
    }
    if (
      args.length === 5 &&
      args[3] === '--host-key-check' &&
      (args[4] === 'tofu' || args[4] === 'ask')
    ) {
      return {
        id: 'machines.update',
        argv: Object.freeze([...args]),
        description: `Update Clan machine ${machine} with host-key-check ${args[4]}.`,
      };
    }
  }

  throw new ApiError('FORBIDDEN', 'This command is not in the allowlist.');
}

export function isReadOnlyCommandId(value: string): value is ReadOnlyCommandId {
  return Object.prototype.hasOwnProperty.call(READ_ONLY_COMMANDS, value);
}

/** argv for a known command id. Throws for an unknown id. */
export function argvFor(id: ReadOnlyCommandId): readonly string[] {
  const command = READ_ONLY_COMMANDS[id];
  return command.argv;
}