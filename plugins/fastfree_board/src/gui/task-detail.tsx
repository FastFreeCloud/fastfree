import { For, Show, createSignal, onMount } from "solid-js"
import { usePlugin, type MountedSession } from "@opencode/plugin/gui"
import { useBoardLang } from "./lang"
import { columnTitle, projectTitle, taskLabels, taskLinks, type Column, type Status, type Task, type SessionLink } from "./kanban-model"
import { TaskMarkdown } from "./task-markdown-view"

export function TaskDetail(props: {
  task: Task; session: MountedSession; columns: readonly Column[]
  close(): void; edit(): void; remove(): void; move(status: Status): void; start(): Promise<void>
  update(fields: Partial<Pick<Task, "description" | "session" | "sessions" | "links">>): void
}) {
  const ctx = usePlugin()
  const { t, intlLocale } = useBoardLang(ctx)
  const colTitle = (column: Pick<Column, "id" | "title">) => columnTitle(column, t)
  const ui = ctx.ui
  const [starting, setStarting] = createSignal(false)
  const linked = () => taskLinks(props.task, props.session.server.id)
  const linkedTitle = (link: SessionLink) => ctx.servers.get(link.server)?.data.session.list()
    .find((session) => session.id === link.id)?.title || t("sessionFallback", { id: link.id })
  const setLinks = (links: SessionLink[]) => props.update({ session: "", sessions: [], links })
  const currentLinked = () => linked().some((link) => link.id === props.session.id && link.server === props.session.server.id)
  let element: HTMLElement | undefined
  onMount(() => element?.focus())
  return <aside ref={element} tabIndex={-1} class="sc-task-detail" aria-label={t("taskDetailsTitle", { title: props.task.title })} onKeyDown={(event) => {
    if (event.key === "Escape" && !event.defaultPrevented) { event.stopPropagation(); props.close() }
  }}>
    <header class="sc-detail-toolbar"><span>{t("taskDetails")}</span><div class="sc-actions">
      <ui.Tooltip value={t("closeTaskDetails")}><ui.IconButton icon="close" label={t("closeTaskDetails")} variant="ghost" onClick={props.close} /></ui.Tooltip>
    </div></header>
    <div class="sc-detail-body">
      <div class="sc-detail-summary">
        <div class="sc-detail-title"><h2>{props.task.title}</h2><div class="sc-actions"><ui.Tooltip value={t("editTask")}><ui.IconButton icon="edit" label={t("editTask")} variant="ghost" onClick={props.edit} /></ui.Tooltip><span class="sc-detail-remove"><ui.Tooltip value={t("removeTask")}><ui.IconButton icon="trash" label={t("removeTask")} variant="ghost" onClick={props.remove} /></ui.Tooltip></span></div></div>
        <div class="sc-detail-meta"><ui.Menu label={props.columns.find((column) => column.id === props.task.status) ? colTitle(props.columns.find((column) => column.id === props.task.status)!) : t("chooseColumn")} trigger="button" items={props.columns.map((column) => ({ label: colTitle(column), disabled: column.id === props.task.status, onSelect: () => props.move(column.id) }))} />
          <div class="sc-task-labels"><For each={taskLabels(props.task.labels)}>{(label) => <span>{label}</span>}</For></div>
        </div>
        <div class="sc-detail-info">
          <span title={props.task.project?.directory}>{props.task.project ? t("project") + ": " + projectTitle(props.task.project) : t("noProjectHint")}</span>
          <Show when={props.task.updatedAt}><time dateTime={new Date(props.task.updatedAt!).toISOString()} title={new Date(props.task.updatedAt!).toLocaleString(intlLocale())}>{t("updatedAt", { date: new Date(props.task.updatedAt!).toLocaleDateString(intlLocale()) })}</time></Show>
        </div>
      </div>
      <section class="sc-detail-section"><h3>{t("description")}</h3><Show when={props.task.description} fallback={<p>{t("noDescription")}</p>}><TaskMarkdown text={props.task.description} update={(description) => props.update({ description })} /></Show></section>
      <section class="sc-detail-section"><h3>{t("linkedSessions")}</h3><p>{t("linkedSessionsHint")}</p>
        <For each={linked()}>{(link) => <div class="sc-linked-session">
          <ui.Tooltip value={t("openSession", { title: linkedTitle(link) })}><ui.Button size="small" icon="arrow-up-right" aria-label={t("openSession", { title: linkedTitle(link) })} onClick={() => ctx.tabs.open(link, { focus: true })}><span class="sc-linked-session-title">{linkedTitle(link)}</span></ui.Button></ui.Tooltip>
          <ui.Tooltip value={t("unlinkSessionFromTask")}><ui.IconButton icon="close" label={t("unlinkSession", { title: linkedTitle(link) })} size="small" variant="ghost" onClick={() => setLinks(linked().filter((item) => item.id !== link.id || item.server !== link.server))} /></ui.Tooltip>
        </div>}</For>
        <div class="sc-actions"><ui.Button size="small" icon="new-session" busy={starting()} onClick={async () => {
          setStarting(true)
          try { await props.start() } finally { setStarting(false) }
        }}>{t("startSession")}</ui.Button>
          <ui.Button size="small" icon="link" disabled={currentLinked()} onClick={() => { if (!currentLinked()) setLinks([...linked(), { id: props.session.id, server: props.session.server.id }]) }}>{t("linkCurrentSession")}</ui.Button>
        </div>
      </section>
    </div>
  </aside>
}
