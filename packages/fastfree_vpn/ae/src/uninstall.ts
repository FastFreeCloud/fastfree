/**
 * Quasar App Extension uninstall script
 * https://quasar.dev/app-extensions/development-guide/uninstall-api
 */

interface ExtensionApi {
  removeBootFile: (file: string) => void;
  onExitLog: (msg: string) => void;
}

export default function (api: ExtensionApi) {
  api.removeBootFile(
    '~quasar-app-extension-fastfree_vpn/src/runtime/boot.register.ts'
  );

  api.onExitLog(
    '✅ FastFree VPN extension uninstalled.'
  );
}
