// Bundle contract tests; Desktop rendering and pointer interactions are checked manually.
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import * as gui from "@opencode/plugin/gui"
import * as rpc from "@opencode/plugin/rpc"
import { webcrypto } from "node:crypto"
import * as solid from "solid-js"
import * as effect from "effect"
import serverPlugin from "../dist/server.js"
import { BoardBridge } from "../dist/rpc.js"

const id = "fastfree_board"
// Hermetic network: the GUI create path recalls from 127.0.0.1:9177; fail it fast in
// tests so the suite never depends on the live daemon's latency/availability.
const realFetch = globalThis.fetch
globalThis.fetch = async (url, init) => {
  if (String(url).includes("127.0.0.1:9177")) {
    return { ok: false, status: 503, statusText: "Unavailable", text: async () => "", json: async () => ({ results: [] }) }
  }
  return realFetch(url, init)
}
const sourceModel = { id: "test-model", providerID: "openai", variant: "high" }
const savedSettings = new Map()
const serverStorage = { async get(key) { return savedSettings.get(key) }, async set(key, value) { savedSettings.set(key, value) } }

// Match OpenCode's JSON-schema RPC validation and HTTP JSON boundary, not just
// direct handler calls (which incorrectly allow explicit undefined fields).
function rpcTransport(definition, handlers) {
  const codec = (schema) => effect.Schema.make(effect.SchemaRepresentation.fromJsonSchemaDocument(effect.JsonSchema.fromSchemaDraft2020_12(schema)).ast)
  return Object.fromEntries(Object.entries(definition.methods).map(([name, method]) => {
    const input = codec(method.input)
    const output = codec(method.output)
    return [name, async (value) => {
      const parsed = effect.Schema.decodeUnknownSync(input)(JSON.parse(JSON.stringify(value)))
      const result = effect.Schema.decodeUnknownSync(output)(await handlers[name](parsed))
      return JSON.parse(JSON.stringify(result))
    }]
  }))
}

test("poll output rejects explicit undefined rather than delivering a non-JSON request", async () => {
  const request = { operation: "list", input: {}, sessionID: "calling-session" }
  const bridge = rpcTransport(BoardBridge, { poll: async () => ({ id: "request-id", request: { ...request, directory: undefined } }) })
  await assert.rejects(bridge.poll({ clientID: "window" }), /directory/)
  const valid = rpcTransport(BoardBridge, { poll: async () => ({ id: "request-id", request }) })
  assert.deepEqual((await valid.poll({ clientID: "window" })).request, request)
})

test("bridge reports RPC failures once until recovery, including plain-object SDK errors", async () => {
  let failing = true
  const host = windowHost({ async poll() { if (failing) throw { type: "rpc.invalid_output", message: "Expected JSON value" }; return null } })
  host.tick()
  await new Promise(setImmediate)
  assert.equal(host.logs.length, 1)
  assert.equal(host.logs[0][1].stage, "poll")
  assert.equal(host.logs[0][1].error, "Expected JSON value")
  host.timers.shift()()
  await new Promise(setImmediate)
  assert.equal(host.logs.length, 1)
  failing = false
  host.timers.shift()()
  await new Promise(setImmediate)
  failing = true
  host.timers.shift()()
  await new Promise(setImmediate)
  assert.equal(host.logs.length, 2)
})

