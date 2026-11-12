import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount, type JSX } from "solid-js"
import { DragDropProvider, DragOverlay, PointerSensor, useDroppable, type DragDropProviderProps } from "@dnd-kit/solid"
import { PointerActivationConstraints } from "@dnd-kit/dom"
import { isSortable, useSortable } from "@dnd-kit/solid/sortable"
import { usePlugin, type MountedSession } from "@opencode/plugin/gui"
import { BoardViewSchema, columnTitle, deleteColumn, matchesTask, moveCard, placeColumn, projectKey, projectTitle, taskIsRunning, taskLabels, taskLinks, type Column, type Status, type Task } from "./kanban-model"
import { checklistItems, markdownExcerpt } from "./task-markdown"
import { TaskDetail } from "./task-detail"
import { TaskEditor } from "./task-editor"
import { ResizableDetail } from "./resizable-detail"
import { ListView } from "./list-view"
import type { BoardStore } from "./kanban-storage"
import { useBoardLang } from "./lang"
import { currentTaskProject, openTaskProjects } from "./task-projects"
import { animateCardMoves } from "./card-motion"
import { version } from "../../package.json"
import { bindCardMenu, cardMenuPosition } from "./card-menu"
import { FastFreeMark } from "./brand-mark"

export function Kanban(props: { session: MountedSession; board: BoardStore; start(task: Task): Promise<void>; openSettings(): void }) {
  const ctx = usePlugin()
  const ui = ctx.ui
  const { t, plural: boardPlural, dir, intlLocale, lang, settings } = useBoardLang(ctx)
  const rtl = () => dir() === "rtl"
  // Persisted default seeds stay English; display them localized, user-renamed columns stay verbatim.
  const colTitle = (column: Pick<Column, "id" | "title">) => columnTitle(column, t)
  const board = () => props.board
  const cards = () => board().value?.cards ?? []
  const running = (task: Task) => {
    return taskIsRunning(task, (id, serverID) => {
      const server = ctx.servers.get(serverID)
      return server?.connected ? server.data.session.status(id) : undefined
    }, true, props.session.server.id)
  }
  const columns = () => board().value?.columns ?? []
  const view = createMemo(() => ctx.storage.store("kanban-view-v2", {
    schema: BoardViewSchema, initial: { collapsed: [], mode: "overlay" },
    scope: "global",
    from: "plugin.opencode-desktop-showcase.kanban-view-v2",
  }))
  const [selected, setSelected] = createSignal<{ id: string; scope: ReturnType<typeof board> }>()
  // The "list" canvas reuses the split detail layout; the kanban modes pass through untouched.
  const viewMode = () => view().value?.mode ?? "overlay"
  const listMode = () => viewMode() === "list"
  const detailMode = (): "overlay" | "split" | "full" => {
    const mode = viewMode()
    return mode === "list" ? "split" : mode
  }
  const selectedTask = () => selected()?.scope === board() ? cards().find((card) => card.id === selected()?.id) : undefined
  const [editor, setEditor] = createSignal<{ existing?: Task; status: Status; scope: ReturnType<typeof board> }>()
  const editing = () => editor()?.scope === board() ? editor() : undefined
  const detailOpen = () => !!editing() || !!selectedTask()
  const closeDetail = () => { setEditor(undefined); setSelected(undefined) }
  const [label, setLabel] = createSignal("")
  const [projectFilter, setProjectFilter] = createSignal("")
  const currentProject = () => currentTaskProject(props.session)
  const projects = createMemo(() => openTaskProjects(ctx, props.session))
  createEffect(() => {
    const selected = projectFilter()
    if (selected && selected !== "none" && !projects().some((project) => projectKey(project) === selected)) setProjectFilter("")
  })
  let seededColumns = false
  // One-time migration for existing boards: make sure the Kanban and Hindsight stage columns exist.
  createEffect(() => {
    if (seededColumns || !board().ready()) return
    seededColumns = true
    const seeded = (settings.value as { columnsSeeded?: boolean } | undefined)?.columnsSeeded
    if (seeded) return
    board().update((draft) => {
      const existing = new Set(draft.columns.map((column) => column.id))
      if (!existing.has("kanban")) draft.columns.push({ id: "kanban", title: "Kanban", color: "#8b5cf6" })
      if (!existing.has("hindsight")) draft.columns.push({ id: "hindsight", title: "Hindsight", color: "#06b6d4" })
    })
    settings.update((draft) => { (draft as Record<string, unknown>).columnsSeeded = true })
  })
  const labels = () => [...new Set(cards().flatMap((card) => taskLabels(card.labels)))].sort()
  const selectedProjectTitle = () => {
    if (projectFilter() === "none") return t("noProject")
    if (!projectFilter()) return undefined
    return projects().find((item) => projectKey(item) === projectFilter()) ? projectTitle(projects().find((item) => projectKey(item) === projectFilter())!) : undefined
  }
  const filterMenuLabel = () => {
    const active = [label(), selectedProjectTitle()].filter((value): value is string => !!value)
    return active.length ? `${t("filters")}: ${active.join(" · ")}` : t("filters")
  }
  let searchRef: HTMLInputElement | undefined
  const searchShortcut = /mac/i.test(navigator.platform ?? "") ? "⌘K" : "Ctrl K"
  const focusSearch = (event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey)) return
    const key = event.key.toLowerCase()
    if (key !== "k" && key !== "ك") return
    if (!searchRef) return
    event.preventDefault()
    searchRef.focus()
    searchRef.select()
  }
  const filtered = () => !!filter().trim() || !!label() || !!projectFilter()
  const collapsed = (status: Status) => {
    try {
      return !!view().value?.collapsed?.includes(status) && landing()?.status !== status
    } catch {
      return false
    }
  }
  const [dragging, setDragging] = createSignal<string>()
  const toggleColumn = (status: Status) => view().update((draft) => {
    draft.collapsed = draft.collapsed.includes(status) ? draft.collapsed.filter((item) => item !== status) : [...draft.collapsed, status]
  })
  const [draggingColumn, setDraggingColumn] = createSignal<string>()
  const [columnIndex, setColumnIndex] = createSignal<number>()
  const displayColumns = createMemo(() => {
    const id = draggingColumn()
    const index = columnIndex()
    return id && index !== undefined ? placeColumn(columns(), id, index) : columns()
  })
  const [dragHeight, setDragHeight] = createSignal(100)
  const [dragTop, setDragTop] = createSignal(0)
  const [landing, setLanding] = createSignal<{ status: Status; anchor?: string; after: boolean }>()
  const [filter, setFilter] = createSignal("")
  const [boardBottom, setBoardBottom] = createSignal(8)
  const observeBoardHeight = (element: HTMLDivElement) => {
    const measure = () => setBoardBottom(element.offsetHeight - element.clientHeight + (parseFloat(getComputedStyle(element).paddingBottom) || 0))
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    onCleanup(() => observer.disconnect())
  }
  let root: HTMLDivElement | undefined
  const [cardMenu, setCardMenu] = createSignal<{ id: string; x: number; y: number; trigger: HTMLButtonElement }>()
  const closeCardMenu = () => setCardMenu(undefined)
  const openCardMenu = (card: Task, event: MouseEvent | KeyboardEvent) => {
    if (dragging() || draggingColumn()) return
    event.preventDefault()
    event.stopPropagation()
    const trigger = event.currentTarget as HTMLButtonElement
    const bounds = trigger.getBoundingClientRect()
    const point = "clientX" in event && (event.clientX || event.clientY) ? { x: event.clientX, y: event.clientY } : { x: rtl() ? bounds.right : bounds.left, y: bounds.bottom }
    setCardMenu({ id: card.id, ...point, trigger })
  }
  let dragBoard: ReturnType<typeof board> | undefined
  let suppressClickUntil = 0
  const preview = (operation: Parameters<NonNullable<DragDropProviderProps["onDragOver"]>>[0]["operation"], point = operation.position.current) => {
    const { source, target } = operation
    if (source?.type === "column") {
      const container = root?.querySelector<HTMLElement>(".sc-board-columns")
      const bounds = container?.getBoundingClientRect()
      if (!container || !bounds || point.x < bounds.left || point.x > bounds.right || point.y < bounds.top || point.y > bounds.bottom) return setColumnIndex(undefined)
      const elements = [...container.querySelectorAll<HTMLElement>("[data-kanban-column]")]
      const slot = elements.find((element) => element.dataset.kanbanColumn === source.data.columnID)
      const tolerance = Math.min(24, (slot?.getBoundingClientRect().width ?? 240) / 4)
      const others = elements.filter((element) => element !== slot)
      const index = others.findIndex((element) => {
        const rect = element.getBoundingClientRect()
        const following = slot ? slot.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING : 0
        // RTL mirrors the visual order, so the insertion comparison inverts and the tolerance sign swaps.
        if (rtl()) {
          const offset = slot ? (following ? tolerance : -tolerance) : 0
          return point.x > rect.left + rect.width / 2 - offset
        }
        const offset = slot ? (following ? -tolerance : tolerance) : 0
        return point.x < rect.left + rect.width / 2 + offset
      })
      setColumnIndex(index < 0 ? others.length : index)
      return
    }
    if (source && operation.activatorEvent?.type !== "keydown") {
      const element = [...root?.querySelectorAll<HTMLElement>("[data-kanban-column]") ?? []].find((element) => {
        const rect = element.getBoundingClientRect()
        return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
      })
      const status = columns().find((column) => column.id === element?.dataset.kanbanColumn)?.id
      if (!element || !status) return setLanding(undefined)
      const slot = element.querySelector(".sc-drop-slot")
      const tolerance = Math.min(24, dragHeight() / 4)
      const anchor = [...element.querySelectorAll<HTMLElement>("[data-task-id]")].find((card) => {
        if (card.dataset.taskId === String(source.id)) return false
        const rect = card.getBoundingClientRect()
        const offset = slot ? slot.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING ? -tolerance : tolerance : 0
        return point.y < rect.top + rect.height / 2 + offset
      })
      return setLanding({ status, anchor: anchor?.dataset.taskId, after: false })
    }
    if (source && target && source.id === target.id) return
    if (!source || !target) return setLanding(undefined)
    const status = columns().find((column) => column.id === (isSortable(target) ? target.group : target.data.status))?.id
    if (!status) return setLanding(undefined)
    const card = cards().find((item) => item.id === target.id)
    const rect = target.element?.getBoundingClientRect()
    const keyboard = operation.activatorEvent?.type === "keydown"
    const after = card && rect ? keyboard
      ? isSortable(source) && isSortable(target) && source.group === target.group && source.index < target.index
      : operation.position.current.y > rect.top + rect.height / 2 : false
    setLanding({ status, anchor: card?.id, after: !!after })
  }
  const finish: NonNullable<DragDropProviderProps["onDragEnd"]> = (event) => {
    preview(event.operation)
    if (draggingColumn()) {
      const id = draggingColumn()!
      const index = columnIndex()
      if (!event.canceled && dragBoard === board() && index !== undefined) board().update((draft) => { draft.columns = placeColumn(draft.columns, id, index) })
      setDraggingColumn(undefined); setColumnIndex(undefined)
      dragBoard = undefined; suppressClickUntil = Date.now() + 200
      return
    }
    const destination = landing()
    const id = dragging()
    if (!event.canceled && event.operation.target && dragBoard === board() && destination && id) {
      board().update((draft) => {
        if (!draft.columns.some((column) => column.id === destination.status)) return
        const others = draft.cards.filter((item) => item.id !== id && item.status === destination.status)
        const anchor = others.findIndex((item) => item.id === destination.anchor)
        const index = anchor < 0 ? others.length : anchor + Number(destination.after)
        draft.cards = moveCard(draft.cards, id, destination.status, index)
        const moved = draft.cards.find((card) => card.id === id)
        if (moved) moved.updatedAt = Date.now()
      })
    }
    dragBoard = undefined
    suppressClickUntil = Date.now() + 200
    setDragging(undefined)
    setLanding(undefined)
  }
  const visibleCards = () => cards().filter((card) => matchesTask(card, filter(), label(), projectFilter()))
  createEffect(() => { const menu = cardMenu(); if (menu && !visibleCards().some((card) => card.id === menu.id)) closeCardMenu() })
  const move = (id: string, status: Status) => {
    board().update((draft) => { if (!draft.columns.some((column) => column.id === status)) return; draft.cards = moveCard(draft.cards, id, status); const task = draft.cards.find((item) => item.id === id); if (task) task.updatedAt = Date.now() })
  }
  const edit = (existing?: Task, status: Status = columns()[0]?.id ?? "") => {
    if (!existing) setSelected(undefined)
    setEditor({ existing, status, scope: board() })
  }
  const remove = async (card: Task) => {
    const target = board()
    if (!await ctx.dialogs.confirm({ title: t("deleteTaskTitle"), description: t("deleteTaskDialog", { title: card.title }) })) return
    target.update((draft) => { draft.cards = draft.cards.filter((item) => item.id !== card.id) })
  }
  const editColumn = (existing?: Column) => {
    const target = board()
    ctx.dialogs.open((dialog) => <ui.Dialog title={existing ? t("editColumn") : t("newColumn")}>
      <div class="sc-root sc-inset sc-kanban-ui"><ColumnEditor existing={existing} cancel={dialog.close} save={(fields) => {
        target.update((draft) => {
          if (existing) { const column = draft.columns.find((item) => item.id === existing.id); if (column) Object.assign(column, fields) }
          else draft.columns.push({ id: crypto.randomUUID(), ...fields })
        })
        dialog.close()
      }} /></div>
    </ui.Dialog>)
  }
  const removeColumn = (column: Column) => {
    const target = board()
    ctx.dialogs.open((dialog) => <ui.Dialog title={t("deleteColumnDialog", { title: colTitle(column) })}>
      <div class="sc-root sc-inset sc-kanban-ui"><ColumnDelete column={column} columns={target.value?.columns ?? []} count={target.value?.cards.filter((card) => card.status === column.id).length ?? 0} cancel={dialog.close} remove={(destination) => {
        const current = target.value
        if (!current) return
        const next = deleteColumn(current, column.id, destination)
        if (next === current) { ctx.toast.show({ variant: "error", title: t("columnDeleteFailed"), description: t("columnDeleteReason") }); return }
        target.set(next)
        dialog.close()
      }} /></div>
    </ui.Dialog>)
  }
  return <div ref={root} class="sc-root sc-kanban sc-kanban-ui" dir={dir()} data-locale={dir() === "rtl" ? "ar" : "en"} onKeyDown={focusSearch}>
    <Show when={detailOpen() && (view().value?.mode ?? "overlay") === "overlay"}>
      <button type="button" class="sc-detail-backdrop" tabIndex={-1} aria-label={t("closeTaskDetails")}
        onPointerDown={(event) => { event.preventDefault(); event.stopPropagation() }}
        onClick={(event) => { event.stopPropagation(); closeDetail() }} />
    </Show>
    <header class="sc-board-header">
      <div class="sc-board-heading">
        <FastFreeMark class="sc-brand-mark" size={46} bare />
        <div class="sc-brand-text">
          <h2 class="sc-brand-name">FastFree</h2>
          <span class="sc-brand-sub">{t("board")}</span>
        </div>
      </div>
      <label class="sc-search" title={t("filterTasks")}>
        <span class="sc-search-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="17" y2="17"/></svg>
        </span>
        <input ref={(element) => (searchRef = element)} class="sc-search-input" type="text" placeholder={t("searchTasksPlaceholder")} value={filter()} disabled={!!dragging()} aria-label={t("filterTasks")} onInput={(event) => setFilter(event.currentTarget.value)} />
        <Show when={!filter()}><kbd class="sc-search-kbd">{searchShortcut}</kbd></Show>
      </label>
      <ui.Menu label={filterMenuLabel()} trigger="button" icon="sliders" disabled={!!dragging()} items={[
        { type: "group", label: t("filtersLabels"), items: [
            { label: `${!label() ? "✓ " : ""}${t("allLabels")}`, onSelect: () => setLabel("") },
            ...labels().map((name) => ({ label: `${label() === name ? "✓ " : ""}${name}`, onSelect: () => setLabel(name) })),
        ]},
        { type: "separator" },
        { type: "group", label: t("filtersProjects"), items: [
            { label: `${projectFilter() === "" ? "✓ " : ""}${t("allProjects")}`, onSelect: () => setProjectFilter("") },
            { label: `${projectFilter() === "none" ? "✓ " : ""}${t("noProject")}`, onSelect: () => setProjectFilter("none") },
            ...projects().map((project) => ({ label: `${projectFilter() === projectKey(project) ? "✓ " : ""}${projectTitle(project)}`, onSelect: () => setProjectFilter(projectKey(project)) })),
        ]},
      ]} />
      <Show when={filtered()}><ui.Tooltip value={t("clearFilters")}><ui.IconButton icon="close" label={t("clearFilters")} variant="ghost" size="small" onClick={() => { setFilter(""); setLabel(""); setProjectFilter("") }} /></ui.Tooltip></Show>
      <span class="sc-board-new"><ui.Button variant="contrast" icon="plus" disabled={!board().ready()} onClick={() => edit()}>{t("newTask")}</ui.Button></span>
      <span class="sc-board-new sc-board-column-btn"><ui.Button variant="neutral" icon="grid-plus" disabled={!board().ready()} onClick={() => editColumn()}>{t("newColumn")}</ui.Button></span>
      <span class="sc-header-actions">
        <span class="sc-header-divider" aria-hidden="true" />
        <ui.Tooltip value={t("boardSettings")}><ui.IconButton icon="settings-gear" label={t("boardSettings")} variant="ghost" size="small" onClick={props.openSettings} /></ui.Tooltip>
      </span>
    </header>
    <Show when={board().ready()} fallback={<ui.Loader />}>
      <Show when={board()} keyed>{(scope) => {
        onCleanup(() => { dragBoard = undefined; suppressClickUntil = 0; setDragging(undefined); setLanding(undefined); setDraggingColumn(undefined); setColumnIndex(undefined) })
        return <DragDropProvider
        sensors={[PointerSensor.configure({
          activationConstraints: [new PointerActivationConstraints.Distance({ value: 6 })],
        })]}
        onDragStart={(event) => {
          const source = event.operation.source
          if (source?.type === "column") { dragBoard = scope; suppressClickUntil = Infinity; setColumnIndex(columns().findIndex((column) => column.id === source.data.columnID)); setDraggingColumn(String(source.data.columnID)); return }
          const card = cards().find((card) => card.id === source?.id)
          if (!source || !card) return
          // Measure before the source leaves flow; its slot takes exactly this space.
          setDragHeight(source.element?.getBoundingClientRect().height ?? 100)
          setDragTop((source.element as HTMLElement | undefined)?.offsetTop ?? 0)
          dragBoard = scope
          suppressClickUntil = Infinity
          setLanding({ status: card.status, anchor: card.id, after: false })
          setDragging(card.id)
        }}
        // Show an insertion marker instead of letting optimistic sorting move Solid-owned DOM.
        onDragOver={(event) => { event.preventDefault(); preview(event.operation) }}
        onDragMove={(event) => preview(event.operation, event.to ?? event.operation.position.current)}
        onDragEnd={finish}>
      <div class="sc-board-workspace" data-mode={detailMode()} data-detail={detailOpen()} style={{ "--sc-board-bottom": `${boardBottom()}px` }}>
      <Show when={!listMode()} fallback={<ListView columns={displayColumns()} cards={visibleCards()} colTitle={colTitle} running={running} selectedId={selectedTask()?.id} emptyMessage={filtered() ? t("noMatchingTasks") : t("noTasksYet")} addTask={(status) => edit(undefined, status)} addTaskLabel={(title) => t("addTaskToColumn", { title })} open={(card) => { closeCardMenu(); if (Date.now() < suppressClickUntil) return; setEditor(undefined); setSelected({ id: card.id, scope: board() }) }} />}>
      <div ref={(element) => { observeBoardHeight(element); onMount(() => { if (root) onCleanup(animateCardMoves(root, element)) }) }} class="sc-board-columns">
        <For each={displayColumns()}>{(column, index) => <DropColumn status={column.id} index={index()} disabled={filtered()} active={landing()?.status === column.id} collapsed={collapsed(column.id)}>{(handleRef) => <>
          <Show when={!collapsed(column.id)} fallback={<><ui.Tooltip value={t("expandColumn", { title: colTitle(column) })}><ui.IconButton icon="chevron-right" label={t("expandColumn", { title: colTitle(column) })} variant="ghost" size="small" onClick={() => toggleColumn(column.id)} /></ui.Tooltip><button ref={handleRef} type="button" class="sc-column-rail sc-column-drag" aria-label={t("dragColumn", { title: colTitle(column) })}>{colTitle(column)}</button><span class="sc-column-count">{cards().filter((card) => card.status === column.id).length}</span></>}>
           <header><button ref={handleRef} type="button" class="sc-column-drag" aria-label={t("dragColumn", { title: colTitle(column) })}><span class="sc-column-dot" style={{ background: column.color }} /><span>{colTitle(column)}</span><span class="sc-column-count">{cards().filter((card) => card.status === column.id).length}</span></button>
              <span class="sc-column-actions"><ui.Tooltip value={t("addTaskToColumn", { title: colTitle(column) })}><ui.IconButton icon="plus" label={t("addTaskToColumn", { title: colTitle(column) })} variant="ghost" size="small" onClick={() => edit(undefined, column.id)} /></ui.Tooltip>
              <ui.Menu label={t("columnOptions", { title: colTitle(column) })} icon="outline-dots" items={[{ label: t("editColumn"), icon: "edit", onSelect: () => editColumn(column) }, { label: t("deleteColumn"), icon: "trash", disabled: columns().length <= 1, onSelect: () => removeColumn(column) }]} />
              <ui.Tooltip value={t("collapseColumn", { title: colTitle(column) })}><ui.IconButton icon="chevron-left" label={t("collapseColumn", { title: colTitle(column) })} variant="ghost" size="small" disabled={!view().ready()} onClick={() => toggleColumn(column.id)} /></ui.Tooltip></span></header>
          <div class="sc-column-cards">
            <For each={visibleCards().filter((card) => card.status === column.id)}>{(card, index) => <>
              <Show when={landing()?.anchor === card.id && !landing()?.after}><DropSlot height={dragHeight()} /></Show>
                 <SortableTask card={card} index={index()} disabled={filtered()} active={running(card)} selected={selectedTask()?.id === card.id} origin={dragging() === card.id} originTop={dragTop()} contextMenu={(event) => openCardMenu(card, event)} open={() => {
                   closeCardMenu()
                  if (Date.now() < suppressClickUntil) return
                  if (selectedTask()?.id === card.id) return closeDetail()
                  setEditor(undefined)
                  setSelected({ id: card.id, scope: board() })
                }}>
                 <TaskSummary card={card} />
              </SortableTask>
              <Show when={landing()?.anchor === card.id && landing()?.after}><DropSlot height={dragHeight()} /></Show>
            </>}</For>
            <Show when={landing()?.status === column.id && !landing()?.anchor}><DropSlot height={dragHeight()} /></Show>
            <Show when={!visibleCards().some((card) => card.status === column.id)}><div class="sc-empty-column">{filtered() ? t("noMatchingTasks") : t("noTasksYet")}</div></Show>
          </div>
          </Show>
        </>}</DropColumn>}</For>
      </div>
      </Show>
      <Show when={detailOpen()}>
        <ResizableDetail mode={detailMode()}
          width={detailMode() === "split" ? view().value?.splitWidth ?? 380 : view().value?.overlayWidth ?? 460}
          saveWidth={(width) => view().update((draft) => { if (draft.mode === "split" || draft.mode === "list") draft.splitWidth = width; else draft.overlayWidth = width })}>
        <Show when={editing()} keyed fallback={<Show when={selectedTask()}>{(task) => <TaskDetail task={task()} session={props.session} columns={columns()}
          close={closeDetail} edit={() => edit(task())} remove={() => { void remove(task()) }} move={(status) => move(task().id, status)} start={() => props.start(task())}
          update={(fields) => board().update((draft) => { const current = draft.cards.find((card) => card.id === task().id); if (current) Object.assign(current, fields, { updatedAt: Date.now() }) })} />
        }</Show>}>{(state) => <section class="sc-task-detail" aria-label={state.existing ? t("editTask") : t("newTask")} onKeyDown={(event) => { if (event.key === "Escape" && !event.defaultPrevented) { event.stopPropagation(); setEditor(undefined) } }}>
          <header class="sc-detail-toolbar"><span>{state.existing ? t("editTask") : t("newTask")}</span><ui.IconButton icon="close" label={t("closeTaskEditor")} variant="ghost" onClick={closeDetail} /></header>
          <div class="sc-detail-body"><TaskEditor existing={state.existing} columns={columns()} projects={projects()} project={projectFilter() === "none" ? undefined : projects().find((item) => projectKey(item) === projectFilter()) ?? currentProject()} status={state.status} cancel={() => setEditor(undefined)} save={(fields) => {
            const id = state.existing?.id ?? crypto.randomUUID()
            state.scope.update((draft) => {
              if (!draft.columns.some((column) => column.id === fields.status)) return
              if (state.existing) {
                const current = draft.cards.find((card) => card.id === id)
                if (!current) return
                if (current.status !== fields.status) draft.cards = moveCard(draft.cards, id, fields.status)
                Object.assign(draft.cards.find((card) => card.id === id)!, fields, { updatedAt: Date.now() })
              } else draft.cards.push({ ...fields, id, session: "", sessions: [], updatedAt: Date.now() })
            })
            setEditor(undefined)
            setSelected({ id, scope: state.scope })
          }} /></div>
        </section>}</Show>
        </ResizableDetail>
      </Show>
      </div>
      <DragOverlay dropAnimation={null}><Show when={cards().find((card) => card.id === dragging())} keyed>{(card) => <div class="sc-root sc-kanban-ui" dir={dir()}><article class="sc-task sc-task-overlay"><h4 class="sc-task-title">{card.title}</h4><TaskSummary card={card} /></article></div>}</Show><Show when={draggingColumn()}><div class="sc-root sc-kanban-ui sc-column-overlay" dir={dir()}>{columns().find((column) => column.id === draggingColumn()) ? colTitle(columns().find((column) => column.id === draggingColumn())!) : ""}</div></Show></DragOverlay>
      </DragDropProvider>
      }}</Show>
    </Show>
    <Show when={cardMenu()} keyed>{(menu) => <CardMenu x={menu.x} y={menu.y} close={closeCardMenu} restoreFocus={() => menu.trigger.focus()} edit={() => {
      const task = cards().find((card) => card.id === menu.id)
      closeCardMenu()
      if (task) edit(task)
    }} remove={() => {
      const task = cards().find((card) => card.id === menu.id)
      closeCardMenu()
      if (task) void remove(task)
    }} />}</Show>
    <footer class="sc-board-footer" aria-label={t("boardVersion", { version })}>v{version}</footer>
  </div>
}

