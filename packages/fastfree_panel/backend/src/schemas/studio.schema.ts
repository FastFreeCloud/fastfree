/**
 * Schemas for the FastFree Design Studio dispatch API.
 * Studio tasks are intentionally small: one prompt, one worktree, zero merges.
 */
import { z } from 'zod';

export const studioDispatchInputSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  prompt: z.string().trim().min(16).max(4000),
  target: z.string().trim().max(240).optional(),
});

export type StudioDispatchInput = z.infer<typeof studioDispatchInputSchema>;
