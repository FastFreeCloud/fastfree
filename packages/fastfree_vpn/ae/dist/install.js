"use strict";
/**
 * Quasar App Extension install script
 * https://quasar.dev/app-extensions/development-guide/install-api
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
function default_1(api) {
    api.extendPackageJson({
        dependencies: {
            '@capacitor/core': '^7.0.0'
        },
        devDependencies: {
            '@capacitor/cli': '^7.0.0'
        }
    });
    api.onExitLog('✅ FastFree VPN extension installed. Run "npx cap sync" to sync native projects.');
}
