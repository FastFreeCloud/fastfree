---
name: play-console-setup
description: Bootstrap FastFree Android apps on Google Play Console via Playwright MCP — create app records, invite the publisher service account, upload first AABs. Use when asked to work on Play Console / publish Android apps.
---

# Play Console Setup (FastFree Android)

Drive the Play Console with Playwright MCP tools (`browser_navigate`, `browser_snapshot`,
`browser_click`, `browser_fill`, `browser_screenshot`). Work **one app at a time**, in this order:
`pos` → `erp` → `hr` → `ledger`. Verify every stage before moving on.

## 0. Identity (never skip)

- Google account owner: `mohamed.fastfree@gmail.com`
- Developer account: `fastfree.cloud`, ID `7269125617638997236`
- If the browser is not logged in, or a Google account chooser appears: **STOP and ask the
  human to log in / pick the owner account**. NEVER type passwords or 2FA codes yourself.
- If a *developer* chooser appears (`/console/developers` with no numeric ID): pick
  `fastfree.cloud`, then confirm the URL contains `/developers/7269125617638997236/`.
- If you land on `console/signup`: STOP — the account has no developer registration ($25).

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

## 3. Stage A — create the app record

1. Open the app list. If the app name is already listed exactly → skip to Stage B.
2. Open the create form. Fill **App name** and **Package name** (from the table above).
3. Click **Check availability**.
   - "already in use / taken" → the app was likely created by an earlier run: check the
     app list for the exact name. Found → skip to Stage B. Not found → STOP and report.
   - "hasn't been registered" → STOP: package registration is a manual Console step.
4. Leave **Default language** as `en-US` (Arabic + English listings ship later via API).
5. Select **App** (not Game) and **Free**.
6. Check exactly TWO declarations: **Developer Program Policies** and **US export laws**.
   There is NO Play App Signing checkbox (it is automatic now — "You'll get automatic
   protection" notice). Never check anything else.
7. Click **Create app** (bottom-right button).
8. Verify: URL contains `?app=<digits>` (new app dashboard) OR the name row is visible.
   On any inline form error: screenshot + report, do not retry blindly.

## 4. Stage B — invite the publisher service account

Service account: `fastfree-play-publisher@fastfree-508417.iam.gserviceaccount.com`

1. Open the users-and-permissions deep link → **Invite new users** → paste the SA email.
2. Tab **App permissions** → **Add app** → tick the app → **Apply**.
3. Tick both: **Release apps to testing tracks** AND
   **Release to production, exclude devices, and use Play App Signing**.
4. **Invite user** → verify its row shows **Active** (service accounts activate instantly).

## 5. Stage C — first AAB upload (Internal track)

1. Open the app → **Test and release** → **Testing** → **Internal testing** →
   **Create new release**.
2. If a Play App Signing prompt appears: accept defaults (**Continue**).
3. Upload the AAB from the table above → wait for processing → **Review release** →
   **Start rollout to Internal**.
4. Verify a release/rollout confirmation is visible.

## 6. Rules (hard)

- One app at a time, stages in order A → B → C. Never run two apps concurrently.
- After every consequential click: snapshot + assert the expected outcome before continuing.
- On ANY failure: `browser_screenshot` first, then report URL + visible text + what was
  expected. Never click repeatedly hoping it works.
- Never touch the human's other tabs. Never commit `.auth/` (git-ignored live session).
- These stay **MANUAL, do not attempt**: Content rating, Data safety, Target audience,
  Ads declaration, App access credentials, Privacy Policy URL, closed-testing (12 testers
  × 14 days), production application. Point the human at the app Dashboard instead.
