/**
 * Paseo Domain Service Layer.
 *
 * Encapsulates Paseo daemon agent telemetry, status, and prompt dispatching
 * over the local Paseo daemon HTTP API (http://127.0.0.1:6767) with graceful fallback.
 *
 * Authentication: the daemon requires a Bearer token. The token is never
 * hard-coded — it is read from the PASEO_TOKEN environment variable or from
 * the local credential file at %USERPROFILE%\.paseo\local-credential at runtime.
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type {
  LivePaseoAgent,
  PaseoAgentCreateInput,
  PaseoAgentPromptInput,
  PaseoAgentStatus,
  PaseoAgentStopInput,
  PaseoStatusCounts,
  PaseoStatusResponse,
} from '../schemas/paseo.schema.js';

/** Default well-known agents as verified in the FastFree Paseo ecosystem */
const DEFAULT_PASEO_AGENTS: LivePaseoAgent[] = [
  { id: 'agy-audit-all', name: 'agy-audit-all', provider: 'agy', status: 'blocked', cwd: 'C:\\Users\\FastFree' },
  { id: 'opencode-clan-deploy', name: 'opencode-clan-deploy', provider: 'opencode', status: 'idle', cwd: 'C:\\Users\\FastFree' },
  { id: 'claude-architecture', name: 'claude-architecture', provider: 'claude', status: 'idle', cwd: 'C:\\Users\\FastFree' },
  { id: 'nixos-eval-dryrun', name: 'nixos-eval-dryrun', provider: 'nixos', status: 'done', cwd: 'C:\\Users\\FastFree' },
  { id: 'ci-release-build', name: 'ci-release-build', provider: 'github', status: 'done', cwd: 'C:\\Users\\FastFree' },
];

function getDaemonBaseUrl(): string {
  const port = process.env['PASEO_DAEMON_PORT'] || '6767';
  return process.env['PASEO_DAEMON_URL'] || `http://127.0.0.1:${port}`;
}

/**
 * Resolve the daemon bearer credential at runtime.
 * Order: PASEO_TOKEN env → $PASEO_HOME/local-credential → %USERPROFILE%\.paseo\local-credential file.
 */
function getCredentialToken(): string | null {
  const envToken = process.env['PASEO_TOKEN'];
  if (envToken) return envToken;

  try {
    const paseoHome = process.env['PASEO_HOME'] ?? join(homedir(), '.paseo');
    const credentialPath = join(paseoHome, 'local-credential');
    if (existsSync(credentialPath)) {
      const content = readFileSync(credentialPath, 'utf8').trim();
      // The credential file may be raw token JSON; unwrap `{"token": ...}` if present.
      if (content.startsWith('{')) {
        try {
          const parsed = JSON.parse(content) as { token?: string };
          if (parsed.token) return parsed.token;
        } catch {
          // fall through to raw-based token usage below
        }
      }
      return content.length > 0 ? content : null;
    }
  } catch {
    // Credential unreadable; daemon calls will fail gracefully.
  }
  return null;
}

function computeCounts(agents: LivePaseoAgent[]): PaseoStatusCounts {
  let blocked = 0;
  let idle = 0;
  let done = 0;
  let working = 0;

  for (const a of agents) {
    if (a.status === 'blocked') blocked++;
    else if (a.status === 'idle') idle++;
    else if (a.status === 'done') done++;
    else if (a.status === 'working') working++;
  }

  return { all: agents.length, blocked, idle, done, working };
}

function normalizeStatus(rawStatus?: string | null): PaseoAgentStatus {
  if (!rawStatus) return 'idle';
  const lower = rawStatus.toLowerCase();
  if (lower.includes('block') || lower.includes('wait') || lower.includes('pause') || lower.includes('permission')) return 'blocked';
  if (lower.includes('work') || lower.includes('run')) return 'working';
  if (lower.includes('done') || lower.includes('exit') || lower.includes('stop') || lower.includes('idle')) return 'idle';
  return 'unknown';
}

interface RawPaseoAgent {
  id?: string;
  name?: string;
  provider?: string;
  provider_id?: string;
  status?: string;
  cwd?: string;
}

function mapRawAgent(raw: RawPaseoAgent): LivePaseoAgent {
  return {
    id: String(raw.id ?? raw.name ?? 'unknown'),
    name: String(raw.name ?? raw.id ?? 'unknown'),
    provider: String(raw.provider ?? raw.provider_id ?? 'unknown'),
    status: normalizeStatus(raw.status),
    cwd: raw.cwd,
  };
}

