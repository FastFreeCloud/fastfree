---
name: play-console-setup
description: Bootstrap FastFree Android apps on Google Play Console via Playwright MCP — create app records, invite the publisher service account, upload first AABs. Use when asked to work on Play Console / publish Android apps.
---

# Play Console Setup (FastFree Android)

Drive the Play Console with Playwright MCP tools. Work **one app at a time**, in this order:
`pos` → `erp` → `hr` → `ledger`. Verify every stage before moving on. Never run two
agents/apps concurrently (one browser, one tab, one driver).

## 0. Identity (never skip)

- Google account owner: `mohamed.fastfree@gmail.com`
- Developer account: `fastfree.cloud`, ID `7269125617638997236`
- If the browser is not logged in, or a Google account chooser appears: **STOP and ask the
  human to log in / pick the owner account**. NEVER type passwords or 2FA codes yourself.
- If a *developer* chooser appears (`/console/developers` with no numeric ID): pick
  `fastfree.cloud`, then confirm the URL contains `/developers/7269125617638997236/`.
  After EVERY navigation that should stay inside our developer, re-assert the numeric ID
  in the URL. Mismatch (`wrong-developer-id`) or access-denied body → STOP, screenshot,
  report actual vs expected ID. Never create/invite/upload under the wrong developer.
- If you land on `console/signup`: STOP — the account has no developer registration ($25).

## 0.5. Stage map + resume (scripts use 0–6, not A/B/C)

| Skill stage | Script stage | Progress file `.auth/play-console/<key>.progress.json` |
|---|---|---|
| A (create) | 2 | `stages["2"]` = record exists (created OR confirmed-taken) |
| B (invite) | 3 | `stages["3"]` = SA row **Active** |
| C (upload) | 4+5 | `stages["4"]` AAB resolved + `stages["5"]` Internal rollout confirmed |
| — | 0, 1, 6 | env OK / session OK / report printed |

- Live state first: read `.auth/play-console/<key>.progress.json` before acting (only
  `pos.progress.json` may exist; erp/hr/ledger start unstarted). Script stages are 0–6
  (env/session/create/invite/AAB/upload/report); stage 1 ALWAYS re-runs (it builds the
  live session — skipping it crashes later stages).
- One driver only: a second process exits on `<key>.run.lock` (per-key lock, also used
  by the §5.5 runner). With your own open
  CentBrowser use `CENTBROWSER_ATTACH=1`; otherwise scripts launch their own profile.
- Resume flags: `--from N` / `--only N` (re-run without them if stage 2/3/5 complains
  about no live session — stage 1 must run to build it). Skip ≠ done: stages 4/5
  without an AAB stay pending and retry next run (honest progress).
- MCP equivalents: keep one tab for the flow; re-`browser_snapshot` after EVERY
  navigation/dialog (refs die on re-render); never chain two clicks on one snapshot.

## 1. App catalog (per app)

| key | Store name | Package | AAB artifact |
|-----|------------|---------|--------------|
| pos | FastFree POS | `com.fastfree.pos` | `.auth/aabs/pos/app-release.aab` |
| erp | FastFree ERP | `com.fastfree.erp` | `.auth/aabs/erp/app-release.aab` |
| hr | FastFree HR | `com.fastfree.hr` | `.auth/aabs/hr/app-release.aab` |
| ledger | FastFree Ledger | `com.fastfree.ledger` | `.auth/aabs/ledger/app-release.aab` |

Contact email: `sales@fastfree.cloud`. Type: App. Price: Free.

## 2. Deep links (always include `u/0` + developer ID — never navigate the dashboard menus)

- App list: `https://play.google.com/console/u/0/developers/7269125617638997236/app-list`
- Create form: `https://play.google.com/console/u/0/developers/7269125617638997236/create-new-app`
- Users & permissions: `https://play.google.com/console/u/0/developers/7269125617638997236/users-and-permissions`
- If a deep link degrades (ID prefix dropped, e.g. `/console/developers/users-and-permissions`),
  re-navigate to the full link and `bring_to_front` before clicking anything.

## 3. Stage A — create the app record

1. Open the app list. If the app name is already listed exactly → skip to Stage B.
2. Open the create form. Fill **App name** and **Package name** (from the table above).
   Verify each fill stuck with a fresh snapshot (SPA masks lose values).
