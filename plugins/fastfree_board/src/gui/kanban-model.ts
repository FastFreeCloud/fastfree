import { Schema } from "effect"

export const columns = [
  { id: "backlog", title: "Backlog", color: "var(--v2-icon-icon-muted)" },
  { id: "ready", title: "Ready", color: "var(--v2-state-fg-info)" },
  { id: "progress", title: "In progress", color: "var(--v2-state-fg-warning)" },
  { id: "review", title: "Review", color: "var(--v2-text-text-accent)" },
  { id: "done", title: "Done", color: "var(--v2-state-fg-success)" },
  { id: "kanban", title: "Kanban", color: "#8b5cf6" },
  { id: "hindsight", title: "Hindsight", color: "#06b6d4" },
] as const

export const TaskProjectSchema = Schema.Struct({ server: Schema.String, directory: Schema.String, name: Schema.optional(Schema.String) })
export type TaskProject = typeof TaskProjectSchema.Type
export const SessionLinkSchema = Schema.Struct({ server: Schema.String, id: Schema.String })
export type SessionLink = typeof SessionLinkSchema.Type

export const CardSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  labels: Schema.String,
  status: Schema.String,
  session: Schema.String,
  sessions: Schema.optional(Schema.Array(Schema.String)),
  links: Schema.optional(Schema.Array(SessionLinkSchema)),
  project: Schema.optional(TaskProjectSchema),
  updatedAt: Schema.optional(Schema.Number),
})
export const ColumnSchema = Schema.Struct({ id: Schema.String, title: Schema.String, color: Schema.String })
export type Column = typeof ColumnSchema.Type
export const columnDefaults: Record<string, string> = { backlog: "Backlog", ready: "Ready", progress: "In progress", review: "Review", done: "Done", kanban: "Kanban", hindsight: "Hindsight" }
export const columnKeys: Record<string, string> = { backlog: "columnBacklog", ready: "columnReady", progress: "columnProgress", review: "columnReview", done: "columnDone", kanban: "columnKanban", hindsight: "columnHindsight" }
/** Display a column's title: known default seeds are localized via `t`; user-renamed columns render verbatim. */
export function columnTitle(column: Pick<Column, "id" | "title">, t?: (key: string) => string): string {
  if (t && columnKeys[column.id] && column.title === columnDefaults[column.id]) return t(columnKeys[column.id])
  return column.title
}
export const BoardSchema = Schema.Struct({ cards: Schema.Array(CardSchema), columns: Schema.Array(ColumnSchema) })
export type Task = typeof CardSchema.Type
export type Status = Task["status"]
export function taskSessions(task: Pick<Task, "session" | "sessions">): string[] {
  return [...new Set([task.session, ...(task.sessions ?? [])].filter(Boolean))]
}

export function taskLinks(task: Pick<Task, "session" | "sessions" | "links" | "project">, fallbackServer: string): SessionLink[] {
  const links = [...(task.links ?? []), ...taskSessions(task).map((id) => ({ id, server: task.project?.server ?? fallbackServer }))]
  return links.filter((link, index) => links.findIndex((item) => item.id === link.id && item.server === link.server) === index)
}

export function projectKey(project: TaskProject): string {
  return JSON.stringify([project.server, project.directory])
}

export function projectTitle(project: TaskProject): string {
  return project.name?.trim() || project.directory.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || project.directory
}

export function taskIsRunning(task: Pick<Task, "session" | "sessions" | "links" | "project">, status: (id: string, server: string) => "idle" | "running" | undefined, connected: boolean, fallbackServer = ""): boolean {
  return connected && taskLinks(task, fallbackServer).some((link) => status(link.id, link.server) === "running")
}
export function initialBoard(): typeof BoardSchema.Type {
  return { cards: [], columns: columns.map((column) => ({ ...column })) }
}

export function placeColumn(items: readonly Column[], id: string, index: number): Column[] {
  const source = items.find((item) => item.id === id)
  if (!source) return [...items]
  const next = items.filter((item) => item.id !== id)
  next.splice(Math.max(0, Math.min(next.length, index)), 0, source)
  return next
}

export function deleteColumn(board: typeof BoardSchema.Type, id: string, destination?: string): typeof BoardSchema.Type {
  if (!board.columns.some((column) => column.id === id) || board.columns.length <= 1) return board
  const hasTasks = board.cards.some((card) => card.status === id)
  if (hasTasks && (!destination || destination === id || !board.columns.some((column) => column.id === destination))) return board
  return { columns: board.columns.filter((column) => column.id !== id), cards: board.cards.map((card) => card.status === id ? { ...card, status: destination! } : card) }
}
export const BoardViewSchema = Schema.Struct({
  collapsed: Schema.Array(Schema.String),
  mode: Schema.Literals(["overlay", "split", "full", "list"]),
  splitWidth: Schema.optional(Schema.Number),
  overlayWidth: Schema.optional(Schema.Number),
})
/** Canvas mode chosen by the user (board layout or the list view). */
export type ViewMode = typeof BoardViewSchema.Type.mode
/** Detail panel mode. The "list" canvas reuses the split detail layout. */
export type DetailMode = Exclude<ViewMode, "list">

