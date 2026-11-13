/**
 * Server-side Hindsight client for the plugin's agent-facing tools and the
 * per-session memory snapshot. The server bundle does not share the GUI
 * plugin store (drafts.sqlite), so configuration is environment-based:
 *
 *   FASTFREE_HINDSIGHT_ENDPOINT  (default http://127.0.0.1:9177)
 *   FASTFREE_HINDSIGHT_BANK      (default "fastfree")
 *
 * Both default to the local embedded daemon used by fastfree_board.
 * The read helpers never throw so the context hook can stay best-effort.
 */

const DEFAULT_ENDPOINT = "http://127.0.0.1:9177"
const DEFAULT_BANK = "fastfree"
const LOOPBACK_HTTP = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d{1,5})?$/i
const BANK_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/i

export type EndpointOverrides = { endpoint?: string; bank?: string }

/**
 * Resolve the effective daemon config. Precedence: explicit overrides (validated,
 * loopback-only) → environment variables → built-in defaults. Never points at a
 * non-loopback host: memory traffic must stay on this machine.
 */
export function resolveConfig(overrides?: EndpointOverrides) {
  const overrideEndpoint = overrides?.endpoint?.trim()
  const envEndpoint = process.env.FASTFREE_HINDSIGHT_ENDPOINT?.trim()
  let endpoint = (overrideEndpoint || envEndpoint || DEFAULT_ENDPOINT).replace(/\/+$/, "")
  if (!LOOPBACK_HTTP.test(endpoint)) endpoint = DEFAULT_ENDPOINT
  const overrideBank = overrides?.bank?.trim()
  const envBank = process.env.FASTFREE_HINDSIGHT_BANK?.trim()
  let bank = overrideBank || envBank || DEFAULT_BANK
  if (!BANK_ID.test(bank)) bank = DEFAULT_BANK
  return { endpoint, bank }
}

export function hindsightServerConfig() {
  return resolveConfig()
}

function bankUrl(path: string, config: { endpoint: string; bank: string }) {
  return `${config.endpoint}/v1/default/banks/${encodeURIComponent(config.bank)}${path}`
}

async function post<T>(path: string, body: unknown, timeoutMs: number, overrides?: EndpointOverrides): Promise<T> {
  const config = resolveConfig(overrides)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(bankUrl(path, config), {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      throw new Error(`Hindsight ${path} failed: HTTP ${response.status}${detail ? ` — ${detail.slice(0, 300)}` : ""}`)
    }
    return await response.json() as T
  } finally {
    clearTimeout(timer)
  }
}

type RecallResponse = { results?: Array<{ text?: string; content?: string; context?: string | null }> }

function recallMarkdown(body: RecallResponse): string | undefined {
  const lines = (body.results ?? [])
    .map((item) => (item.text ?? item.content ?? "").trim())
    .map((text) => text.replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, 8)
    .map((line) => `- ${line.slice(0, 400)}`)
  if (!lines.length) return undefined
  return `## هندسايت — ذاكرة ذات صلة\n${lines.join("\n")}`
}

/** Best effort recall. Returns trimmed markdown, or undefined when nothing is relevant/reachable. Never throws. */
export async function serverRecall(query: string, maxTokens = 1024, overrides?: EndpointOverrides): Promise<string | undefined> {
  try {
    const body = await post<RecallResponse>("/memories/recall", { query: query.slice(0, 2_000), budget: "low", max_tokens: maxTokens }, 20_000, overrides)
    return recallMarkdown(body)
  } catch (error) {
    console.warn("[fastfree_board] Hindsight recall failed:", error instanceof Error ? error.message : error)
    return undefined
  }
}

/** Tool-facing recall: returns markdown lines or a string with the reason nothing was found. Throws on hard failure. */
export async function toolRecall(query: string, maxTokens = 1024, overrides?: EndpointOverrides): Promise<string> {
  const body = await post<RecallResponse>("/memories/recall", { query: query.slice(0, 2_000), budget: "low", max_tokens: maxTokens }, 30_000, overrides)
  return recallMarkdown(body) ?? "No relevant memories found in the bank."
}

/** Persist a compact durable memory. Returns the retained item_count-ish payload summary. Throws on failure. */
export async function toolRetain(content: string, context?: string, documentID?: string, tags?: string[], overrides?: EndpointOverrides): Promise<string> {
  const config = resolveConfig(overrides)
  const body = await post<{ success?: boolean; items_count?: number; bank_id?: string }>(
    "/memories",
    {
      items: [{
        content: content.slice(0, 4_000),
        context: (context ?? "fastfree_board agent tool").slice(0, 500),
        document_id: documentID,
        tags: (tags?.length ? tags : ["fastfree", "agent"]).slice(0, 16),
        update_mode: "append",
      }],
    },
    120_000,
    overrides,
  )
  return `Hindsight retain ${body.success === false ? "reported failure" : "ok"} (bank ${body.bank_id ?? config.bank}, items ${body.items_count ?? 1}).`
}

/** Reflect = LLM synthesis over the bank. Expensive; low budget only. Throws on failure. */
export async function toolReflect(query: string, maxTokens = 600, overrides?: EndpointOverrides): Promise<string> {
  const body = await post<{ text?: string }>("/reflect", { query: query.slice(0, 4_000), budget: "low", max_tokens: Math.max(64, Math.min(maxTokens, 2_000)) }, 90_000, overrides)
  return body.text?.trim() || "(empty reflect response)"
}

/** GUI bridge helpers: never throw, shaped for the RPC contract. */
export async function rpcRecall(query: string, maxTokens: number | undefined, overrides?: EndpointOverrides) {
  try {
    const body = await post<RecallResponse>("/memories/recall", { query: query.slice(0, 2_000), budget: "low", max_tokens: maxTokens ?? 1024 }, 30_000, overrides)
    return { markdown: recallMarkdown(body) ?? null }
  } catch (error) {
    console.warn("[fastfree_board] Hindsight recall failed:", error instanceof Error ? error.message : error)
    return { markdown: null }
  }
}

export async function rpcRetain(input: { content: string; context?: string; document_id?: string; tags?: string[] }, overrides?: EndpointOverrides) {
  try {
    const detail = await toolRetain(input.content, input.context, input.document_id, input.tags, overrides)
    return { detail, ok: !detail.includes("reported failure") }
  } catch (error) {
    console.warn("[fastfree_board] Hindsight retain failed:", error instanceof Error ? error.message : error)
    return { detail: `Hindsight retain failed: ${error instanceof Error ? error.message : String(error)}`, ok: false }
  }
}

export async function rpcReflect(query: string, maxTokens: number | undefined, overrides?: EndpointOverrides) {
  try {
    return { text: await toolReflect(query, maxTokens ?? 600, overrides) }
  } catch (error) {
    console.warn("[fastfree_board] Hindsight reflect failed:", error instanceof Error ? error.message : error)
    return { text: `Hindsight reflect failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}
