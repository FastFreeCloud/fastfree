# Review Gate with Ranked Findings — fastfree_board plugin (PLAN v1)

Derived from kagan-sh/kagan (intake before run, review before approve, triage of ranked findings).
Additive adaptation; no columns replaced. Workspace: `plugins\fastfree_board\`.

## 1. Ground truth (citations, verified on disk)

- Task status on the card: `CardSchema` (src/gui/kanban-model.ts:18-29); global store "kanban-v2" via globalBoard() (kanban-storage.ts:4-13); review id `review` (kanban-model.ts:7).
- Status-write paths to gate:
  1) UI finish() → moveCard (kanban.tsx:212; write :207-215)
  2) UI move() kanban.tsx:224-226 (TaskDetail column menu task-detail.tsx:33, wired kanban.tsx:361)
  3) editor save status change → moveCard (kanban.tsx:372)
  4) agent applyBoardRequest "move" → moveCard (board-tools.ts:79-84; pure, :37-38; call site board-bridge.ts:50-51)
  5) auto-move progress→review → moveCard (auto-move.ts:34-54)
- Agent moves into review/done already retain to Hindsight (board-bridge.ts:67-71; auto-move retains at auto-move.ts:55).
- Agent tools: toolSchemas (board-tools.ts:5-15) iterated by server tool.transform (server.ts:80-101); permission default = board_update (server.ts:89-91); board_move description board-tools.ts:10.
- Hindsight: renderer cannot reach 127.0.0.1:9177 (no CORS) — traffic MUST go through the server part (bind window.tsx:25-29; hindsight.ts:17-39); server registers hindsight_* RPC methods (server.ts:67-79) on BoardBridge (rpc.ts:28-39); loopback-only guard (hindsight-server.ts:13-35); defaults endpoint http://127.0.0.1:9177 bank fastfree (hindsight.ts:48-54).
- Settings "settings-v1": SettingsSchema{toolsEnabled, locale?, columnsSeeded?} (settings.tsx:7-18).
- i18n: EN (i18n.ts:4-150) + AR (:151-297); Arabic-first default (:301-303).

## 2. Data model — src/gui/kanban-model.ts

export const FindingSchema = Schema.Struct({
  id: Schema.String,                  // crypto.randomUUID()
  severity: Schema.Literals(["blocker","major","minor","nit"]),
  title: Schema.String,
  detail: Schema.optional(Schema.String),
  status: Schema.Literals(["open","resolved","waived"]),
  waiveReason: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),   // session/tool id provenance
  createdAt: Schema.Number,
})
// CardSchema (kanban-model.ts:18) gains ONE optional key:
//   findings: Schema.optional(Schema.Array(FindingSchema))
// Legacy cards decode unchanged. BoardSchema unchanged.
New pure exports: SEVERITY_RANK = { blocker:0, major:1, minor:2, nit:3 };
blockingFindings(task) → open blocker|major rank-sorted;
gateOpenCount(task); canMoveToReview(task, mode).
Extend retain() (hindsight.ts:121) with optional { documentId?, context?, tags? }.

## 3. Agent tool surface — src/board-tools.ts (+1 tool, +1 gate)

New key `findings` in toolSchemas (board-tools.ts:5):
  `action: add|list|resolve|waive; task_id; finding_id?; severity?; title?; detail?; reason?`
applyBoardRequest: new branch operation==="findings" (pure add/list/resolve/waive; bumps updatedAt).
move branch gate: applyBoardRequest gains options param { gate?: "off"|"warn"|"enforce", gateDone?: boolean } (default warn / false).
  Destination "review" (or "done" with gateDone) + blockingFindings().length>0:
    enforce → throw `Review gate: N unresolved blocker/major finding(s) on <id>. Resolve or waive via board_findings.`
    warn    → move proceeds; result gains warnings:["review-gate: …"]
board_move description: moves into review rejected while open blocker/major findings remain.
Server part needs ZERO changes (auto-register server.ts:82; permission board_update server.ts:90). No rpc.ts changes.

## 4. GUI gate + findings UI

kanban.tsx finish() (:194-221): before move, if dest==="review" && mode≠off && blocking>0 →
  enforce: abort + toast error; warn: move + warning toast.
Same in move() (:224) and editor-save path (:367-378).
auto-move.ts (:34-54): skip cards with blocking findings (mode≠off) — stay in progress (same "respect user re-plan" rule as :48).
task-detail.tsx: new <section> between description (:41) and linked sessions (:42) — severity-ranked findings, add/resolve/waive inline (waive requires reason).
kanban.tsx TaskSummary chip (:455-472): findings count chip with tooltip.
Gate evidence helper retainGateDecision(hindsight, card, transition, decision) in hindsight.ts — fire-and-forget; document_id "task:<id>:gate"; tags ["fastfree","board","review-gate","task:<id>"].

## 5. Settings — src/gui/settings.tsx (additive, default warn)

SettingsSchema gains: reviewGate: optional(Literals["off","warn","enforce"]),
                      reviewGateDone: optional(Boolean)
Absent ⇒ warn. New "Review gate" section after agent-tools block (settings.tsx:91-105):
Off/Warn/Enforce button row + "Also gate Review → Done" switch. No new storage document.

## 6. i18n — BOTH catalogs (EN i18n.ts:4-150, AR :151-297)

~28 new keys (findings, findingsHint, addFinding, findingTitlePlaceholder, findingDetailPlaceholder,
findingSeverityBlocker/Major/Minor/Nit, findingStatusOpen/Resolved/Waived, resolveFinding, waiveFinding,
waiveFindingReasonPlaceholder, findingsProgress, findingsNone, reviewGateBlockedTitle, reviewGateBlocked,
reviewGateBlockedDone, reviewGateWarnToast, reviewGateSettingTitle, reviewGateSettingDescription,
reviewGateOff/Warn/Enforce/DoneGate, findingsRetained) — provided EN+AR in the inline plan (see agent report).

## 7. RPC / contract — NONE

BoardBridge untouched; server part untouched; gate evidence rides existing hindsight_retain.
Renderer never spawns; Hindsight bank fastfree @ 9177 stays the only memory.

## 8. Tests (bun run check = tsc + build + node --test)

- kanban-model decode round-trip legacy (no findings) + new CardSchema; blockingFindings ranking; waived/resolved ignored.
- board-tools: findings add→list→resolve→waive; enforce move→review throws /Review gate/; warn moves with warnings[]; waived/resolved unlock; expected_updated_at enforced; done-gate only with gateDone:true.
- New tests/review-gate.test.mjs: enforce/warn/off × review/done matrix.
- New tests/auto-move.test.mjs: stub BoardStore; succeeded links + open blocker ⇒ stays progress; all resolved ⇒ moves; mode off ⇒ moves.
- New tests/i18n.test.mjs: key set(en) === key set(ar).
- Gate evidence: bindHindsightTransport({hindsight_retain: capture}) → exactly one retain with document_id "task:<id>:gate"; retain failure must NOT affect move result.

## 9. Minimum Viable v1 (one PR)

1 FindingSchema + optional findings + blockingFindings (kanban-model.ts)
2 board_findings tool + move-gate options param (board-tools.ts; board-bridge.ts:50 gains {gate,gateDone})
3 UI gates (kanban.tsx:212/:224/:372) + auto-move.ts:34-54 + settings prop (window.tsx:23,63)
4 findings section + card chip (task-detail.tsx, kanban.tsx)
5 Settings rows (settings.tsx)
6 EN+AR strings
7 Hindsight gate-evidence retain (hindsight.ts)
8 tests + docs/tools.md board_findings section
Out of v1: done-gate polish, intake gate, system prompt edit, extra badges.
Back-compat: absent settings ⇒ warn; nothing hard-blocks; kanban-v2/settings-v1 untouched.

## 10. v2

- Done gate everywhere + stricter "all resolved" mode.
- Intake gate (kagan "intake before run"): board-bridge.ts:42-49 / start-session.ts — mode≠off & empty description: warn appends notice; enforce refuses; evidence "task:<id>:intake".
- server.ts:143 FASTFREE_BOARD line += "record ranked findings with board_findings, then move to review/done".
- List-view severity sort; matchesTask extension for finding-text search; per-finding source auto-fill at resolve.

## 11. Risks

- effect Schema Struct excess-key tolerance across mixed-version windows — same bundle ships to both; decode round-trip test guards.
- warn must never be silent (toast + warnings[]); enforce errors surface via bridge error path (board-bridge.ts:74-76).
- enforce also blocks human drags — intentional (kagan: humans approve); human path = resolve/waive in the detail panel; documented in settings copy.
- Findings inflate board_get — acceptable (tiny rows) now; defer summary-only-in-list.
- Gate is policy, not proof: records triage honestly; no LLM verification in-plugin; `source` keeps provenance.
