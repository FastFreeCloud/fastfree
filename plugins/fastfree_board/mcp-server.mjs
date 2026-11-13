#!/usr/bin/env node
/**
 * fastfree_board MCP server — connects external callers to the fastfree_board
 * plugin over the Model Context Protocol.
 *
 * Transport: MCP (Model Context Protocol) over stdio, JSON-RPC 2.0.
 * Backend:   the OpenCode HTTP API (`opencode api`), which routes prompts into
 *            an OpenCode session whose agent uses the plugin's `board_*` tools.
 *
 * Why this shape: the board lives inside OpenCode Desktop, and the plugin's RPC
 * is in-process only. The documented external surface is the OpenCode HTTP API,
 * so every tool here is a thin, retry-safe wrapper over `opencode api`.
 *
 * Env:
 *   FASTFREE_OPENCODE_SERVER   explicit server URL (skips discovery)
 *   OPENCODE_PASSWORD          server password (skips discovery)
 *   FASTFREE_BOARD_AGENT       agent to use (default "build")
 *   FASTFREE_BOARD_MODEL       model ref, e.g. "opencode/glm-5.3-flash-free"
 */
import { spawn } from "node:child_process"

const SERVER = process.env.FASTFREE_OPENCODE_SERVER
const PASSWORD = process.env.OPENCODE_PASSWORD
const AGENT = process.env.FASTFREE_BOARD_AGENT ?? "build"
const MODEL = process.env.FASTFREE_BOARD_MODEL

/** Run `opencode api ...` and return parsed JSON. Never throws.
 *
 * `operation` is an OpenAPI operation id (e.g. "session.create") or, as a
 * fallback, an HTTP method + path joined into a single string. `params` holds
 * path/query parameters (passed via --param). `body` is sent with -d.
 */
async function oc(operation, params, body) {
  const argv = [operation]
  if (SERVER) argv.push("--server", SERVER)
  const paramEntries = params && typeof params === "object" ? Object.entries(params) : []
  for (const [key, value] of paramEntries) {
    if (value === undefined || value === null) continue
    argv.push("--param", `${key}=${value}`)
  }
  if (PASSWORD) process.env.OPENCODE_PASSWORD = PASSWORD
  if (body !== undefined) argv.push("-d", JSON.stringify(body))
  return await new Promise((resolve) => {
    const child = spawn("opencode", ["api", ...argv], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env } })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => { stdout += chunk.toString() })
    child.stderr.on("data", (chunk) => { stderr += chunk.toString() })
    child.on("error", (error) => resolve({ __error: error.message }))
    child.on("close", () => {
      const text = stdout.trim()
      if (!text) return resolve({ __error: stderr.trim() || `opencode api exited ${child.exitCode}` })
      try { resolve(JSON.parse(text)) } catch { resolve({ __raw: text }) }
    })
  })
}

/** One reusable session for the lifetime of this MCP server. */
let sessionID = ""
async function ensureSession() {
  if (sessionID) return sessionID
  const created = await oc("session.create", {}, {})
  const id = created?.data?.id ?? created?.id
  if (!id) throw new Error(`cannot create session: ${JSON.stringify(created).slice(0, 300)}`)
  sessionID = id
  return id
}

/** Send a prompt and wait for the assistant to go idle. Returns the last text. */
async function ask(text, timeoutMs = 120_000) {
  const id = await ensureSession()
  const sent = await oc("session.prompt", { sessionID: id }, { text, agent: AGENT, ...(MODEL ? { model: MODEL } : {}) })
  if (sent?.__error) throw new Error(sent.__error)
  const deadline = Date.now() + timeoutMs
  let lastText = ""
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5_000))
    const messages = await oc("session.message.list", { sessionID: id, order: "asc" })
    const list = Array.isArray(messages?.data) ? messages.data : []
    const last = list[list.length - 1]
    if (last?.type === "idle") {
      const texts = list.filter((m) => m.type === "assistant" && Array.isArray(m.content))
        .flatMap((m) => m.content.filter((c) => c.type === "text").map((c) => c.text ?? ""))
        .filter(Boolean)
      return texts.length ? texts.join("\n") : lastText || "(no text)"
    }
    const partial = list.filter((m) => m.type === "assistant" && Array.isArray(m.content))
      .flatMap((m) => m.content.filter((c) => c.type === "text").map((c) => c.text ?? ""))
      .filter(Boolean)
    if (partial.length) lastText = partial.join("\n")
  }
  return lastText || "(timed out)"
}

