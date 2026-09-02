/**
 * Quasar App Extension index/runner script
 * (runs on each dev/build)
 *
 * Docs: https://quasar.dev/app-extensions/development-guide/index-api
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = function (api) {
  api.compatibleWith('quasar', '^2.0.0');
  api.compatibleWith('@quasar/app-vite', '^3.0.0');

  api.extendQuasarConf(function (conf) {
    var _a;
    var boot = (_a = conf.boot) !== null && _a !== void 0 ? _a : [];
    boot.unshift('~quasar-app-extension-fastfree_vpn/src/runtime/boot.register.ts');
    conf.boot = boot;
  });
};
