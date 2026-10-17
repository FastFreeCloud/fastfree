declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '*.scss'
declare module '*.css'

declare module '@fontsource-variable/cairo/wght.css'

interface ImportMetaEnv {
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
  readonly BASE_URL: string
  readonly VITE_API_BASE_URL?: string
  [key: string]: unknown
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '#q-app' {
  export interface QuasarInstallApi {
    onExitLog: (msg: string) => void
    onBuildEnd?: (api: QuasarInstallApi) => void
    [key: string]: unknown
  }
  export const defineInstallScript: (
    fn: (api: QuasarInstallApi) => unknown
  ) => unknown
  export const defineUninstallScript: (
    fn: (api: QuasarInstallApi) => unknown
  ) => unknown
  export const definePromptsScript: (fn: () => unknown) => unknown
  export const defineConfig: (fn: (ctx: Record<string, unknown>) => Record<string, unknown>) => unknown
  export const defineRouter: (fn: (opts: Record<string, unknown>) => unknown) => unknown
}