test("server tools round-trip through JSON RPC validation, the built GUI bridge, and the existing shared store", async () => {
  const tools = new Map()
  const permissions = []
  const sessionReads = []
  let bridge
  let transform
  const editor = { add(tool) { tools.set(tool.name, tool) } }
  const cleanup = await serverPlugin.setup({
    storage: serverStorage,
    rpc: { async register(contract, implementation) { if (contract.id === "fastfree_board.bridge") bridge = rpcTransport(contract, implementation) } },
    permission: { async assert(input) { permissions.push(input) } },
    session: { async get(input) { sessionReads.push(input); return { location: { directory: "/calling-project" }, model: sourceModel } }, async hook() {} },
    tool: { async transform(edit) { transform = edit; edit(editor) }, async reload() { tools.clear(); transform(editor) } },
  })
  assert.deepEqual([...tools.keys()], ["board_list", "board_get", "board_create", "board_update", "board_move", "board_link_session", "board_start_session", "board_remove", "board_wait", "hindsight_recall", "hindsight_retain", "hindsight_reflect"])
  let releaseWait
  let slowWait = false
  const host = windowHost(bridge, {
    async wait() { if (slowWait) await new Promise((resolve) => { releaseWait = resolve }) },
    async context() { return [{ type: "idle", outcome: "succeeded" }] },
  })
  const board = host.list(gui.Panel)[0].render({ session: host.session }).props.board
  const header = host.list(gui.Slot)[0].render({ session: host.session })
  host.tick()
  await new Promise(setImmediate)
  const context = { sessionID: "calling-session", agent: "build", messageID: "message", id: "call", signal: new AbortController().signal }
  const call = async (name, input) => {
    const result = tools.get(name).execute(input, context)
    await new Promise(setImmediate)
    assert.ok(host.timers.length)
    host.timers.shift()()
    return JSON.parse((await result).content)
  }
  const created = await call("board_create", { title: "From conversation", description: "- [ ] verify" })
  assert.equal(board.value.cards[0].id, created.id)
  assert.equal(header.props.board.value.cards.length, 1)
  assert.equal(host.storeCalls(), 8)
  await call("board_update", { task_id: created.id, description: "- [x] verify" })
  assert.equal(board.value.cards[0].description, "- [x] verify")
  await call("board_move", { task_id: created.id, column_id: "done" })
  await call("board_link_session", { task_id: created.id })
  const read = await call("board_get", { task_id: created.id })
  assert.equal(read.status, "done")
  assert.deepEqual(read.links, [{ id: "calling-session", server: "sidecar" }])
  assert.equal(permissions.length, 4)
  assert.equal(permissions[0].action, "board_update")
  assert.equal(host.created.length, 0)
  assert.equal(host.sent.length, 0)
  assert.equal((await call("board_list", {})).tasks.length, 1)
  const starting = call("board_start_session", { task_id: created.id })
  await new Promise(setImmediate)
  assert.equal(host.created.length, 1)
  assert.equal(host.created[0].input.location.directory, "/calling-project")
  assert.deepEqual(host.created[0].input.model, sourceModel)
  assert.deepEqual(sessionReads, [{ sessionID: "calling-session" }])
  host.created[0].resolve({ id: "from-tool" })
  const started = await starting
  assert.equal(started.session_id, "from-tool")
  assert.equal(started.server, "sidecar")
  assert.deepEqual(started.model, sourceModel)
  assert.equal(board.value.cards[0].status, "done")
  assert.ok(board.value.cards[0].links.some((link) => link.id === "from-tool"))
  assert.equal(host.sent[0].text, `Work on board task "From conversation" (task_id: ${created.id}). Mark checkboxes as you complete.\n\n- [x] verify`)
  assert.equal(host.opened.length, 0)
  assert.equal(permissions.at(-1).action, "board_start_session")
  const waited = await call("board_wait", { task_id: created.id })
  assert.equal(waited.all_succeeded, true)
  assert.equal(waited.sessions.length, 1)
  assert.equal(waited.sessions[0].id, "from-tool")
  assert.equal(permissions.at(-1).action, "board_start_session")
  slowWait = true
  const longWait = call("board_wait", { task_id: created.id, session_id: "from-tool" })
  await new Promise(setImmediate)
  assert.equal(typeof releaseWait, "function")
  assert.equal((await call("board_list", {})).tasks.length, 1)
  releaseWait()
  assert.equal((await longWait).all_succeeded, true)
  slowWait = false
  await call("board_update", { task_id: created.id, project: { server: "remote", directory: "/assigned-project" } })
  const remoteStart = call("board_start_session", { task_id: created.id, open: true })
  await new Promise(setImmediate)
  assert.equal(host.created[1].server, "remote")
  assert.equal(host.created[1].input.location.directory, "/assigned-project")
  assert.deepEqual(host.created[1].input.model, sourceModel)
  host.created[1].resolve({ id: "remote-created" })
  assert.equal((await remoteStart).server, "remote")
  assert.equal(host.opened.length, 1)
  assert.equal(host.opened[0][0].id, "remote-created")
  assert.equal(host.opened[0][1].focus, false)
  assert.ok(board.value.cards[0].links.some((link) => link.id === "remote-created" && link.server === "remote"))
  const failedStart = call("board_start_session", { task_id: created.id, open: false })
  const rejected = assert.rejects(failedStart, /Creation unavailable/)
  await new Promise(setImmediate)
  host.created[2].reject(new Error("Creation unavailable"))
  await rejected
  assert.equal(host.sent.length, 2)
  const settingsPage = host.list(gui.SettingsPage)[0]
  const settings = settingsPage.render({}).props.settings
  const captured = tools.get("board_create")
  settings.update((draft) => { draft.toolsEnabled = false })
  host.timers.shift()()
  await new Promise(setImmediate)
  assert.equal(tools.size, 0)
  assert.equal(savedSettings.get("tools-enabled"), false)
  await assert.rejects(captured.execute({ title: "Must stay disabled" }, context), /disabled in Settings/)
  assert.equal(host.list(gui.Panel).length, 1)
  settings.update((draft) => { draft.toolsEnabled = true })
  host.timers.shift()()
  await new Promise(setImmediate)
  assert.equal(tools.size, 12)
  assert.equal(savedSettings.get("tools-enabled"), true)
  assert.equal(host.opened.length, 1)
  assert.equal(board.value.cards[0].links.length, 3)
  await call("board_link_session", { task_id: created.id, unlink: true, session_id: "remote-created", server: "remote" })
  assert.equal(board.value.cards[0].links.length, 2)
  assert.ok(!board.value.cards[0].links.some((link) => link.id === "remote-created"))
  assert.equal((await call("board_remove", { task_id: created.id })).removed, true)
  assert.equal(board.value.cards.length, 0)
  assert.equal(header.props.board.value.cards.length, 0)
  assert.equal(permissions.at(-1).action, "board_remove")
  assert.equal(host.created.length, 3)
  assert.equal(host.sent.length, 2)
  cleanup()
})

test("denied write permissions never enqueue a Desktop mutation", async () => {
  const tools = new Map()
  await serverPlugin.setup({
    storage: serverStorage,
    rpc: { async register() {} },
    permission: { async assert() { throw new Error("Denied") } },
    session: { async hook() {} },
    tool: { async transform(edit) { edit({ add(tool) { tools.set(tool.name, tool) } }) } },
  })
  for (const [name, input] of [["board_create", { title: "Must not be created" }], ["board_remove", { task_id: "keep" }], ["board_link_session", { task_id: "keep", unlink: true }]]) {
    await assert.rejects(tools.get(name).execute(input, {
      sessionID: "session", agent: "build", messageID: "message", id: "call", signal: new AbortController().signal,
    }), /Denied/)
  }
})

function load(effects = [], runtime = {}) {
  const exports = {}
  const modules = {
    "@opencode/plugin/gui": gui,
    "@opencode/plugin/rpc": rpc,
    "solid-js/web": { template: () => () => {}, delegateEvents() {}, createComponent: (component, props) => ({ component, props }) },
    "solid-js": { ...solid, createEffect: (effect) => effects.push(effect), onCleanup() {}, createComponent: (component, props) => ({ component, props }) },
    effect,
  }
  runInNewContext(readFileSync(new URL("../dist/gui-experimental.cjs", import.meta.url), "utf8"), {
    exports, AbortController, crypto: webcrypto, queueMicrotask, setTimeout, clearTimeout,
    ...runtime,
    require(name) { assert.ok(name in modules, `Unexpected bundled import: ${name}`); return modules[name] },
  })
  return exports.default
}

