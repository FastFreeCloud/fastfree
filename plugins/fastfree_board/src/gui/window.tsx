import { createEffect } from "solid-js"
import { useBoardLang } from "./lang"
import { Command, ComposerPill, MenuItem, Panel, SettingsPage, Slot, Style, type PanelTab, type Plugin, type ClosedPanelTab } from "@opencode/plugin/gui"
import { BoardShortcut } from "./board-shortcut"
import { Kanban } from "./kanban"
import { BoardPill } from "./board-pill"
import { sessionLauncher, sessionStarter } from "./start-session"
import { globalBoard } from "./kanban-storage"
import { connectBoardTools } from "./board-bridge"
import { connectAutoMove } from "./auto-move"
import { connectAutoLifecycle } from "./auto-lifecycle"
import { hindsightSettings, hindsightTransportFromServers, bindHindsightTransport } from "./hindsight"
import { BoardSettings, boardSettings, boardSettingsPage } from "./settings"
import { newTaskDialog } from "./new-task-dialog"
import { BoardViewSchema } from "./kanban-model"
import css from "./kanban.css?inline"

export const setup: Plugin.Setup = (ctx) => {
  const { t } = useBoardLang(ctx)
  const board = globalBoard(ctx)
  const settings = boardSettings(ctx)
  const hindsight = hindsightSettings(ctx)
  const launch = sessionLauncher(ctx, board)
  connectAutoMove(ctx, board, hindsight)
  connectAutoLifecycle(ctx, board, settings, launch)
  connectBoardTools(ctx, board, launch, settings, hindsight)
  // Route GUI memory traffic through the plugin server part (the renderer cannot reach the local daemon).
  // Depend on the same storage readiness signals as connectBoardTools: they flip once the stores finish
  // loading, which re-runs this effect at a point where servers are known to be connected.
  createEffect(() => {
    if (!board.ready() || !settings.ready() || !hindsight.ready()) return
    const servers = ctx.servers.list().map((id) => ctx.servers.get(id)).filter((server) => server?.connected)
    bindHindsightTransport(hindsightTransportFromServers(servers))
  })
  const start = sessionStarter(ctx, board, launch)
  const createTask = newTaskDialog(ctx, board, hindsight)
  const open = () => {
    const session = ctx.sessions.current()
    if (session) ctx.layout.open(`${ctx.id}:kanban`, session, { tab: "select" })
  }
  // Same document as Settings → Layout; independent store handle shares it.
  const view = ctx.storage.store("kanban-view-v2", {
    schema: BoardViewSchema, initial: { collapsed: [], mode: "overlay" }, scope: "global",
    from: "plugin.opencode-desktop-showcase.kanban-view-v2",
  })
  const cycleLayout = () => view.update((draft) => { draft.mode = draft.mode === "list" ? "split" : "list" })

  ctx.add(Style, css)
  ctx.add(SettingsPage, (): SettingsPage => ({
    id: boardSettingsPage, title: t("board"), icon: "checklist",
    entries: [{ id: "tools", title: t("enableAgentTools"), keywords: "board tasks kanban tools agents لوحة مهام كانبان أدوات وكلاء" }, { id: "hindsight", title: t("hindsightTitle"), keywords: "hindsight memory ذاكرة" }],
    render: () => <BoardSettings settings={settings} hindsight={hindsight} />,
  }))
  ctx.add(Command, (): Command => ({
    id: "kanban", title: t("board"), keywords: "open tasks board project kanban global لوحة مهام مشاريع",
    featured: true, enabled: !!ctx.sessions.current(), slash: { name: "board" }, bind: "mod+shift+b", run: open,
  }))
  ctx.add(Command, (): Command => ({
    id: "layout", title: t("toggleBoardLayout"), keywords: "layout list split board-layout board قائمة نمط عرض كانبان",
    enabled: view.ready(), slash: { name: "board-layout" }, bind: "mod+shift+l",
    run: cycleLayout,
  }))

  const tab: PanelTab = { id: "kanban", get title() { return "FastFree Board" }, closable: "compact", fallback: true }
  ctx.add(Panel, {
    id: "kanban", region: "side", wide: true,
    list: (input) => input.open.includes("kanban") ? [tab] : [],
    render: (props) => <Kanban session={props.session} board={board} start={(task) => start(props.session, task)} openSettings={() => ctx.layout.settings(boardSettingsPage)} />,
    closed: (): ClosedPanelTab => ({ icon: "checklist", title: t("board") }),
    restore: (): undefined => undefined,
  })
  ctx.add(MenuItem, (): MenuItem => {
    const session = ctx.sessions.current()
    return {
      menu: "session.panel", id: "kanban", title: t("board"), icon: "layout-right", keybind: `${ctx.id}.kanban`,
      opened: !!session && ctx.layout.state(`${ctx.id}:kanban`, session) !== "closed", run: open,
    }
  })
  ctx.add(Slot, {
    at: "session.header",
    render: (props) => <BoardShortcut session={props.session} board={board} createTask={(linked) => createTask(props.session, linked)} />,
  })
  ctx.add(ComposerPill, BoardPill(ctx, board))
}
