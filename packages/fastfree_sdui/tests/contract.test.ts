/**
 * SDUI contract tests (SDUI-01, docs/sdui/PLAN.md §9 P0)
 *
 * Acceptance criteria:
 * 1. Every existing screen (installer + panel + sales + accounting) passes
 *    the Zod contract schema — non-destructively (unknown keys survive).
 * 2. Every widget type used by those screens resolves against the catalog
 *    that mirrors SduiRegistry.
 * 3. The frozen part of the contract (SduiNode: type/props/children/events/
 *    model, SduiScreen: id/root/state/title) rejects structurally broken
 *    screens with precise issue paths.
 * 4. The engine-facing types exported by `quasar-app-extension-fastfree-lowcode`
 *    are the contract types (compile-time guard at the bottom).
 */
import { describe, it, expect, expectTypeOf } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SduiNode, SduiScreen } from '../contract/types'
import {
  SDUI_WIDGET_CATALOG,
  SduiScreenSchema,
  createSduiScreenSchema,
  isKnownSduiWidget,
  parseSduiScreen,
  validateSduiScreen,
  walkSduiNodes,
} from '../contract/screen.schema'
import type { ParsedSduiScreen } from '../contract/screen.schema'
// Type-only: erased at runtime; the alias comes from the root vitest config.
import type {
  SduiScreen as LowcodeSduiScreen,
  SduiNode as LowcodeSduiNode,
} from 'quasar-app-extension-fastfree-lowcode'

const here = dirname(fileURLToPath(import.meta.url))

/** Every directory that ships SDUI screen JSON today (screens.ts sources). */
const SCREEN_DIRS: Array<[string, string]> = [
  ['installer', join(here, '..', '..', '..', 'apps', 'fastfree_installer', 'src', 'schemas')],
  ['panel', join(here, '..', '..', '..', 'packages', 'fastfree_panel', 'src', 'schemas')],
  ['sales', join(here, '..', '..', '..', 'packages', 'fastfree_sales', 'src', 'schemas')],
  ['accounting', join(here, '..', '..', '..', 'packages', 'fastfree_accounting', 'src', 'schemas')],
]

interface LoadedScreen {
  label: string
  screen: SduiScreen
}

function loadScreens(): LoadedScreen[] {
  const loaded: LoadedScreen[] = []
  for (const [name, dir] of SCREEN_DIRS) {
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.json')) continue
      loaded.push({
        label: `${name}/${file}`,
        screen: JSON.parse(readFileSync(join(dir, file), 'utf8')) as SduiScreen,
      })
    }
  }
  return loaded
}

const screens = loadScreens()

/** Minimal screen used as the base for positive/negative variations. */
const baseScreen = (root: Partial<SduiNode> = {}): SduiScreen => ({
  id: 'test_screen',
  root: { type: 'div', ...root },
})

// ── 1. Existing screens pass the contract (acceptance #1) ────────────────────

describe('existing screens × contract schema', () => {
  it('discovers the shipped screen registries', () => {
    // 12 installer + 2 panel + 1 sales + 1 accounting screens ship today.
    expect(screens.length).toBeGreaterThanOrEqual(16)
    for (const [name] of SCREEN_DIRS) {
      expect(screens.some((s) => s.label.startsWith(`${name}/`))).toBe(true)
    }
  })

  it.each(screens.map((s) => [s.label, s.screen] as const))(
    '%s · passes SduiScreenSchema',
    (_label, screen) => {
      const result = SduiScreenSchema.safeParse(screen)
      expect(result.success).toBe(true)
    },
  )

  it.each(screens.map((s) => [s.label, s.screen] as const))(
    '%s · passes the full validator (structure + widget catalog)',
    (_label, screen) => {
      const result = validateSduiScreen(screen)
      expect(result.ok).toBe(true)
    },
  )

  it.each(screens.map((s) => [s.label, s.screen] as const))(
    '%s · parses non-destructively (unknown keys survive)',
    (_label, screen) => {
      const result = SduiScreenSchema.safeParse(screen)
      expect(result.success).toBe(true)
      // Installer screens carry a `clan` spec block; passthrough must keep it.
      expect(result.data).toEqual(screen)
    },
  )

  it('keeps the installer `clan` spec block intact through parsing', () => {
    const clanScreen = screens.find((s) => s.label === 'installer/clan_vars_secrets.json')
    expect(clanScreen).toBeDefined()
    const parsed = SduiScreenSchema.parse(clanScreen!.screen)
    expect(parsed.clan).toEqual((clanScreen!.screen as { clan?: unknown }).clan)
  })
})

// ── 2. Frozen contract rules (acceptance #3 — no breakage, no looseness) ─────

