import { describe, it, expect } from 'vitest'
import LC_DEFAULT_MESSAGES from '../src/runtime/messages-en'
import LC_DEFAULT_MESSAGES_AR from '../src/runtime/messages-ar'

describe('lowcode locales', () => {
  it('keeps EN and AR key sets in sync', () => {
    expect(Object.keys(LC_DEFAULT_MESSAGES_AR).sort()).toEqual(
      Object.keys(LC_DEFAULT_MESSAGES).sort(),
    )
  })

  it('is not empty', () => {
    expect(Object.keys(LC_DEFAULT_MESSAGES).length).toBeGreaterThan(0)
    expect(Object.keys(LC_DEFAULT_MESSAGES_AR).length).toBeGreaterThan(0)
  })
})
