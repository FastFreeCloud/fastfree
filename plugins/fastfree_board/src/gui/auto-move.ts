import { createEffect } from "solid-js"
import type { Context } from "@opencode/plugin/gui"
import { moveCard, taskLinks, type Task } from "./kanban-model"
import type { BoardStore } from "./kanban-storage"
import { retain, type HindsightStore } from "./hindsight"
import { reviewSessions } from "./auto-lifecycle"

/**
 * FastFree automatic lifecycle rules:
 *  - progress → review: every linked session reached idle with outcome "succeeded".
 *  - review   → done:   the review session started by the lifecycle succeeded.
 * Cards with no linked sessions, disconnected servers, or a user-changed status
 * never move. Cards moved into review are written to Hindsight (best effort).
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
    const moved: { card: Task; to: string }[] = []
    for (const card of value.cards) {
      const links = taskLinks(card, fallback())
      if (card.status === "progress") {
        if (links.length === 0 || !links.every(succeeded)) continue
        moved.push({ card: { ...card }, to: "review" })
        continue
      }
      if (card.status === "review") {
        const reviewID = reviewSessions.get(card.id)
        if (!reviewID) continue
        const link = links.find((item) => item.id === reviewID)
        if (!link || !succeeded(link)) continue
        moved.push({ card: { ...card }, to: "done" })
      }
    }
    if (!moved.length) return
    board.update((draft) => {
      for (const source of moved) {
        const current = draft.cards.find((item) => item.id === source.card.id)
        // User re-planned it meanwhile — respect that.
        if (!current || current.status !== source.card.status) continue
        if (!draft.columns.some((column) => column.id === source.to)) {
          console.warn(`[fastfree_board] auto-move skipped: no ${source.to} column on the board`)
          continue
        }
        const index = draft.cards.filter((item) => item.status === source.to).length
        draft.cards = moveCard(draft.cards, source.card.id, source.to, index)
        const done = draft.cards.find((item) => item.id === source.card.id)
        if (done) done.updatedAt = Date.now()
      }
    })
    for (const source of moved) {
      if (source.to === "review") void retain(hindsight, source.card)
      if (source.to === "done") reviewSessions.delete(source.card.id)
    }
  })
}
