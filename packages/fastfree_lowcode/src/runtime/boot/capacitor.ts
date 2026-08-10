import { getSharedConfig } from '../shared-config'

function getCfg() {
  return getSharedConfig()
}

interface CapacitorPlugin {
  hide?: () => Promise<void>
  setStyle?: (options: { style: string }) => Promise<void>
  setBackgroundColor?: (options: { color: string }) => Promise<void>
  addListener?: (event: string, callback: (data: { isActive: boolean }) => void) => Promise<void>
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean
  Plugins?: {
    SplashScreen?: CapacitorPlugin
    StatusBar?: CapacitorPlugin
    App?: CapacitorPlugin
  }
}

declare global {
  interface Window {
    Capacitor?: CapacitorGlobal
  }
}

export async function hideNativeSplash() {
  const cfg = getCfg()
  if (!cfg.capacitor?.enabled) return
  try {
    if (window.Capacitor?.Plugins?.SplashScreen) {
      await window.Capacitor.Plugins.SplashScreen.hide?.()
    }
  } catch {
    // Capacitor not installed
  }
}

export default async function () {
  const cfg = getCfg()
  if (!cfg.capacitor?.enabled) return

  try {
    const Capacitor = window.Capacitor

    if (Capacitor?.isNativePlatform?.()) {
      const StatusBar = Capacitor.Plugins?.StatusBar
      if (StatusBar) {
        await StatusBar.setStyle?.({ style: 'DARK' })
        await StatusBar.setBackgroundColor?.({ color: cfg.capacitor?.statusBarColor || '#1565C0' })
      }

      const App = Capacitor.Plugins?.App
      if (App) {
        void App.addListener?.('appStateChange', ({ isActive }: { isActive: boolean }) => {
          if (isActive) {
            void hideNativeSplash()
          }
        })
      }
    }
  } catch {
    // Capacitor not installed
  }
}