function windowHost(bridge, sessionAPI = { async wait() {}, async context() { return [{ type: "idle", outcome: "succeeded" }] } }, extraRuntime = {}) {
  const effects = []
  const timers = []
  const logs = []
  const plugin = load(effects, { console: { warn: (...args) => logs.push(args) }, setTimeout(fn, delay) { if (delay === 500) timers.push(fn); return fn }, clearTimeout() {}, ...extraRuntime })
  const items = new Map()
  const calls = []
  const created = []
  const opened = []
  const sent = []
  const dialogs = []
  const stores = new Map()
  let storeCalls = 0
  const session = { id: "session-1", key: "sidecar\nsession-1", server: { id: "sidecar" }, directory: "/project" }
  let current = session
  const ctx = {
    id,
    sessions: { current: () => current, list: () => current ? [current] : [] },
    dialogs: { open(render) {
      const entry = { closed: false }
      const handle = { close: () => { entry.closed = true } }
      entry.content = render(handle)
      dialogs.push(entry)
      return handle
    } },
    add(token, item) { const list = items.get(token.id) ?? []; list.push(item); items.set(token.id, list) },
    t(key, params) {
      const enCatalog = {board:"Board",boardSettings:"Board settings",filterTasks:"Filter tasks",searchTasksPlaceholder:"Search tasks…",allLabels:"All labels",allProjects:"All projects",noProject:"No project",clearFilters:"Clear filters",taskLayout:"Task layout",layoutOverlay:"Overlay",layoutSplit:"Split",layoutFull:"Full",newTask:"New Task",newColumn:"New column",editColumn:"Edit column",deleteColumn:"Delete column",saveColumn:"Save column",columnName:"Column name",name:"Name",columnNamePlaceholder:"e.g. Blocked",color:"Color",columnColor:"Column color",moveTasksTo:"Move tasks to",chooseColumn:"Choose column","tasksMoveNotice.zero":"This column is empty. No tasks will be deleted.","tasksMoveNotice.one":"1 task will be moved to another column. No tasks will be deleted.","tasksMoveNotice.two":"2 tasks will be moved to another column. No tasks will be deleted.","tasksMoveNotice.few":"{{count}} tasks will be moved to another column. No tasks will be deleted.","tasksMoveNotice.many":"{{count}} tasks will be moved to another column. No tasks will be deleted.","tasksMoveNotice.other":"{{count}} tasks will be moved to another column. No tasks will be deleted.",emptyColumn:"This column is empty. No tasks will be deleted.",closeTaskDetails:"Close task details",closeTaskEditor:"Close task editor",editTask:"Edit task",removeTask:"Remove task",taskActions:"Task actions",openTask:"Open {{title}}",expandColumn:"Expand {{title}}",collapseColumn:"Collapse {{title}}",dragColumn:"Drag {{title}} column",addTaskToColumn:"Add task to {{title}}",columnOptions:"{{title}} column options",deleteColumnDialog:"Delete {{title}}?",deleteTaskDialog:"Delete {{title}}? Linked sessions will not be deleted.",deleteTaskTitle:"Delete task?",columnDeleteFailed:"Column could not be deleted",columnDeleteReason:"Keep at least one column and choose a destination for its tasks.",noMatchingTasks:"No matching tasks",noTasksYet:"No tasks yet",checklistProgress:"Checklist progress",checklistItem:"Checklist item {{index}}","linkedSession.zero":"No linked sessions","linkedSession.one":"1 linked session","linkedSession.two":"2 linked sessions","linkedSession.few":"{{count}} linked sessions","linkedSession.many":"{{count}} linked sessions","linkedSession.other":"{{count}} linked sessions",startSession:"Start session",linkCurrentSession:"Link current session",unlinkSessionFromTask:"Unlink session from task",unlinkSession:"Unlink {{title}} from task",openSession:"Open session: {{title}}",taskDetails:"Task details",taskDetailsTitle:"Task details: {{title}}",sessionFallback:"Session {{id}}",noProjectHint:"No project · new sessions use the currently open project",updatedAt:"Updated {{date}}",description:"Description",noDescription:"No description yet. Edit the task to add context.",linkedSessions:"Linked sessions",linkedSessionsHint:"Start a new session with this task, or link the current session. Status moves to Review automatically when all linked sessions finish successfully.",title:"Title",whatNeedsDone:"What needs to be done?",status:"Status",project:"Project",write:"Write",preview:"Preview",generating:"Generating…",descriptionPlaceholder:"Context, acceptance criteria… Markdown and - [ ] checklists supported.",nothingToPreview:"Nothing to preview yet.",labels:"Labels",labelsPlaceholder:"ui, bug, priority",cancel:"Cancel",saveTask:"Save task",newTaskFromSession:"New Task from this Session",linkCurrentSessionHint:"Linked only when you save. No session is started.",generatingDescription:"Generating a description from this conversation…",reviewDescription:"Review and edit the description before saving.",couldNotCreateTask:"Could not create task",columnMissing:"The selected column no longer exists. Choose another column.",couldNotGenerateDescription:"Could not generate task description",descriptionOptionalManual:"You can still write the description and save the task manually.",couldNotStartSession:"Could not start session",sessionAlreadyStarting:"A session is already being started for this task.",workspaceDisconnected:"The workspace server is disconnected.",taskDeletedSessionNotStarted:"The task was deleted. The new session was not started.",sessionLinkedServerDropped:"The session was linked, but the server disconnected before the task could be sent.",launchingServerDisconnected:"The launching session's server is disconnected.",boardVersion:"Board version {{version}}","boardCards.zero":"Board · no cards","boardCards.one":"Board · 1 card","boardCards.two":"Board · 2 cards","boardCards.few":"Board · {{count}} cards","boardCards.many":"Board · {{count}} cards","boardCards.other":"Board · {{count}} cards",openBoard:"Open Board",resizeDetail:"Resize task details",colorNeutral:"Neutral",colorBlue:"Blue",colorAmber:"Amber",colorAccent:"Accent",colorGreen:"Green",colorRed:"Red",columnBacklog:"Backlog",columnReady:"Ready",columnProgress:"In progress",columnReview:"Review",columnDone:"Done",taskPrompt:"Work on board task \"{{title}}\" (task_id: {{taskId}}). Mark checkboxes as you complete.",agentTools:"Agent tools",enableAgentTools:"Enable agent tools",agentToolsDescription:"Allow agents to read and manage tasks. Turning this off leaves the board available for manual use.",manageBoardAgents:"Manage how agents interact with Board.",hinssightTitle:"Hindsight memory",hindsightTitle:"Hindsight memory",hindsightDescription:"Optional. Store and recall task memory in Hindsight (hindsight.vectorize.io). The board works without it.",hindsightEnable:"Enable Hindsight",hindsightEnableDescription:"Use the key below to recall related memory when tasks are created and to retain finished tasks.",hindsightApiKey:"API key (Bearer)",hindsightApiKeyPlaceholder:"hsk_…",hindsightBank:"Bank ID",hindsightBankPlaceholder:"hermes",hindsightEmptyKey:"Add your Hindsight API key to enable memory recall and retain."}
      let out = enCatalog[key] ?? key
      if (!params) return out
      for (const [name, value] of Object.entries(params)) out = out.split(`{{${name}}}`).join(String(value))
      return out
    },
    plural(key, count) {
      const enCatalog = {"linkedSession.zero":"No linked sessions","linkedSession.one":"1 linked session","linkedSession.two":"2 linked sessions","linkedSession.few":"{{count}} linked sessions","linkedSession.many":"{{count}} linked sessions","linkedSession.other":"{{count}} linked sessions","tasksMoveNotice.zero":"This column is empty. No tasks will be deleted.","tasksMoveNotice.one":"1 task will be moved to another column. No tasks will be deleted.","tasksMoveNotice.two":"2 tasks will be moved to another column. No tasks will be deleted.","tasksMoveNotice.few":"{{count}} tasks will be moved to another column. No tasks will be deleted.","tasksMoveNotice.many":"{{count}} tasks will be moved to another column. No tasks will be deleted.","tasksMoveNotice.other":"{{count}} tasks will be moved to another column. No tasks will be deleted.","boardCards.zero":"Board · no cards","boardCards.one":"Board · 1 card","boardCards.two":"Board · 2 cards","boardCards.few":"Board · {{count}} cards","boardCards.many":"Board · {{count}} cards","boardCards.other":"Board · {{count}} cards"}
      const category = count === 1 ? "one" : "other"
      const template = enCatalog[`${key}.${category}`] ?? enCatalog[`${key}.other`] ?? key
      return template.split("{{count}}").join(String(count))
    },
    locale: { direction: () => "ltr", locale: () => "en-US" },
    layout: {
      open: (...args) => calls.push(args), state: () => "closed",
      settings: (page) => calls.push({ settings: page }),
      draft: () => { throw new Error("Starting must not depend on a draft tab") },
    },
    tabs: { open: (...args) => opened.push(args) },
    screen: { current: () => { throw new Error("Starting a session must not write to the composer") } },
    servers: { list: () => bridge ? ["sidecar"] : [], get: (serverID) => ({ connected: true, id: serverID, client: { rpc: () => bridge, session: { async get() { return { location: { directory: "/project" }, model: sourceModel } }, ...sessionAPI } }, data: { project: { list: () => [] }, session: {
      get(id) { return { id, title: `Conversation ${id}` } },
      create(input) {
        let resolve, reject
        const request = new Promise((yes, no) => { resolve = yes; reject = no })
        created.push({ input, resolve, reject, server: serverID })
        return { id: "created", request }
      },
      async prompt(input) { sent.push(input) },
    } } }) },
    storage: { store(key, options) {
      storeCalls++
      const scope = JSON.stringify([key, options.scope])
      // Tests pin the tool-friendly English copy; production defaults to Arabic.
      if (key === "settings-v1" && options.initial && typeof options.initial === "object") {
        options = { ...options, initial: { ...options.initial, locale: "en" } }
      }
      // Deliberately return independent handles: the plugin must share its setup-owned store.
      const store = { value: structuredClone(options.initial), ready: () => true, update(fn) { fn(this.value) }, set(value) { this.value = value } }
      stores.set(scope, store)
      return store
    } },
    toast: { show: (input) => calls.push(input) },
  }
  plugin.setup(ctx)
  return {
    calls, session, created, opened, sent, dialogs, logs, stores, timers, storeCalls: () => storeCalls, tick: () => effects.forEach((effect) => effect()), setSession: (value) => { current = value },
    list: (token) => (items.get(token.id) ?? []).map((item) => typeof item === "function" ? item() : item).filter(Boolean),
  }
}

