import { describe, it, expect } from 'vitest'
import { ScreenLoader } from 'quasar-app-extension-fastfree-lowcode/sdui/ScreenLoader'

describe('lowcode SDUI ScreenLoader re-export', () => {
  it('re-exports ScreenLoader class', () => {
    expect(typeof ScreenLoader).toBe('function')
    const l = new (ScreenLoader as any)({ baseUrl: 'http://x', cache: null })
    expect(l.getBaseUrl()).toBe('http://x')
  })
})