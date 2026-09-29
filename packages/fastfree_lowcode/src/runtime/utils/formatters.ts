export interface FormatterOptions {
  locale?: string
  currency?: string
}

function getLocale(options?: FormatterOptions): string {
  const locale = options?.locale ?? 'en'
  return locale.startsWith('ar') ? 'ar-SA-u-nu-latn' : locale
}

export const formatters = {
  number: (num: number, options?: FormatterOptions): string =>
    new Intl.NumberFormat(getLocale(options), { numberingSystem: 'latn' }).format(num),

  currency: (num: number, currency = 'USD', options?: FormatterOptions): string =>
    new Intl.NumberFormat(getLocale(options), {
      numberingSystem: 'latn',
      style: 'currency',
      currency,
    }).format(num),

  date: (dateStr: string, options?: FormatterOptions): string => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString(getLocale(options), { numberingSystem: 'latn' })
  },

  dateTime: (dateStr: string, options?: FormatterOptions): string => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString(getLocale(options), { numberingSystem: 'latn' })
  },

  percent: (num: number, options?: FormatterOptions): string =>
    new Intl.NumberFormat(getLocale(options), {
      numberingSystem: 'latn',
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(num),

  fileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  },
}