describe('SduiScreenSchema structural rules', () => {
  it('accepts the minimal screen', () => {
    expect(SduiScreenSchema.safeParse(baseScreen()).success).toBe(true)
  })

  it('accepts optional metadata without meta', () => {
    expect(SduiScreenSchema.safeParse(baseScreen({ text: { ar: 'أهلاً', en: 'Hello' } })).success).toBe(true)
  })

  const invalid: Array<[string, unknown]> = [
    ['missing everything', {}],
    ['id not a string', { id: 42, root: { type: 'div' } }],
    ['empty id', { id: '', root: { type: 'div' } }],
    ['missing root', { id: 'x' }],
    ['root not an object', { id: 'x', root: 'div' }],
    ['root without type', { id: 'x', root: {} }],
    ['root with empty type', { id: 'x', root: { type: '' } }],
    ['children not an array', baseScreen({ children: 'nope' })],
    ['child node without type', baseScreen({ children: [{ type: 'div' }, {}] })],
    ['text as number', baseScreen({ text: 42 })],
    ['model not a string', baseScreen({ model: 42 })],
    ['events value not an action', baseScreen({ events: { click: 42 } })],
    ['action without type', baseScreen({ events: { click: { command: 'x' } } })],
    ['action type empty', baseScreen({ events: { click: { type: '' } } })],
    ['tauri:invoke without command', baseScreen({ events: { click: { type: 'tauri:invoke' } } })],
    ['meta without app', { id: 'x', root: { type: 'div' }, meta: { updatedAt: 1 } }],
    ['meta.updatedAt as string', { id: 'x', root: { type: 'div' }, meta: { app: 'panel', updatedAt: 'now' } }],
    ['meta with unknown key (strict)', { id: 'x', root: { type: 'div' }, meta: { app: 'panel', updatedAt: 1, extra: true } }],
    ['state not a record', { id: 'x', root: { type: 'div' }, state: 'flat' }],
  ]

  it.each(invalid)('rejects %s', (_name, payload) => {
    expect(SduiScreenSchema.safeParse(payload).success).toBe(false)
  })

  it('reports the precise path of a nested failure', () => {
    const result = validateSduiScreen({
      id: 'x',
      root: {
        type: 'div',
        children: [
          { type: 'card', children: [{ type: 'button', events: { click: { type: 'tauri:invoke' } } }] },
        ],
      },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((i) => i.path === 'root.children.0.children.0.events.click.command')).toBe(true)
    }
  })
})

describe('SduiNode engine semantics', () => {
  it('accepts single actions and action arrays in events (existing screens use both)', () => {
    const screen = baseScreen({
      events: {
        click: [
          { type: 'state:set', target: 'revealed', payload: true },
          { type: 'notify', payload: { message: 'تم', color: 'positive' } },
        ],
        change: { type: 'navigate', target: 'step2' },
      },
    })
    expect(SduiScreenSchema.safeParse(screen).success).toBe(true)
  })

  it('accepts tauri:invoke with a command + payload (the only engine-required field)', () => {
    const screen = baseScreen({
      events: { click: { type: 'tauri:invoke', command: 'verify_license_key', payload: { key: 'X' } } },
    })
    expect(SduiScreenSchema.safeParse(screen).success).toBe(true)
  })

  it('mirrors dispatcher tolerance: state:set bulk-merge and no-op navigate parse fine', () => {
    const screen = baseScreen({
      events: {
        click: { type: 'state:set', payload: { cpu: 8 } },
        dblclick: { type: 'navigate' },
      },
    })
    expect(SduiScreenSchema.safeParse(screen).success).toBe(true)
  })

  it('preserves custom action types and their keys (open_sdui_screen.screen)', () => {
    const parsed = SduiScreenSchema.parse(
      baseScreen({ events: { click: { type: 'open_sdui_screen', screen: 'fleet_monitor' } } }),
    )
    const action = parsed.root.events!.click as { screen?: string }
    expect(action.screen).toBe('fleet_monitor')
  })

  it('accepts every documented class/style form', () => {
    const screen = baseScreen({
      class: ['diag-card', 'q-pa-md'],
      style: { marginTop: 8 },
      children: [
        { type: 'banner', class: { 'diag-card': true, hidden: false }, style: 'border: 1px solid red' },
      ],
    })
    expect(SduiScreenSchema.safeParse(screen).success).toBe(true)
  })

  it('accepts dotted model paths (nested state, e.g. modules.mariadb)', () => {
    const screen = baseScreen({
      children: [{ type: 'toggle', model: 'modules.mariadb' }],
    })
    expect(SduiScreenSchema.safeParse(screen).success).toBe(true)
  })
})

describe('SduiScreenMetaSchema', () => {
  const root = { type: 'div' }

  it('accepts full metadata', () => {
    const screen = {
      id: 'x',
      root,
      meta: {
        app: 'installer',
        module: 'clan',
        minAppVersion: '26.5.0',
        locales: ['ar', 'en'],
        tags: ['p0', 'sovereign'],
        updatedAt: 1794576000000,
      },
    }
    expect(SduiScreenSchema.safeParse(screen).success).toBe(true)
  })

  it('accepts minimal metadata (app + updatedAt only)', () => {
    expect(SduiScreenSchema.safeParse({ id: 'x', root, meta: { app: 'panel', updatedAt: 1 } }).success).toBe(true)
  })
})

