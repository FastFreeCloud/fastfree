/**
 * Typed fetch client for the Clan Panel backend.
 *
 * Every endpoint answers with one of two envelopes:
 *   success -> `{ "data": <payload> }`
 *   failure -> `{ "error": { "code": "...", "message": "..." } }`
 *
 * `apiRequest` normalises both into a resolved payload or a thrown
 * `PanelApiError`, so callers never have to inspect raw responses.
 */

/** Relative base path only — never a hardcoded host, so the dev proxy and any reverse proxy work unchanged. */
const API_BASE = '/api/v1';

/** Default request budget. Every call aborts after this unless it passes its own value. */
export const DEFAULT_TIMEOUT_MS = 15_000;

/** Error codes emitted by the backend. */
const BACKEND_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'RATE_LIMITED',
  'TIMEOUT',
  'UPSTREAM_ERROR',
  'NOT_CONFIGURED',
  'INTERNAL',
] as const;

export type BackendErrorCode = (typeof BACKEND_ERROR_CODES)[number];

/** A backend code, plus the client-side conditions the backend cannot report. */
export type PanelErrorCode = BackendErrorCode | 'NETWORK' | 'UNKNOWN';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** The backend error envelope, as received. */
export interface PanelErrorBody {
  error: {
    code: string;
    message: string;
  };
}

/** The backend success envelope, as received. */
export interface PanelResponse<T> {
  data: T;
}

/**
 * Every failure raised by this module.
 *
 * `code` is safe to use as an i18n key (`errors.<code>`); `status` is the HTTP
 * status, or `0` when the request never produced one (network failure/timeout).
 */
export class PanelApiError extends Error {
  readonly code: PanelErrorCode;
  readonly status: number;

  constructor(code: PanelErrorCode, status: number, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PanelApiError';
    this.code = code;
    this.status = status;
    // Keeps `instanceof` working when the class is compiled down to ES5.
    Object.setPrototypeOf(this, PanelApiError.prototype);
  }
}

/** GET /api/v1/health */
export interface HealthData {
  status: string;
  clanConfigured: boolean;
  bootstrapAuthEnabled: boolean;
  uptimeSeconds: number;
}

/** One machine row, exactly as the backend models it. */
export interface MachineSummary {
  name: string;
  hostname: string | null;
  isOnline: boolean | null;
  description?: string | null | undefined;
  host?: string | null | undefined;
  tags?: string[] | undefined;
  roles?: string[] | undefined;
  reachable?: boolean | undefined;
}

/** GET /api/v1/machines payload */
export interface MachinesData {
  machines: MachineSummary[];
}

/** GET /api/v1/global/show payload */
export interface GlobalSummary {
  name: string;
  description: string | null;
  domain: string;
}

/** Per-call overrides for {@link apiRequest}. */
export interface PanelRequestOptions {
  /** Defaults to `GET`. */
  method?: HttpMethod;
  /** Serialised as JSON. When present — and only then — `Content-Type` is sent. */
  body?: unknown;
  /** Defaults to {@link DEFAULT_TIMEOUT_MS}. */
  timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Type guard, written without a cast so `value` narrows to the union. */
function isPanelErrorCode(value: string): value is PanelErrorCode {
  return BACKEND_ERROR_CODES.some((code) => code === value);
}

/** Falls back to a sensible code when the body is missing or the status is unusual. */
function codeForStatus(status: number): PanelErrorCode {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 408:
      return 'TIMEOUT';
    case 429:
      return 'RATE_LIMITED';
    case 502:
    case 503:
    case 504:
      return 'UPSTREAM_ERROR';
    default:
      return status >= 500 ? 'INTERNAL' : 'UNKNOWN';
  }
}

/** Reads `{ error: { code, message } }` without trusting either field's shape. */
function parseErrorEnvelope(body: unknown): { code: PanelErrorCode; message: string } | null {
  if (!isRecord(body)) return null;

  const error = body.error;
  if (!isRecord(error)) return null;

  const { code, message } = error;
  if (typeof code !== 'string' || typeof message !== 'string') return null;

  return { code: isPanelErrorCode(code) ? code : 'UNKNOWN', message };
}

/** Reads the success envelope. Returns `null` when `data` is absent. */
function parseSuccessEnvelope(body: unknown): { data: unknown } | null {
  if (!isRecord(body) || !('data' in body)) return null;
  return { data: body.data };
}

/** `fetch` rejects with an `AbortError` when our controller fires. */
function isAbortError(error: unknown): boolean {
  return error instanceof DOMException ? error.name === 'AbortError' : false;
}

/**
 * Performs one request and returns the unwrapped `data` payload.
 *
 * @throws {PanelApiError} on any failure, including timeouts and network drops.
 */
