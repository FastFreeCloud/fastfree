import { Schema } from "effect"
import type { Context } from "@opencode/plugin/gui"
import { BoardBridge } from "../rpc.ts"

export const HindsightSchema = Schema.Struct({
  enabled: Schema.Boolean,
  bank: Schema.String,
  endpoint: Schema.String,
})

type HindsightRpcClient = {
  hindsight_recall: (input: { query: string; max_tokens?: number; endpoint?: string; bank?: string }, options?: { signal?: AbortSignal }) => Promise<{ markdown: string | null }>
  hindsight_retain: (input: { content: string; context?: string; document_id?: string; tags?: string[]; endpoint?: string; bank?: string }, options?: { signal?: AbortSignal }) => Promise<{ detail: string; ok: boolean }>
  hindsight_reflect: (input: { query: string; max_tokens?: number; endpoint?: string; bank?: string }, options?: { signal?: AbortSignal }) => Promise<{ text: string }>
}

/**
 * The renderer cannot fetch the local daemon (no CORS preflight support), so the
 * GUI talks to the daemon through the plugin server part via this transport.
 * `bindHindsightTransport` is called once at setup time (see window.tsx).
 */
let transport: HindsightRpcClient | undefined
export function bindHindsightTransport(client: HindsightRpcClient | undefined) {
  transport = client
}

function rpcClientFor(server: unknown): HindsightRpcClient | undefined {
  const client = (server as { client?: { rpc?: (contract: unknown) => unknown } } | undefined)?.client
  if (!client?.rpc) return undefined
  return client.rpc(BoardBridge) as HindsightRpcClient
}

export function hindsightTransportFromServers(servers: ReadonlyArray<unknown>) {
  for (const server of servers) {
    const rpc = rpcClientFor(server)
    if (rpc) return rpc
  }
  return undefined
}

/**
 * fastfree_board ships with local-only Hindsight by design.
 * Point the plugin at the local embedded Hindsight daemon owned by Hermes/fastfree
 * (bank "fastfree") when `HINDSIGHT_MODE=local_embedded`. No API key required; the
 * Vectorize cloud path is intentionally removed.
 * Default matches the running daemon on 127.0.0.1:9177 (see ~/.hindsight/profiles/fastfree.env).
 */
export function hindsightSettings(ctx: Pick<Context, "storage">) {
  return ctx.storage.store("hindsight-local-v2", {
    schema: HindsightSchema,
    initial: { enabled: true, bank: "fastfree", endpoint: "http://127.0.0.1:9177" },
    scope: "global",
  })
}
export type HindsightStore = ReturnType<typeof hindsightSettings>

const RECALL_TIMEOUT_MS = 90_000

function timedSignal(ms: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, done: () => clearTimeout(timer) }
}

function configured(settings: HindsightStore) {
  const value = settings.value
  if (!value || value.enabled === false) return undefined
  const endpoint = (value.endpoint?.trim() || "http://127.0.0.1:9177").replace(/\/$/, "")
  return { ...value, endpoint }
}

/** Scan a Hindsight bank for memories relevant to a task query. Returns trimmed markdown or undefined. Never throws. */
export async function recall(settings: HindsightStore, query: string): Promise<string | undefined> {
  const config = configured(settings)
  if (!config) return undefined
  if (transport) {
    const { signal, done } = timedSignal(RECALL_TIMEOUT_MS)
    try {
      const response = await transport.hindsight_recall({ query: query.slice(0, 2_000), max_tokens: 1_024, endpoint: config.endpoint, bank: config.bank }, { signal })
      return response.markdown ?? undefined
    } catch (error) {
      console.warn("[fastfree_board] Hindsight recall error:", error instanceof Error ? error.message : error)
      return undefined
    } finally {
      done()
    }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), RECALL_TIMEOUT_MS)
  try {
    const response = await fetch(`${config.endpoint}/v1/default/banks/${encodeURIComponent(config.bank || "fastfree")}/memories/recall`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.slice(0, 2_000), budget: "low", max_tokens: 1_024 }),
    })
    if (!response.ok) {
      console.warn("[fastfree_board] Hindsight recall failed:", response.status)
      return undefined
    }
    const body = await response.json() as { results?: Array<{ content?: string; text?: string; score?: number }> }
    const lines = (body.results ?? [])
      .map((item) => item.content ?? item.text ?? "")
      .map((text) => text.trim())
      .filter(Boolean)
      .slice(0, 5)
    if (!lines.length) return undefined
    return `## Hindsight recall (related memory)\n${lines.map((line) => `- ${line.replace(/\s+/g, " ").slice(0, 240)}`).join("\n")}`
  } catch (error) {
    console.warn("[fastfree_board] Hindsight recall error:", error instanceof Error ? error.message : error)
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

/** Return only the recall markdown block (or undefined). */
export const recallSection = recall

/** Store a compact memory for a finished task. Best effort; returns true when retained. */
export async function retain(settings: HindsightStore, item: { id: string; title: string; description: string }): Promise<boolean> {
  const config = configured(settings)
  if (!config) return false
  if (transport) {
    const { signal, done } = timedSignal(150_000)
    try {
      const response = await transport.hindsight_retain({
        content: `Task ${item.id} (${item.title}) finished via fastfree_board. Summary: ${item.description.replace(/\s+/g, " ").slice(0, 600)}`,
        context: "fastfree_board task completion",
        document_id: `task:${item.id}`,
        tags: ["fastfree", "board", `task:${item.id}`],
        endpoint: config.endpoint,
        bank: config.bank,
      }, { signal })
      return response.ok
    } catch (error) {
      console.warn("[fastfree_board] Hindsight retain error:", error instanceof Error ? error.message : error)
      return false
    } finally {
      done()
    }
  }
  try {
    const response = await fetch(`${config.endpoint}/v1/default/banks/${encodeURIComponent(config.bank || "fastfree")}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          content: `Task ${item.id} (${item.title}) finished via fastfree_board. Summary: ${item.description.replace(/\s+/g, " ").slice(0, 600)}`,
          context: "fastfree_board task completion",
          document_id: `task:${item.id}`,
          tags: ["fastfree", "board", `task:${item.id}`],
          update_mode: "append",
        }],
      }),
    })
    if (!response.ok) {
      console.warn("[fastfree_board] Hindsight retain failed:", response.status)
      return false
    }
    return true
  } catch (error) {
    console.warn("[fastfree_board] Hindsight retain error:", error instanceof Error ? error.message : error)
    return false
  }
}