test("registers the board, launchers, settings page, header shortcut, and styles", () => {
  const host = windowHost()
  assert.equal(host.list(gui.Command).length, 2)
  assert.equal(host.list(gui.Panel).length, 1)
  assert.equal(host.list(gui.MenuItem).length, 1)
  assert.equal(host.list(gui.Style).length, 1)
  assert.equal(host.list(gui.ComposerPill).length, 1)
  assert.deepEqual(host.list(gui.Slot).map((slot) => slot.at), ["session.header"])
  assert.equal(host.list(gui.SettingsPage).length, 1)
  assert.equal(host.list(gui.SettingsPage)[0].title, "Board")
  assert.equal(host.list(gui.SettingsPage)[0].render({}).props.settings.value.toolsEnabled, true)
  for (const token of [gui.TitlebarItem, gui.Server, gui.LinkHandler]) {
    assert.equal(host.list(token).length, 0)
  }
  assert.equal(load().main, undefined)
  assert.equal(load().stores, undefined)
})

test("settings bundle uses OpenCode's native settings header, card, and row slots", () => {
  const bundle = readFileSync(new URL("../dist/gui-experimental.cjs", import.meta.url), "utf8")
  for (const name of ["settings-tab-header", "settings-tab-title", "settings-tab-body--sectioned", "settings-list", "settings-row-copy", "settings-row-title", "settings-row-description", "settings-row-control"]) {
    assert.ok(bundle.includes(name), `Missing native settings layout: ${name}`)
  }
})