function DropColumn(props: { status: Status; index: number; disabled: boolean; active: boolean; collapsed: boolean; children: (handleRef: (element: Element) => void) => JSX.Element }) {
  const sortable = useSortable({
    get id() { return `column-sort:${props.status}` }, get index() { return props.index }, group: "columns",
    type: "column", accept: "column", get data() { return { columnID: props.status } },
  })
  const drop = useDroppable({
    get id() { return `column:${props.status}` },
    get disabled() { return props.disabled },
    data: { status: props.status }, accept: "task", collisionPriority: -1,
  })
  return <section ref={(element) => { drop.ref(element); sortable.ref(element) }} class="sc-board-column" data-column-dragging={sortable.isDragSource()} data-kanban-column={props.status} data-collapsed={props.collapsed} data-over={props.active}>{props.children(sortable.handleRef)}</section>
}

function SortableTask(props: { card: Task; index: number; disabled: boolean; selected: boolean; active: boolean; origin: boolean; originTop: number; open(): void; contextMenu(event: MouseEvent | KeyboardEvent): void; children: JSX.Element }) {
  const ctx = usePlugin()
  const { t } = useBoardLang(ctx)
  const sortable = useSortable({
    get id() { return props.card.id },
    get index() { return props.index },
    get group() { return props.card.status },
    get disabled() { return props.disabled },
    type: "task", accept: "task", collisionPriority: 1,
  })
  return <button type="button" ref={(element) => { sortable.ref(element); sortable.handleRef(element) }}
    class="sc-task" data-task-id={props.card.id} data-dragging={props.origin} data-selected={props.selected} data-active={props.active}
    style={{ "--sc-drag-top": `${props.originTop}px` }} aria-label={t("openTask", { title: props.card.title })} aria-haspopup="menu" onClick={props.open} onContextMenu={props.contextMenu} onKeyDown={(event) => {
      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) props.contextMenu(event)
    }}>
    <span class="sc-task-title">{props.card.title}</span>
    {props.children}
  </button>
}