export function detailWidthBounds(available: number, mode: DetailMode): { min: number; max: number } {
  const max = Math.max(0, available - (mode === "split" ? 232 : mode === "overlay" ? 24 : 0))
  return { min: Math.min(280, max), max }
}

export function clampDetailWidth(width: number, available: number, mode: DetailMode): number {
  const { min, max } = detailWidthBounds(available, mode)
  return Math.round(Math.max(min, Math.min(max, Number.isFinite(width) ? width : 380)))
}

export function taskLabels(text: string): string[] {
  return [...new Set(text.split(",").map((label) => label.trim()).filter(Boolean))]
}

export function matchesTask(task: Task, query: string, label: string, project = ""): boolean {
  return (!label || taskLabels(task.labels).includes(label)) &&
    (!project || (task.project ? projectKey(task.project) : "none") === project) &&
    `${task.title} ${task.description} ${task.labels}`.toLowerCase().includes(query.trim().toLowerCase())
}

export function moveCard<T extends Task>(cards: readonly T[], id: string, status: Status, index?: number): T[] {
  const card = cards.find((item) => item.id === id)
  if (!card || (card.status === status && index === undefined)) return [...cards]
  const remaining = cards.filter((item) => item.id !== id)
  const destination = remaining.filter((item) => item.status === status)
  const anchor = index === undefined ? undefined : destination[Math.max(0, index)]
  const position = anchor ? remaining.findIndex((item) => item.id === anchor.id) : remaining.length
  remaining.splice(position, 0, { ...card, status })
  return remaining
}

/**
 * Instruction sent as the session's first user message. Pass `t` (the board translator)
 * to localize the human-visible part; without it the legacy English text is used, which
 * keeps agent-facing callers and tests byte-identical. The "Session rules" suffix stays English.
 */
export function taskPrompt(card: Task, t?: (key: string, params?: Record<string, string | number>) => string): string {
  const instruction = t
    ? t("taskPrompt", { title: card.title, taskId: card.id })
    : `Work on board task "${card.title}" (task_id: ${card.id}). Mark checkboxes as you complete.`
  // FastFree: opt-in per-task enhancers driven by labels. Plain cards keep the legacy output byte-for-byte.
  const labels = taskLabels(card.labels)
  const rules: string[] = []
  if (labels.some((label) => label === "worktree" || label.startsWith("worktree:"))) {
    const branch = card.id.slice(0, 8)
    rules.push(`WORKTREE REQUIRED: Before changing any file, create an isolated git worktree with: git worktree add ../fastfree_worktrees/${branch} -b task/${branch} and do ALL work inside it. Do not touch the main checkout.`)
  }
  for (const label of labels) {
    if (!label.startsWith("profile:")) continue
    const raw = label.slice("profile:".length).trim()
    if (!raw) continue
    const profile = raw.startsWith("fastfree-") ? raw : `fastfree-${raw}`
    rules.push(`PROFILE: This task is routed to the ${profile} Hermes profile. For review or verification steps, delegate to it (e.g. hermes -p ${profile}) rather than doing everything yourself; prefer its specialist roles.`)
  }
  if (labels.some((label) => label === "mirror" || label === "kanban" || label.startsWith("mirror:"))) {
    rules.push(`HERMES MIRROR: This task mirrors to the Hermes 'fastfree-erp' kanban board. Commands run against \`hermes kanban --board fastfree-erp\`. When you start work, run: hermes kanban --board fastfree-erp claim <id> if a matching task exists, or create one with: hermes kanban --board fastfree-erp create --title "<title>" (it maps backlog->todo, ready->ready, progress->running, review->review, done->done). When you move this card, mirror the same move: complete (done), request-review (review), reopen-review/unblock otherwise. Comment with your final summary on the Hermes task using hermes kanban --board fastfree-erp comment <id> "<summary>". If hermes CLI fails, note it and continue; do not block on the mirror.`)
  }
  if (labels.some((label) => label === "hindsight" || label === "memory" || label.startsWith("hindsight:"))) {
    rules.push(`HINDSIGHT: Before writing any code, recall related memory via your available memory tool (hindsight_recall or equivalent) with the task title as the query — honor any dependencies or constraints it returns. When the task completes, write a short memory (hindsight_retain) noting what was done and which decisions mattered for future tasks in this project.`)
  }
  const base = [instruction, card.description].filter(Boolean).join("\n\n")
  return rules.length ? `${base}\n\n## Session rules (fastfree_board)\n${rules.join("\n")}` : base
}
