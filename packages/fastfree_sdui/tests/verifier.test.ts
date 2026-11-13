import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..', '..')
const SCRIPT = join(ROOT, 'apps', 'fastfree_installer', 'scripts', 'verify-sdui-screens.cjs')

describe('SDUI verifier (SDUI-02)', () => {
  it('passes all shipped screens (exit 0)', () => {
    execFileSync(process.execPath, [SCRIPT], { stdio: 'pipe' })
  })

  it('rejects an invalid screen with a clear error (exit 1)', () => {
    const f = join(tmpdir(), 'invalid-sdui-screen.json')
    writeFileSync(f, JSON.stringify({ id: '', root: { type: 'HologramWidget' } }))
    let err: any
    try {
      execFileSync(process.execPath, [SCRIPT, f], { stdio: 'pipe' })
    } catch (e) {
      err = e
    }
    expect(err).toBeTruthy()
    expect(err.status).toBe(1)
    const out = (err.stderr?.toString() || '') + (err.stdout?.toString() || '')
    expect(out).toMatch(/Unregistered widget type|Missing screen id|HologramWidget/)
    unlinkSync(f)
  })
})