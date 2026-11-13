import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SDUI_WIDGET_CATALOG } from '../contract/screen.schema'

const here = dirname(fileURLToPath(import.meta.url))

describe('widget catalog JSON (SDUI-02)', () => {
  it('exists in the contract package and matches SDUI_WIDGET_CATALOG', () => {
    const jsonPath = join(here, '..', 'contract', 'widget-catalog.json')
    const json = JSON.parse(readFileSync(jsonPath, 'utf8')) as string[]
    expect(Array.isArray(json)).toBe(true)
    expect(json).toHaveLength(SDUI_WIDGET_CATALOG.length)
    expect([...json].sort()).toEqual([...SDUI_WIDGET_CATALOG].sort())
  })

  it('matches the installer-local copy', () => {
    const root = join(here, '..', '..', '..')
    const installerCopy = join(root, 'apps', 'fastfree_installer', 'scripts', 'widget-catalog.json')
    const a = JSON.parse(readFileSync(join(here, '..', 'contract', 'widget-catalog.json'), 'utf8'))
    const b = JSON.parse(readFileSync(installerCopy, 'utf8'))
    expect(a).toEqual(b)
  })
})