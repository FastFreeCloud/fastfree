"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WireGuardService = void 0;
const core_1 = require("@capacitor/core");
const WireGuardNative = (0, core_1.registerPlugin)('WireGuard');
class WireGuardService {
    static async generateKeys() {
        try {
            return await WireGuardNative.WireGuard.generateKeys();
        }
        catch {
            throw new Error('Failed to generate WireGuard keys');
        }
    }
    static async connect(config) {
        try {
            await WireGuardNative.WireGuard.connect(config);
        }
        catch {
            throw new Error('Failed to connect to WireGuard');
        }
    }
    static async disconnect() {
        try {
            await WireGuardNative.WireGuard.disconnect();
        }
        catch {
            throw new Error('Failed to disconnect from WireGuard');
        }
    }
    static async getStatus() {
        try {
            return await WireGuardNative.WireGuard.getStatus();
        }
        catch {
            return {
                connected: false,
                interface: '',
                bytesIn: 0,
                bytesOut: 0,
                lastHandshake: '',
                serverPublicKey: '',
                serverEndpoint: ''
            };
        }
    }
    static buildConfig(keys, endpoint, address = '10.100.0.2/32', dns = '1.1.1.1') {
        return {
            privateKey: keys.privateKey,
            publicKey: keys.publicKey,
            address,
            endpoint,
            dns,
            allowedIPs: '0.0.0.0/0'
        };
    }
}
exports.WireGuardService = WireGuardService;
