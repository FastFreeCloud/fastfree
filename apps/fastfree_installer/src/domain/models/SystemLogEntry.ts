/**
 * Domain Model: SystemLogEntry
 * Encapsulates a structured telemetry or runtime log event.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'success';
export type LogSource = 'SYSTEM' | 'HYPER-V' | 'WIREGUARD' | 'STORAGE' | 'UPDATE';

export class SystemLogEntry {
  public readonly id: string;
  public readonly timestamp: Date;
  public readonly source: LogSource;
  public readonly message: string;
  public readonly level: LogLevel;

  constructor(source: LogSource, message: string, level: LogLevel = 'info', timestamp?: Date) {
    this.id = Math.random().toString(36).substring(2, 9);
    this.timestamp = timestamp || new Date();
    this.source = source;
    this.message = message;
    this.level = level;
  }

  public get formattedTime(): string {
    return this.timestamp.toTimeString().split(' ')[0] || '';
  }

  public formatLine(): string {
    return `[${this.formattedTime}] [${this.source}] ${this.message}`;
  }

  public static createDefaultSeed(clientId: string = 'client2'): SystemLogEntry[] {
    const now = new Date();
    return [
      new SystemLogEntry('SYSTEM', `FastFree Sovereign Node Companion booted (v26.5.33).`, 'success', new Date(now.getTime() - 15000)),
      new SystemLogEntry('HYPER-V', `Appliance FastFree-${clientId} running (NixOS 26.05 Clan Core).`, 'info', new Date(now.getTime() - 10000)),
      new SystemLogEntry('WIREGUARD', `P2P tunnel active: 10.24.0.2/32 listening on UDP 51822.`, 'success', new Date(now.getTime() - 5000)),
      new SystemLogEntry('STORAGE', `Drive G:\\FastFree mounted (NTFS Hardened ACL OK).`, 'info', now)
    ];
  }
}
