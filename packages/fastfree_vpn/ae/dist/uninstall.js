"use strict";
/**
 * Quasar App Extension uninstall script
 * https://quasar.dev/app-extensions/development-guide/uninstall-api
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
function default_1(api) {
    api.removeBootFile('~quasar-app-extension-fastfree_vpn/src/runtime/boot.register.ts');
    api.onExitLog('✅ FastFree VPN extension uninstalled.');
}
