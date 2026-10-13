/**
 * `clan-api` — the panel's only backend.
 *
 * Responsibilities, in order of the request lifecycle:
 *   1. authenticate the caller with a constant-time bearer token compare
 *   2. route /api/* to the allowlisted command set
 *   3. never fall through to the Vue renderer
 *
 * Security properties that are not negotiable:
 *   - `execFile` with an argv array; no shell, no string concatenation
 *   - commands come from allowlist.ts, never from the request
 *   - the only user-supplied value that reaches argv is a machine name or a
 *     `clan select` selector, and both are validated against the real machine
 *     list / a strict grammar before use
 *   - secrets are masked before a response is ever built
 */
import { timingSafeEqual } from "node:crypto";
import { defineSsrMiddleware } from "#q-app";
import type { Hono } from "hono";

import {
  isReadCommand,
  isValidMachineName,
  isValidSelector,
  isValidWriteCommand,
  READ_COMMAND_IDS,
  WRITE_COMMAND_IDS,
} from "../clan/allowlist.js";
import { ClanError, parseJsonOutput, runRead } from "../clan/exec.js";
import { getJob, listJobs, startJob } from "../clan/jobs.js";
import { maskTextOutput } from "../clan/mask.js";

/** How long a read result stays fresh. Every command here evaluates the flake,
 * and the Overview screen polls. */
const READ_CACHE_TTL_MS = 60_000;

type CacheEntry = { at: number; body: unknown };
const readCache = new Map<string, CacheEntry>();

function cached<T>(key: string): T | undefined {
  const hit = readCache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > READ_CACHE_TTL_MS) {
    readCache.delete(key);
    return undefined;
  }
  return hit.body as T;
}

function remember(key: string, body: unknown): void {
  readCache.set(key, { at: Date.now(), body });
}

/** Constant-time compare. Length differences are not secret: the token length
 * is fixed by whoever generated it, and comparing lengths first only avoids
 * the timingSafeEqual throw on a mismatched buffer size. */
function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !value) return null;
  return value.trim();
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // The panel handles tokens, so nothing may be cached by a proxy.
      "cache-control": "no-store",
    },
  });
}

/** Anything thrown here must not leak a command line or a path to the browser. */
function errorResponse(error: unknown): Response {
  if (error instanceof ClanError) {
    const status = error.code === "config" ? 500 : 400;
    return json({ error: error.code, message: error.message }, status);
  }
  return json({ error: "internal", message: "request failed" }, 500);
}

