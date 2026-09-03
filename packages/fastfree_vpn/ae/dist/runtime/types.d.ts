export interface WgKeys {
    privateKey: string;
    publicKey: string;
}
export interface WgConfig {
    privateKey: string;
    publicKey: string;
    address: string;
    endpoint: string;
    dns: string;
    allowedIPs?: string;
}
export interface WgStatus {
    connected: boolean;
    interface: string;
    bytesIn: number;
    bytesOut: number;
    lastHandshake: string;
    serverPublicKey: string;
    serverEndpoint: string;
}
export interface VpnConfig {
    endpoint: string;
    port: number;
    address: string;
    dns: string;
    publicKey: string;
}
