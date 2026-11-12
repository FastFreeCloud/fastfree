import { For, Show, createMemo } from "solid-js"
import { usePlugin } from "@opencode/plugin/gui"
import { projectTitle, taskLabels, taskLinks, type Column, type Task } from "./kanban-model"
import { checklistItems, markdownExcerpt } from "./task-markdown"
import { useBoardLang } from "./lang"

/**
 * List canvas for the board (mode: "list"). Rows stay grouped by column so the
 * board semantics are identical to the kanban view; clicking a row opens the
 * same detail panel used everywhere else.
 */
export function ListView(props: {
  columns: readonly Column[]
  cards: readonly Task[]
  colTitle(column: Pick<Column, "id" | "title">): string
  running(card: Task): boolean
  selectedId?: string
  emptyMessage: string
  addTask(status: string): void
  addTaskLabel(title: string): string
  open(card: Task): void
}) {
  const ctx = usePlugin()
  const ui = ctx.ui
  const { t, plural, dir, intlLocale } = useBoardLang(ctx)
  const groups = createMemo(() => props.columns
    .map((column) => ({ column, rows: props.cards.filter((card) => card.status === column.id) }))
    .filter((group) => group.rows.length > 0))

  return (
    <div class="sc-list" role="list">
      <Show when={props.cards.length === 0}>
        <div class="sc-empty-column">{props.emptyMessage}</div>
      </Show>
      <For each={groups()}>{(group) => (
        <section class="sc-list-group" aria-label={props.colTitle(group.column)}>
          <header class="sc-list-group-head">
            <span class="sc-list-dot" style={{ background: group.column.color }} aria-hidden="true" />
            <span class="sc-list-group-title">{props.colTitle(group.column)}</span>
            <span class="sc-list-count">{group.rows.length}</span>
            <button type="button" class="sc-list-add" aria-label={props.addTaskLabel(props.colTitle(group.column))} onClick={() => props.addTask(group.column.id)}>
              <ui.Icon name="plus" size="small" />
            </button>
          </header>
          <div class="sc-list-rows">
            <For each={group.rows}>{(card) => <ListRow
              card={card}
              running={props.running(card)}
              selected={props.selectedId === card.id}
              onOpen={() => props.open(card)}
              dir={dir()}
              intlLocale={intlLocale()}
              t={t}
              plural={plural}
            />}</For>
          </div>
        </section>
      )}</For>
    </div>
  )
}

function ListRow(props: {
  card: Task
  running: boolean
  selected: boolean
  onOpen(): void
  dir: "rtl" | "ltr"
  intlLocale: string
  t(key: string, params?: Record<string, string | number>): string
  plural(key: string, count: number): string
}) {
  const ctx = usePlugin()
  const ui = ctx.ui
  const items = createMemo(() => checklistItems(props.card.description))
  const excerpt = createMemo(() => markdownExcerpt(props.card.description))
  const labels = () => taskLabels(props.card.labels)
  const links = () => taskLinks(props.card, "")
  const done = () => items().filter((item) => item.checked).length
  const updated = () => props.card.updatedAt ? new Date(props.card.updatedAt) : undefined

  return (
    <button type="button" class="sc-list-row" role="listitem"
      data-selected={props.selected}
      data-active={props.running}
      aria-current={props.selected ? "true" : undefined}
      onClick={props.onOpen}>
      <span class="sc-list-bar" style={{ background: props.running ? "var(--ff-accent)" : "transparent" }} aria-hidden="true" />
      <span class="sc-list-main">
        <span class="sc-list-top">
          <span class="sc-list-title">{props.card.title}</span>
          <Show when={props.running}><span class="sc-list-live" title={props.t("activeSession")}><span class="sc-list-live-dot" aria-hidden="true" />{props.t("activeSession")}</span></Show>
        </span>
        <Show when={excerpt()}><span class="sc-list-excerpt">{excerpt()}</span></Show>
        <span class="sc-list-meta">
          <Show when={props.card.project}>{(project) => <span class="sc-list-chip sc-list-chip-project" title={project().directory}><ui.Icon name="folder" size="small" />{projectTitle(project())}</span>}</Show>
          <For each={labels().slice(0, 3)}>{(label) => <span class="sc-list-chip">{label}</span>}</For>
          <Show when={items().length}><span class="sc-list-chip sc-list-chip-checklist" title={props.t("checklistProgress")}><ui.Icon name="checklist" size="small" />{done()}/{items().length}</span></Show>
          <Show when={links().length}>{(count) => <span class="sc-list-chip" title={props.plural("linkedSession", count())} aria-label={props.plural("linkedSession", count())}><ui.Icon name="link" size="small" />{count()}</span>}</Show>
          <Show when={updated()}><time class="sc-list-date" title={updated()!.toLocaleString(props.intlLocale)}>{updated()!.toLocaleDateString(props.intlLocale, { month: "short", day: "numeric" })}</time></Show>
        </span>
      </span>
      <span class="sc-list-chevron" aria-hidden="true">
        <ui.Icon name={props.dir === "rtl" ? "chevron-left" : "chevron-right"} size="small" />
      </span>
    </button>
  )
}
