import { mergeConfig, type LcFullConfig } from './config'

let _config: LcFullConfig | null = null

export function setSharedConfig(config: LcFullConfig) {
  _config = config
}

export function getSharedConfig(): LcFullConfig {
  if (!_config) {
    _config = mergeConfig()
  }
  return _config
}

export interface LanguageOption {
  label: string
  value: string
}

export interface LanguageInfo extends LanguageOption {
  countryCode?: string
  direction?: 'ltr' | 'rtl'
}

let supportedLanguages: LanguageInfo[] = [
  { label: 'English', value: 'en', countryCode: 'us', direction: 'ltr' },
  { label: 'العربية', value: 'ar', countryCode: 'sa', direction: 'rtl' },
]

export function getSupportedLanguages(): LanguageInfo[] {
  return supportedLanguages
}

export function setSupportedLanguages(langs: LanguageInfo[]) {
  supportedLanguages = langs
}
