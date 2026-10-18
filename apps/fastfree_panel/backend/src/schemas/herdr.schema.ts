import { z } from 'zod';

export const herdrAgentStatusEnum = z.enum(['idle', 'blocked', 'done', 'working', 'unknown']);
export type HerdrAgentStatus = z.infer<typeof herdrAgentStatusEnum>;

export const liveHerdrAgentSchema = z.object({
  name: z.string(),
  agent: z.string(),
  status: herdrAgentStatusEnum,
  workspace_id: z.string(),
  tab_id: z.string(),
  pane_id: z.string(),
  cwd: z.string().optional(),
  focused: z.boolean().optional(),
});
export type LiveHerdrAgent = z.infer<typeof liveHerdrAgentSchema>;

export const herdrStatusCountsSchema = z.object({
  all: z.number(),
  blocked: z.number(),
  idle: z.number(),
  done: z.number(),
  working: z.number(),
});
export type HerdrStatusCounts = z.infer<typeof herdrStatusCountsSchema>;

export const herdrStatusResponseSchema = z.object({
  running: z.boolean(),
  connected: z.boolean(),
  source: z.enum(['live', 'snapshot_cache', 'fallback']),
  socketPath: z.string(),
  workspace: z.string(),
  activeLeadAgent: z.string(),
  focusedPane: z.string(),
  counts: herdrStatusCountsSchema,
  agents: z.array(liveHerdrAgentSchema),
  message: z.string().optional(),
});
export type HerdrStatusResponse = z.infer<typeof herdrStatusResponseSchema>;

export const herdrAgentPromptSchema = z.object({
  target: z.string().min(1, 'Target agent name or pane is required'),
  text: z.string().min(1, 'Prompt text cannot be empty'),
  wait: z.boolean().optional(),
  timeout_ms: z.number().max(25000).optional(),
});
export type HerdrAgentPromptInput = z.infer<typeof herdrAgentPromptSchema>;
