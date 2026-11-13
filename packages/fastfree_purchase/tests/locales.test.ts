import { describe, it, expect } from 'vitest'
import { PURCHASE_MESSAGES_EN } from '../src/locales/en'
import { PURCHASE_MESSAGES_AR } from '../src/locales/ar'

describe('purchase locales', () => {
  it('keeps EN and AR key sets in sync', () => {
    expect(Object.keys(PURCHASE_MESSAGES_AR).sort()).toEqual(
      Object.keys(PURCHASE_MESSAGES_EN).sort(),
    )
  })

  it('is not empty', () => {
    expect(Object.keys(PURCHASE_MESSAGES_EN).length).toBeGreaterThan(0)
    expect(Object.keys(PURCHASE_MESSAGES_AR).length).toBeGreaterThan(0)
  })
})
