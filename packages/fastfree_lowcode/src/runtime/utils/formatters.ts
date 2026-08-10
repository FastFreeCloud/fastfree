export interface FormatterOptions {
  locale?: string
  currency?: string
}

function getLocale(options?: FormatterOptions): string {
  return options?.locale ?? 'en'
}

export const formatters = {
  number: (num: number, options?: FormatterOptions): string =>
    new Intl.NumberFormat(getLocale(options)).format(num),

  currency: (num: number, currency = 'USD', options?: FormatterOptions): string =>
    new Intl.NumberFormat(getLocale(options), {
      style: 'currency',
      currency,
    }).format(num),

  date: (dateStr: string, options?: FormatterOptions): string => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString(getLocale(options))
  },

  dateTime: (dateStr: string, options?: FormatterOptions): string => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString(getLocale(options))
  },

  percent: (num: number, options?: FormatterOptions): string =>
    new Intl.NumberFormat(getLocale(options), {
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
