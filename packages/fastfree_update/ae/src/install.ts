/**
 * Quasar App Extension install script
 * https://quasar.dev/app-extensions/development-guide/install-api
 */

import { defineInstallScript } from '#q-app';

// can be async
export default defineInstallScript(api => {
  // InstallAPI.extendPackageJson is declared in @quasar/app-vite
  // types/app-extension.d.ts (verified) and deep-merges into the host
  // package.json, so this call only ADDS the native plugin entry. If a
  // future CLI ever drops this API, install must still succeed: the native
  // plugin is lazy-loaded via dynamic import at runtime, so the host app can
  // add `@capawesome/capacitor-app-update@^7.0.0` manually instead.
  // (The `typeof` guard below is that future-proofing — it is expected to
  // always be a function on current CLIs.)
  const extendPackageJson = api.extendPackageJson as unknown;
  if (typeof extendPackageJson === 'function') {
    (extendPackageJson as (extPkg: object) => void)({
      dependencies: {
        '@capawesome/capacitor-app-update': '^7.0.0',
      },
    });
  }

  api.onExitLog(
    '✅ fastfree_update installed! Native + PWA update checks are wired via boot file.',
  );
});
