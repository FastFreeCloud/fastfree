/**
 * NixOS System & Deployment Domain Service.
 *
 * Provides system health monitoring (CPU, RAM, Disk, Systemd, Generation),
 * system generation rollbacks, and streamable deployment operations.
 */

import { execFile, spawn } from 'node:child_process';
import { statfs } from 'node:fs/promises';
import { readlink } from 'node:fs/promises';
import os from 'node:os';
import { promisify } from 'node:util';

import { validateMachineName } from '../clan/exec.js';
import type {
  NixosDeployInput,
  NixosDeployResult,
  NixosHealthInfo,
  NixosRollbackInput,
  NixosRollbackResult,
} from '../schemas/nixos.schema.js';

const execFileAsync = promisify(execFile);

/**
 * Extract NixOS generation number from profile symlink target or nixos-rebuild output.
 */
function parseGenerationNumber(linkTarget: string): number | null {
  const match = /system-(\d+)-link/.exec(linkTarget);
  if (match?.[1]) {
    const num = Number.parseInt(match[1], 10);
    return Number.isInteger(num) ? num : null;
  }
  return null;
}

export class NixosService {
  /**
   * Collect comprehensive host system health metrics.
   */
  async getSystemHealth(): Promise<NixosHealthInfo> {
    const timestamp = new Date().toISOString();

    // 1. CPU
    const cpus = os.cpus();
    const cores = cpus.length;
    const cpuModel = cpus[0]?.model ?? 'Unknown';
    const loadAverage = os.loadavg();

    // 2. Memory
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = Math.max(0, totalMem - freeMem);
    const memPercent = totalMem > 0 ? Math.round((usedMem / totalMem) * 1000) / 10 : 0;

    // 3. Disk (Root filesystem)
    let diskTotal = 0;
    let diskFree = 0;
    let diskUsed = 0;
    let diskPercent = 0;
    let mountPath = '/';

    try {
      // Test root mount first; fall back to cwd if not found (e.g. Windows dev)
      const targetPath = process.platform === 'win32' ? process.cwd() : '/';
      mountPath = targetPath;
      const stats = await statfs(targetPath);
      diskTotal = Number(stats.bsize) * Number(stats.blocks);
      diskFree = Number(stats.bsize) * Number(stats.bfree);
      diskUsed = Math.max(0, diskTotal - diskFree);
      diskPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 1000) / 10 : 0;
    } catch {
      // Graceful fallback if statfs is unavailable
    }

    // 4. Systemd status & active units
    let systemdStatus = 'unknown';
    let activeUnitsCount = 0;

    if (process.platform === 'linux') {
      try {
        const { stdout: isRunningOut } = await execFileAsync(
          'systemctl',
          ['is-system-running'],
          { timeout: 2000 },
        ).catch((err: { stdout?: string }) => ({ stdout: err.stdout ?? 'degraded' }));

        systemdStatus = (isRunningOut || '').trim() || 'unknown';

        const { stdout: unitsOut } = await execFileAsync(
          'systemctl',
          ['list-units', '--state=active', '--no-legend', '--plain'],
          { timeout: 3000 },
        );
        const lines = unitsOut.split('\n').filter((l) => l.trim().length > 0);
        activeUnitsCount = lines.length;
      } catch {
        systemdStatus = 'unavailable';
      }
    } else {
      systemdStatus = 'not-applicable (non-linux)';
    }

    // 5. NixOS Generation & Version
    let currentGeneration: number | null = null;
    let systemVersion: string | null = null;

    if (process.platform === 'linux') {
      try {
        const link = await readlink('/nix/var/nix/profiles/system').catch(() => null);
        if (link) {
          currentGeneration = parseGenerationNumber(link);
        }
      } catch {
        // Not a NixOS system or permissions missing
      }

      try {
        const { stdout: versionOut } = await execFileAsync('nixos-version', [], { timeout: 2000 });
        systemVersion = versionOut.trim();
      } catch {
        // Not NixOS
      }
    }

    // Determine aggregate health state
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (memPercent >= 95 || diskPercent >= 95) {
      status = 'critical';
    } else if (memPercent >= 85 || diskPercent >= 85 || systemdStatus === 'degraded') {
      status = 'degraded';
    }

