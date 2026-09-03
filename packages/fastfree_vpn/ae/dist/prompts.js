"use strict";
/**
 * Quasar App Extension prompts script
 * https://quasar.dev/app-extensions/development-guide/prompts-api
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const prompts_1 = require("@clack/prompts");
async function default_1() {
    (0, prompts_1.intro)('FastFree VPN Setup');
    const answers = await (0, prompts_1.group)({
        endpoint: () => (0, prompts_1.text)({
            message: 'VPN Server Endpoint (e.g., fastfree.cloud:51820):',
            defaultValue: 'fastfree.cloud:51820'
        }),
        address: () => (0, prompts_1.text)({
            message: 'VPN IP Address (e.g., 10.100.0.2/32):',
            defaultValue: '10.100.0.2/32'
        }),
        dns: () => (0, prompts_1.text)({
            message: 'DNS Server:',
            defaultValue: '1.1.1.1'
        })
    }, {
        onCancel: () => {
            (0, prompts_1.cancel)('Operation cancelled.');
            process.exit(0);
        }
    });
    (0, prompts_1.outro)('VPN configuration saved!');
    return answers;
}
