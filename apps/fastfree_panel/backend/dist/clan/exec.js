/**
 * The only place in the backend that spawns a process.
 *
 * Invariants:
 *   - `execFile` with an argv array. Never `exec`, never a shell string.
 *   - the argv must come from the frozen allowlist (clan/allowlist.ts);
 *   - a wall-clock timeout and a hard output cap are always applied;
 *   - concurrency is capped by config.maxConcurrency;
 *   - raw stderr is never placed in an ApiError, so it can never reach HTTP.
 */
import { execFile } from 'node:child_process';
import { config } from '../config.js';
import { ApiError } from '../http/errors.js';
import { assertAllowed } from './allowlist.js';
/** Name of the CLI binary. Resolved from PATH, which is the Flox environment. */
export const CLAN_BIN = 'clan';
/**
 * The only user-supplied value that may ever reach a command is a machine name.
 * Anchored, bounded, and free of every shell metacharacter.
 */
export const MACHINE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/i;
/** @throws ApiError VALIDATION_ERROR when the name is not a safe identifier. */
export function validateMachineName(name) {
    if (typeof name !== 'string' || !MACHINE_NAME_PATTERN.test(name)) {
        throw ApiError.validation('Invalid machine name.', { field: 'name' });
    }
    return name;
}
function isExecFailure(error) {
    return error instanceof Error;
}
const MAX_BUFFER_OVERFLOW = 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER';
/** Clamp text to a byte budget without splitting a multi-byte UTF-8 sequence. */
export function clampUtf8(text, maxBytes) {
    const buffer = Buffer.from(text, 'utf8');
    if (buffer.byteLength <= maxBytes) {
        return { text, truncated: false };
    }
    let end = maxBytes;
    while (end > 0) {
        const byte = buffer[end];
        if (byte === undefined || (byte & 0xc0) !== 0x80) {
            break;
        }
        end -= 1;
    }
    return { text: buffer.subarray(0, end).toString('utf8'), truncated: true };
}
/** FIFO semaphore bounding how many Clan commands run at the same time. */
export class ConcurrencyLimiter {
    max;
    active = 0;
    waiting = [];
    constructor(max) {
        this.max = Math.max(1, Math.trunc(max));
    }
    async run(task) {
        await this.acquire();
        try {
            return await task();
        }
        finally {
            this.release();
        }
    }
    acquire() {
        if (this.active < this.max) {
            this.active += 1;
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            this.waiting.push(() => {
                this.active += 1;
                resolve();
            });
        });
    }
    release() {
        this.active -= 1;
        const next = this.waiting.shift();
        if (next !== undefined) {
            next();
        }
    }
}
export const clanLimiter = new ConcurrencyLimiter(config.maxConcurrency);
function buildEnv() {
    const env = { ...process.env };
    // Pin the repository root so the child never depends on the server's cwd.
    if (config.clanDir !== null) {
        env.CLAN_DIR = config.clanDir;
    }
    env.GIT_DISCOVERY_ACROSS_FILESYSTEM = '1';
    return env;
}
function spawnClan(argv, timeoutMs) {
    return new Promise((resolve, reject) => {
        const options = {
            cwd: config.clanDir ?? undefined,
            env: buildEnv(),
            timeout: timeoutMs,
            killSignal: 'SIGTERM',
            maxBuffer: config.maxOutputBytes,
            windowsHide: true,
            encoding: 'utf8',
        };
        execFile(CLAN_BIN, [...argv], options, (error, stdout, stderr) => {
            const failure = isExecFailure(error) ? error : null;
            const stdoutText = typeof stdout === 'string' ? stdout : '';
            const stderrText = typeof stderr === 'string' ? stderr : '';
            // execFile only reports an exit code through the error argument: a null
            // error means the command completed successfully with exit code 0.
            const succeeded = failure === null;
            const exitCode = succeeded
                ? 0
                : typeof failure.code === 'number'
                    ? failure.code
                    : null;
            const timedOut = failure !== null && failure.killed === true;
            const overflowed = failure !== null && failure.code === MAX_BUFFER_OVERFLOW;
            const spawnFailed = failure !== null && typeof failure.code === 'string';
            // Server-side diagnostics only: never the argv, stderr, or any path.
            if (failure !== null && exitCode !== 0) {
                console.error(`[clan] ${argv.join(' ')} failed (code=${String(failure.code ?? 'null')}, timeout=${timedOut}, overflow=${overflowed})`);
                if (stderrText.length > 0) {
                    console.error(`[clan stderr] ${stderrText.trim()}`);
                }
            }
            if (overflowed) {
                reject(new ApiError('UPSTREAM_ERROR', 'Clan command produced too much output.'));
                return;
            }
            if (timedOut) {
                reject(new ApiError('TIMEOUT', 'Clan command timed out.'));
                return;
            }
            if (spawnFailed) {
                reject(new ApiError('INTERNAL', 'Clan CLI is not available on the server.'));
                return;
            }
            if (exitCode !== null && exitCode !== 0) {
                // stderr stays on the server; the message is fixed and path-free.
                reject(new ApiError('UPSTREAM_ERROR', 'Clan command failed.'));
                return;
            }
            if (failure !== null) {
                reject(new ApiError('UPSTREAM_ERROR', 'Clan command failed.'));
                return;
            }
            const clampedOut = clampUtf8(stdoutText, config.maxOutputBytes);
            const clampedErr = clampUtf8(stderrText, config.maxOutputBytes);
            resolve({
                ok: exitCode === 0,
                code: exitCode,
                stdout: clampedOut.text,
                stderr: clampedErr.text,
                timedOut: false,
                truncated: clampedOut.truncated || clampedErr.truncated,
            });
        });
    });
}
/**
 * Run an allowlisted `clan` command.
 *
 * Rejects with an ApiError whose code is already part of the public contract:
 * NOT_CONFIGURED, FORBIDDEN, TIMEOUT, UPSTREAM_ERROR or INTERNAL. Messages are
 * fixed strings and never contain stderr, stack traces or filesystem paths.
 */
export async function runClan(args, opts = {}) {
    const command = assertAllowed(args);
    if (config.clanDir === null) {
        throw ApiError.notConfigured('Clan is not configured on this server.');
    }
    const timeoutMs = opts.timeoutMs ?? config.commandTimeoutMs;
    const result = await clanLimiter.run(() => spawnClan(command.argv, timeoutMs));
    if (!result.ok) {
        throw new ApiError('UPSTREAM_ERROR', 'Clan command failed.');
    }
    return result;
}
/**
 * Route-level mapping: keeps a typed ApiError as-is and degrades anything else
 * to an opaque UPSTREAM_ERROR, so nothing unexpected reaches the client.
 */
export function mapClanFailure(error) {
    if (error instanceof ApiError) {
        return error;
    }
    return new ApiError('UPSTREAM_ERROR', 'Clan command failed.');
}
//# sourceMappingURL=exec.js.map