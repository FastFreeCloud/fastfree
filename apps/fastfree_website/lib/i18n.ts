export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ar';

export function isLocale(v: string): v is Locale {
  return v === 'ar' || v === 'en';
}

export function localeDirection(l: Locale): 'rtl' | 'ltr' {
  return l === 'ar' ? 'rtl' : 'ltr';
}

export function localeOG(l: Locale): string {
  return l === 'ar' ? 'ar_EG' : 'en_US';
}

export function getLocaleStaticParams() {
  return locales.map((l) => ({ lang: l }));
}
