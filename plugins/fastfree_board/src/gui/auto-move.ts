import { createEffect } from "solid-js"
import type { Context } from "@opencode/plugin/gui"
import { moveCard, taskLinks, type Task } from "./kanban-model"
import type { BoardStore } from "./kanban-storage"
import { retain, type HindsightStore } from "./hindsight"

/**
 * FastFree rule: a card in "progress" whose linked sessions have all reached
 * idle with outcome "succeeded" moves automatically to "review". The moved
 * cards are also written to Hindsight as one memory per task (best effort).
 * Cards with no linked sessions, disconnected servers, or a user-changed
 * status never move.
 */
export function connectAutoMove(ctx: Pick<Context, "servers" | "sessions">, board: BoardStore, hindsight: HindsightStore) {
  const fallback = () => ctx.sessions.current()?.server.id ?? ""
  const succeeded = (link: { id: string; server: string }) => {
    const server = ctx.servers.get(link.server)
    if (!server?.connected) return false
    if (server.data.session.status(link.id) !== "idle") return false
    const idle = server.data.session.message.list(link.id).findLast((message) => message.type === "idle")
    if (!idle) {
      // Session finished before this window synced; ask the host to sync, then decide next trigger.
      void Promise.resolve(server.data.session.message.sync(link.id)).catch(() => {})
      return false
    }
    return idle.outcome === "succeeded"
  }

  createEffect(() => {
    if (!board.ready()) return
    const value = board.value
    if (!value) return
    const moved: Task[] = []
    for (const card of value.cards) {
      if (card.status !== "progress") continue
      const links = taskLinks(card, fallback())
      if (links.length === 0 || !links.every(succeeded)) continue
      moved.push({ ...card })
    }
    if (!moved.length) return
    board.update((draft) => {
      if (!draft.columns.some((column) => column.id === "review")) {
        console.warn("[fastfree_board] auto-move skipped: no review column on the board")
        return
      }
      for (const source of moved) {
        const current = draft.cards.find((item) => item.id === source.id)
        if (current?.status !== "progress") continue // user re-planned it meanwhile — respect that
        const index = draft.cards.filter((item) => item.status === "review").length
        draft.cards = moveCard(draft.cards, source.id, "review", index)
        const done = draft.cards.find((item) => item.id === source.id)
        if (done) done.updatedAt = Date.now()
      }
    })
    for (const card of moved) void retain(hindsight, card)
  })
}