const TOOLS = [
  { name: "fastfree_board_list", description: "List board tasks with optional filters (query, column_id, label, limit, offset). Returns columns and tasks.", properties: { query: { type: "string" }, column_id: { type: "string" }, label: { type: "string" }, limit: { type: "number" }, offset: { type: "number" } } },
  { name: "fastfree_board_get", description: "Get one task by id, including its full Markdown description, project and session links.", properties: { task_id: { type: "string" } }, required: ["task_id"] },
  { name: "fastfree_board_create", description: "Create a board task. Defaults to the bottom of the first column.", properties: { title: { type: "string" }, description: { type: "string" }, labels: { type: "string" }, column_id: { type: "string" }, project: { type: "object" } }, required: ["title"] },
  { name: "fastfree_board_update", description: "Update a task's title, description, labels or project.", properties: { task_id: { type: "string" }, title: { type: "string" }, description: { type: "string" }, labels: { type: "string" }, project: { type: ["object", "null"] } }, required: ["task_id"] },
  { name: "fastfree_board_move", description: "Move a task to another column and/or position. Omit column_id to reorder within the column.", properties: { task_id: { type: "string" }, column_id: { type: "string" }, position: { type: "number" } }, required: ["task_id"] },
  { name: "fastfree_board_remove", description: "Delete a task permanently. Linked sessions are not stopped.", properties: { task_id: { type: "string" } }, required: ["task_id"] },
  { name: "fastfree_board_summary", description: "Board summary: totals, per-column counts, and the automatic-lifecycle queues.", properties: {} },
  { name: "fastfree_board_start", description: "Start a session on a task (auto-lifecycle normally does this). Returns the session id.", properties: { task_id: { type: "string" }, open: { type: "boolean" } }, required: ["task_id"] },
]

function reply(id, result) { process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n") }
function fail(id, code, message) { process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n") }

async function callTool(name, args) {
  const a = args ?? {}
  const prompt = `You are operating the fastfree_board. Call the \`${name.replace("fastfree_board_", "board_")}\` tool exactly once with this JSON input: ${JSON.stringify(a)}. Then reply with ONLY the tool's raw JSON result, no commentary, no markdown fences.`
  const text = await ask(prompt)
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return { content: [{ type: "text", text }] }
  try { return { content: [{ type: "text", text: JSON.stringify(JSON.parse(match[0]), null, 1) }] } }
  catch { return { content: [{ type: "text", text }] } }
}

const buffer = []
process.stdin.on("data", (chunk) => {
  buffer.push(chunk.toString())
  let text = buffer.join("")
  const parts = text.split(/\r?\n/)
  buffer.length = 0
  if (!text.endsWith("\n")) buffer.push(parts.pop())
  for (const line of parts) {
    if (!line.trim()) continue
    handle(line).catch((error) => fail(null, -32603, error.message))
  }
})

async function handle(line) {
  let message
  try { message = JSON.parse(line) } catch { return }
  const { id, method, params } = message
  if (method === "initialize") {
    return reply(id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "fastfree_board", version: "0.3.0" } })
  }
  if (method === "notifications/initialized" || method === "initialized") return
  if (method === "ping") return reply(id, {})
  if (method === "tools/list") return reply(id, { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: { type: "object", properties: t.properties, required: t.required ?? [], additionalProperties: false } })) })
  if (method === "tools/call") {
    const tool = TOOLS.find((t) => t.name === params?.name)
    if (!tool) return fail(id, -32602, `unknown tool: ${params?.name}`)
    try { return reply(id, await callTool(tool.name, params.arguments)) }
    catch (error) { return fail(id, -32603, error instanceof Error ? error.message : String(error)) }
  }
  if (id !== undefined) return fail(id, -32601, `unknown method: ${method}`)
}
