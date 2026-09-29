import { boot } from 'quasar/wrappers'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

export default boot(async () => {
  if (!isBrowser()) return

  try {
    // The console is opt-in: dev builds or an explicit ?eruda=1 query.
    // Native production builds no longer get it automatically.
    const params = new URLSearchParams(window.location.search)
    const wantEruda = import.meta.env.DEV || params.get('eruda') === '1'
    if (!wantEruda) return

    const eruda = await import('eruda')
    // Try init without shadowDom first — Capacitor WebView often clips shadow DOM
    try {
      eruda.default.init({
        tool: ['console', 'elements', 'network', 'resources', 'info'],
        useShadowDom: false,
        autoScale: true,
      })
    } catch {
      // Fallback: minimal init
      eruda.default.init()
    }
    // Hide the floating entry button (console opens from the About screen).
    // Guarded separately so a failure here can never block window.__eruda.
    try {
      eruda.default.get('entryBtn')?.hide()
    } catch {
      // optional — console still works via window.__eruda.show()
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__eruda = eruda.default
    console.warn('[eruda] initialized — open it from About → Debug Console')
  } catch (e) {
    console.warn('[eruda] unavailable:', e)
  }
})
