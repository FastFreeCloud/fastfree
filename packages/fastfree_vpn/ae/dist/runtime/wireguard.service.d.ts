import type { WgKeys, WgConfig, WgStatus } from './types';
export declare class WireGuardService {
    static generateKeys(): Promise<WgKeys>;
    static connect(config: WgConfig): Promise<void>;
    static disconnect(): Promise<void>;
    static getStatus(): Promise<WgStatus>;
    static buildConfig(keys: WgKeys, endpoint: string, address?: string, dns?: string): WgConfig;
}
