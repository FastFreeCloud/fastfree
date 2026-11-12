/**
 * Domain Service: TelemetryService
 * Streams live appliance telemetry from the native Rust backend
 * (`probe_vm_usage`): real Get-VM runtime metrics, real drive capacity and
 * cumulative FastFree adapter counters. Network MB/s rates are derived
 * frontend-side from consecutive counter samples.
 */
import { ApplianceTelemetry, type RawTelemetryData } from '../models/ApplianceTelemetry';
import { invoke } from '@tauri-apps/api/core';

export interface VmUsageProbe {
  exists: boolean;
  vm_cpu_percent: number | null;
  core_count: number | null;
  assigned_mb: number | null;
  demand_mb: number | null;
  uptime_seconds: number | null;
  vm_status: string;
  vhdx_path: string;
  vhdx_used_gb: number | null;
  drive: string;
  drive_total_gb: number | null;
  drive_free_gb: number | null;
  wg_adapter_up: boolean;
  wg_up_bytes: number | null;
  wg_down_bytes: number | null;
  vmms_status: string;
}

const GB = 1024 * 1024 * 1024;

interface CounterSample {
  up: number;
  down: number;
  at: number;
}

export class TelemetryService {
  private static _instance: TelemetryService;
  private _telemetry: ApplianceTelemetry;
  private _listeners: Set<(telemetry: ApplianceTelemetry) => void> = new Set();
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _lastCounters: CounterSample | null = null;

  private constructor() {
    this._telemetry = new ApplianceTelemetry();
  }

  public static getInstance(): TelemetryService {
    if (!TelemetryService._instance) {
      TelemetryService._instance = new TelemetryService();
    }
    return TelemetryService._instance;
  }

  public get currentTelemetry(): ApplianceTelemetry {
    return this._telemetry;
  }

  public get vmStatus(): string {
    return this._lastStatus;
  }
  private _lastStatus: string = '';

  public subscribe(callback: (telemetry: ApplianceTelemetry) => void): () => void {
    this._listeners.add(callback);
    callback(this._telemetry);
    return () => this._listeners.delete(callback);
  }

  public startPolling(
    clientId: string,
    drive: string | null = null,
    intervalMs: number = 15000
  ): void {
    this.stopPolling();
    this.fetchOnce(clientId, drive);
    this._timer = setInterval(() => {
      this.fetchOnce(clientId, drive);
    }, intervalMs);
  }

  public stopPolling(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  public async fetchOnce(clientId: string, drive: string | null = null): Promise<ApplianceTelemetry> {
    try {
      // Real Hyper-V runtime probe (Get-VM based, hidden PowerShell in Rust).
      const res = await invoke<VmUsageProbe>('probe_vm_usage', { clientId, drive });

      if (res && res.exists) {
        const partial = this.buildPartial(res);
        this._telemetry.update(partial);
        this._lastStatus = res.vm_status || '';
      } else {
        this._lastStatus = '';
      }
    } catch {
      // Backend probe unavailable (non-native preview / busy): keep last real data.
    }

    this.notifyListeners();
    return this._telemetry;
  }

  private buildPartial(res: VmUsageProbe): RawTelemetryData {
    // Network rates from cumulative counters: rate = Δbytes / Δseconds.
    let netUp: number | null = null;
    let netDown: number | null = null;
    if (res.wg_adapter_up && res.wg_up_bytes !== null && res.wg_down_bytes !== null) {
      const now = Date.now();
      if (this._lastCounters) {
        const dt = (now - this._lastCounters.at) / 1000;
        if (dt >= 1) {
          const dUp = res.wg_up_bytes - this._lastCounters.up;
          const dDown = res.wg_down_bytes - this._lastCounters.down;
          if (dUp >= 0) netUp = dUp / dt;
          if (dDown >= 0) netDown = dDown / dt;
        }
      }
      this._lastCounters = { up: res.wg_up_bytes, down: res.wg_down_bytes, at: now };
    } else {
      this._lastCounters = null;
    }

    // vCPU dial: real CPUUsage from Get-VM (0% while idle is a REAL value, not absence).
    // RAM dial: real guest memory demand (working set) over the real current assignment.
    // Storage: real vhdx attachment drive free/total; disk bars are honest.
    return {
      cpuUsagePercent: res.vm_cpu_percent,
      cpuCores: res.core_count,
      memoryUsedMb: res.demand_mb,
      memoryTotalMb: res.assigned_mb,
      diskFreeBytes: res.drive_free_gb !== null ? res.drive_free_gb * GB : null,
      diskTotalBytes: res.drive_total_gb !== null ? res.drive_total_gb * GB : null,
      diskPath: res.drive || null,
      networkUpBytesPerSec: netUp,
      networkDownBytesPerSec: netDown,
      uptimeSeconds: res.uptime_seconds,
    };
  }

  private notifyListeners(): void {
    for (const listener of this._listeners) {
      try {
        // Fresh snapshot per delivery: same-reference notifications never
        // re-render Vue consumers (ApplianceTelemetry mutates in place).
        listener(this._telemetry.snapshot());
      } catch (err) {
        console.error('Telemetry subscriber error:', err);
      }
    }
  }
}
