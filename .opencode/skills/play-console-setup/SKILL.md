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

- Current state: POS has `0,1,2=true`; stages 3–6 open. erp/hr/ledger unstarted.
- One driver only: a second process exits on `<key>.run.lock`. With your own open
  CentBrowser use `CENTBROWSER_ATTACH=1`; otherwise scripts launch their own profile.
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
   **Persist the numeric app id** (`POS_APP_ID=<digits>`, etc.) — later visits use
   `.../developers/7269125617638997236/app/<id>/dashboard`. On any inline form error:
   screenshot + report, do not retry blindly.

## 4. Stage B — invite the publisher service account

Service account: `fastfree-play-publisher@fastfree-508417.iam.gserviceaccount.com`

1. Open the users-and-permissions deep link → **Invite new users** (top-right, plural) →
   paste the SA email (match label AND placeholder `user@example.com`).
2. Tab **App permissions** (NOT Account permissions) → **Add app** → filter/search the
   EXACT app name → tick its checkbox row → **Apply** (closes picker, NOT Invite yet).
   Assert the app chip/row appears.
3. Tick both (least privilege — never a broad Release-manager role):
   **Release apps to testing tracks** AND
   **Release to production, exclude devices, and use Play App Signing**.
   Assert both `checked` via snapshot.
4. Click **Invite user** (singular, bottom-right) → wait for **Active** (service accounts
   flip instantly). If it sticks on Invited/pending: screenshot, report, do NOT re-click.

## 5. Stage C — first AAB upload (Internal track)

0. Verify the artifact FIRST: `.auth/aabs/<key>/app-release.aab` exists and is non-trivial
   (baselines: pos ≈5.87 MB, erp ≈5.93 MB, hr ≈5.89 MB, ledger ≈6.89 MB). Confirm the
   package (`com.fastfree.<key>`) matches the app row. Never upload a 0-byte/wrong AAB.
1. Read the Dashboard state FIRST: `Draft/Unpublished, never rolled out` → proceed.
   `In review` → STOP (screenshot + report, never stack a second release). `Internal
   live` → milestone already met, record `?app=<id>`, move on.
2. Open the app → **Test and release** → **Testing** → **Internal testing** →
   **Create new release**. Assert the `Internal testing` header.
3. If a Play App Signing prompt appears: accept defaults TWICE — **Continue / Let Google
   manage**, then **Continue / Accept / Save** — screenshot the ToS page first. If it
   shows a checkbox instead of Continue: STOP, screenshot, report (shape changed).
4. Upload via file input (NEVER click an OS picker): `browser_file_upload` with the
   ABSOLUTE AAB path → expect `Processing` → wait for **Review release** (up to 2 min,
   AAB processing is slow) → assert versionCode and no `Errors` banner (check
   `browser_console_messages` too).
5. **Review release** → **Start rollout to Internal** (accept the confirm dialog only
   after snapshotting it) → wait for Rollout/Released confirmation → screenshot proof.

## 5.4. Keystore gate (once, before the FIRST of the 4 uploads)

- Use ONLY the stable key: alias `fastfree`. Fingerprint-match both on-disk copies
  (`.auth/signing/release.jks` AND `scripts/fastfree-android/keystore/release.jks`)
  with `fastfree_android_keystore.py --info` — both must report the same SHA-256.
  Mismatch → STOP, human reconciles before any upload.
- NEVER `--gen --force`, never `git add` a `.jks`, never accept CI's ephemeral fallback
  for a first-ever upload (Play pins the first certificate permanently).
- Upload rejected with certificate/SHA mismatch → STOP all four apps, screenshot,
  human owns recovery (key upgrade in Console, not a re-upload).

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
- These stay **MANUAL, do not attempt** (app Dashboard → Policy sections, human completes):
  **Content rating**, **Data safety**, **Target audience**, **Ads declaration**,
  **App access credentials**, **Privacy Policy URL field** (`Main store listing →
  Privacy Policy URL` = exactly `https://fastfree.cloud/privacy-policy.html` — NOT the
  privacy sentence the metadata generator appends inside the description),
  **closed testing (12 testers × 14 days)**, **production application**.
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
