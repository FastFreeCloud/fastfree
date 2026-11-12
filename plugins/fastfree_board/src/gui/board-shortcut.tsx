import { usePlugin, type MountedSession } from "@opencode/plugin/gui"
import { useBoardLang } from "./lang"
import { FastFreeMark } from "./brand-mark"
import type { BoardStore } from "./kanban-storage"

export function BoardShortcut(props: { session: MountedSession; board: BoardStore; createTask(linked: boolean): void }) {
  const ctx = usePlugin()
  const { t, plural } = useBoardLang(ctx)
  const ui = ctx.ui
  const count = () => props.board.ready() ? props.board.value?.cards.length : undefined
  const label = () => count() === undefined ? t("board") : plural("boardCards", count()!)

  return <span class="sc-root sc-board-shortcut" role="presentation">
    <ui.Tooltip value={label()}>
      <button type="button" class="ff-board-launcher" aria-label={label()} onClick={() => ctx.layout.open(`${ctx.id}:kanban`, props.session, { tab: "select" })}>
        <FastFreeMark size={27} bare />
      </button>
    </ui.Tooltip>
  </span>
}
