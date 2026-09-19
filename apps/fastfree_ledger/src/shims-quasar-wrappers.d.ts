declare module 'quasar/wrappers' {
  import type { App } from 'vue';
  import type { Router } from 'vue-router';
  interface BootContext {
    app: App;
    router: Router;
    store: unknown;
    ssrContext: unknown;
    redirect: (url: string) => void;
    urlPath: string;
    publicPath: string;
  }
  export function boot(fn: (ctx: BootContext) => void | Promise<void>): void;
}
