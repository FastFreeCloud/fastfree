/**
 * Domain Model: NodeSizingPolicy
 * Pure constraints and derived values for allocating host hardware to a
 * FastFree appliance (vCPU / RAM / storage). No locale, no UI, no framework —
 * every method is a pure function of its inputs and unit-testable.
 */

export interface HostSizingInput {
  /** Real host core count from system discovery (null in preview mode). */
  cpuCount?: number | null;
  /** Real host memory in MB from system discovery. */
  totalMemoryMb?: number | null;
  /** Backend recommendation for vCPU cores. */
  recommendedCores?: number | null;
  /** Backend recommendation for RAM in MB. */
  recommendedRamMb?: number | null;
}

export interface SizingLimits {
  minCores: number;
  maxCores: number;
  recommendedCores: number;
  minRamMb: number;
  maxRamMb: number;
  recommendedRamMb: number;
}

export interface DiskFacts {
  total_space_gb: number;
  available_space_gb: number;
}

export class NodeSizingPolicy {
  /** RAM always reserved for the Windows host OS while the VM runs. */
  public static readonly HOST_RAM_RESERVE_MB = 4096;
  public static readonly DEFAULT_HOST_CPU_COUNT = 8;
  public static readonly DEFAULT_HOST_RAM_MB = 16_384;
  public static readonly DEFAULT_RECOMMENDED_CORES = 4;
  public static readonly DEFAULT_RECOMMENDED_RAM_MB = 4096;

  /** Minimum RAM the appliance itself accepts (hard floor). */
  public static readonly MIN_APPLIANCE_RAM_MB = 2048;

  /** Hardware allocation limits with the sovereign host-reserve guarantee. */
  public static limits(input: HostSizingInput): SizingLimits {
    const cpuCount = input.cpuCount || NodeSizingPolicy.DEFAULT_HOST_CPU_COUNT;
    const totalMemoryMb = input.totalMemoryMb || NodeSizingPolicy.DEFAULT_HOST_RAM_MB;
    return {
      minCores: 2,
      maxCores: Math.max(2, cpuCount - 1),
      recommendedCores: input.recommendedCores || NodeSizingPolicy.DEFAULT_RECOMMENDED_CORES,
      minRamMb: NodeSizingPolicy.MIN_APPLIANCE_RAM_MB,
      maxRamMb: Math.max(NodeSizingPolicy.HOST_RAM_RESERVE_MB, totalMemoryMb - NodeSizingPolicy.HOST_RAM_RESERVE_MB),
      recommendedRamMb: input.recommendedRamMb || NodeSizingPolicy.DEFAULT_RECOMMENDED_RAM_MB,
    };
  }

  /** Fraction of the slider track occupied by the handle, clamped to 0..100. */
  public static sliderFillPercent(value: number, min: number, max: number): number {
    const span = max - min;
    if (span <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round(((value - min) / span) * 100)));
  }

  /** Share of the whole host consumed by the assigned resource. */
  public static hostSharePercent(assigned: number, hostTotal: number): number {
    if (hostTotal <= 0) return 0;
    return Math.round((assigned / hostTotal) * 100);
  }

  /** Percentage of the target disk already used (0..100). */
  public static diskUsedPercent(disk: DiskFacts | null | undefined): number {
    if (!disk || disk.total_space_gb <= 0) return 0;
    const used = disk.total_space_gb - disk.available_space_gb;
    return Math.min(100, Math.max(0, Math.round((used / disk.total_space_gb) * 100)));
  }

  /** Deterministic VHDX path for the appliance image on the chosen drive. */
  public static vhdxPath(targetDrive: string | null | undefined, clientId: string | null | undefined): string {
    const letter = (targetDrive || 'C:').replace(/[\\/]+$/, '');
    return `${letter}\\FastFree\\Disks\\fastfree_${clientId || 'client1'}.vhdx`;
  }

  /** Best-matching disk row for the chosen mount point (first row as fallback). */
  public static pickTargetDisk<T extends { mount_point: string }>(disks: ReadonlyArray<T>, targetDrive: string | null | undefined): T | null {
    const wanted = (targetDrive || '').toLowerCase();
    return disks.find((d) => d.mount_point.toLowerCase() === wanted) || disks[0] || null;
  }
}
