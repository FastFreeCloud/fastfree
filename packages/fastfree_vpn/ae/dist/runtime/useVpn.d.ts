import type { WgConfig, WgStatus } from './types';
export declare function useVpn(): {
    connected: import("vue").Ref<boolean, boolean>;
    loading: import("vue").Ref<boolean, boolean>;
    status: import("vue").Ref<{
        connected: boolean;
        interface: string;
        bytesIn: number;
        bytesOut: number;
        lastHandshake: string;
        serverPublicKey: string;
        serverEndpoint: string;
    } | null, WgStatus | {
        connected: boolean;
        interface: string;
        bytesIn: number;
        bytesOut: number;
        lastHandshake: string;
        serverPublicKey: string;
        serverEndpoint: string;
    } | null>;
    error: import("vue").Ref<string | null, string | null>;
    connect: (config: WgConfig) => Promise<void>;
    disconnect: () => Promise<void>;
    refreshStatus: () => Promise<void>;
    startStatusPolling: (intervalMs?: number) => void;
    stopStatusPolling: () => void;
};
