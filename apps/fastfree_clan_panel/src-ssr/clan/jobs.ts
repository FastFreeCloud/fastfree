/**
 * Background jobs for the state-changing commands.
 *
 * A `clan machines update` runs for tens of minutes, so it cannot live inside
 * a request. Jobs live in memory only: Phase 6 of PLAN.md moves them to a
 * database once an audit log exists.
 */
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

import { getCommand, resolveArgv } from "./allowlist.js";
import { ClanError } from "./exec.js";

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelling";

export type Job = {
  id: string;
  command: string;
  machine: string;
  argv: string[];
  status: JobStatus;
  startedAt: string;
  finishedAt: string | null;
  code: number | null;
  /** Bounded so a runaway update cannot exhaust memory. */
  log: string;
  cancel: () => void;
};

const MAX_LOG_CHARS = 512 * 1024;
const jobs = new Map<string, Job>();
const MAX_JOBS_KEPT = 200;

function appendLog(job: Job, chunk: string): void {
  if (job.log.length >= MAX_LOG_CHARS) return;
  job.log += chunk;
  if (job.log.length > MAX_LOG_CHARS) {
    job.log = job.log.slice(0, MAX_LOG_CHARS) + "\n… log truncated …\n";
  }
}

export async function startJob(commandId: string, machine: string): Promise<Job> {
  const spec = getCommand(commandId);
  if (!spec.mutating) {
    throw new ClanError(`${commandId} does not change state`, "not_write");
  }

  const argv = resolveArgv(spec, { machine });
  const cwd = process.env["CLAN_DIR"];
  if (!cwd) throw new ClanError("CLAN_DIR is not set", "config");

  const id = randomUUID();
  const job: Job = {
    id,
    command: commandId,
    machine,
    argv,
    status: "queued",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    code: null,
    log: "",
    cancel: () => {},
  };
  jobs.set(id, job);

  // Keep the map bounded: drop the oldest finished jobs.
  if (jobs.size > MAX_JOBS_KEPT) {
    const finished = [...jobs.values()]
      .filter((j) => j.finishedAt !== null)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    for (const stale of finished) {
      if (jobs.size <= MAX_JOBS_KEPT) break;
      jobs.delete(stale.id);
    }
  }

  const child = spawn(process.env["CLAN_BINARY"] ?? "clan", argv, {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  job.status = "running";
  appendLog(job, `$ ${argv.join(" ")}\n`);

  child.stdout.on("data", (chunk: Buffer) => appendLog(job, chunk.toString()));
  child.stderr.on("data", (chunk: Buffer) => appendLog(job, chunk.toString()));

  job.cancel = () => {
    if (job.status !== "running") return;
    job.status = "cancelling";
    child.kill("SIGTERM");
    // Escalate if the child ignores SIGTERM.
    setTimeout(() => child.kill("SIGKILL"), 5_000).unref();
  };

  child.on("error", (error) => {
    appendLog(job, `\nspawn failed: ${error.message}\n`);
    job.status = "failed";
    job.finishedAt = new Date().toISOString();
  });

  child.on("close", (code, signal) => {
    job.code = code;
    job.status = code === 0 ? "succeeded" : "failed";
    job.finishedAt = new Date().toISOString();
    if (signal) appendLog(job, `\nterminated by ${signal}\n`);
  });

  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function listJobs(): Array<Omit<Job, "cancel">> {
  return [...jobs.values()]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map(({ cancel: _cancel, ...rest }) => rest);
}