#!/usr/bin/env node
/**
 * oc-run — OpenCode agent runner with automatic model failover.
 *
 * OpenCode does NOT switch models on its own when a provider returns 429
 * (free daily limit / Go 5-hour limit). This wrapper tries a list of models in
 * order and returns the first successful agent reply.
 *
 * Usage:
 *   node scripts/oc-run.mjs "<prompt>" [model,model,...]
 *   node scripts/oc-run.mjs "<prompt>"                       # default model chain
 *   OC_MODELS="opencode-go/beam-free,opencode-go/glm-5.3" node scripts/oc-run.mjs "<prompt>"
 *
 * Environment:
 *   OC_MODELS   comma-separated fallback chain (overrides the argument)
 *   OC_AGENT    OpenCode agent to use (default: build)
 *   OC_CWD      Working directory (default: repo root)
 */
import { spawn } from 'node:child_process'

const DEFAULT_CHAIN = [
  'opencode-go/beam-free',
  'opencode-go/glm-5.3',
  'opencode-go/glm-5.3-flash',
  'opencode-go/longcat-2.5-free',
  'opencode/longcat-2.5-free',
  'opencode/glm-5.3-flash-free',
]

const prompt = process.argv[2]
if (!prompt) {
  console.error('usage: node scripts/oc-run.mjs "<prompt>" [model,model,...]')
  process.exit(2)
}

const chain = (process.env.OC_MODELS ? process.env.OC_MODELS.split(',') : (process.argv[3] ? process.argv[3].split(',') : DEFAULT_CHAIN))
  .map((m) => m.trim())
  .filter(Boolean)

const AGENT = process.env.OC_AGENT ?? 'build'
const CWD = process.env.OC_CWD ?? process.cwd()

function run(model) {
  return new Promise((resolve) => {
    const child = spawn(
      'opencode',
      ['run', '--auto', '--format', 'json', '-m', model, '--agent', AGENT, prompt],
      { windowsHide: true, cwd: CWD, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => { out += d.toString() })
    child.stderr.on('data', (d) => { err += d.toString() })
    child.on('error', (e) => resolve({ code: 1, out, err: String(e) }))
    child.on('close', (code) => resolve({ code, out, err }))
  })
}

/** A provider-level usage limit means "try the next model", not a task failure. */
function isLimited(out, err) {
  return /free-limit|GoUsageLimit|usage limit|status.*429|provider\.free/i.test(out + err)
}

/** Collect the agent's visible text from the JSON-line stream. */
function extractText(out) {
  const texts = []
  for (const line of out.split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const j = JSON.parse(line)
      if (j?.part?.text) texts.push(j.part.text)
    } catch {
      // non-JSON line (e.g. a warning) — ignore
    }
  }
  return texts.join('\n').trim()
}

for (const model of chain) {
  const { out, err } = await run(model)
  if (isLimited(out, err)) {
    console.error(`[oc-run] ${model}: usage limit — trying next model`)
    continue
  }
  const text = extractText(out)
  if (text) {
    console.log(text)
    process.exit(0)
  }
  console.error(`[oc-run] ${model}: no agent text (exit) — trying next model`)
  if (err.trim()) console.error(`[oc-run] ${model} stderr: ${err.trim().slice(0, 300)}`)
}

console.error('[oc-run] all models failed')
process.exit(1)
