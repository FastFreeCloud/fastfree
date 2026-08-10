import { ref } from 'vue'
import { Loading } from 'quasar'
import { getSharedConfig } from '../shared-config'

export interface SplashCoordinator {
  /** Whether splash is currently visible */
  visible: boolean
  /** Current phase: 'loading' | 'transitioning' | 'ready' */
  phase: 'loading' | 'transitioning' | 'ready'
  /** Show the splash (called from boot) */
  show: () => void
  /** Hide all splash layers */
  hide: () => void
  /** Mark app as ready, triggers hide sequence */
  setReady: () => void
}

export function useSplashCoordinator(): SplashCoordinator {
  const visible = ref(true)
  const phase = ref<'loading' | 'transitioning' | 'ready'>('loading')
  const cfg = getSharedConfig()
  const splashCfg = cfg.splash

  let isNative = false
  try {
    const Capacitor = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    isNative = Capacitor?.isNativePlatform?.() ?? false
  } catch { /* browser */ }

  const effectiveMode = (() => {
    if (splashCfg.mode === 'auto') {
      return isNative ? 'native' : 'loading-plugin'
    }
    return splashCfg.mode
  })()

  async function show() {
    visible.value = true
    phase.value = 'loading'

    if (effectiveMode === 'loading-plugin') {
      Loading.show({
        message: splashCfg.message || 'Loading...',
        spinnerColor: splashCfg.spinnerColor || 'primary',
        backgroundColor: splashCfg.backgroundColor || '#1565C0',
        delay: 0,
      })
    }
  }

  async function hideNativeSplash() {
    if (!isNative) return
    try {
      const Capacitor = (window as unknown as { Capacitor?: { Plugins?: { SplashScreen?: { hide?: () => Promise<void> } } } }).Capacitor
      if (Capacitor?.Plugins?.SplashScreen) {
        await Capacitor.Plugins.SplashScreen.hide?.()
      }
    } catch {
      // Capacitor not available
    }
  }

  async function hide() {
    if (effectiveMode === 'loading-plugin') {
      Loading.hide()
    }

    if (isNative && cfg.capacitor.nativeSplashAutoHide) {
      await hideNativeSplash()
    }

    visible.value = false
  }

  function setReady() {
    phase.value = 'transitioning'
    setTimeout(() => {
      phase.value = 'ready'
      hide()
    }, splashCfg.delay || 1200)
  }

  return {
    get visible() { return visible.value },
    get phase() { return phase.value },
    show,
    hide,
    setReady,
  }
}

// Singleton for use across boot files and components
let _coordinator: SplashCoordinator | null = null

export function getSplashCoordinator(): SplashCoordinator {
  if (!_coordinator) {
    _coordinator = useSplashCoordinator()
  }
  return _coordinator
}