// ── 3. Widget catalog (PLAN §9 P0: "محقق Zod + كتالوج الويدجتات") ─────────────

describe('widget catalog', () => {
  it('resolves every widget type used by the shipped screens', () => {
    const used = new Set<string>()
    for (const { screen } of screens) {
      walkSduiNodes(screen.root, (node) => {
        used.add(node.type)
        expect(isKnownSduiWidget(node.type)).toBe(true)
      })
    }
    // Sanity: the 14 aliases the 16 screens actually use (analysis of 1197 nodes).
    expect(used.size).toBeGreaterThanOrEqual(14)
  })

  it('mirrors SduiRegistry resolution: exact, kebab-case and case-insensitive', () => {
    for (const key of SDUI_WIDGET_CATALOG) {
      expect(isKnownSduiWidget(key)).toBe(true)
    }
    expect(isKnownSduiWidget('q-card')).toBe(true)
    expect(isKnownSduiWidget('Q-BTN')).toBe(true)
    expect(isKnownSduiWidget('qcardsection')).toBe(true)
    expect(isKnownSduiWidget('  QBtn  ')).toBe(true)
  })

  it('rejects unknown and empty types', () => {
    expect(isKnownSduiWidget('WizardWidget')).toBe(false)
    expect(isKnownSduiWidget('')).toBe(false)
  })

  it('createSduiScreenSchema enforces the catalog on top of the structure', () => {
    const unknownWidgetScreen = baseScreen({ children: [{ type: 'hologram' }] })
    // Base schema is permissive (registry renders a visible fallback):
    expect(SduiScreenSchema.safeParse(unknownWidgetScreen).success).toBe(true)
    // Checked schema rejects with a precise path:
    const strict = createSduiScreenSchema().safeParse(unknownWidgetScreen)
    expect(strict.success).toBe(false)
    if (!strict.success) {
      expect(strict.error.issues.some((i) => i.path.join('.') === 'root.children.0.type')).toBe(true)
    }
    // …and accepts the widget when the catalog is extended:
    const extended = createSduiScreenSchema({ allowedTypes: [...SDUI_WIDGET_CATALOG, 'hologram'] })
    expect(extended.safeParse(unknownWidgetScreen).success).toBe(true)
  })
})

// ── 4. Helpers ───────────────────────────────────────────────────────────────

describe('validateSduiScreen / parseSduiScreen', () => {
  it('returns the parsed screen on success', () => {
    const result = validateSduiScreen(screens[0].screen)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.screen).toEqual(screens[0].screen)
  })

  it('collects every issue at once with readable paths', () => {
    const result = validateSduiScreen({ id: '', root: {} })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const paths = result.issues.map((i) => i.path)
      expect(paths).toContain('id')
      expect(paths).toContain('root.type')
      expect(result.issues.every((i) => i.message.length > 0 && i.code.length > 0)).toBe(true)
    }
  })

  it('parseSduiScreen throws on invalid payloads', () => {
    expect(() => parseSduiScreen({ id: 'x' })).toThrow()
  })
})

describe('walkSduiNodes', () => {
  it('visits every node with its Zod-style path', () => {
    const visits: Array<[string, Array<string | number>]> = []
    walkSduiNodes(
      {
        type: 'div',
        children: [
          { type: 'card' },
          { type: 'row', children: [{ type: 'button' }] },
        ],
      },
      (node, path) => visits.push([node.type, path]),
    )
    expect(visits.map((v) => v[0])).toEqual(['div', 'card', 'row', 'button'])
    expect(visits.map((v) => v[1].join('.'))).toEqual([
      'root',
      'root.children.0',
      'root.children.1',
      'root.children.1.children.0',
    ])
  })
})

// ── 5. Engine compatibility (compile-time guard — enforced by tsc/vue-tsc) ───

describe('contract ⇄ engine type compatibility', () => {
  // The lowcode engine re-exports this contract, so these are the same types.
  // If the shim is ever replaced by a divergent local copy, a typecheck run
  // (vue-tsc / tsc) fails here first instead of in a running app.
  it('SduiNode is exactly the engine type', () => {
    expectTypeOf<LowcodeSduiNode>().toEqualTypeOf<SduiNode>()
  })

  it('SduiScreen is exactly the engine type', () => {
    expectTypeOf<LowcodeSduiScreen>().toEqualTypeOf<SduiScreen>()
  })

  it('schema output satisfies the SduiScreen contract', () => {
    expectTypeOf<ParsedSduiScreen>().toExtend<SduiScreen>()
  })
})
