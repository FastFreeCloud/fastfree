/**
 * Quasar App Extension install script
 * https://quasar.dev/app-extensions/development-guide/install-api
 */

interface ExtensionApi {
  hasPackage: (pkg: string) => boolean;
  getPackageVersion: (pkg: string) => string;
  extendPackageJson: (pkg: Record<string, unknown>) => void;
  render: (template: string, data: Record<string, unknown>) => string;
  onExitLog: (msg: string) => void;
}

export default function (api: ExtensionApi) {
  api.extendPackageJson({
    dependencies: {
      '@capacitor/core': '^7.0.0'
    },
    devDependencies: {
      '@capacitor/cli': '^7.0.0'
    }
  });

  api.onExitLog(
    '✅ FastFree VPN extension installed. Run "npx cap sync" to sync native projects.'
  );
}
