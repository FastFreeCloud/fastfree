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
}
