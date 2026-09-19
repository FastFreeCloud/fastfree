declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'capacitor-plugin-xframe' {
  export const Xframe: {
    start(): Promise<void>
    stop(): Promise<void>
    addListener(event: string, handler: (data: Record<string, unknown>) => void): Promise<{ remove(): void }>
  }
}
