import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.fastfree.pos',
  android: {
    webContentsDebuggingEnabled: false,
  },
  appName: 'FastFree POS',
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
      backgroundColor: '#E11D48',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
}

export default config