    return {
      status,
      timestamp,
      cpu: {
        cores,
        model: cpuModel,
        loadAverage,
      },
      memory: {
        totalBytes: totalMem,
        freeBytes: freeMem,
        usedBytes: usedMem,
        percentUsed: memPercent,
      },
      disk: {
        totalBytes: diskTotal,
        freeBytes: diskFree,
        usedBytes: diskUsed,
        percentUsed: diskPercent,
        mount: mountPath,
      },
      systemd: {
        status: systemdStatus,
        activeUnitsCount,
      },
      nixos: {
        currentGeneration,
        systemVersion,
      },
    };
  }

  /**
   * Execute NixOS rollback: switches to the previous generation via `nixos-rebuild switch --rollback`.
   */
  async rollback(input: NixosRollbackInput = {}): Promise<NixosRollbackResult> {
    if (process.platform !== 'linux') {
      return {
        success: false,
        message: 'NixOS rollback is only supported on Linux/NixOS hosts.',
        rawOutput: 'Host is not running Linux.',
      };
    }

    let previousGen: number | null = null;
    try {
      const link = await readlink('/nix/var/nix/profiles/system').catch(() => null);
      if (link) {
        previousGen = parseGenerationNumber(link);
      }
    } catch {
      // Ignore
    }

    try {
      const args = ['switch', '--rollback'];
      if (input.targetHost) {
        args.push('--target-host', input.targetHost);
      }

      const { stdout, stderr } = await execFileAsync('nixos-rebuild', args, {
        timeout: 180_000,
        env: { ...process.env, PATH: process.env.PATH },
      });

      let currentGen: number | null = null;
      try {
        const linkAfter = await readlink('/nix/var/nix/profiles/system').catch(() => null);
        if (linkAfter) {
          currentGen = parseGenerationNumber(linkAfter);
        }
      } catch {
        // Ignore
      }

      return {
        success: true,
        message: 'NixOS rollback completed successfully.',
        previousGeneration: previousGen,
        currentGeneration: currentGen,
        rawOutput: `${stdout}\n${stderr}`.trim(),
      };
    } catch (error: unknown) {
      const execError = error as { message?: string; stdout?: string; stderr?: string };
      return {
        success: false,
        message: `NixOS rollback failed: ${execError.message ?? 'Unknown error'}`,
        previousGeneration: previousGen,
        currentGeneration: null,
        rawOutput: `${execError.stdout ?? ''}\n${execError.stderr ?? ''}`.trim(),
      };
    }
  }

  /**
   * Trigger machine deployment with live stream output callback.
   */
  async streamDeployment(
    input: NixosDeployInput,
    onChunk?: (chunk: string) => void,
  ): Promise<NixosDeployResult> {
    const validName = validateMachineName(input.machine);
    const startTime = Date.now();
    const hostKeyCheck = input.hostKeyCheck ?? 'tofu';

    return new Promise<NixosDeployResult>((resolve) => {
      const args = ['machines', 'update', validName, '--host-key-check', hostKeyCheck];
      if (input.dryRun) {
        args.push('--dry-run');
      }

      const child = spawn('clan', args, {
        windowsHide: true,
        env: { ...process.env },
      });

      let outputAccumulator = '';

      child.stdout.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        outputAccumulator += text;
        onChunk?.(text);
      });

      child.stderr.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        outputAccumulator += text;
        onChunk?.(text);
      });

      child.on('error', (err) => {
        const durationMs = Date.now() - startTime;
        resolve({
          machine: validName,
          success: false,
          message: `Failed to spawn Clan deployment: ${err.message}`,
          durationMs,
          rawOutput: outputAccumulator,
        });
      });

      child.on('close', (code) => {
        const durationMs = Date.now() - startTime;
        const success = code === 0;
        resolve({
          machine: validName,
          success,
          message: success
            ? `Deployment for ${validName} completed successfully.`
            : `Deployment for ${validName} exited with code ${code}.`,
          durationMs,
          rawOutput: outputAccumulator,
        });
      });
    });
  }

  /**
   * Get all system errors and failed units.
   */
  async getSystemDiagnostics(): Promise<{
    failedUnits: Array<{ unit: string; load: string; active: string; sub: string; description: string }>;
    criticalErrors: string[];
    services: Array<{ name: string; active: string; sub: string; description: string }>;
  }> {
    const failedUnits: Array<{ unit: string; load: string; active: string; sub: string; description: string }> = [];
    const criticalErrors: string[] = [];
    const services: Array<{ name: string; active: string; sub: string; description: string }> = [];

    if (process.platform === 'linux') {
      try {
        const { stdout } = await execFileAsync(
          'systemctl',
          ['list-units', '--type=service', '--state=failed', '--no-legend', '--plain'],
          { timeout: 3000 },
        );
        for (const line of stdout.split('\n')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            failedUnits.push({
              unit: parts[0] || '',
              load: parts[1] || '',
              active: parts[2] || '',
              sub: parts[3] || '',
              description: parts.slice(4).join(' '),
            });
          }
        }
      } catch {
        // no failed units
      }

      try {
        const { stdout } = await execFileAsync(
          'journalctl',
          ['-p', '3', '-xb', '-n', '30', '--no-pager'],
          { timeout: 5000 },
        );
        for (const line of stdout.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.length > 0 && !trimmed.startsWith('-- Logs begin')) {
            criticalErrors.push(trimmed);
          }
        }
      } catch {
        // fallback
      }

      try {
        const { stdout } = await execFileAsync(
          'systemctl',
          ['list-units', '--type=service', '--all', '--no-legend', '--plain', 'fastfree*', 'caddy*', 'mariadb*', 'redis*', 'sshd*'],
          { timeout: 3000 },
        );
        for (const line of stdout.split('\n')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            services.push({
              name: parts[0] || '',
              active: parts[2] || '',
              sub: parts[3] || '',
              description: parts.slice(4).join(' '),
            });
          }
        }
      } catch {
        // fallback
      }
    }

    return { failedUnits, criticalErrors, services };
  }
}

export const nixosService = new NixosService();
