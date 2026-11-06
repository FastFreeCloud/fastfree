/**
 * Pure browser-standard hardware signal model.
 *
 * Outside the desktop webview the reachable hardware surface collapses to
 * two permissionless, privacy-rounded browser signals: logical CPU cores
 * (`navigator.hardwareConcurrency`) and a capped memory estimate
 * (`navigator.deviceMemory`, maximum 8 GiB by Chromium design). The model
 * normalises those readings through injected readers to stay pure and
 * testable — no direct DOM/global access inside this file.
 */

export interface NavigatorHardwareReader {
  readonly readCpuCores: () => number;
  readonly readMemoryGiB: () => number;
}

export interface BrowserHardwareSignalReport {
  readonly cpuCores: number;
  readonly memoryGiB: number;
}

export class BrowserHardwareSignal {
  /** Chromium privacy cap applied to the memory estimate. */
  static readonly MEMORY_CAP_GIB = 8;

  static read(reader: NavigatorHardwareReader): BrowserHardwareSignalReport {
    const cores = reader.readCpuCores();
    const giB = reader.readMemoryGiB();
    return {
      cpuCores: Number.isFinite(cores) && cores > 0 ? Math.floor(cores) : 0,
      memoryGiB: Number.isFinite(giB) && giB > 0 ? giB : 0,
    };
  }
}
