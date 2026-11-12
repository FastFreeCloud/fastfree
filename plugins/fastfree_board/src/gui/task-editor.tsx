import { Show, createSignal, type JSX } from "solid-js"
import { usePlugin } from "@opencode/plugin/gui"
import { columnTitle, projectTitle, type Column, type Status, type Task, type TaskProject } from "./kanban-model"
import { useBoardLang } from "./lang"

export type TaskFields = Pick<Task, "title" | "description" | "labels" | "status" | "project">
export type DescriptionInput = { readonly value: string; readonly loading: boolean; onInput(value: string): void }

export function TaskEditor(props: { existing?: Task; initialTitle?: string; description?: DescriptionInput; columns: readonly Column[]; projects: readonly TaskProject[]; project?: TaskProject; status: Status; children?: JSX.Element; cancel(): void; save(fields: TaskFields): void }) {
  const ctx = usePlugin()
  const ui = ctx.ui
  const { t } = useBoardLang(ctx)
  const colTitle = (column: Pick<Column, "id" | "title">) => columnTitle(column, t)
  const statusColumn = () => props.columns.find((column) => column.id === status())
  const [title, setTitle] = createSignal(props.existing?.title ?? props.initialTitle ?? "")
  const [localDescription, setDescription] = createSignal(props.existing?.description ?? "")
  const description = () => props.description?.value ?? localDescription()
  const generating = () => props.description?.loading ?? false
  const [labels, setLabels] = createSignal(props.existing?.labels ?? "")
  const [status, setStatus] = createSignal(props.existing?.status ?? props.status)
  const [project, setProject] = createSignal<TaskProject | undefined>(props.existing ? props.existing.project : props.project)
  const [preview, setPreview] = createSignal(false)
  return <form class="sc-task-editor" onSubmit={(event) => {
    event.preventDefault()
    if (title().trim() && !generating()) props.save({ title: title().trim(), description: description().trim(), labels: labels().trim(), status: status(), project: project() })
  }}>
    <div class="sc-editor-field"><span>{t("title")}</span><ui.TextInput class="sc-kanban-input" label={t("title")} value={title()} onInput={setTitle} placeholder={t("whatNeedsDone")} autofocus /></div>
    <div class="sc-editor-field"><span>{t("status")}</span><ui.Menu label={statusColumn() ? colTitle(statusColumn()!) : t("chooseColumn")} trigger="button" items={props.columns.map((column) => ({ label: colTitle(column), onSelect: () => setStatus(column.id) }))} /></div>
    <div class="sc-editor-field"><span>{t("project")}</span><ui.Menu label={project() ? projectTitle(project()!) : t("noProject")} trigger="button" items={[
      { label: t("noProject"), onSelect: () => setProject(undefined) },
      ...props.projects.map((item) => ({ label: projectTitle(item), onSelect: () => setProject(item) })),
    ]} /></div>
    <div class="sc-editor-field"><div class="sc-description-heading"><span>{t("description")}</span><div class="sc-actions"><ui.Button size="small" disabled={generating()} variant={preview() ? "ghost-muted" : "neutral"} onClick={() => setPreview(false)}>{t("write")}</ui.Button><ui.Button size="small" disabled={generating()} variant={preview() ? "neutral" : "ghost-muted"} onClick={() => setPreview(true)}>{t("preview")}</ui.Button></div></div>
      <Show when={preview() && !generating()} fallback={<textarea aria-label={t("description")} aria-busy={generating()} disabled={generating()} value={description()} onInput={(event) => props.description ? props.description.onInput(event.currentTarget.value) : setDescription(event.currentTarget.value)} placeholder={generating() ? t("generating") : t("descriptionPlaceholder")} />}><div class="sc-markdown-preview"><Show when={description()} fallback={<p>{t("nothingToPreview")}</p>}><ui.Markdown text={description()} /></Show></div></Show>
    </div>
    <div class="sc-editor-field"><span>{t("labels")}</span><ui.TextInput class="sc-kanban-input" label={t("labels")} value={labels()} onInput={setLabels} placeholder={t("labelsPlaceholder")} /></div>
    {props.children}
    <div class="sc-editor-actions"><ui.Button type="button" onClick={props.cancel}>{t("cancel")}</ui.Button><ui.Button type="submit" variant="contrast" disabled={generating() || !title().trim() || !props.columns.some((column) => column.id === status())}>{t("saveTask")}</ui.Button></div>
  </form>
}
