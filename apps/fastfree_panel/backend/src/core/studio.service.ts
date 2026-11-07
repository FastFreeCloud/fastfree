/**
 * FastFree Design Studio — isolated task execution service.
 *
 * The Studio is a REAL pipeline, not a mock: every dispatched task creates a
 * detached git worktree of the monorepo (HEAD) under `.worktrees/studio-<id>`
 * and shells out to the locally installed `opencode` CLI inside it. Edits
 * therefore never touch the primary working tree or `master`; the human
 * reviews the diff, then merges manually. Nothing is ever pushed.
 *
 * Security invariants (do not relax):
 *  - no network remote, CI, deploy or secret file is ever modified;
 *  - worktrees are only deleted if they resolve inside `.worktrees`;
 *  - exactly one task runs at a time;
 *  - tasks carry a hard timeout and can be cancelled;
 *  - the API never returns raw stderr or stack traces.
 */
import { randomUUID } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { createWriteStream, promises as fsp } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import type { StudioDispatchInput } from '../schemas/studio.schema.js';

const execFileAsync = promisify(execFile);

export type StudioTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface OmnigentProbeResult {
  reachable: boolean;
  baseUrl: string;
  serverVersion: string | null;
  accountsEnabled: boolean | null;
  singleUser: boolean | null;
  agentCount: number;
  harnessCount: number;
  harnessIds: string[];
  sessionCount: number | null;
  usage: { totalCostUsd: number | null; costTodayUsd: number | null } | null;
  probedAt: string;
}

export interface StudioTask {
  id: string;
  title: string;
  prompt: string;
  target: string | null;
  status: StudioTaskStatus;
  phase: string;
  worktreePath: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  timedOut: boolean;
  error: string | null;
  exitCode: number | null;
}

export interface StudioTaskView extends StudioTask {
  logTail: string[];
  diffStat: string;
  diffShortstat: string;
  changedFiles: string[];
}

const LOG_TAIL_LINES = 400;
const LOG_FILE = 'studio-task.log';
const TASK_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_LOG_LINE = 2000;

interface Journal {
  child: ReturnType<typeof spawn> | null;
  stream: ReturnType<typeof createWriteStream> | null;
  timeout: ReturnType<typeof setTimeout> | null;
}

export class StudioService {
  private static instance: StudioService;
  private readonly tasks = new Map<string, StudioTask>();
  private readonly journals = new Map<string, Journal>();
  private repoRoot: string | null = null;

  public static getInstance(): StudioService {
    if (!StudioService.instance) StudioService.instance = new StudioService();
    return StudioService.instance;
  }

