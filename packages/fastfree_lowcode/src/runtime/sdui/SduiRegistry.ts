/**
 * SduiRegistry — Component Registry for Server-Driven UI
 * Implements Singleton Pattern for registering and resolving Quasar & Custom Vue Components.
 */

import { defineComponent, h, type Component } from 'vue'
import {
  QCard,
  QCardSection,
  QCardActions,
  QBtn,
  QSlider,
  QInput,
  QToggle,
  QIcon,
  QBanner,
  QLinearProgress,
  QChip,
  QBadge,
  QSeparator,
} from 'quasar'

/**
 * Functional HTML Primitive Components to fulfill Component type contract
 */
const DivComponent = defineComponent({
  name: 'SduiDiv',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, slots.default ? slots.default() : undefined)
  }
})

const SpanComponent = defineComponent({
  name: 'SduiSpan',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('span', attrs, slots.default ? slots.default() : undefined)
  }
})

/**
 * Safe fallback component when an unregistered type is requested
 */
const FallbackComponent = defineComponent({
  name: 'SduiFallback',
  inheritAttrs: false,
  props: {
    type: { type: String, default: 'unknown' }
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        'div',
        {
          ...attrs,
          class: 'sdui-fallback-node q-pa-xs rounded-borders text-negative bg-red-1',
          style: 'border: 1px dashed currentColor;'
        },
        [
          h('span', { class: 'text-caption text-bold' }, `[Unknown Component: ${props.type}]`),
          slots.default ? slots.default() : undefined
        ]
      )
  }
})

export class SduiRegistry {
  private static instance: SduiRegistry | null = null

  /**
   * Internal component mapping
   */
  private components: Map<string, Component> = new Map()

  /**
   * Private constructor: Registers standard Quasar & Primitive components
   */
  private constructor() {
    this.registerDefaults()
  }

  /**
   * Singleton instance accessor
   */
  public static getInstance(): SduiRegistry {
    if (!SduiRegistry.instance) {
      SduiRegistry.instance = new SduiRegistry()
    }
    return SduiRegistry.instance
  }

  /**
   * Registers default Quasar and HTML elements
   */
  private registerDefaults(): void {
    // Quasar Components
    this.register('QCard', QCard)
    this.register('QCardSection', QCardSection)
    this.register('QCardActions', QCardActions)
    this.register('QBtn', QBtn)
    this.register('QSlider', QSlider)
    this.register('QInput', QInput)
    this.register('QToggle', QToggle)
    this.register('QIcon', QIcon)
    this.register('QBanner', QBanner)
    this.register('QLinearProgress', QLinearProgress)
    this.register('QChip', QChip)
    this.register('QBadge', QBadge)
    this.register('QSeparator', QSeparator)

    // Common ergonomic aliases
    this.register('button', QBtn)
    this.register('btn', QBtn)
    this.register('card', QCard)
    this.register('banner', QBanner)
    this.register('progress', QLinearProgress)
    this.register('chip', QChip)
    this.register('separator', QSeparator)
    this.register('input', QInput)
    this.register('slider', QSlider)
    this.register('toggle', QToggle)
    this.register('icon', QIcon)
    this.register('badge', QBadge)
    this.register('row', DivComponent)

    // HTML Primitive components
    this.register('div', DivComponent)
    this.register('span', SpanComponent)
  }

  /**
   * Registers a component under a specified type name and common kebab-case alias
   *
   * @param type Component type key (e.g. 'QBtn', 'div')
   * @param component Vue component definition
   */
  public register(type: string, component: Component): void {
    if (!type || !component) return

    const trimmed = type.trim()
    this.components.set(trimmed, component)

    // Also register kebab-case and lowercase aliases for developer ergonomics
    const kebab = this.toKebabCase(trimmed)
    if (kebab !== trimmed) {
      this.components.set(kebab, component)
    }
  }

  /**
   * Resolves a component definition by type name.
   * If not found, falls back gracefully to FallbackComponent or DivComponent.
   *
   * @param type Component type key (case-insensitive & kebab-aware)
   * @returns Vue Component
   */
  public resolve(type: string): Component {
    if (!type) {
      return DivComponent
    }

    const trimmed = type.trim()

    // 1. Direct match
    if (this.components.has(trimmed)) {
      return this.components.get(trimmed)!
    }

    // 2. Kebab-case match (e.g. 'q-btn' -> 'QBtn')
    const kebab = this.toKebabCase(trimmed)
    if (this.components.has(kebab)) {
      return this.components.get(kebab)!
    }

    // 3. Lowercase / case-insensitive search
    const lower = trimmed.toLowerCase()
    for (const [key, comp] of this.components.entries()) {
      if (key.toLowerCase() === lower) {
        return comp
      }
    }

    // 4. Standard HTML tag check
    if (trimmed === 'div') return DivComponent
    if (trimmed === 'span') return SpanComponent

    console.warn(`[SduiRegistry] Component of type "${type}" not registered; using fallback`)
    return FallbackComponent
  }

  /**
   * Checks whether a component type is registered
   */
  public has(type: string): boolean {
    if (!type) return false
    const trimmed = type.trim()
    return this.components.has(trimmed) || this.components.has(this.toKebabCase(trimmed))
  }

  /**
   * Removes a component registration
   */
  public unregister(type: string): boolean {
    const trimmed = type.trim()
    const removed1 = this.components.delete(trimmed)
    const removed2 = this.components.delete(this.toKebabCase(trimmed))
    return removed1 || removed2
  }

  /**
   * Returns a copy of all registered component keys
   */
  public getRegisteredTypes(): string[] {
    return Array.from(this.components.keys())
  }

  /**
   * Helper: converts PascalCase / camelCase to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
      .toLowerCase()
  }
}

export const sduiRegistry = SduiRegistry.getInstance()
