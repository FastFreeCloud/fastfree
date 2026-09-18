/**
 * Quasar App Extension index/runner script
 * (runs on each dev/build)
 *
 * Docs: https://quasar.dev/app-extensions/development-guide/index-api
 */

import { defineIndexScript } from '#q-app';

const BOOT_FILE =
  '~quasar-app-extension-fastfree_update/src/runtime/boot.register.ts';

// can be async
export default defineIndexScript(api => {
  api.compatibleWith('quasar', '^2.0.0');
  api.compatibleWith('@quasar/app-vite', '^3.0.0');

  api.extendQuasarConf(conf => {
    // APPEND (never overwrite): the host app owns `boot` — dedupe so
    // re-running the extension install cannot register the file twice.
    const boot = (conf.boot ??= []);
    if (!boot.includes(BOOT_FILE)) {
      boot.push(BOOT_FILE);
    }

    // UpdateDialog + useAppUpdate require the Dialog and Notify plugins.
    conf.framework ??= {};
    const plugins = (conf.framework.plugins ??= []);
    for (const plugin of ['Dialog', 'Notify'] as const) {
      if (!plugins.includes(plugin)) {
        plugins.push(plugin);
      }
    }

    // Dialog buttons/icons need at least one icon set to render correctly.
    const extras = (conf.extras ??= []);
    if (!extras.includes('material-icons') && !extras.includes('mdi-v7')) {
      extras.push('material-icons');
    }
  });
});