function CardMenu(props: { x: number; y: number; close(): void; restoreFocus(): void; edit(): void; remove(): void }) {
  const ctx = usePlugin()
  const ui = ctx.ui
  const { t, dir } = useBoardLang(ctx)
  let menu!: HTMLDivElement
  onMount(() => {
    const bounds = menu.parentElement!.getBoundingClientRect()
    const position = cardMenuPosition(props, bounds, menu.getBoundingClientRect())
    menu.style.left = `${position.x}px`
    menu.style.top = `${position.y}px`
    onCleanup(bindCardMenu(menu, props.close, props.restoreFocus))
  })
  return <div ref={menu} class="sc-card-menu" role="menu" aria-label={t("taskActions")} dir={dir()} onContextMenu={(event) => event.preventDefault()}>
    <button type="button" role="menuitem" onClick={props.edit}><ui.Icon name="edit" size="small" />{t("editTask")}</button>
    <button type="button" role="menuitem" class="sc-card-menu-remove" onClick={props.remove}><ui.Icon name="trash" size="small" />{t("removeTask")}</button>
  </div>
}

function DropSlot(props: { height: number }) {
  return <div class="sc-drop-slot" style={{ height: `${props.height}px` }} aria-hidden="true" />
}

function TaskSummary(props: { card: Task }) {
  const ctx = usePlugin()
  const ui = ctx.ui
  const { t, plural: boardPlural, intlLocale } = useBoardLang(ctx)
  const items = createMemo(() => checklistItems(props.card.description))
  const excerpt = createMemo(() => markdownExcerpt(props.card.description))
  const labels = () => taskLabels(props.card.labels)
  return <>
    <Show when={props.card.project}>{(project) => <span class="sc-task-project" title={project().directory}><ui.Icon name="folder" size="small" />{projectTitle(project())}</span>}</Show>
    <Show when={excerpt()}><span class="sc-task-excerpt">{excerpt()}</span></Show>
    <span class="sc-card-footer"><span class="sc-task-labels"><For each={labels().slice(0, 2)}>{(label) => <span>{label}</span>}</For><Show when={labels().length > 2}><span title={labels().slice(2).join(", ")}>+{labels().length - 2}</span></Show></span>
      <span class="sc-card-meta"><Show when={items().length}><span title={t("checklistProgress")}><ui.Icon name="checklist" size="small" />{items().filter((item) => item.checked).length}/{items().length}</span></Show>
        <Show when={taskLinks(props.card, "").length}>{(count) => <span title={boardPlural("linkedSession", count())} aria-label={boardPlural("linkedSession", count())}><ui.Icon name="link" size="small" />{count()}</span>}</Show>
        <Show when={props.card.updatedAt}><time title={new Date(props.card.updatedAt!).toLocaleString(intlLocale())}>{new Date(props.card.updatedAt!).toLocaleDateString(intlLocale(), { month: "short", day: "numeric" })}</time></Show>
      </span>
    </span>
  </>
}

