import { Plugin } from "@opencode/plugin"
import { BoardBridge } from "./rpc.ts"
import { bridgeQueue } from "./bridge-queue.ts"
import { toolSchemas, applyBoardRequest } from "./board-tools.ts"
import { sessionOrigin } from "./session-model.ts"
import { toolSettings } from "./tool-settings.ts"
import { serverRecall, toolRecall, toolRetain, toolReflect, hindsightServerConfig, rpcRecall, rpcRetain, rpcReflect } from "./hindsight-server.ts"

// Sessions whose Hindsight snapshot was already injected this process lifetime. Bounded.
const seenMemorySessions = new Set<string>()

// Board writes wait up to 60s by default: the Desktop GUI may be busy rendering or
// launching a session, and the old 15s budget produced spurious "did not answer" failures.
const BOARD_TIMEOUT = Number(process.env.FASTFREE_BOARD_TIMEOUT_MS) || 60_000

/** Best-effort extraction of the latest user prompt from a session's messages. */
function extractUserQuery(messages: unknown[]): string | undefined {
  const collect = (value: unknown, depth: number): string => {
    if (depth > 6 || value === null || value === undefined) return ""
    if (typeof value === "string") return value + "\n"
    if (Array.isArray(value)) return value.map((item) => collect(item, depth + 1)).join("")
    if (typeof value === "object") {
      const record = value as Record<string, unknown>
      let text = ""
      for (const key of ["text", "content", "prompt", "value", "input"]) {
        if (record[key] !== undefined) text += collect(record[key], depth + 1)
      }
      return text
    }
    return ""
  }
  try {
    for (let index = messages.length - 1; index >= 0; index--) {
      const message = messages[index] as Record<string, unknown> | null
      const role = (message?.role ?? (message?.info as Record<string, unknown> | undefined)?.role) as string | undefined
      if (role !== undefined && role !== "user") continue
      const cleaned = collect(message, 0).replace(/\s+/g, " ").trim()
      return cleaned.length >= 8 ? cleaned.slice(0, 500) : undefined
    }
    return undefined
  } catch {
    return undefined
  }
}

// Location instances in the same server share a broker, not per-project boards.
// v3: bumped so a reloaded plugin never reuses a queue instance from older code.
const key = Symbol.for("fastfree_board.bridge.v3")
const shared = globalThis as typeof globalThis & { [key]?: ReturnType<typeof bridgeQueue> }
const queue = shared[key] ??= bridgeQueue(BOARD_TIMEOUT)
const settingsKey = Symbol.for("fastfree_board.tool-settings.v1")
const preferences = globalThis as typeof globalThis & { [settingsKey]?: ReturnType<typeof toolSettings> }
const settings = preferences[settingsKey] ??= toolSettings()


