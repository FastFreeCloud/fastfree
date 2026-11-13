export type Delivery = { id: string; request: unknown }
export type BridgeStatus = { lastSeen: number; pending: number; owned: number; completed: number }

type Pending = Delivery & {
  owner?: string
  concurrent: boolean
  claimedAt?: number
  resolve(value: unknown): void
  reject(error: Error): void
}

export type RequestOptions = {
  /** Deliver concurrently with other requests (long-running reads such as `wait`). */
  concurrent?: boolean
  /** Per-request timeout in ms. Defaults to the queue timeout. */
  timeout?: number
  /** Dedupe retries of the same logical write: a repeated key returns the cached result. */
  idempotencyKey?: string
}

const MAX_COMPLETED = 200

/**
 * Transport between the OpenCode server (agents) and the Desktop GUI.
 *
 * Robustness contract:
 *  - A request is delivered to exactly one window at a time (`owner`), so writes never run twice.
 *  - A claim is leased: a window that claims a request and then goes silent releases it after
 *    `leaseMs`, so one stuck window cannot wedge the whole board.
 *  - Any window may poll (no leader gate); the `owner` flag is the single source of truth.
 *  - `status()`/`heartbeat()` let agents distinguish "Desktop is closed" from "Desktop is busy".
 *  - Failed requests are never redelivered; the caller re-reads the board before retrying.
 */
export function bridgeQueue(timeout = 60_000, leaseMs = 30_000) {
  const pending = new Map<string, Pending>()
  const completed = new Map<string, { result: unknown }>()
  const cancellations = new Map<string, string[]>()
  let seen = 0
  let reaper: ReturnType<typeof setInterval> | undefined

  const status = (): BridgeStatus => ({
    lastSeen: seen,
    pending: pending.size,
    owned: [...pending.values()].filter((item) => item.owner).length,
    completed: completed.size,
  })

  const ensureReaper = () => {
    if (reaper) return
    reaper = setInterval(() => {
      const now = Date.now()
      for (const item of pending.values()) {
        if (item.owner && !item.concurrent && item.claimedAt !== undefined && now - item.claimedAt > leaseMs) {
          // Release a stale claim so another window can finish the request.
          item.owner = undefined
          item.claimedAt = undefined
        }
      }
      if (pending.size === 0) {
        clearInterval(reaper)
        reaper = undefined
      }
    }, 1_000)
    // Never keep the host process alive just for the reaper.
    ;(reaper as { unref?: () => void }).unref?.()
  }

  return {
    poll(clientID: string): Delivery | { cancel: string } | null {
      const cancelled = cancellations.get(clientID)?.shift()
      if (cancelled) {
        if (!cancellations.get(clientID)?.length) cancellations.delete(clientID)
        return { cancel: cancelled }
      }
      seen = Date.now()
      // Release stale claims so a silent window cannot wedge the board.
      for (const item of pending.values()) {
        if (item.owner && !item.concurrent && item.claimedAt !== undefined && seen - item.claimedAt > leaseMs) {
          item.owner = undefined
          item.claimedAt = undefined
        }
      }
      // One in flight across windows; writes must never run twice.
      if ([...pending.values()].some((item) => item.owner && !item.concurrent)) return null
      const item = [...pending.values()].find((item) => !item.owner)
      if (!item) return null
      item.owner = clientID
      item.claimedAt = seen
      ensureReaper()
      return { id: item.id, request: item.request }
    },
    complete(clientID: string, id: string, result: unknown, error?: string) {
      const item = pending.get(id)
      if (!item || item.owner !== clientID) return
      pending.delete(id)
      if (error !== undefined) item.reject(new Error(error))
      else item.resolve(result)
    },
    async request(request: unknown, signal: AbortSignal, options: RequestOptions = {}): Promise<unknown> {
      if (signal.aborted) throw new Error("Board request cancelled")
      if (options.idempotencyKey) {
        const cached = completed.get(options.idempotencyKey)
        if (cached) return cached.result
      }
      if (Date.now() - seen > 5_000) throw new Error("Open OpenCode Desktop with fastfree_board enabled and connected to this server to use board tools.")
      if (pending.size >= 100) throw new Error("Too many pending board requests; try again shortly.")
      const id = crypto.randomUUID()
      let timer: ReturnType<typeof setTimeout> | undefined
      let abort: () => void = () => {}
      try {
        const result = await new Promise((resolve, reject) => {
          const cancel = (reason: string) => {
            const owner = pending.get(id)?.owner
            const delivered = !!owner
            if (owner && options.concurrent) {
              const items = cancellations.get(owner) ?? []
              cancellations.set(owner, [...items.slice(-99), id])
            }
            pending.delete(id)
            reject(new Error(delivered && !options.concurrent ? `${reason}. The request was delivered and may have been applied; read the board before retrying.` : reason))
          }
          abort = () => cancel("Board request cancelled")
          pending.set(id, { id, request, concurrent: options.concurrent ?? false, resolve, reject })
          signal.addEventListener("abort", abort, { once: true })
          timer = setTimeout(() => cancel("Desktop did not answer the board request"), options.timeout ?? timeout)
        })
        if (options.idempotencyKey) {
          completed.set(options.idempotencyKey, { result })
          if (completed.size > MAX_COMPLETED) {
            const oldest = completed.keys().next().value
            if (oldest !== undefined) completed.delete(oldest)
          }
        }
        return result
      } finally {
        clearTimeout(timer)
        signal.removeEventListener("abort", abort)
        pending.delete(id)
      }
    },
    status,
    heartbeat(clientID: string) {
      seen = Date.now()
      return { ok: true, clientID, ...status() }
    },
  }
}
