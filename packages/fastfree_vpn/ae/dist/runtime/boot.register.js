"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _q_app_1 = require("#q-app");
const VpnStatus_vue_1 = __importDefault(require("./VpnStatus.vue"));
const VpnConnectButton_vue_1 = __importDefault(require("./VpnConnectButton.vue"));
exports.default = (0, _q_app_1.defineBoot)(async ({ app }) => {
    app.component('vpn-status', VpnStatus_vue_1.default);
    app.component('vpn-connect-button', VpnConnectButton_vue_1.default);
});