test("Board uses one name for its launchers and its settings cog opens the registered page", () => {
  const host = windowHost()
  const panel = host.list(gui.Panel)[0]
  assert.equal(host.list(gui.Command)[0].title, "Board")
  assert.equal(host.list(gui.Command)[0].slash.name, "board")
  assert.equal(host.list(gui.MenuItem)[0].title, "Board")
  assert.equal(panel.list({ open: ["kanban"] })[0].title, "FastFree Board")
  panel.render({ session: host.session }).props.openSettings()
  assert.equal(host.calls.at(-1).settings, host.list(gui.SettingsPage)[0].id)
})

test("Board bundle includes a settings cog and footer using the package version", () => {
  const bundle = readFileSync(new URL("../dist/gui-experimental.cjs", import.meta.url), "utf8")
  const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
  for (const name of ["settings-gear", "Board settings", "sc-board-footer", "Board version", version]) assert.ok(bundle.includes(name), `Missing Board chrome: ${name}`)
})

test("compact board typography excludes native Markdown in descriptions and previews", () => {
  const css = readFileSync(new URL("../src/gui/kanban.css", import.meta.url), "utf8")
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{[^{}]*\}/g)].map((match) => match[1].trim())
  const typography = rules.filter((selector) => /^\.sc-(root|kanban-ui) (h[23]|:is\((h2|p))/.test(selector))
  assert.equal(typography.length, 4)
  for (const selector of typography) assert.ok(selector.includes(':not(:where([data-component="markdown"] *))'), selector)
  assert.match(css, /\.sc-root \.sc-detail-toolbar \{[^}]*flex-shrink: 0/)
  assert.match(css, /\.sc-root \.sc-detail-body \{[^}]*min-height: 0; overflow: auto/)
})

test("header New Task opens a blank form and cancellation does not create a task or session", () => {
  const host = windowHost()
  const header = host.list(gui.Slot)[0].render({ session: host.session })
  header.props.createTask(false)
  const dialog = host.dialogs[0]
  assert.equal(dialog.content.props.linked, false)
  assert.equal(dialog.content.props.initialTitle, "")
  assert.equal(dialog.content.props.project.directory, "/project")
  assert.equal(header.props.board.value.cards.length, 0)
  dialog.content.props.cancel()
  assert.equal(dialog.closed, true)
  assert.equal(header.props.board.value.cards.length, 0)
  assert.equal(host.created.length, 0)
  assert.equal(host.sent.length, 0)
})

test("session task modal opens immediately, generates a description, and links the captured session only on save", async () => {
  let resolve, request, signal
  const host = windowHost(undefined, { generate(input, options) {
    request = input
    signal = options.signal
    return new Promise((done) => { resolve = done })
  } })
  const header = host.list(gui.Slot)[0].render({ session: host.session })
  header.props.createTask(true)
  const dialog = host.dialogs[0]
  const form = dialog.content.props
  assert.equal(form.linked, true)
  assert.equal(form.initialTitle, "Conversation session-1")
  assert.equal(form.sessionTitle, "Conversation session-1")
  assert.equal(form.description.value, "")
  assert.equal(form.description.loading, true)
  assert.equal(request.sessionID, "session-1")
  assert.match(request.prompt, /concise task description in Markdown/)
  assert.equal(signal.aborted, false)
  assert.equal(form.status, "backlog")
  assert.equal(header.props.board.value.cards.length, 0)
  host.setSession({ ...host.session, id: "different-session", server: { id: "remote" }, directory: "/other" })
  const fields = { title: "Follow up", description: "- [ ] Work", labels: "follow-up", status: "ready", project: { server: "remote", directory: "/assigned" } }
  form.save(fields)
  assert.equal(dialog.closed, false)
  assert.equal(header.props.board.value.cards.length, 0)
  resolve({ text: " Generated description " })
  await new Promise(setImmediate)
  assert.equal(form.description.loading, false)
  assert.equal(form.description.value, "Generated description")
  form.description.onInput("Edited description")
  assert.equal(form.description.value, "Edited description")
  form.save(fields)
  assert.equal(dialog.closed, true)
  const task = header.props.board.value.cards[0]
  assert.equal(task.title, "Follow up")
  assert.equal(task.status, "ready")
  assert.equal(task.project.server, "remote")
  assert.deepEqual(Array.from(task.links, (link) => [link.server, link.id]), [["sidecar", "session-1"]])
  form.save(fields)
  assert.equal(header.props.board.value.cards.length, 1)
  assert.equal(host.list(gui.Panel)[0].render({ session: host.session }).props.board.value.cards.length, 1)
  assert.equal(host.created.length, 0)
  assert.equal(host.sent.length, 0)
})

