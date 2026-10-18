import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.fastfree.ledger',
  android: {
    webContentsDebuggingEnabled: false,
  },
  appName: 'FastFree Ledger',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0D9488',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
}

export default config
