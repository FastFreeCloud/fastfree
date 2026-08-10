export const VALIDATORS = {
  required: (message?: string) =>
    (val: unknown) => !!val || message || 'This field is required',

  email: (message?: string) =>
    (val: unknown) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val)) || message || 'Invalid email',

  minLength: (min: number, message?: string) =>
    (val: unknown) => !val || String(val).length >= min || message || `Must be at least ${min} characters`,

  maxLength: (max: number, message?: string) =>
    (val: unknown) => !val || String(val).length <= max || message || `Must not exceed ${max} characters`,

  phone: (message?: string) =>
    (val: unknown) => !val || /^\+?[\d\s-]{7,15}$/.test(String(val)) || message || 'Invalid phone number',

  numeric: (message?: string) =>
    (val: unknown) => !val || /^\d+(\.\d+)?$/.test(String(val)) || message || 'Must be a number',

  min: (min: number, message?: string) =>
    (val: unknown) => {
      const num = Number(val)
      return !val || !isNaN(num) && num >= min || message || `Must be at least ${min}`
    },

  max: (max: number, message?: string) =>
    (val: unknown) => {
      const num = Number(val)
      return !val || !isNaN(num) && num <= max || message || `Must not exceed ${max}`
    },

  pattern: (re: RegExp, message?: string) =>
    (val: unknown) => !val || re.test(String(val)) || message || 'Invalid format',

  url: (message?: string) =>
    (val: unknown) => {
      if (!val) return true
      try { new URL(String(val)); return true } catch { return message || 'Invalid URL' }
    },
}
