import { describe, it, expect } from 'vitest'
import AUTH_MESSAGES_EN from '../src/locales/en'
import AUTH_MESSAGES_AR from '../src/locales/ar'

describe('auth locales', () => {
  it('keeps EN and AR key sets in sync', () => {
    expect(Object.keys(AUTH_MESSAGES_AR).sort()).toEqual(
      Object.keys(AUTH_MESSAGES_EN).sort(),
    )
  })

  it('is not empty', () => {
    expect(Object.keys(AUTH_MESSAGES_EN).length).toBeGreaterThan(0)
    expect(Object.keys(AUTH_MESSAGES_AR).length).toBeGreaterThan(0)
  })
})
