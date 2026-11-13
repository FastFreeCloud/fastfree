import { createEffect, onCleanup, untrack } from "solid-js"
import type { Context } from "@opencode/plugin/gui"
import { BoardBridge } from "../rpc.ts"
import { applyBoardRequest, type BoardRequest } from "../board-tools.ts"
import type { BoardStore } from "./kanban-storage.ts"
import type { SessionLauncher } from "./start-session.ts"
import { waitForTask } from "./board-wait.ts"
import type { SettingsStore } from "./settings.tsx"
import { recallSection, retain, type HindsightStore } from "./hindsight"

/** A single board operation must never hang the GUI: fail it instead of wedging the queue. */
const RESPONSE_TIMEOUT_MS = 45_000

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (cause) => { clearTimeout(timer); reject(cause) },
    )
  })
}

export function connectBoardTools(ctx: Context, board: BoardStore, launch: SessionLauncher, settings: SettingsStore, hindsight: HindsightStore) {
  const clientID = crypto.randomUUID()
  createEffect(() => {
    const servers = ctx.servers.list().map((id) => ctx.servers.get(id)).filter((server) => server?.connected)
    const controller = new AbortController()
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const waits = new Map<string, AbortController>()
    // Liveness heartbeat: keeps the server's "Desktop is alive" clock fresh even before the
    // board store is ready, so agents fail fast instead of waiting out the full timeout.
    const beat = setInterval(() => {
      for (const server of servers) {
        if (!server) continue
        try { void server.client.rpc(BoardBridge).heartbeat({ clientID }) } catch { /* server reload */ }
      }
    }, 2_000)
    timers.add(beat as unknown as ReturnType<typeof setTimeout>)
    onCleanup(() => {
      controller.abort()
      timers.forEach((timer) => clearTimeout(timer))
      waits.forEach((wait) => wait.abort(new Error("Desktop bridge disconnected")))
    })
    if (!board.ready() || !settings.ready()) return
    for (const server of servers) {
      if (!server) continue
      let lastFailure: string | undefined
      const poll = async () => {
        let stage = "poll"
        try {
          const rpc = server.client.rpc(BoardBridge)
          const delivery = await rpc.poll({ clientID, toolsEnabled: untrack(() => settings.value?.toolsEnabled ?? true) }, { signal: controller.signal }) as { id: string; request: BoardRequest } | { cancel: string } | null
          if (controller.signal.aborted) return
          if (delivery && "cancel" in delivery) waits.get(delivery.cancel)?.abort(new Error("Board wait cancelled"))
          else if (delivery) {
            const waitController = delivery.request.operation === "wait" ? new AbortController() : undefined
            const respondInner = async (): Promise<unknown> => {
              if (!board.value) throw new Error("Board storage is not ready")
              if (settings.value?.toolsEnabled === false) throw new Error("Board agent tools are disabled in Settings.")
              const request = delivery.request
              if (request.operation === "wait") {
                const task = board.value.cards.find((card) => card.id === request.input.task_id)
                if (!task) throw new Error(`Unknown task: ${request.input.task_id}`)
                return await waitForTask(ctx, task, request, server.id, waitController!.signal)
              }
              if (request.operation === "start_session") {
                if (request.input.open !== undefined && typeof request.input.open !== "boolean") throw new Error("Invalid open")
                const task = board.value.cards.find((card) => card.id === request.input.task_id)
                if (!task) throw new Error(`Unknown task: ${request.input.task_id}`)
                if (!request.directory) throw new Error("The calling session's directory is unavailable")
                if (!request.model?.id || !request.model.providerID) throw new Error("The calling session's model is unavailable")
                return await launch({ server: server.id, directory: request.directory, model: request.model }, task, { open: request.input.open === true, focus: false })
              }
              let applied = applyBoardRequest(board.value, request, server.id)
              // Create returns to the agent immediately (the Hindsight recall costs ~13s,
              // longer than the RPC budget). The card is enriched in the background — same
              // fire-and-forget pattern as newTaskDialog — and board.set applies it whenever ready.
              if (request.operation === "create") {
                const created = applied.result as { id: string; title: string; description?: string }
                void (async () => {
                  try {
                    const section = await recallSection(hindsight, `${created.title}\n${created.description ?? ""}`)
                    if (!section) return
                    const before = (created.description ?? "").replace(/\s+$/, "")
                    const update: BoardRequest = { operation: "update", input: { task_id: created.id, description: `${before}\n\n${section}` }, sessionID: request.sessionID }
                    const current = board.value
                    if (!current) return
                    const enriched = applyBoardRequest(current, update, server.id)
                    if (enriched.board !== current) board.set(enriched.board)
                  } catch (recallError) {
                    console.warn("[fastfree_board] Hindsight recall on create failed", recallError instanceof Error ? recallError.message : recallError)
                  }
                })()
              }
              if (applied.board !== board.value) board.set(applied.board)
              // Agent-driven move into review/done also persists a compact memory (best effort).
              if (request.operation === "move" && (request.input.column_id === "review" || request.input.column_id === "done")) {
                const moved = applied.result as { id: string; title: string; description?: string }
                void retain(hindsight, { id: moved.id, title: moved.title, description: moved.description ?? "" })
              }
              return applied.result
            }
            // The poll loop never waits for a response: a slow `start_session` or a stuck
            // `wait` must not stop the GUI from claiming the next request. The queue's
            // one-in-flight rule still serialises writes.
            if (waitController) waits.set(delivery.id, waitController)
            void (async () => {
              let result: unknown
              let error: string | undefined
              try {
                result = await withTimeout(respondInner(), RESPONSE_TIMEOUT_MS, "Board operation timed out")
              } catch (cause) {
                error = cause instanceof Error ? cause.message : String(cause)
              }
              stage = "complete"
              await rpc.complete({ clientID, id: delivery.id, ...(error === undefined ? { result: JSON.parse(JSON.stringify(result)) } : { error }) })
            })().catch((error) => console.warn("Board tool response failed", { server: server.id, stage, error: String(error) })).finally(() => waits.delete(delivery.id))
          }
          lastFailure = undefined
        } catch (cause) {
          // Server/plugin reloads and disconnected servers are retried, never replaying a delivered mutation.
          if (controller.signal.aborted) return
          const message = cause && typeof cause === "object" && "message" in cause ? String(cause.message) : String(cause)
          const failure = `${stage}: ${message}`
          if (failure !== lastFailure) console.warn("Board tool bridge RPC failed", { server: server.id, stage, error: message })
          lastFailure = failure
        } finally {
          if (!controller.signal.aborted) {
            const timer = setTimeout(() => { timers.delete(timer); void poll() }, 500)
            timers.add(timer)
          }
        }
      }
      void poll()
    }
  })

}