const columnColors = [
  { key: "colorNeutral", value: "var(--v2-icon-icon-muted)" },
  { key: "colorBlue", value: "var(--v2-state-fg-info)" },
  { key: "colorAmber", value: "var(--v2-state-fg-warning)" },
  { key: "colorAccent", value: "var(--v2-text-text-accent)" },
  { key: "colorGreen", value: "var(--v2-state-fg-success)" },
  { key: "colorRed", value: "var(--v2-state-fg-danger)" },
]

function ColumnEditor(props: { existing?: Column; cancel(): void; save(fields: Pick<Column, "title" | "color">): void }) {
  const ctx = usePlugin()
  const { t } = useBoardLang(ctx)
  const ui = ctx.ui
  const [title, setTitle] = createSignal(props.existing?.title ?? "")
  const [color, setColor] = createSignal(props.existing?.color ?? columnColors[0].value)
  return <form class="sc-task-editor" onSubmit={(event) => { event.preventDefault(); if (title().trim()) props.save({ title: title().trim(), color: color() }) }}>
    <div class="sc-editor-field"><span>{t("name")}</span><ui.TextInput class="sc-kanban-input" label={t("columnName")} value={title()} onInput={setTitle} autofocus placeholder={t("columnNamePlaceholder")} /></div>
    <div class="sc-editor-field"><span>{t("color")}</span><div class="sc-column-colors" role="group" aria-label={t("columnColor")}><For each={columnColors}>{(item) => <ui.Tooltip value={t(item.key)}><button type="button" aria-label={t(item.key)} aria-pressed={color() === item.value} style={{ background: item.value }} onClick={() => setColor(item.value)} /></ui.Tooltip>}</For></div></div>
    <div class="sc-editor-actions"><ui.Button onClick={props.cancel}>{t("cancel")}</ui.Button><ui.Button type="submit" variant="contrast" disabled={!title().trim()}>{t("saveColumn")}</ui.Button></div>
  </form>
}