test("ordinary task modal saves without a link and rejects deleted columns", () => {
  const host = windowHost()
  const header = host.list(gui.Slot)[0].render({ session: host.session })
  const board = header.props.board
  header.props.createTask(false)
  const dialog = host.dialogs[0]
  const fields = { title: "Standalone", description: "", labels: "", status: "backlog" }
  const columns = board.value.columns
  board.update((draft) => { draft.columns = [] })
  dialog.content.props.save(fields)
  assert.equal(dialog.closed, false)
  assert.equal(board.value.cards.length, 0)
  assert.equal(host.calls.at(-1).title, "Could not create task")
  board.update((draft) => { draft.columns = columns })
  dialog.content.props.save(fields)
  assert.equal(dialog.closed, true)
  assert.equal(board.value.cards.length, 1)
  assert.equal(board.value.cards[0].links.length, 0)
})

test("failed or empty generation unlocks manual editing and allows unlinking before save", async () => {
  for (const fails of [false, true]) {
    const host = windowHost(undefined, { async generate() {
      if (fails) throw new Error("Disconnected")
      return { text: "  " }
    } })
    const header = host.list(gui.Slot)[0].render({ session: host.session })
    header.props.createTask(true)
    await new Promise(setImmediate)
    const dialog = host.dialogs[0]
    assert.equal(dialog.content.props.description.value, "")
    assert.equal(dialog.content.props.description.loading, false)
    assert.equal(host.calls.at(-1).title, "Could not generate task description")
    assert.equal(header.props.board.value.cards.length, 0)
    dialog.content.props.save({ title: "Unlinked", description: "", labels: "", status: "backlog" }, false)
    assert.equal(header.props.board.value.cards[0].links.length, 0)
    assert.equal(host.created.length, 0)
    assert.equal(host.sent.length, 0)
  }
})

test("closing a generating task modal aborts only its generation and ignores late results", async () => {
  for (const dismiss of ["cancel", "dispose"]) {
    let resolve, signal
    const host = windowHost(undefined, { generate(input, options) {
      signal = options.signal
      return new Promise((done) => { resolve = done })
    } })
    const header = host.list(gui.Slot)[0].render({ session: host.session })
    header.props.createTask(true)
    const form = host.dialogs[0].content.props
    form[dismiss]()
    assert.equal(signal.aborted, true)
    resolve({ text: "Late result" })
    await new Promise(setImmediate)
    assert.equal(form.description.value, "")
    form.save({ title: "Late save", description: "", labels: "", status: "backlog" })
    assert.equal(header.props.board.value.cards.length, 0)
    assert.equal(host.calls.length, 0)
    assert.equal(host.created.length, 0)
    assert.equal(host.sent.length, 0)
  }
})

test("header task creation waits for storage readiness and includes all dropdown actions", () => {
  const host = windowHost()
  const header = host.list(gui.Slot)[0].render({ session: host.session })
  header.props.board.ready = () => false
  header.props.createTask(true)
  assert.equal(host.dialogs.length, 0)
  const bundle = readFileSync(new URL("../dist/gui-experimental.cjs", import.meta.url), "utf8")
  for (const action of ["Open Board", "New Task", "New Task from this Session"]) assert.ok(bundle.includes(action))
})

test("header count and board share one live store across changes and panel remounts", () => {
  const host = windowHost()
  const panel = host.list(gui.Panel)[0]
  const header = host.list(gui.Slot)[0].render({ session: host.session })
  const board = panel.render({ session: host.session }).props.board
  assert.equal(header.props.board, board)
  board.value.cards = Array.from({ length: 5 }, (_, id) => ({ id: String(id) }))
  host.tick()
  assert.equal(header.props.board.value.cards.length, 5)
  board.update((draft) => { draft.cards.push({ id: "new" }) })
  assert.equal(header.props.board.value.cards.length, 6)
  host.tick()
  assert.equal(header.props.board.value.cards.length, 6)
  assert.equal(panel.render({ session: host.session }).props.board, board)
  board.update((draft) => { draft.cards = [] })
  assert.equal(header.props.board.value.cards.length, 0)
  assert.equal(host.storeCalls(), 8)
})

test("board command follows the current session and is unavailable on Home", () => {
  const host = windowHost()
  const command = host.list(gui.Command)[0]
  assert.equal(command.id, "kanban")
  assert.equal(command.enabled, true)
  command.run()
  assert.equal(host.calls[0][0], `${id}:kanban`)
  assert.equal(host.calls[0][1], host.session)
  assert.equal(host.calls[0][2].tab, "select")
  const next = { ...host.session, id: "session-2" }
  host.setSession(next)
  command.run()
  assert.equal(host.calls[1][1], next)
  host.setSession(undefined)
  assert.equal(host.list(gui.Command)[0].enabled, false)
  command.run()
  assert.equal(host.calls.length, 2)
})

test("board tab identity is stable and absent until opened", () => {
  const host = windowHost()
  const panel = host.list(gui.Panel)[0]
  assert.equal(panel.list({ open: [] }).length, 0)
  const tabs = panel.list({ open: ["kanban"] })
  assert.equal(tabs.length, 1)
  assert.equal(tabs[0].id, "kanban")
  assert.equal(tabs[0], panel.list({ open: ["kanban"] })[0])
})

test("panel menu opens the board for the current session", () => {
  const host = windowHost()
  const menu = host.list(gui.MenuItem)[0]
  assert.equal(menu.menu, "session.panel")
  menu.run()
  assert.equal(host.calls[0][0], `${id}:kanban`)
  assert.equal(host.calls[0][1], host.session)
})

async function startingTask(fields = {}) {
  const host = windowHost()
  host.tick()
  const task = { id: "task", title: "Build it", description: "Acceptance criteria", labels: "", status: "backlog", session: "", ...fields }
  const panel = host.list(gui.Panel)[0].render({ session: host.session })
  const starting = panel.props.start(task)
  const scope = JSON.stringify(["kanban-v2", "global"])
  const board = host.stores.get(scope)
  board.value.cards.push(task)
  await new Promise(setImmediate)
  return { host, task, board, starting, start: () => panel.props.start(task) }
}

