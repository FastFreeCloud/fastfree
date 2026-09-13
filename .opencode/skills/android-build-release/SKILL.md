---
name: android-build-release
description: Build signed APK/AAB for a FastFree Android app locally or via tag-triggered CI workflows, then cut a GitHub Release. Use for pos/erp/hr/ledger builds and build failures.
---

# Android Build & Release

## App table (names, packages, tags, workflows)

| App | Dir | Package | Tag | Workflow |
|-----|-----|---------|-----|----------|
| POS | `apps/fastfree_pos` | `com.fastfree.pos` | `pos-v*` | `09-build-pos-android.yaml` |
| ERP | `apps/fastfree_erp` | `com.fastfree.erp` | `erp-v*` | `10-build-erp-android.yaml` |
| HR | `apps/fastfree_hr` | `com.fastfree.hr` | `hr-v*` | `11-build-hr-android.yaml` |
| Ledger | `apps/fastfree_ledger` | `com.fastfree.ledger` | `ledger-v*` | `12-build-ledger-android.yaml` |

Versioning: `versionCode = YYYYMMDD × 100 + github.run_number`, `versionName = YYYY.MM.DD`.

## Local build (per app, e.g. POS)

```powershell
cd apps/fastfree_pos
pnpm install --no-frozen-lockfile --ignore-scripts
cd src-capacitor; npm install; cd ../..
mkdir -p .quasar
echo '{"compilerOptions":{}}' > .quasar/tsconfig.json
pnpm exec quasar prepare --silent
$env:VITE_API_BASE_URL = "https://backend.fastfree.cloud"
pnpm exec quasar build
cd src-capacitor
npx cap add android   # skip if android/ already exists
npx cap sync android
cd android
gradle assembleRelease
gradle bundleRelease
```

Outputs: `app/build/outputs/apk/release/` (APK), `app/build/outputs/bundle/release/` (AAB).

## CI build + release

```powershell
git tag pos-v1.0.0; git push origin pos-v1.0.0
gh run list --repo FastFreeCloud/fastfree --limit 5
gh run watch <RUN_ID> --repo FastFreeCloud/fastfree
gh workflow run 09-build-pos-android.yaml --repo FastFreeCloud/fastfree  # manual, no tag
```

## Signing (stable key, never ephemeral for Play)

Priority used by CI `Generate Keystore` step: **repo keystore → `ANDROID_KEYSTORE_BASE64`
secret → ephemeral fallback**. Ephemeral keys break Play upgrades (certificate pinning).

- Generate/inspect locally: `uv run fastfree_android_keystore.py --gen` (see skill
  `play-publish-automation` for the uv project setup).
- CI binds it via `fastfree_android_keystore.py --wire --app-dir <APP_DIR>`.

## First-aid failures

| Failure | Fix |
|---------|-----|
| `cap add android` fails | platform exists — skip, run `cap sync` only |
| `No AAB found` | check `quasar build` output above it |
| `Token expired` | WIF renews automatically — rerun |
| `gcloud: command not found` | reopen PowerShell after `winget install Google.CloudSDK` |

## Boundaries

- First-ever app record / SA invite / first AAB → skill `play-console-setup` (browser).
- Publishing listings/tracks → skill `play-publish-automation` (API, no browser).
