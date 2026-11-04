/**
 * Domain Model: ApplianceTelemetry
 * Encapsulates live system telemetry (CPU, RAM, Disk, Network) with OOP principles.
 */

export interface RawTelemetryData {
  cpuUsagePercent?: number;
  cpuCores?: number;
  memoryUsedMb?: number;
  memoryTotalMb?: number;
  diskFreeBytes?: number;
  diskTotalBytes?: number;
  diskPath?: string;
  networkUpBytesPerSec?: number;
  networkDownBytesPerSec?: number;
  uptimeSeconds?: number;
}

export interface IApplianceTelemetry {
  readonly cpuUsagePercent: number;
  readonly cpuCores: number;
  readonly memoryUsedMb: number;
  readonly memoryTotalMb: number;
  readonly memoryUsagePercent: number;
  readonly diskFreeGbFormatted: string;
  readonly diskUsagePercent: number;
  readonly diskPath: string;
  readonly networkUpFormatted: string;
  readonly networkDownFormatted: string;
  readonly uptimeSeconds: number;
  readonly isCpuUnderPressure: boolean;
  readonly isMemoryUnderPressure: boolean;
  formatUptime(isRtl?: boolean): string;
}

export class ApplianceTelemetry implements IApplianceTelemetry {
  private _cpuUsagePercent: number;
  private _cpuCores: number;
  private _memoryUsedMb: number;
  private _memoryTotalMb: number;
  private _diskFreeBytes: number;
  private _diskTotalBytes: number;
  private _diskPath: string;
  private _networkUpBytesPerSec: number;
  private _networkDownBytesPerSec: number;
  private _uptimeSeconds: number;

  constructor(data: RawTelemetryData = {}) {
    this._cpuUsagePercent = Math.max(0, Math.min(100, data.cpuUsagePercent ?? 27));
    this._cpuCores = Math.max(1, data.cpuCores ?? 4);
    this._memoryTotalMb = Math.max(1024, data.memoryTotalMb ?? 8192);
    this._memoryUsedMb = Math.max(0, Math.min(this._memoryTotalMb, data.memoryUsedMb ?? 3520));
    this._diskTotalBytes = Math.max(1, data.diskTotalBytes ?? 256 * 1024 * 1024 * 1024);
    this._diskFreeBytes = Math.max(0, Math.min(this._diskTotalBytes, data.diskFreeBytes ?? 186.4 * 1024 * 1024 * 1024));
    this._diskPath = data.diskPath || 'Drive G:\\FastFree';
    this._networkUpBytesPerSec = Math.max(0, data.networkUpBytesPerSec ?? 2.0 * 1024 * 1024);
    this._networkDownBytesPerSec = Math.max(0, data.networkDownBytesPerSec ?? 4.6 * 1024 * 1024);
    this._uptimeSeconds = Math.max(0, data.uptimeSeconds ?? 0);
  }

  // Getters
  get cpuUsagePercent(): number {
    return Math.round(this._cpuUsagePercent);
  }

  get cpuCores(): number {
    return this._cpuCores;
  }

  get memoryUsedMb(): number {
    return this._memoryUsedMb;
  }

  get memoryTotalMb(): number {
    return this._memoryTotalMb;
  }

  get memoryUsagePercent(): number {
    if (this._memoryTotalMb <= 0) return 0;
    return Math.round((this._memoryUsedMb / this._memoryTotalMb) * 100);
  }

  get diskFreeGbFormatted(): string {
    const gb = this._diskFreeBytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  }

  get diskUsagePercent(): number {
    if (this._diskTotalBytes <= 0) return 0;
    const used = this._diskTotalBytes - this._diskFreeBytes;
    return Math.round((used / this._diskTotalBytes) * 100);
  }

  get diskPath(): string {
    return this._diskPath;
  }

  get networkUpFormatted(): string {
    return this.formatSpeed(this._networkUpBytesPerSec);
  }

  get networkDownFormatted(): string {
    return this.formatSpeed(this._networkDownBytesPerSec);
  }

  get uptimeSeconds(): number {
    return this._uptimeSeconds;
  }

  get isCpuUnderPressure(): boolean {
    return this._cpuUsagePercent > 85;
  }

  get isMemoryUnderPressure(): boolean {
    return this.memoryUsagePercent > 90;
  }

  // Methods
  public update(partial: Partial<RawTelemetryData>): void {
    if (partial.cpuUsagePercent !== undefined) this._cpuUsagePercent = Math.max(0, Math.min(100, partial.cpuUsagePercent));
    if (partial.cpuCores !== undefined) this._cpuCores = Math.max(1, partial.cpuCores);
    if (partial.memoryUsedMb !== undefined) this._memoryUsedMb = Math.max(0, partial.memoryUsedMb);
    if (partial.memoryTotalMb !== undefined) this._memoryTotalMb = Math.max(1024, partial.memoryTotalMb);
    if (partial.diskFreeBytes !== undefined) this._diskFreeBytes = Math.max(0, partial.diskFreeBytes);
    if (partial.diskTotalBytes !== undefined) this._diskTotalBytes = Math.max(1, partial.diskTotalBytes);
    if (partial.diskPath !== undefined) this._diskPath = partial.diskPath;
    if (partial.networkUpBytesPerSec !== undefined) this._networkUpBytesPerSec = Math.max(0, partial.networkUpBytesPerSec);
    if (partial.networkDownBytesPerSec !== undefined) this._networkDownBytesPerSec = Math.max(0, partial.networkDownBytesPerSec);
    if (partial.uptimeSeconds !== undefined) this._uptimeSeconds = Math.max(0, partial.uptimeSeconds);
  }

  public formatUptime(isRtl: boolean = false): string {
    const s = this._uptimeSeconds;
    if (s <= 0) return isRtl ? 'أقل من دقيقة' : 'Less than a minute';

    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);

    if (days > 0) {
      return isRtl ? `${days} يوم و ${hours} ساعة` : `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return isRtl ? `${hours} ساعة و ${minutes} دقيقة` : `${hours}h ${minutes}m`;
    }
    return isRtl ? `${minutes} دقيقة` : `${minutes}m`;
  }

  private formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec >= 1024 * 1024) {
      return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
    }
    if (bytesPerSec >= 1024) {
      return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
    }
    return `${Math.round(bytesPerSec)} B/s`;
  }
}
