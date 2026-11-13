import { describe, it, expect } from 'vitest'
import { SALES_MESSAGES_EN } from '../src/locales/en'
import { SALES_MESSAGES_AR } from '../src/locales/ar'

describe('sales locales', () => {
  it('keeps EN and AR key sets in sync', () => {
    expect(Object.keys(SALES_MESSAGES_AR).sort()).toEqual(
      Object.keys(SALES_MESSAGES_EN).sort(),
    )
  })

  it('is not empty', () => {
    expect(Object.keys(SALES_MESSAGES_EN).length).toBeGreaterThan(0)
    expect(Object.keys(SALES_MESSAGES_AR).length).toBeGreaterThan(0)
  })
})
