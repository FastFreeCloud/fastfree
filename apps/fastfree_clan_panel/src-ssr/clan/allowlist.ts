/**
 * The complete set of clan subcommands this panel may ever run.
 *
 * Nothing outside this file may reach the `clan` binary. A request never
 * carries a command: the HTTP layer names an entry in READ_COMMANDS or
 * WRITE_COMMANDS, and this module supplies the argv. There is no code path
 * that concatenates user input into a shell string.
 *
 * Denied on purpose (see CLAUDE.md "Hard safety rules"):
 *   machines install   — overwrites the target disk
 *   machines delete    — destroys the inventory entry
 *   machines create    — mutates the repository
 *   machines update-hardware-config / init-hardware-config — mutates the repo
 *   flash write        — writes raw images to a device
 *   backups restore    — destructive data restore
 *   vars get / set     — reveal or rotate secret values
 *   secrets get / set / remove — same, plus group/keys
 *   templates apply    — mutates the repository
 *   update --no-check  — bypasses NixOS switch inhibitors
 */

/** Argv is fixed at module load. Only the machine name is ever interpolated,
 * and it is validated against the real machine list before it gets here. */
export type CommandSpec = {
  readonly argv: readonly string[];
  /** True for anything that changes state; requires a UI confirmation and
   * runs as a background job with a log rather than a blocking request. */
  readonly mutating: boolean;
  /** Seconds before the child is killed. */
  readonly timeoutMs: number;
};

/** Commands that only read. Safe to call from a plain GET. */
export const READ_COMMANDS = {
  show: { argv: ["clan", "show"], mutating: false, timeoutMs: 60_000 },

  machinesList: {
    argv: ["clan", "machines", "list"],
    mutating: false,
    timeoutMs: 120_000,
  },

  /** `clan select` is the only command in clan-core that emits JSON, so the
   * panel uses it instead of scraping tables. */
  select: {
    argv: ["clan", "select", "__selector__"],
    mutating: false,
    timeoutMs: 180_000,
  },

  stateList: {
    argv: ["clan", "state", "list", "__machine__"],
    mutating: false,
    timeoutMs: 180_000,
  },

  varsList: {
    argv: ["clan", "vars", "list", "__machine__"],
    mutating: false,
    timeoutMs: 180_000,
  },

  /** Reports missing or stale vars. Read-only: it does not write. */
  varsCheck: { argv: ["clan", "vars", "check"], mutating: false, timeoutMs: 240_000 },

  backupsList: {
    argv: ["clan", "backups", "list", "__machine__"],
    mutating: false,
    timeoutMs: 180_000,
  },

  secretsList: { argv: ["clan", "secrets", "list"], mutating: false, timeoutMs: 120_000 },

  networkList: { argv: ["clan", "network", "list"], mutating: false, timeoutMs: 120_000 },

  networkPing: {
    argv: ["clan", "network", "ping", "__machine__"],
    mutating: false,
    timeoutMs: 120_000,
  },

  /** `tofu` rather than the `ask` default: `ask` blocks on stdin and would
   * hang forever inside a background job with no TTY. TOFU records the host
   * key on first use instead of prompting. */
  generations: {
    argv: [
      "clan",
      "machines",
      "generations",
      "__machine__",
      "--host-key-check",
      "tofu",
    ],
    mutating: false,
    timeoutMs: 240_000,
  },
} as const satisfies Record<string, CommandSpec>;

/** Commands that change state. Each one requires a UI confirmation and runs
 * as a background job whose output is streamed to the Jobs screen. */
export const WRITE_COMMANDS = {
  /** A real update. Never given `--no-check`: a blocked switch inhibitor must
   * surface to the operator, not be forced past. */
  machinesUpdate: {
    argv: [
      "clan",
      "machines",
      "update",
      "__machine__",
      "--host-key-check",
      "tofu",
    ],
    mutating: true,
    timeoutMs: 1_800_000,
  },

  /** Dry run only. `clan machines build` has no deploy side effect on its own
   * and `--dry-run` stops before compiling anything. */
  machinesBuildDryRun: {
    argv: ["clan", "machines", "build", "__machine__", "--dry-run"],
    mutating: true,
    timeoutMs: 600_000,
  },

  backupsCreate: {
    argv: ["clan", "backups", "create", "__machine__"],
    mutating: true,
    timeoutMs: 1_800_000,
  },
} as const satisfies Record<string, CommandSpec>;