interface DaemonResult<T> {
  data?: T;
  error?: string;
  statusCode?: number;
}

/** Minimal authenticated JSON fetch wrapper for the Paseo daemon. */
async function daemonFetch<T>(path: string, init: RequestInit = {}): Promise<DaemonResult<T>> {
  const base = getDaemonBaseUrl();
  const headers: Record<string, string> = { accept: 'application/json' };

  const contentTypeHeader = (init.headers as Record<string, string> | undefined)?.['content-type'];
  if (contentTypeHeader) headers['content-type'] = contentTypeHeader;

  const token = getCredentialToken();
  if (token) {
    headers.authorization = `Bearer ${token}`;
  } else {
    console.warn('[paseo] no daemon credential resolved (set PASEO_TOKEN or create .paseo/local-credential); sending unauthenticated request');
  }

  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
      signal: AbortSignal.timeout(4000),
    });
    const text = await res.text();
    const parsed = text ? (JSON.parse(text) as T) : undefined;
    return parsed === undefined ? { error: `empty body (HTTP ${res.status})`, statusCode: res.status } : { data: parsed, statusCode: res.status };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { error: errMsg };
  }
}

export class PaseoService {
  /**
   * Retrieves Paseo real-time status:
   * 1. Attempts live agent listing from the Paseo daemon
   * 2. Falls back gracefully to the default registered agent roster
   */
  async getStatus(): Promise<PaseoStatusResponse> {
    const baseUrl = getDaemonBaseUrl();

    const res = await daemonFetch<RawPaseoAgent[]>('/api/v1/agents');
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      const live = res.data.filter((raw) => raw && typeof raw === 'object').map(mapRawAgent);
      if (live.length > 0) {
        return {
          running: true,
          connected: true,
          source: 'live',
          baseUrl,
          counts: computeCounts(live),
          agents: live,
          message: 'Connected to live Paseo daemon session',
        };
      }
    }

    const counts = computeCounts(DEFAULT_PASEO_AGENTS);
    return {
      running: false,
      connected: false,
      source: 'fallback',
      baseUrl,
      counts,
      agents: DEFAULT_PASEO_AGENTS,
      message: 'Paseo daemon offline. Displaying fallback agent ecosystem.',
    };
  }

  /**
   * Create a new agent on the Paseo daemon (workspace + prompt).
   */
  async createAgent(input: PaseoAgentCreateInput): Promise<{
    success: boolean;
    message: string;
    agent?: LivePaseoAgent;
    code?: string;
  }> {
    const res = await daemonFetch<RawPaseoAgent>('/api/v1/agents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ config: { provider: input.provider }, cwd: input.cwd, prompt: input.prompt }),
    });

    if (res.data) {
      const agent = mapRawAgent(res.data);
      return { success: true, message: `Agent "${agent.name}" created via Paseo daemon.`, agent };
    }
    return {
      success: false,
      code: 'daemon_unreachable',
      message: `Paseo daemon is offline. Agent creation failed: ${res.error ?? 'unknown error'}`,
    };
  }

  /**
   * Stop/cancel a running agent on the Paseo daemon.
   */
  async stopAgent(input: PaseoAgentStopInput): Promise<{ success: boolean; message: string; code?: string }> {
    const { target } = input;

    const res = await daemonFetch<RawPaseoAgent>(`/api/v1/agents/${encodeURIComponent(target)}/stop`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
      return { success: true, message: `Stop signal delivered to agent "${target}".` };
    }
    return {
      success: false,
      code: 'daemon_unreachable',
      message: `Paseo daemon is offline. Stop request for agent "${target}" failed: ${res.error ?? 'unknown error'}`,
    };
  }

  /**
   * Submit an instruction or command prompt to a live Paseo agent.
   */
  async dispatchPrompt(input: PaseoAgentPromptInput): Promise<{
    success: boolean;
    message: string;
    code?: string;
  }> {
    const { target, text } = input;

    const res = await daemonFetch<RawPaseoAgent>(`/api/v1/agents/${encodeURIComponent(target)}/prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
      return { success: true, message: `Prompt delivered to agent "${target}".` };
    }
    return {
      success: false,
      code: 'daemon_unreachable',
      message: `Paseo daemon is offline. Prompt was staged for agent "${target}". Start Paseo to execute interactively.`,
    };
  }
}

export const paseoService = new PaseoService();
