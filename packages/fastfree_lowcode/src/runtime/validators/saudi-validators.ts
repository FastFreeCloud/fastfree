import { useLcI18n } from '../i18n'

export function useSaudiValidators() {
  const { t } = useLcI18n()

  function required(val: unknown): string | true {
    if (val === null || val === undefined || val === '') return t('validation.required')
    if (Array.isArray(val) && val.length === 0) return t('validation.required')
    return true
  }

  function phone(val: unknown): string | true {
    if (!val) return true
    const s = String(val)
    // Saudi mobile: 05XXXXXXXX, international: +9665XXXXXXXX
    if (/^(\+?966|0)?5[0-9]{8}$/.test(s.replace(/[\s-]/g, ''))) return true
    return t('validation.invalidPhone')
  }

  function nationalId(val: unknown): string | true {
    if (!val) return true
    const s = String(val).replace(/[\s-]/g, '')
    // Saudi National ID: 10 digits, starts with 1 or 2
    if (/^[12]\d{9}$/.test(s)) return true
    return t('validation.invalidNationalId')
  }

  function commercialRegistration(val: unknown): string | true {
    if (!val) return true
    const s = String(val).replace(/[\s-]/g, '')
    // CR: 10 digits
    if (/^\d{10}$/.test(s)) return true
    return t('validation.invalidCR')
  }

  function vatNumber(val: unknown): string | true {
    if (!val) return true
    const s = String(val).replace(/[\s-]/g, '')
    // Saudi VAT: 15 digits, starts with 3
    if (/^3\d{14}$/.test(s)) return true
    return t('validation.invalidVAT')
  }

  function email(val: unknown): string | true {
    if (!val) return true
    const s = String(val)
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return true
    return t('validation.invalidEmail')
  }

  function maxLength(max: number) {
    return (val: unknown): string | true => {
      if (!val) return true
      if (String(val).length <= max) return true
      return t('validation.max') + ' ' + max
    }
  }

  function minLength(min: number) {
    return (val: unknown): string | true => {
      if (!val) return true
      if (String(val).length >= min) return true
      return t('validation.min') + ' ' + min
    }
  }

  function numeric(val: unknown): string | true {
    if (!val) return true
    if (/^\d+(\.\d+)?$/.test(String(val))) return true
    return t('validation.invalidNumber')
  }

  function integer(val: unknown): string | true {
    if (!val) return true
    if (/^\d+$/.test(String(val))) return true
    return t('validation.invalidNumber')
  }

  function arabicText(val: unknown): string | true {
    if (!val) return true
    if (/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d.,!?()-]+$/.test(String(val))) return true
    return t('validation.arabicOnly')
  }

  function iban(val: unknown): string | true {
    if (!val) return true
    const s = String(val).replace(/[\s-]/g, '').toUpperCase()
    // Saudi IBAN: SA + 20 digits
    if (/^SA\d{2}\d{20}$/.test(s)) return true
    return t('validation.invalidIban')
  }

  return { required, phone, nationalId, commercialRegistration, vatNumber, email, maxLength, minLength, numeric, integer, arabicText, iban }
}