export type ReadCommandId = keyof typeof READ_COMMANDS;
export type WriteCommandId = keyof typeof WRITE_COMMANDS;

export const READ_COMMAND_IDS = Object.keys(READ_COMMANDS) as ReadCommandId[];
export const WRITE_COMMAND_IDS = Object.keys(WRITE_COMMANDS) as WriteCommandId[];

/** Substrings that must never appear in a resolved argv. Belt and braces:
 * even if READ_COMMANDS or WRITE_COMMANDS were edited badly, this catches the
 * destructive verbs before anything is spawned. */
const DENIED_FRAGMENTS = [
  "install",
  "delete",
  "create",
  "restore",
  "flash",
  "get",
  "set",
  "remove",
  "apply",
  "--no-check",
] as const;

/**
 * Substitutions allowed in a spec's argv. Deliberately narrow: a machine name
 * or a `clan select` selector, nothing else.
 */
const PLACEHOLDERS = ["__machine__", "__selector__"] as const;

export class CommandNotAllowedError extends Error {
  constructor(public readonly commandId: string) {
    super(`command not allowed: ${commandId}`);
    this.name = "CommandNotAllowedError";
  }
}

export function isReadCommand(id: string): id is ReadCommandId {
  return Object.prototype.hasOwnProperty.call(READ_COMMANDS, id);
}

export function isWriteCommand(id: string): id is WriteCommandId {
  return Object.prototype.hasOwnProperty.call(WRITE_COMMANDS, id);
}

/** Runtime guard used by the HTTP layer before a POST is accepted. */
export function isValidWriteCommand(id: string): id is WriteCommandId {
  return isWriteCommand(id);
}

/** Same idea for read commands, kept for symmetry at the call sites. */
export function isValidReadCommand(id: string): id is ReadCommandId {
  return isReadCommand(id);
}

export function isKnownCommand(id: string): boolean {
  return isReadCommand(id) || isWriteCommand(id);
}

export function getCommand(id: string): CommandSpec {
  if (isReadCommand(id)) return READ_COMMANDS[id];
  if (isWriteCommand(id)) return WRITE_COMMANDS[id];
  throw new CommandNotAllowedError(id);
}

/**
 * Fill a spec's placeholders. `machine` must already have been validated
 * against `clan select`; `selector` must match the small grammar `clan select`
 * accepts, which is attribute paths over the flake and never a path on disk.
 */
export function resolveArgv(
  spec: CommandSpec,
  values: { machine?: string; selector?: string } = {},
): string[] {
  const argv: string[] = [];

  for (const token of spec.argv) {
    if (token === "__machine__") {
      if (!values.machine) throw new CommandNotAllowedError("missing machine");
      argv.push(values.machine);
      continue;
    }
    if (token === "__selector__") {
      if (!values.selector) throw new CommandNotAllowedError("missing selector");
      argv.push(values.selector);
      continue;
    }
    argv.push(token);
  }

  assertSafeArgv(argv);
  return argv;
}

/**
 * Reject anything the denylist would catch. `get` and `create` are matched on
 * a whole-token basis so that legitimate commands containing those letters
 * (`generations`, `network`) are not caught, while the real verbs are.
 */
export function assertSafeArgv(argv: readonly string[]): void {
  for (const token of argv) {
    for (const placeholder of PLACEHOLDERS) {
      if (token === placeholder) {
        throw new CommandNotAllowedError(`unresolved ${placeholder}`);
      }
    }

    const bare = token.replace(/^--?/, "");
    if ((DENIED_FRAGMENTS as readonly string[]).includes(bare)) {
      throw new CommandNotAllowedError(token);
    }
    if (token.startsWith("--no-check")) {
      throw new CommandNotAllowedError(token);
    }
  }
}

/**
 * The machine name grammar. `clan` uses these as an attribute-path segment, so
 * anything outside this set could escape the attribute path.
 */
const MACHINE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export function isValidMachineName(value: unknown): value is string {
  return typeof value === "string" && MACHINE_NAME_RE.test(value);
}

/**
 * The selector grammar, used only for `clan select`. Attribute paths over the
 * flake: dotted identifiers, `*` and `{}` globs, single or double quotes.
 * No spaces, slashes, backslashes, or shell metacharacters.
 */
const SELECTOR_RE = /^[A-Za-z0-9_.*'"{}-]+$/;

export function isValidSelector(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= 300 && SELECTOR_RE.test(value)
  );
}