3. Click **Check availability** (not Create app).
   - "already in use / taken / duplicate" → DO NOT submit blindly: open the app-list
     deep link, `bring_to_front`, look for the EXACT name; reload once and wait up to
     45 s (the list SPA stalls when throttled). Found → record is OURS: skip to
     Stage B. Absent after reload → STOP and report `taken AND <Name> not in our
     list` + screenshot + URL. Never reuse/rename/delete — package names are fixed.
   - "hasn't been registered" → STOP: package registration is a manual Console step
     (capture the live path and feed it back here).
4. Leave **Default language** as `en-US` (Arabic + English listings ship later via API).
5. Select **App** (not Game) and **Free**.
6. Check exactly TWO declarations: **Developer Program Policies** and **US export laws**.
   There is NO Play App Signing checkbox (it is automatic now — "You'll get automatic
   protection" notice). Assert exactly 2 checked. Never check anything else.
7. Screenshot (pre-create proof), then click **Create app** (bottom-right button).
8. Verify: URL contains `?app=<digits>` (new app dashboard) OR the name row is visible.
   **Persist the numeric app id** immediately in `.auth/play-console/app-ids.json`
   (`{"pos": <digits>, ...}`) — later visits use
   `.../developers/7269125617638997236/app/<id>/dashboard`. On any inline form error:
   screenshot + report, do not retry blindly.

## 4. Stage B — invite the publisher service account

Service account: `fastfree-play-publisher@fastfree-508417.iam.gserviceaccount.com`

1. Open the users-and-permissions deep link → **Invite new users** (top-right, plural) →
   paste the SA email (match label AND placeholder `user@example.com`).
2. Tab **App permissions** (NOT Account permissions) → **Add app** → filter/search the
   EXACT app name → tick its checkbox row → **Apply** (closes picker, NOT Invite yet).
   Assert the app chip/row appears.
3. Tick all four (least privilege — never a broad Release-manager role):
    **Release apps to testing tracks** AND
    **Release to production, exclude devices, and use Play App Signing** AND
    **Manage store presence** (without it the API edit commit 403s — seen
    2026-09-14; the SA publish 403 is STILL OPEN, do not claim fixed) AND
    **View app information** (read-only base — commit-time union 403s without
    it; diagnosed 2026-09-15: staged calls pass, commit 403s).
    After ticking: **Apply** in the permissions dialog (required per app).
    Assert the four via snapshot.
4. Click **Invite user** (singular, bottom-right) → confirm **Send invite?** dialog →
    wait for **Active** (service accounts flip instantly). If it sticks on
    Invited/pending: screenshot, report, do NOT re-click.
    If the SA row already exists ("User already exists" on re-invite): open its row
    and extend its app permissions via the row arrow instead (Add-app path is the
    fallback when the app is not on the user yet).

## 5. Stage C — first AAB upload (Internal track)

0. Verify the artifact FIRST: `.auth/aabs/<key>/app-release.aab` must exist and be
   non-trivial (observed 2026-09-13: pos ≈5.87 MB, erp ≈5.93 MB, hr ≈5.89 MB,
   ledger ≈6.89 MB; AABs are local-only, git-ignored, CI-rebuildable). Missing/stale
   → the bootstrap script pulls `com.fastfree.<key>-aab` from the newest successful
   `09/10/11/12-build-*-android.yaml` run (`gh run download`); with no green run it
   SKIPS the upload and finishes create+invite. Same rule by hand: confirm the package
   (`com.fastfree.<key>`) matches the app row first.
1. Read the Dashboard state FIRST: `Draft/Unpublished, never rolled out` → proceed.
   `In review` → STOP (screenshot + report, never stack a second release). `Internal
   live` → milestone already met, record `?app=<id>`, move on.
2. Open the app → hamburger ☰ → **Test and release** → **Testing** (expand the
   subgroup — "Internal testing" nests inside it) → **Internal testing** →
   **Create new release** (tracks URL is `.../app/<id>/tracks/internal-testing`).
   If Create is disabled a draft exists → **Edit release** instead.
3. If a Play App Signing prompt appears: accept defaults TWICE — **Continue / Let Google
   manage**, then **Continue / Accept / Save** — screenshot the ToS page first. If it
   shows a checkbox instead of Continue: STOP, screenshot, report (shape changed).
4. Upload via file input (NEVER click an OS picker): attach the ABSOLUTE AAB path →
   wait for the version row (processing is slow) → fill Release name if empty →
   **Next** (waits for server-side processing; if it never enables, screenshot the
   bundle row — a red row means a rejected bundle, see rule 6).
5. Step 2 **Preview and confirm**: expand **Show more** FIRST (bypass links hide
   collapsed) → click **Proceed anyway** under the version-code warning if present →
   **Save and publish** → wait for Rollout/Released confirmation → screenshot proof.
6. VERSION-CODE IRON RULE (seen 2026-09-14): a bundle version consumed by ANY upload
   (even a later-discarded draft) can NEVER be re-uploaded ("already been used").
   Every retry needs a FRESH CI build (higher run_number → higher versionCode).
   Discard stale drafts from INSIDE the editor (tracks page has no Discard link;
   confirm in the dialog scope) — but only when a fresh-versioned AAB is ready.

## 5.4. Keystore gate (once, before the FIRST of the 4 uploads)

- Use ONLY the stable key: alias `fastfree`. Fingerprint-match both on-disk copies
  (`.auth/signing/release.jks` AND `scripts/fastfree-android/keystore/release.jks`)
  with `fastfree_android_keystore.py --info` (second copy: `--info --in <path>`) —
  both must report the same SHA-256. Copy direction is ALWAYS
  `.auth/signing/` → `scripts/fastfree-android/keystore/` (CI reads the latter).
  Mismatch → STOP, human reconciles before any upload.
- NEVER `--gen --force`, never `git add` a `.jks`, never accept CI's ephemeral fallback
  for a first-ever upload (Play pins the first certificate permanently).
- CI binds the key via `fastfree_android_keystore.py --wire --app-dir <APP_DIR>`, which
  also pins `targetSdkVersion = 36` (Play min-target — see skill
  `android-build-release`).
- Upload rejected with certificate/SHA mismatch → STOP all four apps, screenshot,
  human owns recovery (key upgrade in Console, not a re-upload).

## 5.5. Setup questionnaires (11 tasks per app — runner `fastfree_setup_tasks.py --app <key>`)

Order matters: **Sign in details BEFORE Target audience** (console blocks the
audience questionnaire until sign-in is done). Progress: `.auth/play-console/<key>.tasks.json`.

Section slugs (`.../app/<id>/app-content/<slug>`, observed — never guess others):
`ads-declaration`, `government-apps`, `finance`, `health`, `testing-credentials`,
`target-audience-content`, `content-rating-overview`, `content-rating-iarc-questionnaire`,
`data-privacy-security`, `store-settings`. Tracks: `.../app/<id>/tracks/internal-testing(?tab=testers)`.

Fixed answer bank (identical all 4 apps): ads No · government No · financial NONE
("My app doesn't provide any financial features" opt-out checkbox) · health NONE
("My app does not have any health features") · privacy `https://fastfree.cloud/privacy-policy.html`
· category **Business** · contact `mohamed.fastfree@gmail.com` / `+201091999937` ·
sign-in `Administrator` + password runtime-read from `apps/fastfree_os/nix/clients/client3.nix`
(`passwords.admin`, verified live) · audience **18+ only** · rating **Everyone**
(email + All-Other-Types + IARC terms, all-No bank) · data safety collects Name /
Phone / Credentials, no sharing, encrypted in transit Yes, deletion via support email.

Iron rules: radios carry USELESS accessible names — answer ONLY via `get_by_label` exact
text + `count()==1` + `is_checked()` verify (banner copy like "not a government app"
otherwise selects Yes!). Dashboard task rows hide collapsed (expand "View tasks",
`aria-expanded`) and row-text clicks often don't navigate (verify `app-content` in URL,
retry via app-list row click). Wizards (finance/health/audience/rating/safety) end in
Next, not Save — Next enables late (Save first, it unlocks server-side). IARC auto-submits
(detect `IARC status Completed` + rating badges, don't chase Next forever).

Probed store-listing DOM behaviors (2026-09-17, 12 probes — trust these over guesses):
- Locale picker is a DROPDOWN (button), not tabs; options render as EITHER
  `role=option` or `role=menuitem` (varies per render — probe both). Absent locale →
  "Manage languages" option opens a searchable checkbox dialog: fill Search with the
  FULL language name ("Arabic", not "ar"), label-click the exact row, assert the
  counter flips `1 selected` → `2 selected` BEFORE Apply. After Apply the page
  navigates straight to the new locale form (detect the `Arabic – ar` button first;
  the menu no longer lists the active locale).
- Listing inputs carry NO usable accessible names — fill Common-text-assets
  title/short/full by DOM ORDER inside the section panel (re-read `input_value`
  to verify). Slot filled ⟺ full basename in slot text OR `img[alt=basename]`
  thumbnail (never stem-substrings: "1"/"2"/"icon" false-positive; slots keep
  their Add-assets link when full so button-absence proves nothing).
- Sections collapse/expand via chevron buttons with NO accessible name — find by
  mat-icon ligature text `button:has-text('expand_more'/'expand_less')`, read state,
  never blind-toggle. Verify expansion INSIDE the panel (page-wide counts borrow
  other sections' controls).
- Graphics upload: slots expose NO `input[type=file]` — slot "Add assets" →
  right asset-library drawer → drawer "Upload" → OS file chooser (`expect_file_chooser`
  + `set_files`) → tile auto-selects → drawer "Add" attaches. Tile selection ONLY
  via `a[debug-id='select-button']` (row/text clicks do NOT select); verify the
  file-row text after. First uploads can stall minutes under throttle — 150s wait
  with drawer-text diagnostics.
- Drawer dismissal: open ⟺ side-panel has `mat-drawer-expanded` (bboxes lie);
  header-X and Escape never close it; the backdrop click TOGGLES (clicking while
  closed OPENS it!) — so backdrop is last-resort-once while verified open,
  targeting the `pointer-events != none` backdrop. A leftover drawer covers the
  form (dropdown/save clicks die with "intercepts pointer events"). Save itself:
  DOM-click (`evaluate click`) the visible+enabled Save-as-draft — transparent
  drawer remnants swallow hit-tested clicks (`elementFromPoint` proof).
- Windows console is cp1252: reconfigure stdout/stderr to UTF-8 at startup or
  Arabic log text crashes with UnicodeEncodeError.
- The listing editor has NO privacy-URL field (only title/short/full + YouTube
  box) — privacy lives in the app-content task; never pattern-fill blindly or
  the URL lands in the drawer's search box.
- Pace everything (8s task / 4s nav), never hammer through 429s (30–60 min
  silence to cool down); uploads stall first under throttle while GETs pass.

## 5.6. Internal testers

Email lists are ACCOUNT-WIDE (`dev` list reused); each track ATTACHES it (Testers tab).
Add `mohamed.fastfree@gmail.com` once via Edit-email-list dialog + confirm dialog.
Track stays Inactive until a release + testers exist. Closed testing later needs
12+ opted-in tester emails (only 1 known today) + 14 days — Google-mandated, unskippable.

## 5.7. Internal-track rollout (draft → Active + opt-in link)

Verified live 2026-09-17 (ERP+POS+HR). Script: `scripts/fastfree-android/fastfree_rollout_internal.py --app <key> [--from <stage>]` (preflight always runs; `--from` ∈ testers/edit/preview/publish/verify). Internal track ONLY — assert same developer + app id and the PINNED numeric track id (captured from the tracks page ancestry); never Discard/Production/other tracks; exactly-1-match clicks (counted across button+link roles); STOP on ambiguity.

- Stage 0 Preflight: CentBrowser must expose CDP :9222 (`--remote-debugging-port=9222`; same profile preserves login). Wedged symptom: HTTP `/json/version` OK but WS handshake times out → restart browser (profile persists, tabs re-navigated). Always pass explicit timeouts (`connect_over_cdp` timeout=25000).
- Stage 1 Track state: `.../app/<id>/tracks/internal-testing` shows `Set up internal testing track` checklist (Select testers / Create a new release / Preview and confirm). Snapshot 2026-09-17 (re-read live, states move): ERP 2/3 (draft, testers attached), POS/HR/Ledger 1/3 (draft, testers NOT attached). No opt-in link until Active ("The link will be shown here when you publish your app").
- Stage 2 Testers: Testers tab → `dev` list (8 users) checkbox is a `mat-checkbox` custom element (`aria-checked` true/false; NO `input[type=checkbox]` — input-walks fail). Click via DOM, verify `aria-checked=true`, Save only if enabled.
- Stage 3 Edit+Preview: Releases tab → exact "Edit release" → Next (≤4) → review URL `.../tracks/<tid>/releases/<n>/review`. Settle splash ("Loading Google Play Console" hidden, 30s cap) after EVERY navigation — content renders minutes late under throttle.
- Stage 4 Proceed-anyway: review shows 1 Error "version code significantly higher..." + Proceed-anyway LINK (role varies button/link — probe both) hidden behind collapsed "Show more" (expand first). Click → "Proceed anyway?" dialog → "Proceed" → error becomes "(ignored for this release)" → "Save and publish" enables. Stays disabled → STOP, never force (see §5 rule 6).
- Stage 5 Publish: "Save and publish" → confirm INSIDE dialog scope → returns to `?tab=releases`.
- Stage 6 Verify: summary reads `Active · Latest release: <versionCode> (date)` (+ "Temporary app name '<pkg> (unreviewed)'" — normal pre-review). Opt-in link `https://play.google.com/apps/internaltest/<id>` appears in Testers tab under "How testers join your test" — generated ASYNC (minutes–hours; ERP observed live: .../4701556479865063787). Absence right after publish is normal, not failure.
- Tester-side (human): open join link logged in as `mohamed.fastfree@gmail.com`; Play Store on the phone must run the same account; first join can take hours to propagate. Public `store/apps/details?id=` links 404 until production review — expected, not an error.

## 6. Rules (hard)

- One app at a time, stages in order A → B → C. Never run two apps concurrently.
- MCP power pattern, every step: `snapshot → pick ref → act on ref → wait_for (text,
  never blind sleep) → fresh snapshot → assert`. Refs die on every navigation/dialog.
- Prefer `browser_wait_for` on visible text over sleeps; use `browser_network_requests`
  to prove uploads finished; `browser_console_messages` on any error banner.
- Start `browser_start_tracing` at flow start, `browser_stop_tracing` on failure
  (needs `--caps=devtools`); screenshots: JPEG for routine proof, PNG on failure.
- File uploads need ABSOLUTE paths inside the workspace. Never touch the human's tabs.
- Never commit `.auth/` (git-ignored live session).
- These stay **MANUAL, do not attempt** (human completes; the 11 questionnaires in
  §5.5 are automated by the runner, NOT manual — the old `stage6_report` line naming
  5 of them as "remaining manual" predates the runner and is stale):
  **closed testing (12 testers × 14 days)**, **production application**.
  (Privacy Policy URL field = exactly `https://fastfree.cloud/privacy-policy.html` —
  NOT the privacy sentence the metadata generator appends inside the description.)
- Post-Internal order (all human-led, API never promotes): Internal confirmed →
  Closed testing → Production application. When Internal is confirmed for all four
  packages, hand the human the four `?app=<id>` Dashboard links + per-app
  Policy-checklist screenshots and stop.

## 7. Deleting an app record (MANUAL, human decides — never automate)

Requirements (verify live, all must hold; screenshot each):
1. You are the owner in developer `fastfree.cloud` (`/developers/7269125617638997236/`).
2. It is NOT a confirmed record from §3 (never delete an established app).
3. No Internal release ever rolled out for it (Dashboard shows no rollout history).

Procedure: app Dashboard (`?app=<digits>`) → find delete/remove in Settings/Setup
(path changes; screenshot exact labels, never guess) → Console forces typing the
package name + shows a confirmation reference. Record the reference verbatim,
screenshot the post-delete list proving the row is gone.
Consequence: **a deleted package name can never be re-registered — deletion is only
for genuinely wrong records, never "start over" convenience.** Also needs the
developer-registration **Transaction ID** (Google Payments → Activity → "Google Play
Developer"). Failure: `DELETE REFUSED — <exact text> at <url>` + shot; STOP.
