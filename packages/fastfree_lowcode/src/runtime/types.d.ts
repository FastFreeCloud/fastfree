declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '*.scss'
declare module '*.sass'
declare module '*.css'
declare module '*.sass.scss' with {
  const content: string
  default content
}
declare module '*.css' with {
  const content: string
  default content
}
declare module '@fontsource-variable/cairo/wght.css'
declare module '@fontsource-variable/cairo'

interface ImportMetaEnv {
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
  readonly BASE_URL: string
  readonly VITE_API_BASE_URL?: string
  readonly CLAN_DIR?: string
  readonly CLAN_PANEL_TOKEN?: string
  [key: string]: unknown
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '#q-app' {
  const defineConfig: (fn: (ctx: Record<string, unknown>) => Record<string, unknown>) => unknown
  const defineRouter: (fn: (opts: Record<string, unknown>) => unknown) => unknown
  export { defineConfig, defineRouter }
}