test("starting links the created session and sends the task directly without touching the composer", async () => {
  const { host, task, starting } = await startingTask()
  assert.equal(host.created[0].input.location.directory, "/project")
  assert.equal(host.created[0].input.model.providerID, "openai")
  assert.equal(host.created[0].input.model.id, "test-model")
  assert.equal(host.created[0].input.model.variant, "high")
  assert.equal(task.session, "")
  host.created[0].resolve({ id: "created" })
  await starting
  assert.deepEqual(Array.from(task.links, (link) => [link.server, link.id]), [["sidecar", "created"]])
  assert.equal(task.session, "")
  assert.equal(task.status, "backlog")
  assert.ok(task.updatedAt)
  assert.equal(host.opened[0][0].id, "created")
  assert.equal(host.opened[0][1].focus, true)
  assert.equal(host.sent.length, 1)
  assert.equal(host.sent[0].sessionID, "created")
  assert.equal(host.sent[0].text, 'Work on board task "Build it" (task_id: task). Mark checkboxes as you complete.\n\nAcceptance criteria')
  host.tick()
  assert.equal(host.sent.length, 1)
})

test("failed creation leaves the task unlinked and reports the error", async () => {
  const { host, task, starting } = await startingTask()
  host.created[0].reject(new Error("Server unavailable"))
  await starting
  assert.equal(task.session, "")
  assert.equal(host.opened.length, 0)
  assert.equal(host.sent.length, 0)
  assert.equal(host.calls[0].title, "Could not start session")
})

test("global tasks start on their assigned project and server, not the currently open session", async () => {
  const { host, task, starting } = await startingTask({ project: { server: "remote", directory: "/other-project" } })
  assert.equal(host.created[0].server, "remote")
  assert.equal(host.created[0].input.location.directory, "/other-project")
  host.created[0].resolve({ id: "created" })
  await starting
  assert.equal(host.opened[0][0].server, "remote")
  assert.equal(task.links[0].server, "remote")
})

test("repeated clicks do not create duplicate sessions while creation is pending", async () => {
  const { host, task, starting, start } = await startingTask()
  await start()
  assert.equal(host.created.length, 1)
  host.created[0].resolve({ id: "created" })
  await starting
  const second = start()
  await new Promise(setImmediate)
  host.created[1].resolve({ id: "created-2" })
  await second
  assert.deepEqual(Array.from(task.links, (link) => link.id), ["created", "created-2"])
})

test("starting preserves manual link changes and never executes deleted tasks", async () => {
  const { host, task, starting } = await startingTask()
  task.session = "manually-linked"
  host.created[0].resolve({ id: "created" })
  await starting
  assert.deepEqual(Array.from(task.links, (link) => link.id), ["manually-linked", "created"])
  assert.equal(host.sent.length, 1)
  const next = await startingTask()
  next.board.value.cards = []
  next.host.created[0].resolve({ id: "created" })
  await next.starting
  assert.equal(next.board.value.cards.length, 0)
  assert.equal(next.host.sent.length, 0)
})

test("hindsight agent tools call the configured local daemon (hermetic stub)", async () => {
  const { createServer } = await import("node:http")
  const calls = []
  const stub = createServer((req, res) => {
    let body = ""
    req.on("data", (chunk) => { body += chunk })
    req.on("end", () => {
      calls.push({ url: req.url, body: body ? JSON.parse(body) : null })
      res.setHeader("Content-Type", "application/json")
      if (req.url?.endsWith("/memories/recall")) { res.end(JSON.stringify({ results: [{ text: "bank is fastfree" }] })) }
      else if (req.url?.endsWith("/memories")) { res.end(JSON.stringify({ success: true, items_count: 1, bank_id: "fastfree" })) }
      else if (req.url?.endsWith("/reflect")) { res.end(JSON.stringify({ text: "reflect answer" })) }
      else { res.statusCode = 404; res.end("{}") }
    })
  })
  await new Promise((resolve) => stub.listen(0, "127.0.0.1", resolve))
  const previous = { endpoint: process.env.FASTFREE_HINDSIGHT_ENDPOINT, bank: process.env.FASTFREE_HINDSIGHT_BANK }
  process.env.FASTFREE_HINDSIGHT_ENDPOINT = `http://127.0.0.1:${stub.address().port}`
  process.env.FASTFREE_HINDSIGHT_BANK = "fastfree"
  try {
    const tools = new Map()
    const editor = { add(tool) { tools.set(tool.name, tool) } }
    const hooks = new Map()
    const cleanup = await serverPlugin.setup({
      storage: serverStorage,
      rpc: { async register() {} },
      permission: { async assert() {} },
      session: { async get() { return { location: { directory: "/tmp" }, model: sourceModel } }, async hook(event, handler) { hooks.set(event, handler) } },
      tool: { async transform(edit) { edit(editor) }, async reload() {} },
    })
    const context = { sessionID: "calling-session", agent: "build", messageID: "message", id: "call", signal: new AbortController().signal }
    const recall = await tools.get("hindsight_recall").execute({ query: "migration" }, context)
    assert.match(recall.content, /bank is fastfree/)
    const retain = await tools.get("hindsight_retain").execute({ content: "bank migrated to fastfree", document_id: "task:test" }, context)
    assert.match(retain.content, /retain ok/)
    const reflect = await tools.get("hindsight_reflect").execute({ query: "status?" }, context)
    assert.equal(reflect.content, "reflect answer")
    assert.equal(calls.length, 3)
    assert.deepEqual(calls.map((call) => call.url), [
      "/v1/default/banks/fastfree/memories/recall",
      "/v1/default/banks/fastfree/memories",
      "/v1/default/banks/fastfree/reflect",
    ])
    // Context hook: injects the board instruction once per session + one memory snapshot.
    const inject = hooks.get("context")
    assert.equal(typeof inject, "function")
    const event = () => ({ sessionID: "memory-session", tools: { board_list: {} }, system: [], messages: [{ role: "user", content: "Fix RTL clipping in the installer screens" }], options: {} })
    const first = event()
    await inject(first)
    const boardTexts = first.system.filter((part) => part.text.includes("FASTFREE_BOARD"))
    const memoryTexts = first.system.filter((part) => part.text.includes("FASTFREE_MEMORY"))
    assert.equal(boardTexts.length, 1)
    assert.equal(memoryTexts.length, 1)
    assert.match(memoryTexts[0].text, /bank is fastfree/)
    const second = event()
    await inject(second)
    assert.equal(second.system.filter((part) => part.text.includes("FASTFREE_BOARD")).length, 1)
    assert.equal(second.system.filter((part) => part.text.includes("FASTFREE_MEMORY")).length, 0)
    const callsBefore = calls.length
    // Auxiliary requests carry no tools: nothing injected, no recall issued.
    const aux = { sessionID: "aux-session", tools: {}, system: [], messages: [{ role: "user", content: "give me a title" }], options: {} }
    await inject(aux)
    assert.equal(aux.system.length, 0)
    assert.equal(calls.length, callsBefore)
    if (cleanup) await cleanup()
  } finally {
    if (previous.endpoint === undefined) delete process.env.FASTFREE_HINDSIGHT_ENDPOINT; else process.env.FASTFREE_HINDSIGHT_ENDPOINT = previous.endpoint
    if (previous.bank === undefined) delete process.env.FASTFREE_HINDSIGHT_BANK; else process.env.FASTFREE_HINDSIGHT_BANK = previous.bank
    await new Promise((resolve) => stub.close(resolve))
  }
})

