/**
 * Zod validation schemas for Clan operations and domain entities.
 */

import { z } from 'zod';

/**
 * Strict machine name pattern: 1-63 chars, letters/digits and inner hyphens.
 * Anchored, bounded, and free of every shell metacharacter.
 */
export const machineNameSchema = z
  .string()
  .min(1, 'Machine name cannot be empty')
  .max(63, 'Machine name cannot exceed 63 characters')
  .regex(
    /^[a-z0-9][a-z0-9-]{0,62}$/i,
    'Invalid machine name: must start with letter/digit and contain only letters, numbers, and hyphens',
  );

export type MachineName = z.infer<typeof machineNameSchema>;

/**
 * Input query parameters for searching or filtering machines.
 */
export const clanMachineQuerySchema = z.object({
  name: machineNameSchema.optional(),
  tag: z.string().trim().min(1).optional(),
});

export type ClanMachineQuery = z.infer<typeof clanMachineQuerySchema>;

/**
 * Input schema for triggering a machine update.
 */
export const clanMachineUpdateSchema = z.object({
  machine: machineNameSchema,
  hostKeyCheck: z.enum(['tofu', 'ask']).default('tofu').optional(),
});

export type ClanMachineUpdateInput = z.infer<typeof clanMachineUpdateSchema>;

/**
 * Detailed representation of a Clan-managed machine.
 */
export const clanMachineInfoSchema = z.object({
  name: z.string(),
  hostname: z.string().nullable(),
  isOnline: z.boolean().nullable(),
  roles: z.array(z.string()),
  description: z.string().nullable().optional(),
  targetHost: z.string().nullable().optional(),
  buildHost: z.string().nullable().optional(),
  machineClass: z.string().nullable().optional(),
  installedAt: z.string().nullable().optional(),
});

export type ClanMachineInfo = z.infer<typeof clanMachineInfoSchema>;

/**
 * Clan variable entry representation.
 */
export const clanVarEntrySchema = z.object({
  name: z.string(),
  isSecret: z.boolean(),
  valueSummary: z.string(),
});

export type ClanVarEntry = z.infer<typeof clanVarEntrySchema>;

/**
 * Result schema for a machine update operation.
 */
export const clanUpdateResultSchema = z.object({
  machine: z.string(),
  success: z.boolean(),
  message: z.string(),
  durationMs: z.number().optional(),
  stdout: z.string().optional(),
});

export type ClanUpdateResult = z.infer<typeof clanUpdateResultSchema>;
