import type { ComposerPill, Context, MountedSession } from "@opencode/plugin/gui"
import { useBoardLang } from "./lang"
import { columnTitle, taskIsRunning, taskLinks, type Task } from "./kanban-model"
import type { BoardStore } from "./kanban-storage"

/**
 * Composer pill: visible only for a session that tracks >= 1 running board task,
 * so it never clutters an unrelated session. Clicking (or picking a row) opens the board.
 */
export function BoardPill(ctx: Context, board: BoardStore): ComposerPill {
  const { t, plural } = useBoardLang(ctx)

  const isRunning = (task: Task, session: MountedSession) =>
    taskIsRunning(task, (id, serverID) => {
      const server = ctx.servers.get(serverID)
      return server?.connected ? server.data.session.status(id) : undefined
    }, true, session.server.id)

  return {
    id: "running",
    order: 10,
    show(input) {
      const session = input.session as MountedSession
      const store = board.value
      if (!store) return undefined
      const linked = store.cards.filter((card) =>
        taskLinks(card, session.server.id).some((link) => link.server === session.server.id && link.id === session.id),
      )
      const active = linked.filter((card) => isRunning(card, session))
      if (!active.length) return undefined
      const colTitle = (id: string) => {
        const column = store.columns.find((item) => item.id === id)
        return column ? columnTitle(column, t) : id
      }
      const open = () => void ctx.layout.open(`${ctx.id}:kanban`, session, { tab: "select" })
      return {
        icon: "checklist",
        label: plural("boardCards", active.length),
        tone: "warning",
        title: t("board"),
        rows: active.slice(0, 3).map((card) => ({
          id: card.id,
          label: card.title.slice(0, 80),
          icon: "task" as const,
          tone: "warning" as const,
          detail: colTitle(card.status),
          run: open,
        })),
        run: open,
      }
    },
  }
}
