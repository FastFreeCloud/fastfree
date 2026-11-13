import { describe, it, expect } from 'vitest'
import {
  locales,
  defaultLocale,
  isLocale,
  localeDirection,
  localeOG,
  getLocaleStaticParams,
} from '../lib/i18n'

describe('website i18n', () => {
  it('declares the bilingual locales with Arabic as the default', () => {
    expect(locales).toEqual(['ar', 'en'])
    expect(defaultLocale).toBe('ar')
  })

  it('validates locale strings', () => {
    expect(isLocale('ar')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('fr')).toBe(false)
  })

  it('maps each locale to its text direction', () => {
    expect(localeDirection('ar')).toBe('rtl')
    expect(localeDirection('en')).toBe('ltr')
  })

  it('maps each locale to its OpenGraph locale', () => {
    expect(localeOG('ar')).toBe('ar_EG')
    expect(localeOG('en')).toBe('en_US')
  })

  it('generates static params for every locale', () => {
    expect(getLocaleStaticParams()).toEqual([{ lang: 'ar' }, { lang: 'en' }])
  })
})
