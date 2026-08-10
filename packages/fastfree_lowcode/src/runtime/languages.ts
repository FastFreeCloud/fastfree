import type { LanguageInfo } from './shared-config'
import quasarLangs from 'quasar/lang/index.json'

const EXCLUDED_LOCALES = new Set(['he'])

const LOCALE_TO_COUNTRY: Record<string, string> = {
  ar: 'sa', 'ar-TN': 'tn', 'az-Latn': 'az', bg: 'bg', bn: 'bd',
  'bs-BA': 'ba', ca: 'es', cs: 'cz', da: 'dk',
  'de-CH': 'ch', 'de-DE': 'de', de: 'de', el: 'gr',
  'en-GB': 'gb', 'en-US': 'us', eo: 'eo', es: 'es', et: 'ee',
  eu: 'es', fi: 'fi', fr: 'fr',
  gn: 'py', hi: 'in', hr: 'hr', hu: 'hu',
  id: 'id', is: 'is', it: 'it', ja: 'jp', kk: 'kz', km: 'kh',
  'ko-KR': 'kr', 'kur-CKB': 'iq', lb: 'lu', lt: 'lt', lu: 'cd',
  lv: 'lv', mk: 'mk', ml: 'in', mm: 'mm',
  'ms-MY': 'my', ms: 'my', my: 'mm', 'nb-NO': 'no', nl: 'nl',
  pl: 'pl', 'pt-BR': 'br', pt: 'pt', ro: 'ro', ru: 'ru',
  sk: 'sk', sl: 'si', sm: 'ws', sq: 'al',
  'sr-CYR': 'rs', sr: 'rs', sv: 'se', ta: 'in', th: 'th',
  tl: 'ph', tr: 'tr', ug: 'cn', uk: 'ua', 'ur-PK': 'pk',
  'uz-Cyrl': 'uz', 'uz-Latn': 'uz', vi: 'vn',
  'zh-CN': 'cn', 'zh-TW': 'tw',
}

let cached: LanguageInfo[] = []

export function getAllLanguages(): LanguageInfo[] {
  if (cached.length > 0) return cached
  const allowed = new Set(['en-US', 'ar', 'fr', 'es', 'de-DE', 'zh-CN', 'ja', 'tr', 'ur-PK', 'pt-BR'])
  const filtered = (quasarLangs as { isoName: string; nativeName: string }[])
    .filter(l => allowed.has(l.isoName) && !EXCLUDED_LOCALES.has(l.isoName))
  cached = filtered.map(l => {
    const entry: LanguageInfo = {
      value: l.isoName,
      label: l.nativeName,
    }
    const cc = LOCALE_TO_COUNTRY[l.isoName]
    if (cc) entry.countryCode = cc
    if (l.isoName === 'ar' || l.isoName === 'ur-PK') entry.direction = 'rtl'
    return entry
  })
  return cached
}

export function getLanguageInfo(code: string): LanguageInfo | undefined {
  return getAllLanguages().find(l => l.value === code)
}