  private async getRepoRoot(): Promise<string> {
    if (this.repoRoot) return this.repoRoot;
    try {
      const { stdout } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
        cwd: process.cwd(),
        timeout: 10_000,
      });
      const root = stdout.trim();
      this.repoRoot = root && (await fsp.stat(root)).isDirectory() ? root : process.cwd();
    } catch {
      this.repoRoot = process.cwd();
    }
    return this.repoRoot;
  }

  private resolveSafeWorktree(repoRoot: string, name: string): string | null {
    const base = path.resolve(repoRoot, '.worktrees');
    const target = path.resolve(base, name);
    const rel = path.relative(base, target);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
    return target;
  }

  public async probe(): Promise<{ opencode: boolean; git: boolean; repoRoot: string; activeTaskId: string | null }> {
    const repoRoot = await this.getRepoRoot();
    let opencode = false;
    let git = true;
    const isWindows = process.platform === 'win32';
    try {
      // opencode ships as a .cmd shim on Windows — exec through cmd.exe explicitly.
      await (isWindows
        ? execFileAsync('cmd.exe', ['/d', '/s', '/c', 'opencode --version'], { timeout: 10_000 })
        : execFileAsync('opencode', ['--version'], { timeout: 10_000 }));
      opencode = true;
    } catch {
      opencode = false;
    }
    try {
      await execFileAsync('git', ['--version'], { timeout: 10_000 });
    } catch {
      git = false;
    }
    const active = this.getActiveTask();
    return { opencode, git, repoRoot, activeTaskId: active?.id ?? null };
  }

  private getActiveTask(): StudioTask | undefined {
    for (const task of this.tasks.values()) {
      if (task.status === 'queued' || task.status === 'running') return task;
    }
    return undefined;
  }

  public async dispatch(input: StudioDispatchInput): Promise<StudioTaskView> {
    const active = this.getActiveTask();
    if (active) {
      throw new Error(`TASK_IN_PROGRESS:${active.id}`);
    }

    const id = `studio-${randomUUID().slice(0, 8)}`;
    const repoRoot = await this.getRepoRoot();
    const worktreePath = this.resolveSafeWorktree(repoRoot, id);
    if (!worktreePath) {
      throw new Error('WORKTREE_PATH_INVALID');
    }

    const task: StudioTask = {
      id,
      title: input.title?.trim() || input.prompt.trim().split('\n')[0]!.slice(0, 80),
      prompt: input.prompt,
      target: input.target?.trim() || null,
      status: 'queued',
      phase: 'Creating isolated worktree',
      worktreePath,
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      timedOut: false,
      error: null,
      exitCode: null,
    };
    this.tasks.set(id, task);

    try {
      await execFileAsync('git', ['worktree', 'add', '-B', `studio/${id}`, worktreePath, 'HEAD'], {
        cwd: repoRoot,
        timeout: 60_000,
        maxBuffer: 4 * 1024 * 1024,
      });
    } catch (error) {
      task.status = 'failed';
      task.phase = 'Worktree creation failed';
      task.error = this.safeMessage(error, 'git worktree add failed');
      task.finishedAt = new Date().toISOString();
      this.tasks.set(id, { ...task });
      return this.toView(task);
    }

    this.journals.set(id, { child: null, stream: null, timeout: null });
    task.status = 'running';
    task.startedAt = new Date().toISOString();
    task.phase = 'OpenCode executing in isolated worktree';
    void this.runOpenCode(task);
    this.tasks.set(id, { ...task });
    return this.toView(task);
  }

  private buildAgentPrompt(task: StudioTask): string {
    const targetLine = task.target ? `\nRequested target file(s): ${task.target}` : '';
    return [
      'You are operating inside an ISOLATED git worktree of the FastFree monorepo.',
      'Hard constraints (mandatory, non-negotiable):',
      '- Edit ONLY the requested source file(s) unless the request explicitly says otherwise.',
      '- Do NOT commit, tag, push, merge, deploy, or modify CI/CD workflows, secrets or env files.',
      '- Do NOT install packages, change package.json files, or modify the lockfile.',
      '- Keep the diff minimal and professional. Preserve existing architecture and naming.',
      '- When finished, print a short summary of changed files and why.',
      targetLine,
      '\nRequested work:\n' + task.prompt,
    ].join('\n');
  }

  private async runOpenCode(task: StudioTask): Promise<void> {
    const logPath = path.join(task.worktreePath, LOG_FILE);
    let stream: ReturnType<typeof createWriteStream> | null = null;
    try {
      stream = createWriteStream(logPath, { encoding: 'utf8' });
      const journal = this.journals.get(task.id);
      if (journal) journal.stream = stream;

      const wrapped = this.buildAgentPrompt(task);
      const isWindows = process.platform === 'win32';
      const safeMessage = wrapped.replace(/"/g, "'").replace(/[\r\n]+/g, ' ').slice(0, 6000);
      // Windows: opencode ships as .cmd; invoke it through cmd.exe explicitly so Node never
      // concatenates unescaped argv (avoids DEP0190 without shell-implicit quoting).
      const child = isWindows
        ? spawn('cmd.exe', ['/d', '/s', '/c', `opencode run --auto --title fastfree-${task.id} "${safeMessage}"`], {
            cwd: task.worktreePath,
            stdio: ['ignore', 'pipe', 'pipe'],
          })
        : spawn('opencode', ['run', '--auto', '--title', `fastfree-${task.id}`, safeMessage], {
            cwd: task.worktreePath,
            shell: false,
            stdio: ['ignore', 'pipe', 'pipe'],
          });

      const journalRef = this.journals.get(task.id);
      if (journalRef) journalRef.child = child;

      const writeChunk = (source: 'stdout' | 'stderr', chunk: Buffer) => {
        try {
          stream?.write(`[${source}] ${chunk.toString('utf8')}`);
        } catch {
          /* journal only */
        }
      };
      child.stdout?.on('data', (d: Buffer) => writeChunk('stdout', d));
      child.stderr?.on('data', (d: Buffer) => writeChunk('stderr', d));

      const timeout = setTimeout(() => {
        const live = this.journals.get(task.id);
        const liveTask = this.tasks.get(task.id);
        if (live?.child && liveTask?.status === 'running') {
          liveTask.timedOut = true;
          liveTask.phase = 'Hard timeout reached — terminating agent';
          this.tasks.set(task.id, { ...liveTask });
          try {
            live.child.kill('SIGTERM');
          } catch {
            /* already gone */
          }
        }
      }, TASK_TIMEOUT_MS);
      const journalNowForTimeout = this.journals.get(task.id);
      if (journalNowForTimeout) this.journals.set(task.id, { ...journalNowForTimeout, timeout });

      const exitCode: number | null = await new Promise((resolve) => {
        child.on('error', () => resolve(null));
        child.on('exit', (code) => resolve(code));
      });

      const journalNow = this.journals.get(task.id);
      if (journalNow?.timeout) clearTimeout(journalNow.timeout);

      const live = this.tasks.get(task.id);
      if (!live) return;
      live.exitCode = exitCode;
      live.phase = live.timedOut ? 'Timed out' : 'Collecting diff snapshot';
      live.status = live.status === 'cancelled' ? 'cancelled' : exitCode === 0 ? 'succeeded' : 'failed';
      live.finishedAt = new Date().toISOString();
      if (live.status === 'succeeded') live.error = null;
      else if (!live.error && !live.timedOut) live.error = 'Agent process exited with a non-zero code — review the log tail for the cause.';
      if (live.timedOut) live.error = 'Hard timeout (15 minutes) reached — the worktree is preserved for inspection.';
      this.tasks.set(task.id, { ...live });
    } catch (error) {
      const live = this.tasks.get(task.id);
      if (live) {
        live.status = 'failed';
        live.phase = 'Host spawn failure';
        live.error = this.safeMessage(error, 'failed to launch opencode');
        live.finishedAt = new Date().toISOString();
        this.tasks.set(task.id, { ...live });
      }
    } finally {
      try {
        stream?.end();
      } catch {
        /* ignore */
      }
    }
  }

  private safeMessage(error: unknown, fallback: string): string {
    const raw = error instanceof Error ? error.message : String(error ?? '');
    // Never leak raw stderr verbatim to the SPA; keep only a short sanitized hint.
    const hint = raw.replace(/[\r\n]+/g, ' ').trim().slice(-280);
    return hint ? `${fallback}: ${hint}` : fallback;
  }

  public listTasks(): Promise<StudioTaskView[]> {
    return Promise.all(Array.from(this.tasks.values()).map((t) => this.getTaskView(t.id))).then((views) =>
      views.filter((v): v is StudioTaskView => v !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  public async getTask(id: string): Promise<StudioTaskView | null> {
    return this.getTaskView(id);
  }

  private async readDiff(task: StudioTask): Promise<{ diffStat: string; shortstat: string; changedFiles: string[] }> {
    if (task.status === 'queued') return { diffStat: '', shortstat: '', changedFiles: [] };
    try {
      const [{ stdout: stat }, { stdout: shortstat }, { stdout: nameOnly }] = await Promise.all([
        execFileAsync('git', ['diff', '--stat', 'HEAD'], { cwd: task.worktreePath, timeout: 15_000, maxBuffer: 4 * 1024 * 1024 }),
        execFileAsync('git', ['diff', 'HEAD', '--shortstat'], { cwd: task.worktreePath, timeout: 15_000 }),
        execFileAsync('git', ['diff', 'HEAD', '--name-only'], { cwd: task.worktreePath, timeout: 15_000 }),
      ]);
      return { diffStat: stat.trim(), shortstat: shortstat.trim(), changedFiles: nameOnly.split('\n').map((s) => s.trim()).filter(Boolean) };
    } catch {
      return { diffStat: '', shortstat: '', changedFiles: [] };
    }
  }

  private async readLogTail(task: StudioTask): Promise<string[]> {
    try {
      const raw = await fsp.readFile(path.join(task.worktreePath, LOG_FILE), 'utf8');
      const lines = raw.split('\n').map((l) => (l.length > MAX_LOG_LINE ? l.slice(0, MAX_LOG_LINE) + '…' : l));
      return lines.slice(-LOG_TAIL_LINES);
    } catch {
      return ['(log file not available yet)'];
    }
  }

  private toView(task: StudioTask): StudioTaskView {
    return {
      ...task,
      logTail: [],
      diffStat: '',
      diffShortstat: '',
      changedFiles: [],
    };
  }

  public async getTaskView(id: string): Promise<StudioTaskView | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    const [logTail, diff] = await Promise.all([this.readLogTail(task), this.readDiff(task)]);
    return { ...task, logTail, diffStat: diff.diffStat, diffShortstat: diff.shortstat, changedFiles: diff.changedFiles };
  }

  public cancelTask(id: string): boolean {
    const task = this.tasks.get(id);
    const journal = this.journals.get(id);
    if (!task || task.status !== 'running' || !journal?.child) return false;
    task.status = 'cancelled';
    task.phase = 'Cancellation requested by user';
    task.finishedAt = new Date().toISOString();
    this.tasks.set(id, { ...task });
    try {
      journal.child.kill('SIGTERM');
    } catch {
      /* already exited */
    }
    return true;
  }

  public async discardTask(id: string): Promise<{ ok: boolean; residualWorktree: string | null }> {
    const task = this.tasks.get(id);
    if (!task || task.status === 'running' || task.status === 'queued') {
      return { ok: false, residualWorktree: null };
    }
    const repoRoot = await this.getRepoRoot();
    const safe = this.resolveSafeWorktree(repoRoot, task.id);
    if (!safe) return { ok: false, residualWorktree: null };

    // Best effort 1: the registered worktree path.
    await execFileAsync('git', ['worktree', 'remove', '--force', safe], { cwd: repoRoot, timeout: 30_000 }).catch(() => undefined);
    // Best effort 2: orphaned/empty directory shells git no longer tracks.
    await fsp.rm(safe, { recursive: true, force: true }).catch(() => undefined);
    // Best effort 3: prune stale administrative entries and the task branch.
    await execFileAsync('git', ['worktree', 'prune'], { cwd: repoRoot, timeout: 15_000 }).catch(() => undefined);
    await execFileAsync('git', ['branch', '-D', `studio/${task.id}`], { cwd: repoRoot, timeout: 15_000 }).catch(() => undefined);

    const stillExists = await fsp.stat(safe).then(() => true).catch(() => false);

    const timeoutHandle = this.journals.get(id)?.timeout;
    if (timeoutHandle) clearTimeout(timeoutHandle);
    this.journals.delete(id);
    this.tasks.delete(id);
    return { ok: true, residualWorktree: stillExists ? path.relative(repoRoot, safe).replace(/\\/g, '/') : null };
  }

  /**
   * Probe the REAL local Omnigent server (started via `omnigent server --background`).
   * Read-only. Never throws when the server is down — reports `reachable: false` instead.
   */
  public async probeOmnigentServer(): Promise<OmnigentProbeResult> {
    const base = process.env.OMNIGENT_SERVER_URL?.trim() || 'http://127.0.0.1:6767';
    const result: OmnigentProbeResult = {
      reachable: false,
      baseUrl: base,
      serverVersion: null,
      accountsEnabled: null,
      singleUser: null,
      agentCount: 0,
      harnessCount: 0,
      harnessIds: [],
      sessionCount: null,
      usage: null,
      probedAt: new Date().toISOString(),
    };

    const getJson = async (pathname: string): Promise<unknown> => {
      const response = await fetch(`${base}${pathname}`, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        throw new Error(`${pathname} -> HTTP ${response.status}`);
      }
      return response.json();
    };

    try {
      // 1) /health — bare liveness
      await getJson('/health');
      result.reachable = true;

      // 2) /api/version
      const versionBody = (await getJson('/api/version')) as { version?: string };
      result.serverVersion = typeof versionBody?.version === 'string' ? versionBody.version : null;

      // 3) /v1/info — single_user + accounts mode
      try {
        const infoBody = (await getJson('/v1/info')) as {
          accounts_enabled?: boolean;
          single_user?: boolean;
        };
        result.accountsEnabled = typeof infoBody?.accounts_enabled === 'boolean' ? infoBody.accounts_enabled : null;
        result.singleUser = typeof infoBody?.single_user === 'boolean' ? infoBody.single_user : null;
      } catch {
        /* info endpoint optional — keep null */
      }

      // 4) /v1/agents + /v1/harnesses — capability surface
      try {
        const agentsBody = (await getJson('/v1/agents')) as { data?: unknown[] };
        result.agentCount = Array.isArray(agentsBody?.data) ? agentsBody.data.length : 0;
      } catch {
        /* capability listing stays "unknown" */
      }
      try {
        const harnessesBody = (await getJson('/v1/harnesses')) as { data?: Array<{ id?: string }> };
        const ids = Array.isArray(harnessesBody?.data)
          ? harnessesBody.data.map((entry) => entry?.id).filter((id): id is string => typeof id === 'string')
          : [];
        result.harnessCount = ids.length;
        result.harnessIds = ids;
      } catch {
        /* capability listing stays "unknown" */
      }

      // 5) /v1/sessions — visible session count (may be empty, that's fine)
      try {
        const sessionsBody = (await getJson('/v1/sessions')) as { data?: unknown[] } | unknown[];
        const list = Array.isArray(sessionsBody)
          ? sessionsBody
          : Array.isArray((sessionsBody as { data?: unknown[] })?.data)
            ? (sessionsBody as { data: unknown[] }).data
            : null;
        result.sessionCount = list ? list.length : null;
      } catch {
        result.sessionCount = null;
      }

      // 6) /v1/usage — cost accounting visibility
      try {
        const usageBody = (await getJson('/v1/usage')) as {
          total_cost_usd?: number;
          cost_today?: number;
        };
        result.usage = {
          totalCostUsd: typeof usageBody?.total_cost_usd === 'number' ? usageBody.total_cost_usd : null,
          costTodayUsd: typeof usageBody?.cost_today === 'number' ? usageBody.cost_today : null,
        };
      } catch {
        result.usage = null;
      }
    } catch {
      result.reachable = false;
    }
    return result;
  }
}

export const studioService = StudioService.getInstance();
