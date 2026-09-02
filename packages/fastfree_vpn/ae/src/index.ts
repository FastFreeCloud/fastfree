/**
 * Quasar App Extension index/runner script
 * (runs on each dev/build)
 *
 * Docs: https://quasar.dev/app-extensions/development-guide/index-api
 */

interface ExtensionApi {
  compatibleWith: (pkg: string, range: string) => void;
  extendQuasarConf: (fn: (conf: Record<string, unknown>) => void) => void;
}

export default function (api: ExtensionApi) {
  api.compatibleWith('quasar', '^2.0.0');
  api.compatibleWith('@quasar/app-vite', '^3.0.0');

  api.extendQuasarConf((conf: Record<string, unknown>) => {
    const boot = (conf.boot as string[]) ?? [];
    boot.unshift(
      '~quasar-app-extension-fastfree_vpn/src/runtime/boot.register.ts'
    );
    conf.boot = boot;
  });
}
