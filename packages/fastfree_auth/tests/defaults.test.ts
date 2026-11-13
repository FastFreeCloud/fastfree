import { describe, it, expect } from 'vitest'

// Subpath import by package name: exercises the workspace alias in the root
// vitest.config.ts (`fastfree-auth/*` -> packages/fastfree_auth/src/*) without
// pulling in the barrel's `.vue` screens.
import { DEFAULT_SETTINGS } from 'fastfree-auth/types'

describe('fastfree-auth defaults', () => {
  it('ships a complete default settings object', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      language: 'ar',
      theme: 'light',
      notifications: true,
      autoSave: true,
    })
  })

  it('defaults to Arabic, matching the product default locale', () => {
    expect(DEFAULT_SETTINGS.language).toBe('ar')
  })
})
