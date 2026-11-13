import { describe, it, expect } from 'vitest'
import { HR_MESSAGES_EN } from '../src/locales/en'
import { HR_MESSAGES_AR } from '../src/locales/ar'

describe('hr locales', () => {
  it('keeps EN and AR key sets in sync', () => {
    expect(Object.keys(HR_MESSAGES_AR).sort()).toEqual(
      Object.keys(HR_MESSAGES_EN).sort(),
    )
  })

  it('is not empty', () => {
    expect(Object.keys(HR_MESSAGES_EN).length).toBeGreaterThan(0)
    expect(Object.keys(HR_MESSAGES_AR).length).toBeGreaterThan(0)
  })
})
