import { createEffect } from "solid-js"
import type { Context } from "@opencode/plugin/gui"
import { moveCard, taskLinks, type Task } from "./kanban-model"
import type { BoardStore } from "./kanban-storage"
import type { SessionLauncher } from "./start-session"
import type { SettingsStore } from "./settings.tsx"
import type { SessionModel } from "../session-model.ts"
import { DEFAULT_AUTO_MODEL } from "./settings-model"

export type AutoLifecyclePrefs = {
  /** Start a work session when a card enters `ready`. Default true. */
  autoStart?: boolean
  /** Start a review session when a card enters `review`. Default true. */
  autoReview?: boolean
  /** Promote `backlog` cards to `ready` when there is room. Default true. */
  autoPromote?: boolean
  /** Max cards in `progress` at once. Weak host default: 2. */
  maxConcurrent?: number
  /** Model used for automatic sessions, as `providerID/modelID`. */
  autoModel?: string
}

/**
 * cardId → the review session the lifecycle started. auto-move reads it to
 * finish the review → done transition once that session succeeds.
 */
export const reviewSessions = new Map<string, string>()

/** Parse a `providerID/modelID` string into a session model ref. */
export function parseAutoModel(raw: string | undefined): SessionModel | undefined {
  const value = raw?.trim()
  if (!value) return undefined
  const slash = value.indexOf("/")
  if (slash <= 0) return undefined
  const providerID = value.slice(0, slash)
  const id = value.slice(slash + 1)
  if (!providerID || !id) return undefined
  return { providerID, id }
}

/**
 * Full automatic lifecycle — the columns drive execution end-to-end:
 *   backlog → ready  (autoPromote when progress count < maxConcurrent)
 *   ready   → progress (autoStart opens a work session, then moves the card)
 *   progress → review (auto-move watches linked sessions)
 *   review  → done   (autoReview opens a review session; auto-move completes it)
 *
 * A card is started at most once per column (tracked via `starting`).
 * Failures surface as toasts; they never break the board or the effect.
 */
export function connectAutoLifecycle(
  ctx: Pick<Context, "servers" | "toast">,
  board: BoardStore,
  settings: SettingsStore,
  launch: SessionLauncher,
) {
  const starting = new Set<string>()
  createEffect(() => {
    if (!board.ready() || !settings.ready()) return
    const value = board.value
    if (!value) return
    const prefs = (settings.value ?? {}) as AutoLifecyclePrefs
    const autoStart = prefs.autoStart !== false
    const autoReview = prefs.autoReview !== false
    const autoPromote = prefs.autoPromote !== false
    if (!autoStart && !autoReview && !autoPromote) return
    const model = parseAutoModel(prefs.autoModel) ?? parseAutoModel(DEFAULT_AUTO_MODEL)
    if (!model) return

    // 1. Promote backlog → ready when there is room in progress.
    if (autoPromote) {
      const maxConcurrent = Math.max(1, prefs.maxConcurrent ?? 2)
      const inProgress = value.cards.filter((card) => card.status === "progress").length
      const room = maxConcurrent - inProgress
      const backlog = value.cards.filter((card) => card.status === "backlog")
      const toPromote = backlog.slice(0, Math.max(0, room))
      if (toPromote.length) {
        board.update((draft) => {
          for (const card of toPromote) {
            if (!draft.columns.some((column) => column.id === "ready")) continue
            const current = draft.cards.find((item) => item.id === card.id)
            if (!current || current.status !== "backlog") continue
            const index = draft.cards.filter((item) => item.status === "ready").length
            draft.cards = moveCard(draft.cards, card.id, "ready", index)
            const moved = draft.cards.find((item) => item.id === card.id)
            if (moved) moved.updatedAt = Date.now()
          }
        })
      }
    }

    // 2. Start sessions for ready/review cards.
    for (const card of value.cards) {
      const wantReady = card.status === "ready" && autoStart
      const wantReview = card.status === "review" && autoReview
      if (!wantReady && !wantReview) continue
      if (wantReady && taskLinks(card, "").length > 0) continue
      if (wantReview && reviewSessions.has(card.id)) continue
      if (starting.has(card.id)) continue
      starting.add(card.id)
      void (async () => {
        try {
          const serverID = card.project?.server ?? ctx.servers.list().map((id) => ctx.servers.get(id)).find((server) => server?.connected)?.id
          if (!serverID) throw new Error("No connected server")
          const server = ctx.servers.get(serverID)
          const directory = card.project?.directory ?? server?.data.location.default().directory ?? ""
          if (!directory) throw new Error("No directory available for this task")
          const result = await launch({ server: serverID, directory, model }, card, { open: false })
          if (card.status === "ready") {
            // Move the card into progress as soon as the work session starts.
            board.update((draft) => {
              if (!draft.columns.some((column) => column.id === "progress")) return
              const current = draft.cards.find((item) => item.id === card.id)
              if (!current || current.status !== "ready") return
              const index = draft.cards.filter((item) => item.status === "progress").length
              draft.cards = moveCard(draft.cards, card.id, "progress", index)
              const moved = draft.cards.find((item) => item.id === card.id)
              if (moved) moved.updatedAt = Date.now()
            })
          } else if (card.status === "review") {
            reviewSessions.set(card.id, result.session_id)
          }
        } catch (error) {
          ctx.toast.show({ title: "Auto-lifecycle", description: error instanceof Error ? error.message : String(error), variant: "error" })
        } finally {
          starting.delete(card.id)
        }
      })()
    }
  })
}
