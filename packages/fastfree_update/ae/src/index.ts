/**
 * Quasar App Extension index/runner script
 * (runs on each dev/build)
 *
 * Docs: https://quasar.dev/app-extensions/development-guide/index-api
 */

import { defineIndexScript } from '#q-app';

// can be async
export default defineIndexScript(api => {
  api.compatibleWith('quasar', '^2.0.0');
  api.compatibleWith('@quasar/app-vite', '^3.0.0');

  api.extendQuasarConf(conf => {
    // NOTE: Boot registration is handled by the host app's quasar.config.ts
    // because Quasar AE resolves ~quasar-app-extension-* aliases to absolute
    // Windows paths that Rolldown can't resolve. The host adds the boot file
    // manually to the boot array.

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
