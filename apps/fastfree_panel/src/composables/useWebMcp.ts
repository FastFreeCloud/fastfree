import type { ComputedRef, Ref } from 'vue';
import { computed, ref } from 'vue';

export type McpConnectionState = 'connected' | 'connecting' | 'error' | 'disconnected';

export interface McpServerEvent<T = unknown> {
  event: string;
  data: T;
  timestamp: number;
}

export type McpEventListener<T = unknown> = (data: T) => void;

// Module-level singleton state so all components and stores share a single SSE stream
const connectionState = ref<McpConnectionState>('disconnected');
const isConnected = computed(() => connectionState.value === 'connected');
const isConnecting = computed(() => connectionState.value === 'connecting');
const error = ref<string | null>(null);
const sessionId = ref<string | null>(null);
const messagesEndpoint = ref<string | null>(null);

const latestEvent = ref<McpServerEvent<unknown> | null>(null);
const events = ref<Record<string, unknown>>({});

const listeners = new Map<string, Set<(data: unknown) => void>>();
const wildcardListeners = new Set<(event: McpServerEvent<unknown>) => void>();

let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
let explicitlyClosed = false;

const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const BACKOFF_MULTIPLIER = 1.5;

function cleanupCurrentSource(): void {
  if (eventSource) {
    try {
      eventSource.close();
    } catch {
      // ignore
    }
    eventSource = null;
  }
}

function scheduleReconnect(): void {
  if (explicitlyClosed) return;
  if (reconnectTimer !== null) return;

  connectionState.value = 'disconnected';
  const delay = Math.min(
    BASE_RECONNECT_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retryAttempt),
    MAX_RECONNECT_DELAY_MS,
  );
  const jitter = Math.floor(Math.random() * 500);
  retryAttempt += 1;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!explicitlyClosed) {
      connect();
    }
  }, delay + jitter);
}

function handleEndpointEvent(rawEndpoint: string): void {
  const trimmed = typeof rawEndpoint === 'string' ? rawEndpoint.trim() : '';
  messagesEndpoint.value = trimmed;
  try {
    const url = new URL(trimmed, window.location.origin);
    const sid = url.searchParams.get('sessionId');
    if (sid) {
      sessionId.value = sid;
    }
  } catch {
    // rawEndpoint is not a parseable URL with origin
  }
  handleIncomingEvent('endpoint', rawEndpoint);
}

function handleIncomingEvent(eventName: string, rawData: unknown): void {
  let parsed: unknown = rawData;
  if (typeof rawData === 'string') {
    try {
      parsed = JSON.parse(rawData);
    } catch {
      parsed = rawData;
    }
  }

  let resolvedEvent = eventName;
  let resolvedData = parsed;

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (typeof obj['event'] === 'string') {
      resolvedEvent = obj['event'];
      resolvedData = obj['data'] !== undefined ? obj['data'] : obj;
    } else if (typeof obj['type'] === 'string') {
      resolvedEvent = obj['type'];
    }
  }

  const mcpEvent: McpServerEvent<unknown> = {
    event: resolvedEvent,
    data: resolvedData,
    timestamp: Date.now(),
  };

  latestEvent.value = mcpEvent;
  events.value = {
    ...events.value,
    [resolvedEvent]: resolvedData,
  };

  const registered = listeners.get(resolvedEvent);
  if (registered) {
    for (const listener of registered) {
      try {
        listener(resolvedData);
      } catch (err) {
        console.error(`[useWebMcp] Listener error for "${resolvedEvent}":`, err);
      }
    }
  }

  for (const wildcard of wildcardListeners) {
    try {
      wildcard(mcpEvent);
    } catch (err) {
      console.error('[useWebMcp] Wildcard listener error:', err);
    }
  }
}

let nextRpcId = 1;

function extractToolResult<T>(body: unknown): T {
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    if ('result' in obj) {
      const result = obj['result'];
      if (
        result &&
        typeof result === 'object' &&
        'content' in (result as Record<string, unknown>)
      ) {
        const contents = (result as { content?: unknown[] }).content;
        if (Array.isArray(contents)) {
          const textItem = contents.find(
            (c) =>
              c &&
              typeof c === 'object' &&
              (c as { type?: unknown }).type === 'text' &&
              typeof (c as { text?: unknown }).text === 'string',
          ) as { text: string } | undefined;

          if (textItem) {
            try {
              return JSON.parse(textItem.text) as T;
            } catch {
              return textItem.text as T;
            }
          }
        }
      }
      return result as T;
    }
    if ('data' in obj) {
      return obj['data'] as T;
    }
  }
  return body as T;
}

