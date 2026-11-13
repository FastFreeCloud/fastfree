import { describe, it, expect } from 'vitest'
import { LicenseExpiry } from '../src/domain/models/LicenseExpiry'

const REF = Date.parse('2026-01-01T00:00:00Z')

describe('LicenseExpiry', () => {
  it('treats a missing expiry as perpetual', () => {
    for (const raw of [null, undefined, '']) {
      const expiry = new LicenseExpiry(raw, REF)
      expect(expiry.isPerpetual).toBe(true)
      expect(expiry.isoDate).toBeNull()
      expect(expiry.daysRemaining).toBeNull()
    }
  })

  it('treats far-future licences as perpetual', () => {
    const expiry = new LicenseExpiry('2100-01-01T00:00:00Z', REF)
    expect(expiry.isPerpetual).toBe(true)
    expect(expiry.daysRemaining).toBeNull()
  })

  it('normalizes a concrete expiry and counts whole days remaining', () => {
    const expiry = new LicenseExpiry('2026-01-11T00:00:00Z', REF)
    expect(expiry.isPerpetual).toBe(false)
    expect(expiry.isoDate).toBe('2026-01-11')
    expect(expiry.daysRemaining).toBe(10)
  })

  it('reports negative days for an already-expired licence', () => {
    const expiry = new LicenseExpiry('2025-12-01T00:00:00Z', REF)
    expect(expiry.isPerpetual).toBe(false)
    expect(expiry.isoDate).toBe('2025-12-01')
    expect(expiry.daysRemaining).toBe(-31)
  })

  it('never invents facts for an unparseable date', () => {
    const expiry = new LicenseExpiry('not-a-date', REF)
    expect(expiry.isPerpetual).toBe(false)
    expect(expiry.isoDate).toBe('not-a-date')
    expect(expiry.daysRemaining).toBeNull()
  })
})
