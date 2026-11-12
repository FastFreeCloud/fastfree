/**
 * Domain Model: ApplianceTelemetry
 * Encapsulates live appliance telemetry (CPU, RAM, Disk, Network).
 *
 * Honesty contract: every unmeasured metric is `null` and renders as "—".
 * The UI must never show synthetic placeholder numbers.
 */

export interface RawTelemetryData {
  cpuUsagePercent?: number | null;
  cpuCores?: number | null;
  memoryUsedMb?: number | null;
  memoryTotalMb?: number | null;
  diskFreeBytes?: number | null;
  diskTotalBytes?: number | null;
  diskPath?: string | null;
  networkUpBytesPerSec?: number | null;
  networkDownBytesPerSec?: number | null;
  uptimeSeconds?: number | null;
}

export interface IApplianceTelemetry {
  readonly cpuUsagePercent: number | null;
  readonly cpuCores: number | null;
  readonly memoryUsedMb: number | null;
  readonly memoryTotalMb: number | null;
  readonly memoryUsagePercent: number | null;
  readonly diskFreeGbFormatted: string | null;
  readonly diskUsagePercent: number | null;
  readonly diskPath: string | null;
  readonly networkUpFormatted: string | null;
  readonly networkDownFormatted: string | null;
  readonly uptimeSeconds: number | null;
  readonly isCpuUnderPressure: boolean;
  readonly isMemoryUnderPressure: boolean;
  formatUptime(isRtl?: boolean): string;
}

const GB = 1024 * 1024 * 1024;

export class ApplianceTelemetry implements IApplianceTelemetry {
  private _cpuUsagePercent: number | null;
  private _cpuCores: number | null;
  private _memoryUsedMb: number | null;
  private _memoryTotalMb: number | null;
  private _diskFreeBytes: number | null;
  private _diskTotalBytes: number | null;
  private _diskPath: string | null;
  private _networkUpBytesPerSec: number | null;
  private _networkDownBytesPerSec: number | null;
  private _uptimeSeconds: number | null;

  constructor(data: RawTelemetryData = {}) {
    this._cpuUsagePercent = clampPercent(data.cpuUsagePercent ?? null);
    this._cpuCores = data.cpuCores ?? null;
    this._memoryTotalMb = data.memoryTotalMb ?? null;
    this._memoryUsedMb = data.memoryUsedMb ?? null;
    this._diskTotalBytes = data.diskTotalBytes ?? null;
    this._diskFreeBytes = data.diskFreeBytes ?? null;
    this._diskPath = data.diskPath ?? null;
    this._networkUpBytesPerSec = clampBytesPerSec(data.networkUpBytesPerSec ?? null);
    this._networkDownBytesPerSec = clampBytesPerSec(data.networkDownBytesPerSec ?? null);
    this._uptimeSeconds = data.uptimeSeconds ?? null;
  }

  // Getters
  get cpuUsagePercent(): number | null {
    return this._cpuUsagePercent === null ? null : Math.round(this._cpuUsagePercent);
  }

  get cpuCores(): number | null {
    return this._cpuCores;
  }

  get memoryUsedMb(): number | null {
    return this._memoryUsedMb;
  }

  get memoryTotalMb(): number | null {
    return this._memoryTotalMb;
  }

  get memoryUsagePercent(): number | null {
    if (this._memoryUsedMb === null || !this._memoryTotalMb) return null;
    return Math.round((this._memoryUsedMb / this._memoryTotalMb) * 100);
  }

  get diskFreeGbFormatted(): string | null {
    if (this._diskFreeBytes === null) return null;
    return `${(this._diskFreeBytes / GB).toFixed(1)} GB`;
  }

  get diskUsagePercent(): number | null {
    if (this._diskFreeBytes === null || !this._diskTotalBytes) return null;
    const used = this._diskTotalBytes - this._diskFreeBytes;
    return Math.round((used / this._diskTotalBytes) * 100);
  }

  get diskPath(): string | null {
    return this._diskPath;
  }

  get networkUpFormatted(): string | null {
    return this._networkUpBytesPerSec === null ? null : this.formatSpeed(this._networkUpBytesPerSec);
  }

  get networkDownFormatted(): string | null {
    return this._networkDownBytesPerSec === null ? null : this.formatSpeed(this._networkDownBytesPerSec);
  }

  get uptimeSeconds(): number | null {
    return this._uptimeSeconds;
  }

  get isCpuUnderPressure(): boolean {
    return this._cpuUsagePercent !== null && this._cpuUsagePercent > 85;
  }

  get isMemoryUnderPressure(): boolean {
    const pct = this.memoryUsagePercent;
    return pct !== null && pct > 90;
  }

  // Methods
  /**
   * Merge a fresh probe result. `null`/`undefined` fields never clobber a
   * previously collected real value — only fresh real data refreshes counts.
   */
  public update(partial: RawTelemetryData): void {
    const cpu = partial.cpuUsagePercent ?? null;
    if (cpu !== null) this._cpuUsagePercent = clampPercent(cpu);
    if (partial.cpuCores != null) this._cpuCores = Math.max(1, partial.cpuCores);
    if (partial.memoryUsedMb != null) this._memoryUsedMb = Math.max(0, partial.memoryUsedMb);
    if (partial.memoryTotalMb != null) this._memoryTotalMb = Math.max(1, partial.memoryTotalMb);
    if (partial.diskFreeBytes != null) this._diskFreeBytes = Math.max(0, partial.diskFreeBytes);
    if (partial.diskTotalBytes != null) this._diskTotalBytes = Math.max(1, partial.diskTotalBytes);
    if (partial.diskPath != null) this._diskPath = partial.diskPath;
    const up = clampBytesPerSec(partial.networkUpBytesPerSec ?? null);
    if (up !== null) this._networkUpBytesPerSec = up;
    const down = clampBytesPerSec(partial.networkDownBytesPerSec ?? null);
    if (down !== null) this._networkDownBytesPerSec = down;
    if (partial.uptimeSeconds != null) this._uptimeSeconds = Math.max(0, partial.uptimeSeconds);
  }

  public formatUptime(isRtl: boolean = false): string {
    const s = this._uptimeSeconds;
    if (s === null) return isRtl ? 'غير متاح' : 'N/A';
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

  /**
   * Fresh, independent copy of the current values. The service mutates one
   * shared ApplianceTelemetry instance — assigning that same reference to a
   * Vue `ref` would never trigger a re-render. Subscribers must hand out
   * snapshots so reactivity sees a new object.
   */
  public snapshot(): ApplianceTelemetry {
    return new ApplianceTelemetry({
      cpuUsagePercent: this._cpuUsagePercent,
      cpuCores: this._cpuCores,
      memoryUsedMb: this._memoryUsedMb,
      memoryTotalMb: this._memoryTotalMb,
      diskFreeBytes: this._diskFreeBytes,
      diskTotalBytes: this._diskTotalBytes,
      diskPath: this._diskPath,
      networkUpBytesPerSec: this._networkUpBytesPerSec,
      networkDownBytesPerSec: this._networkDownBytesPerSec,
      uptimeSeconds: this._uptimeSeconds,
    });
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

function clampPercent(value: number | null): number | null {
  if (value === null) return null;
  return Math.max(0, Math.min(100, value));
}

function clampBytesPerSec(value: number | null): number | null {
  if (value === null) return null;
  return Math.max(0, Math.round(value));
}
