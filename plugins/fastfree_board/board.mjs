#!/usr/bin/env node
/** Thin CLI over the fastfree_board MCP server: `node board.mjs <tool> [json]`. */
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const here = path.dirname(fileURLToPath(import.meta.url))
const tool = process.argv[2]
const args = process.argv[3] ? JSON.parse(process.argv[3]) : {}
if (!tool) { console.error("usage: node board.mjs <tool> [json]"); process.exit(1) }

const child = spawn(process.execPath, [path.join(here, "mcp-server.mjs")], { stdio: ["pipe", "pipe", "inherit"] })
let out = ""
child.stdout.on("data", (c) => { out += c.toString() })
const send = (msg) => child.stdin.write(JSON.stringify(msg) + "\n")
send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })
send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} })
send({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: tool, arguments: args } })
setTimeout(() => { child.kill(); const lines = out.split(/\r?\n/).filter(Boolean); const last = lines[lines.length - 1]; try { const parsed = JSON.parse(last); const text = parsed?.result?.content?.map((c) => c.text).join("\n") ?? JSON.stringify(parsed); console.log(text) } catch { console.log(out) } }, 240_000)
