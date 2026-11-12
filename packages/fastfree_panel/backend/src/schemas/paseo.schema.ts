import { z } from 'zod';

export const paseoAgentStatusEnum = z.enum(['idle', 'blocked', 'done', 'working', 'unknown']);
export type PaseoAgentStatus = z.infer<typeof paseoAgentStatusEnum>;

export const livePaseoAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  status: paseoAgentStatusEnum,
  cwd: z.string().optional(),
});
export type LivePaseoAgent = z.infer<typeof livePaseoAgentSchema>;

export const paseoStatusCountsSchema = z.object({
  all: z.number(),
  blocked: z.number(),
  idle: z.number(),
  done: z.number(),
  working: z.number(),
});
export type PaseoStatusCounts = z.infer<typeof paseoStatusCountsSchema>;

export const paseoStatusResponseSchema = z.object({
  running: z.boolean(),
  connected: z.boolean(),
  source: z.enum(['live', 'fallback']),
  baseUrl: z.string(),
  counts: paseoStatusCountsSchema,
  agents: z.array(livePaseoAgentSchema),
  message: z.string().optional(),
});
export type PaseoStatusResponse = z.infer<typeof paseoStatusResponseSchema>;

export const paseoAgentPromptSchema = z.object({
  target: z.string().min(1, 'Target agent id or name is required'),
  text: z.string().min(1, 'Prompt text cannot be empty'),
  wait: z.boolean().optional(),
  timeout_ms: z.number().max(25000).optional(),
});
export type PaseoAgentPromptInput = z.infer<typeof paseoAgentPromptSchema>;

export const paseoAgentCreateSchema = z.object({
  provider: z.string().min(1, 'Provider/model is required'),
  cwd: z.string().min(1, 'Working directory is required'),
  prompt: z.string().min(1, 'Prompt text cannot be empty'),
});
export type PaseoAgentCreateInput = z.infer<typeof paseoAgentCreateSchema>;

export const paseoAgentStopSchema = z.object({
  target: z.string().min(1, 'Target agent id or name is required'),
});
export type PaseoAgentStopInput = z.infer<typeof paseoAgentStopSchema>;
