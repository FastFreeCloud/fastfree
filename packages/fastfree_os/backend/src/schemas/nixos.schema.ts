/**
 * Zod validation schemas for NixOS operations, rollback, and system health.
 */

import { z } from 'zod';
import { machineNameSchema } from './clan.schema.js';

/**
 * Health response schema capturing system resources, systemd units, and NixOS generation.
 */
export const nixosHealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'critical']),
  timestamp: z.string(),
  cpu: z.object({
    cores: z.number().int().nonnegative(),
    model: z.string(),
    loadAverage: z.array(z.number()),
  }),
  memory: z.object({
    totalBytes: z.number().nonnegative(),
    freeBytes: z.number().nonnegative(),
    usedBytes: z.number().nonnegative(),
    percentUsed: z.number().min(0).max(100),
  }),
  disk: z.object({
    totalBytes: z.number().nonnegative(),
    freeBytes: z.number().nonnegative(),
    usedBytes: z.number().nonnegative(),
    percentUsed: z.number().min(0).max(100),
    mount: z.string(),
  }),
  systemd: z.object({
    status: z.string(),
    activeUnitsCount: z.number().int().nonnegative(),
  }),
  nixos: z.object({
    currentGeneration: z.number().int().positive().nullable(),
    systemVersion: z.string().nullable(),
  }),
});

export type NixosHealthInfo = z.infer<typeof nixosHealthResponseSchema>;

/**
 * Input schema for triggering a rollback.
 */
export const nixosRollbackSchema = z.object({
  targetHost: z.string().trim().optional(),
  machine: machineNameSchema.optional(),
});

export type NixosRollbackInput = z.infer<typeof nixosRollbackSchema>;

/**
 * Result schema for a rollback operation.
 */
export const nixosRollbackResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  previousGeneration: z.number().int().positive().nullable().optional(),
  currentGeneration: z.number().int().positive().nullable().optional(),
  rawOutput: z.string().optional(),
});

export type NixosRollbackResult = z.infer<typeof nixosRollbackResponseSchema>;

/**
 * Input schema for triggering a deployment.
 */
export const nixosDeploySchema = z.object({
  machine: machineNameSchema,
  dryRun: z.boolean().default(false).optional(),
  hostKeyCheck: z.enum(['tofu', 'ask']).default('tofu').optional(),
});

export type NixosDeployInput = z.infer<typeof nixosDeploySchema>;

/**
 * Result schema for a deployment operation.
 */
export const nixosDeployResponseSchema = z.object({
  machine: z.string(),
  success: z.boolean(),
  message: z.string(),
  durationMs: z.number().optional(),
  rawOutput: z.string().optional(),
});

export type NixosDeployResult = z.infer<typeof nixosDeployResponseSchema>;