test("board_create attempts a Hindsight recall through the bridge transport and degrades to no section on 503", async () => {
  const tools = new Map()
  let bridge
  const cleanup = await serverPlugin.setup({
    storage: serverStorage,
    rpc: { async register(contract, implementation) { if (contract.id === "fastfree_board.bridge") bridge = rpcTransport(contract, implementation) } },
    permission: { async assert() {} },
    session: { async get() { return { location: { directory: "/calling-project" }, model: sourceModel } }, async hook() {} },
    tool: { async transform(edit) { edit({ add(tool) { tools.set(tool.name, tool) } }) }, async reload() {} },
  })
  // Bound transport: the create path must round-trip hindsight_recall through the plugin server RPC wiring.
  const recallInputs = []
  const spyBridge = { ...bridge, hindsight_recall: async (input) => { recallInputs.push(input); return { markdown: null } } }
  const host = windowHost(spyBridge)
  host.tick()
  await new Promise(setImmediate)
  const board = host.list(gui.Panel)[0].render({ session: host.session }).props.board
  // The server-side queue has two 5s rules (src/bridge-queue.ts): a fresh poller may claim the lead only after 5s
  // of silence from the previous leader, and request() refuses while no poll has landed within 5s. The earlier tests
  // in this process stop polling milliseconds before we run, so wait out the election window, then let one poll of
  // ours claim the lead (it delivers nothing; the request is enqueued afterwards).
  await new Promise((resolve) => setTimeout(resolve, 5_200))
  assert.ok(host.timers.length)
  host.timers.shift()()
  await new Promise(setImmediate)
  const context = { sessionID: "calling-session", agent: "build", messageID: "message", id: "call", signal: new AbortController().signal }
  const call = async (name, input) => {
    const result = tools.get(name).execute(input, context)
    await new Promise(setImmediate)
    await new Promise(setImmediate)
    assert.ok(host.timers.length)
    host.timers.shift()()
    return JSON.parse((await result).content)
  }
  const created = await call("board_create", { title: "Recall wiring", description: "- [ ] verify" })
  assert.equal(recallInputs.length, 1)
  assert.equal(recallInputs[0].bank, "fastfree")
  assert.equal(recallInputs[0].endpoint, "http://127.0.0.1:9177")
  assert.match(recallInputs[0].query, /Recall wiring/)
  assert.equal(board.value.cards[0].description, "- [ ] verify")
  assert.equal(created.description, "- [ ] verify")
  // Unbound transport: the direct-fetch fallback hits a 503-serving fetch stub inside the bundle's sandbox; the task is still created without a section.
  let recallFetches = 0
  const fallbackFetch = async (url) => {
    if (String(url).includes("127.0.0.1:9177")) recallFetches += 1
    return { ok: false, status: 503, statusText: "Unavailable", text: async () => "", json: async () => ({ results: [] }) }
  }
  const fallback = windowHost(undefined, undefined, { fetch: fallbackFetch })
  fallback.tick()
  await new Promise(setImmediate)
  const header = fallback.list(gui.Slot)[0].render({ session: fallback.session })
  header.props.createTask(false)
  const dialog = fallback.dialogs[0]
  dialog.content.props.save({ title: "Fallback create", description: "- [ ] check", labels: "", status: "backlog", project: { server: "sidecar", directory: "/project" } })
  for (let i = 0; i < 3; i += 1) await new Promise(setImmediate)
  assert.equal(recallFetches, 1)
  assert.ok(fallback.logs.some((entry) => entry[0] === "[fastfree_board] Hindsight recall failed:" && entry[1] === 503))
  assert.equal(header.props.board.value.cards[0].title, "Fallback create")
  assert.equal(header.props.board.value.cards[0].description, "- [ ] check")
  if (cleanup) await cleanup()
})
