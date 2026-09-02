import { registerPlugin } from '@capacitor/core';
import type { WgKeys, WgConfig, WgStatus } from './types';

const WireGuardNative = registerPlugin<{ WireGuard: {
  generateKeys: () => Promise<WgKeys>;
  connect: (config: WgConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  getStatus: () => Promise<WgStatus>;
} }>('WireGuard');

export class WireGuardService {

  static async generateKeys(): Promise<WgKeys> {
    try {
      return await WireGuardNative.WireGuard.generateKeys();
    } catch {
      throw new Error('Failed to generate WireGuard keys');
    }
  }

  static async connect(config: WgConfig): Promise<void> {
    try {
      await WireGuardNative.WireGuard.connect(config);
    } catch {
      throw new Error('Failed to connect to WireGuard');
    }
  }

  static async disconnect(): Promise<void> {
    try {
      await WireGuardNative.WireGuard.disconnect();
    } catch {
      throw new Error('Failed to disconnect from WireGuard');
    }
  }

  static async getStatus(): Promise<WgStatus> {
    try {
      return await WireGuardNative.WireGuard.getStatus();
    } catch {
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

  static buildConfig(keys: WgKeys, endpoint: string, address = '10.100.0.2/32', dns = '1.1.1.1'): WgConfig {
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
