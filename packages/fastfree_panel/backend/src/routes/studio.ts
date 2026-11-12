/**
 * FastFree Design Studio routes.
 *
 * Exposes the Studio as an honest, isolated automation surface:
 *   GET  /studio/health          - probe opencode + git + repo root (no secrets)
 *   GET  /studio/omnigent/status - probe the real local Omnigent server (read-only)
 *   GET  /studio/tasks           - list task history (session-local)
 *   POST /studio/tasks           - dispatch a task (one at a time; worktree isolated)
 *   GET  /studio/tasks/:id       - task status + log tail + diff stat
 *   POST /studio/tasks/:id/cancel  - cancel a running task
 *   POST /studio/tasks/:id/discard - delete the worktree (only when settled)
 *
 * Nothing in this module merges, pushes or deploys — ever.
 */
import { Hono } from 'hono';

import { studioService } from '../core/studio.service.js';
import { studioDispatchInputSchema } from '../schemas/studio.schema.js';
import { ApiError } from '../http/errors.js';
import { ok } from '../http/respond.js';

export const studioRoutes = new Hono();

studioRoutes.get('/studio/health', async (c) => {
  try {
    const probe = await studioService.probe();
    return c.json(ok(probe));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Studio probe failed';
    throw new ApiError('UPSTREAM_ERROR', message);
  }
});

studioRoutes.get('/studio/omnigent/status', async (c) => {
  try {
    const result = await studioService.probeOmnigentServer();
    return c.json(ok(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Omnigent server probe failed';
    throw new ApiError('UPSTREAM_ERROR', message);
  }
});

studioRoutes.get('/studio/tasks', async (c) => {
  try {
    const views = await studioService.listTasks();
    return c.json(ok({ tasks: views }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list studio tasks';
    throw new ApiError('UPSTREAM_ERROR', message);
  }
});

studioRoutes.post('/studio/tasks', async (c) => {
  const raw = await c.req.json().catch(() => null);
  if (!raw || typeof raw !== 'object') {
    throw ApiError.validation('Request body must be a JSON object with "prompt".');
  }
  const parsed = studioDispatchInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw ApiError.validation(parsed.error.issues.map((issue) => issue.message).join(', '));
  }

  try {
    const task = await studioService.dispatch(parsed.data);
    return c.json(ok(task));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to dispatch studio task';
    if (message.startsWith('TASK_IN_PROGRESS:')) {
      throw new ApiError('RATE_LIMITED', 'Another Studio task is already running. Wait for it to finish or cancel it.');
    }
    if (message === 'WORKTREE_PATH_INVALID') {
      throw new ApiError('INTERNAL', 'Worktree path failed the safety check.');
    }
    throw new ApiError('UPSTREAM_ERROR', message);
  }
});

studioRoutes.get('/studio/tasks/:id', async (c) => {
  const id = c.req.param('id');
  const task = await studioService.getTaskView(id);
  if (!task) {
    throw new ApiError('NOT_FOUND', 'Studio task not found.');
  }
  return c.json(ok(task));
});

studioRoutes.post('/studio/tasks/:id/cancel', (c) => {
  const id = c.req.param('id');
  const cancelled = studioService.cancelTask(id);
  if (!cancelled) {
    throw new ApiError('NOT_FOUND', 'Task is not running or does not exist.');
  }
  return c.json(ok({ cancelled: true }));
});

studioRoutes.post('/studio/tasks/:id/discard', async (c) => {
  const id = c.req.param('id');
  const result = await studioService.discardTask(id);
  if (!result.ok) {
    throw new ApiError('VALIDATION_ERROR', 'Unable to discard the task. It may be running, or the worktree guard rejected the path.');
  }
  return c.json(ok({ discarded: true, residualWorktree: result.residualWorktree }));
});
