// ============================================================
// External URLs — canonical FastFree links + safe opener
// Works on web, PWA and Capacitor native (via @capacitor/browser
// Custom Tabs when installed, plain new-tab fallback otherwise).
// ============================================================

export const FASTFREE_SITE_URL = 'https://fastfree.cloud'
export const FASTFREE_PRIVACY_URL = 'https://fastfree.cloud/privacy-policy.html'

interface BrowserPlugin {
  open: (options: { url: string }) => Promise<void>
}

interface CapacitorGlobal {
  Plugins?: Record<string, unknown>
}

function getBrowserPlugin(): BrowserPlugin | undefined {
  if (typeof window === 'undefined') return undefined
  const capacitor = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor
  const plugin = capacitor?.Plugins?.Browser
  if (
    plugin !== null &&
    typeof plugin === 'object' &&
    'open' in plugin &&
    typeof (plugin as { open: unknown }).open === 'function'
  ) {
    return plugin as BrowserPlugin
  }
  return undefined
}

/**
 * Locale-aware privacy-policy page on fastfree.cloud.
 * Falls back to the browser language when no locale is given.
 */
export function getPrivacyPolicyUrl(locale?: string): string {
  let lang = (locale ?? '').toLowerCase()
  if (!lang && typeof navigator !== 'undefined') {
    lang = (navigator.language || '').toLowerCase()
  }
  if (lang.startsWith('ar')) return `${FASTFREE_SITE_URL}/ar/privacy`
  return `${FASTFREE_SITE_URL}/en/privacy`
}

/**
 * Open an external URL safely:
 * - Capacitor native → system browser (Custom Tabs, keeps app state)
 * - Web / PWA → new tab with noopener
 */
export async function openExternalUrl(url: string): Promise<void> {
  const browser = getBrowserPlugin()
  if (browser) {
    await browser.open({ url })
    return
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