function ColumnDelete(props: { column: Column; columns: readonly Column[]; count: number; cancel(): void; remove(destination?: string): void }) {
  const ctx = usePlugin()
  const { t, plural: boardPlural } = useBoardLang(ctx)
  const colTitle = (column: Pick<Column, "id" | "title">) => columnTitle(column, t)
  const ui = ctx.ui
  const others = () => props.columns.filter((column) => column.id !== props.column.id)
  const [destination, setDestination] = createSignal(others()[0]?.id)
  return <div class="sc-task-editor">
    <p>{props.count ? boardPlural("tasksMoveNotice", props.count) : t("emptyColumn")}</p>
    <Show when={props.count}><div class="sc-editor-field"><span>{t("moveTasksTo")}</span><ui.Menu label={others().find((column) => column.id === destination()) ? colTitle(others().find((column) => column.id === destination())!) : t("chooseColumn")} trigger="button" items={others().map((column) => ({ label: colTitle(column), onSelect: () => setDestination(column.id) }))} /></div></Show>
    <div class="sc-editor-actions"><ui.Button onClick={props.cancel}>{t("cancel")}</ui.Button><ui.Button variant="danger" disabled={!others().length || (!!props.count && !destination())} onClick={() => props.remove(destination())}>{t("deleteColumn")}</ui.Button></div>
  </div>
}