export default Plugin.define({
  id: "fastfree_board",
  async setup(ctx) {
    await settings.load(ctx.storage)
    await ctx.rpc.register(BoardBridge, {
      poll: async (input) => {
        const { clientID, toolsEnabled } = input as { clientID: string; toolsEnabled?: boolean }
        if (toolsEnabled !== undefined) await settings.set(toolsEnabled, ctx.storage)
        return queue.poll(clientID)
      },
      complete: async (input) => {
        const { clientID, id, result, error } = input as { clientID: string; id: string; result?: unknown; error?: string }
        queue.complete(clientID, id, result, error)
        return null
      },
      heartbeat: async (input) => {
        const { clientID } = input as { clientID: string }
        return queue.heartbeat(clientID)
      },
      status: async () => queue.status(),
      // Hindsight memory bridge: the GUI cannot reach the local daemon (CORS preflight
      // gets no answer), so all GUI→daemon traffic flows through the server part.
      hindsight_recall: async (input) => {
        const args = input as { query: string; max_tokens?: number; endpoint?: string; bank?: string }
        return rpcRecall(args.query, args.max_tokens, { endpoint: args.endpoint, bank: args.bank })
      },
      hindsight_retain: async (input) => {
        const args = input as { content: string; context?: string; document_id?: string; tags?: string[]; endpoint?: string; bank?: string }
        return rpcRetain({ content: args.content, context: args.context, document_id: args.document_id, tags: args.tags }, { endpoint: args.endpoint, bank: args.bank })
      },
      hindsight_reflect: async (input) => {
        const args = input as { query: string; max_tokens?: number; endpoint?: string; bank?: string }
        return rpcReflect(args.query, args.max_tokens, { endpoint: args.endpoint, bank: args.bank })
      },
    })
    await ctx.tool.transform((editor) => {
      if (!settings.enabled) return
      for (const [operation, definition] of Object.entries(toolSchemas)) {
        editor.add({
          name: `board_${operation}`,
          description: `${definition.description} Requires OpenCode Desktop open and connected.`,
          input: { type: "object", properties: definition.properties, required: [...definition.required], additionalProperties: false },
          execute: async (input, context) => {
            if (!settings.enabled) throw new Error("Board agent tools are disabled in Settings.")
            if (operation !== "list" && operation !== "get" && operation !== "wait") {
              await ctx.permission.assert({ sessionID: context.sessionID, agent: context.agent, source: { type: "tool", messageID: context.messageID, id: context.id }, action: operation === "start_session" ? "board_start_session" : operation === "remove" ? "board_remove" : "board_update", resources: [String((input as Record<string, unknown>).task_id ?? "new")], save: ["*"] })
            }
            const origin = operation === "start_session" ? await sessionOrigin(ctx.session, context.sessionID) : undefined
            const timeout = (input as Record<string, unknown>).timeout_seconds ?? 120
            if (operation === "wait" && (typeof timeout !== "number" || !Number.isInteger(timeout) || timeout < 1 || timeout > 3600)) throw new Error("timeout_seconds must be an integer between 1 and 3600")
            if (!settings.enabled) throw new Error("Board agent tools are disabled in Settings.")
            const result = await queue.request({ operation, input, sessionID: context.sessionID, ...(origin ?? {}) }, context.signal, operation === "wait" ? { concurrent: true, timeout: Number(timeout) * 1000 + 15_000 } : {})
            return { content: JSON.stringify(result) }
          },
        })
      }
      // Liveness probe: answers from the server, no Desktop round-trip, so agents can
      // distinguish "Desktop is closed" from "Desktop is busy" before retrying a write.
      editor.add({
        name: "board_status",
        description: "Check whether OpenCode Desktop is connected to the board and how many board requests are pending. Use before retrying a failed board write.",
        input: { type: "object", properties: {}, additionalProperties: false },
        execute: async () => ({ content: JSON.stringify(queue.status()) }),
      } as never)
      const { endpoint, bank } = hindsightServerConfig()
      const where = `Local Hindsight bank "${bank}" at ${endpoint} (set FASTFREE_HINDSIGHT_ENDPOINT / FASTFREE_HINDSIGHT_BANK to override).`
      editor.add({
        name: "hindsight_recall",
        description: `Search Hindsight long-term memory for facts relevant to a query. Use BEFORE non-trivial work to surface prior decisions, pitfalls and conventions. Returns markdown bullet lines. ${where}`,
        input: { type: "object", properties: { query: { type: "string", minLength: 1, description: "What to look for, e.g. 'fastfree_installer RTL fonts'" }, max_tokens: { type: "integer", minimum: 64, maximum: 4096, description: "Token budget for relevant-memory output. Defaults to 1024." } }, required: ["query"], additionalProperties: false },
        execute: async (input: unknown) => {
          const args = input as { query?: unknown; max_tokens?: number }
          if (!args?.query) throw new Error("query is required")
          return { content: await toolRecall(String(args.query), args.max_tokens) }
        },
      } as never)
      editor.add({
        name: "hindsight_retain",
        description: `Save a durable memory to Hindsight. Use when a decision, root cause, fix or convention is worth remembering across sessions. ${where}`,
        input: { type: "object", properties: { content: { type: "string", minLength: 1, description: "1-3 factual sentences. No secrets or credentials." }, context: { type: "string", description: "Short label for provenance, e.g. 'code review fix'" }, document_id: { type: "string", description: "Stable id so repeated retains update the same document, e.g. 'task:<uuid>'" }, tags: { type: "array", items: { type: "string" }, maxItems: 16 } }, required: ["content"], additionalProperties: false },
        execute: async (input: unknown, context: unknown) => {
          const args = input as { content?: unknown; context?: string; document_id?: string; tags?: string[] }
          if (!args?.content) throw new Error("content is required")
          const ctx2 = context as { sessionID: string; agent: string; messageID: string; id: string }
          await ctx.permission.assert({ sessionID: ctx2.sessionID, agent: ctx2.agent, source: { type: "tool", messageID: ctx2.messageID, id: ctx2.id }, action: "board_update", resources: [`hindsight:${bank}`], save: ["*"] })
          return { content: await toolRetain(String(args.content), args.context, args.document_id, args.tags) }
        },
      } as never)
      editor.add({
        name: "hindsight_reflect",
        description: `Ask Hindsight to SYNTHESIZE an answer from bank memory (LLM reflection over facts). Slower and token-heavier than recall; prefer hindsight_recall for simple lookups. ${where}`,
        input: { type: "object", properties: { query: { type: "string", minLength: 1 }, max_tokens: { type: "integer", minimum: 64, maximum: 2000, description: "Answer budget. Defaults to 600." } }, required: ["query"], additionalProperties: false },
        execute: async (input: unknown) => {
          const args = input as { query?: unknown; max_tokens?: number }
          if (!args?.query) throw new Error("query is required")
          return { content: await toolReflect(String(args.query), args.max_tokens) }
        },
      } as never)
    })
    // Every session's system prompt gets (a) the board-tracking instruction and
    // (b) once per session, a bounded Hindsight memory snapshot for the opening
    // request. Memory injection is best effort: it never blocks or fails the request.
    await ctx.session.hook("context", async (event) => {
      if (event.tools && Object.keys(event.tools).length === 0) return // auxiliary requests (title etc.) that carry no tools
      event.system.push({
        type: "text" as const,
        text: "FASTFREE_BOARD: You are an autonomous engineer on the FastFree ERP project. Track significant work on the fastfree_board plugin, not in ad-hoc notes.\n\nWORKFLOW for multi-step tasks:\n1. OPEN — board_get the task (or board_list) and read the full description, acceptance criteria, and linked context.\n2. RECALL — hindsight_recall with the task title before writing code; honor any dependencies, constraints, or prior decisions it returns.\n3. PLAN — state a short plan, then implement in small verifiable steps.\n4. VERIFY — run the relevant tests/typecheck (e.g. `pnpm test`, `bun run typecheck`) and include the REAL command output in your report. Never claim success without running them.\n5. TRACK — board_update as you complete checklist items (one at a time, never check unfinished work); move to review only after verification.\n6. PERSIST — hindsight_retain the decisions and root causes that matter for future tasks.\n\nBOARD RELIABILITY: if a board write fails with \"Desktop did not answer\", re-read the board (board_get/board_list) before retrying — the write may already have been applied. Use board_status to check Desktop connectivity. Prefer not to call board tools for trivial one-line changes — only when the task has multiple steps, touches files, or spans sessions. When a session completes linked work, prefer waiting briefly for any board sessions before announcing completion.",
      })
      if (seenMemorySessions.has(event.sessionID)) return
      seenMemorySessions.add(event.sessionID)
      if (seenMemorySessions.size > 500) {
        const oldest = seenMemorySessions.values().next().value
        if (oldest !== undefined) seenMemorySessions.delete(oldest)
      }
      const query = extractUserQuery(Array.isArray(event.messages) ? event.messages : [])
      if (!query) return
      const snapshot = await serverRecall(query, 512)
      if (snapshot) event.system.push({ type: "text" as const, text: `FASTFREE_MEMORY (Hindsight bank for this machine):\n${snapshot}` })
    })
    return settings.subscribe(() => ctx.tool.reload())
  },
})