async function postToMessages<T>(
  toolName: string,
  args: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<T> {
  const endpoint =
    messagesEndpoint.value ??
    (sessionId.value
      ? `/mcp/messages?sessionId=${encodeURIComponent(sessionId.value)}`
      : '/mcp/messages');

  const rpcPayload = {
    jsonrpc: '2.0',
    id: nextRpcId++,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(rpcPayload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Failed to post to MCP messages endpoint (${res.status}): ${errText || res.statusText}`,
    );
  }

  if (res.status === 202) {
    return undefined as T;
  }

  const body = (await res.json().catch(() => null)) as unknown;
  return extractToolResult<T>(body);
}

/**
 * Initiates the SSE connection to /mcp/sse.
 * Safe to call repeatedly; handles reconnection automatically.
 */
export function connect(): void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return;
  }

  if (
    eventSource &&
    (eventSource.readyState === EventSource.OPEN ||
      eventSource.readyState === EventSource.CONNECTING)
  ) {
    return;
  }

  explicitlyClosed = false;
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  connectionState.value = 'connecting';
  error.value = null;

  try {
    const es = new EventSource('/mcp/sse');
    eventSource = es;

    es.onopen = () => {
      connectionState.value = 'connected';
      error.value = null;
      retryAttempt = 0;
    };

    es.onerror = () => {
      connectionState.value = 'error';
      error.value = 'MCP SSE connection dropped';
      cleanupCurrentSource();
      scheduleReconnect();
    };

    es.onmessage = (e: MessageEvent<string>) => {
      handleIncomingEvent('message', e.data);
    };

    es.addEventListener('endpoint', (e: MessageEvent<string>) => {
      handleEndpointEvent(e.data);
    });

    const knownEvents = [
      'health',
      'deploy',
      'deploy_progress',
      'deploy_start',
      'deploy_complete',
      'deploy_error',
      'machine_update',
      'machines_updated',
      'rollback',
      'status',
      'clan',
    ];

    for (const evt of knownEvents) {
      es.addEventListener(evt, (e: MessageEvent<string>) => {
        handleIncomingEvent(evt, e.data);
      });
    }
  } catch (err) {
    connectionState.value = 'error';
    error.value = err instanceof Error ? err.message : 'Failed to create EventSource';
    scheduleReconnect();
  }
}

/**
 * Closes the SSE connection and stops any pending reconnection timer.
 */
export function disconnect(): void {
  explicitlyClosed = true;
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  retryAttempt = 0;
  cleanupCurrentSource();
  connectionState.value = 'disconnected';
}

/**
 * Invokes an MCP tool by calling `/mcp/call` (or posting to `/mcp/messages`).
 */
export async function callMcpTool<T = unknown>(
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const payload = {
    tool: toolName,
    name: toolName,
    arguments: args,
    params: {
      name: toolName,
      arguments: args,
    },
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (sessionId.value) {
    headers['x-session-id'] = sessionId.value;
  }

  const callUrl = sessionId.value
    ? `/mcp/call?sessionId=${encodeURIComponent(sessionId.value)}`
    : '/mcp/call';

  try {
    const res = await fetch(callUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const body = (await res.json().catch(() => null)) as unknown;
      return extractToolResult<T>(body);
    }

    if (res.status === 404) {
      return await postToMessages<T>(toolName, args, headers);
    }

    const errText = await res.text().catch(() => '');
    throw new Error(
      `MCP tool "${toolName}" call failed (${res.status}): ${errText || res.statusText}`,
    );
  } catch (err) {
    if (messagesEndpoint.value || sessionId.value) {
      try {
        return await postToMessages<T>(toolName, args, headers);
      } catch {
        // preserve original error
      }
    }
    throw err;
  }
}

/**
 * Subscribes to a specific SSE event. Returns an unsubscribe function.
 */
export function onEvent<T = unknown>(
  eventName: string,
  callback: (data: T) => void,
): () => void {
  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set());
  }
  const set = listeners.get(eventName)!;
  const untyped = callback as (data: unknown) => void;
  set.add(untyped);
  return () => {
    set.delete(untyped);
    if (set.size === 0) {
      listeners.delete(eventName);
    }
  };
}

export interface UseWebMcpReturn {
  connectionState: Ref<McpConnectionState>;
  isConnected: ComputedRef<boolean>;
  isConnecting: ComputedRef<boolean>;
  error: Ref<string | null>;
  sessionId: Ref<string | null>;
  messagesEndpoint: Ref<string | null>;
  latestEvent: Ref<McpServerEvent<unknown> | null>;
  events: Ref<Record<string, unknown>>;
  connect: () => void;
  disconnect: () => void;
  callMcpTool: <T = unknown>(toolName: string, args?: Record<string, unknown>) => Promise<T>;
  onEvent: <T = unknown>(eventName: string, callback: (data: T) => void) => () => void;
}

/**
 * Reactive Vue 3 composable providing access to the MCP SSE stream and tools.
 */
export function useWebMcp(): UseWebMcpReturn {
  if (typeof window !== 'undefined') {
    connect();
  }

  return {
    connectionState,
    isConnected,
    isConnecting,
    error,
    sessionId,
    messagesEndpoint,
    latestEvent,
    events,
    connect,
    disconnect,
    callMcpTool,
    onEvent,
  };
}
