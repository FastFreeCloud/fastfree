---
name: play-publish-automation
description: Publish Play listings, graphics, and AABs to the internal track via uv scripts and keyless WIF auth. Use for Play uploads, metadata changes, and publish failures. No browser needed.
---

# Play Publish Automation (API only, no browser)

Project: `scripts/fastfree-android/` (Python 3.11, `uv`). Run from the **repo root**.

## Order of operations (always in this order)

```powershell
cd scripts/fastfree-android
uv sync --locked
uv run fastfree_android_keystore.py --gen     # once: stable release.jks in .auth/signing/
uv run fastfree_store_metadata.py [--app fastfree_pos]   # titles/descriptions/changelogs/icons
uv run fastfree_store_graphics.py [--app pos]            # 1024x500 banner + placeholders
uv run fastfree_store_publish.py --package com.fastfree.pos --locales ar,en-US --metadata-dir ../../apps/fastfree_pos/fastlane/metadata/android --track internal --aab <PATH> --status draft --version-code <N>
uv run fastfree_store_screenshots.py pos en-US           # crop phone screenshots to 1080x1920
```

Locales are always `ar,en-US`. Track is `internal`, status `draft` — **never auto-promote
to production** (closed test 12 testers × 14 days + human application required).

## Auth (keyless, no secrets)

- CI: `google-github-actions/auth@v3` (WIF) before the publish step; needs `id-token: write`.
- Local: `gcloud auth login` + `gcloud config set project fastfree-508417`.
- WIF identifiers (public values, also hardcoded in `09-12` workflows — read them there,
  don't copy them here): provider, service account, project number.
- Service account needs these **three granular permissions** on each app (least privilege —
  never the broad Release-manager role; see skill `play-console-setup` §4):
  - Release apps to testing tracks (upload AABs, rollout to Internal)
  - Release to production, exclude devices, and use Play App Signing
  - Manage store presence (titles/descriptions/graphics — without it edit commit 403s)

## First-aid failures

| Failure | Fix |
|---------|-----|
| `403 Permission denied` | invite the SA in Play Console → Users and Access |
| `Unable to acquire impersonated credentials` | verify project number + IAM binding `attribute.repository/FastFreeCloud/fastfree` |
| `Could not load default credentials` | WIF step must run before publish; check `GOOGLE_APPLICATION_CREDENTIALS` |
| Privacy URL missing from listing | generator appends `https://fastfree.cloud/privacy-policy.html` — rerun metadata |

## Boundaries

- First app record, SA invite, first AAB, legal questionnaires → skill `play-console-setup`
  (browser, human checkpoints). This skill starts where that one ends.
- Building the AAB itself → skill `android-build-release`.
- Screenshots capture (emulator + Maestro) → workflow `18-capture-screenshots.yaml`
  (ephemeral `admin_pass` input, never stored).