export async function apiRequest<T>(
  path: string,
  options: PanelRequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = { Accept: 'application/json' };
  // Only announce a body when one is actually being sent.
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      // `RequestInit.body` is `BodyInit | null` under `exactOptionalPropertyTypes`,
      // so an absent body must be sent as `null`, not `undefined`.
      body: body === undefined ? null : JSON.stringify(body),
      // The timeout signal is authoritative for this client.
      signal: controller.signal,
    });

    const raw = await response.text();

    let parsed: unknown = null;
    if (raw.length > 0) {
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        // Non-JSON body: treated as "no envelope" below.
        parsed = null;
      }
    }

    if (!response.ok) {
      const failure = parseErrorEnvelope(parsed);
      throw new PanelApiError(
        failure?.code ?? codeForStatus(response.status),
        response.status,
        failure?.message ?? 'The request was rejected by the server.',
      );
    }

    const envelope = parseSuccessEnvelope(parsed);
    if (!envelope) {
      throw new PanelApiError(
        'INTERNAL',
        response.status,
        'The server returned an unexpected response.',
      );
    }

    // The one unavoidable cast: `T` is a caller-supplied compile-time contract
    // that cannot be verified at runtime. Endpoint functions below are the
    // place where that contract is asserted against the backend contract.
    return envelope.data as T;
  } catch (error) {
    if (error instanceof PanelApiError) throw error;

    if (isAbortError(error)) {
      throw new PanelApiError('TIMEOUT', 0, 'The server took too long to respond.');
    }

    // fetch() rejects with a TypeError on DNS failure, refused connections, and
    // offline transitions — i.e. the request never reached the server.
    throw new PanelApiError('NETWORK', 0, 'Unable to reach the server.', { cause: error });
  } finally {
    clearTimeout(timer);
  }
}

/** `GET /api/v1/health` — liveness and configuration probe. */
export function apiHealth(timeoutMs?: number): Promise<HealthData> {
  return apiRequest<HealthData>('/health', timeoutMs === undefined ? {} : { timeoutMs });
}

/** `GET /api/v1/machines` — the machine roster. */
export function apiMachines(timeoutMs?: number): Promise<MachinesData> {
  return apiRequest<MachinesData>('/machines', timeoutMs === undefined ? {} : { timeoutMs });
}

export interface ClanBuildParams {
  format?: string | undefined;
  architecture?: 'x86_64-linux' | 'aarch64-linux' | undefined;
  noSecrets?: boolean | undefined;
  buildHost?: string | undefined;
  dryRun?: boolean | undefined;
}

export interface ClanBuildResult {
  machine: string;
  format: string;
  success: boolean;
  message: string;
  artifactPath?: string | null;
  downloadUrl?: string | null;
  workflowRunUrl?: string | null;
  workflowId?: string | number | null;
  durationMs?: number;
  stdout?: string;
}

/** `POST /api/v1/machines/:name/build` — trigger real image build via GitHub Actions. */
export function apiBuildMachine(
  name: string,
  params: ClanBuildParams = {},
  timeoutMs?: number,
): Promise<ClanBuildResult> {
  return apiRequest<ClanBuildResult>(`/machines/${encodeURIComponent(name)}/build`, {
    method: 'POST',
    body: params,
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
  });
}

/** `GET /api/v1/global/show` — the configured clan identity. */
export function apiGlobalShow(timeoutMs?: number): Promise<GlobalSummary> {
  return apiRequest<GlobalSummary>('/global/show', timeoutMs === undefined ? {} : { timeoutMs });
}

export type PaseoAgentStatus = 'idle' | 'blocked' | 'done' | 'working' | 'unknown';

export interface LivePaseoAgent {
  id: string;
  name: string;
  provider: string;
  status: PaseoAgentStatus;
  cwd?: string;
}

export interface PaseoStatusData {
  running: boolean;
  connected: boolean;
  source: 'live' | 'fallback';
  baseUrl: string;
  counts: {
    all: number;
    blocked: number;
    idle: number;
    done: number;
    working: number;
  };
  agents: LivePaseoAgent[];
  message?: string;
}

export interface PaseoPromptResult {
  success: boolean;
  message: string;
  code?: string;
}

/** `GET /api/v1/paseo/status` — live Paseo daemon and agent telemetry. */
export function apiPaseoStatus(timeoutMs?: number): Promise<PaseoStatusData> {
  return apiRequest<PaseoStatusData>('/paseo/status', timeoutMs === undefined ? {} : { timeoutMs });
}

/** `POST /api/v1/paseo/prompt` — submit an instruction or command prompt to a target agent. */
export function apiPaseoPrompt(target: string, text: string, timeoutMs?: number): Promise<PaseoPromptResult> {
  return apiRequest<PaseoPromptResult>('/paseo/prompt', {
    method: 'POST',
    body: { target, text },
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
  });
}