export default defineSsrMiddleware(({ app, resolve }) => {
  const api = app as unknown as Hono;

  /**
   * Reject before routing so that no handler ever sees an unauthenticated
   * request. The login screen posts the token to /api/verify to prove it works.
   */
  api.use("*", async (c, next) => {
    const expected = process.env["CLAN_PANEL_TOKEN"];
    if (!expected) {
      return json({ error: "config", message: "CLAN_PANEL_TOKEN is not set" }, 500);
    }

    const provided = bearerToken(c.req.raw);
    if (!provided || !tokenMatches(provided, expected)) {
      return json({ error: "unauthorized", message: "invalid or missing token" }, 401);
    }
    await next();
    return undefined;
  });

  /** Login screen: check a token without touching clan. */
  api.get("/api/verify", (c) => json({ ok: true, panel: "clan-panel" }));

  /** Which commands exist, so the UI can build itself from one source. */
  api.get("/api/commands", (c) =>
    json({
      read: READ_COMMAND_IDS,
      write: WRITE_COMMAND_IDS,
    }),
  );

  /** Global `clan show`. */
  api.get("/api/global/show", async (c) => {
    const hit = cached<unknown>("show");
    if (hit) return json(hit);
    try {
      const result = await runRead("show");
      const body = { stdout: result.stdout, code: result.code, durationMs: result.durationMs };
      remember("show", body);
      return json(body);
    } catch (error) {
      return errorResponse(error);
    }
  });

  /**
   * Machine names, resolved from the flake rather than from a hardcoded list,
   * so the panel cannot be pointed at a machine that does not exist.
   */
  api.get("/api/machines", async (c) => {
    const hit = cached<unknown>("machines");
    if (hit) return json(hit);
    try {
      const result = await runRead("select", {
        selector: "clan.inventory.machines",
      });
      const parsed = parseJsonOutput<Record<string, unknown>>(result);
      const machines = Object.keys(parsed).sort();
      const body = { machines, raw: parsed };
      remember("machines", body);
      return json(body);
    } catch (error) {
      return errorResponse(error);
    }
  });

  /** Generic `clan select` bridge for the inventory screens. */
  api.get("/api/select", async (c) => {
    const selector = c.req.query("selector");
    if (!isValidSelector(selector)) {
      return json({ error: "bad_selector", message: "invalid selector" }, 400);
    }
    const key = `select:${selector}`;
    const hit = cached<unknown>(key);
    if (hit) return json(hit);
    try {
      const result = await runRead("select", { selector });
      const body = { selector, data: parseJsonOutput<unknown>(result) };
      remember(key, body);
      return json(body);
    } catch (error) {
      return errorResponse(error);
    }
  });

  /** Read commands that take a machine name. */
  api.get("/api/machine/:command/:machine", async (c) => {
    const command = c.req.param("command");
    const machine = c.req.param("machine");

    if (!isReadCommand(command)) {
      return json({ error: "not_allowed", message: `unknown read command: ${command}` }, 400);
    }
    if (!isValidMachineName(machine)) {
      return json({ error: "bad_machine", message: "invalid machine name" }, 400);
    }

    const key = `${command}:${machine}`;
    const hit = cached<unknown>(key);
    if (hit) return json(hit);

    try {
      const result = await runRead(command, { machine });
      // Raw text: the fixture in docs/verified-outputs/ defines the shape, and
      // the client-side parser is written from that file rather than guessed.
      // Everything goes through maskTextOutput first — `clan vars list` prints
      // the emergency-access bcrypt hash in the clear, and that is a credential.
      const body = {
        command,
        machine,
        stdout: maskTextOutput(result.stdout),
        stderr: maskTextOutput(result.stderr),
        code: result.code,
        durationMs: result.durationMs,
      };
      remember(key, body);
      return json(body);
    } catch (error) {
      return errorResponse(error);
    }
  });

  /** Mutating commands become background jobs, never a blocking request. */
  api.post("/api/jobs", async (c) => {
    let payload: { command?: unknown; machine?: unknown; confirm?: unknown };
    try {
      payload = (await c.req.json()) as typeof payload;
    } catch {
      return json({ error: "bad_body", message: "expected JSON" }, 400);
    }

    const command = payload.command;
    const machine = payload.machine;

    if (typeof command !== "string" || !isValidWriteCommand(command)) {
      return json({ error: "not_allowed", message: `unknown write command: ${String(command)}` }, 400);
    }
    if (!isValidMachineName(machine)) {
      return json({ error: "bad_machine", message: "invalid machine name" }, 400);
    }
    // The UI has to send the confirmation flag; a bare POST never mutates.
    if (payload.confirm !== true) {
      return json(
        { error: "needs_confirm", message: "set confirm=true to run a state-changing command" },
        400,
      );
    }

    try {
      const job = await startJob(command, machine);
      return json(job, 202);
    } catch (error) {
      return errorResponse(error);
    }
  });

  api.get("/api/jobs", (c) => json({ jobs: listJobs() }));

  api.get("/api/jobs/:id", (c) => {
    const job = getJob(c.req.param("id"));
    return job ? json(job) : json({ error: "not_found" }, 404);
  });

  /**
   * Stop a running job. Cancelling is the only write path here that does not
   * spawn clan, so it needs no confirmation.
   */
  api.post("/api/jobs/:id/cancel", (c) => {
    const job = getJob(c.req.param("id"));
    if (!job) return json({ error: "not_found" }, 404);
    job.cancel();
    return json({ ok: true, jobId: job.id, status: "cancelling" });
  });

  /**
   * Anything else under /api is a client mistake, not a route to the Vue
   * renderer. Falling through would render HTML for an API path.
   */
  api.all("/api/*", (c) =>
    json({ error: "not_found", message: `no such endpoint: ${c.req.url}` }, 404),
  );

  // `resolve` is intentionally unused: this middleware never renders.
  void resolve;
});