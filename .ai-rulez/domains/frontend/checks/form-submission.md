---
description: Ensure all modal dialog forms use @submit.prevent with type="submit"
severity: high
targets:
  - antigravity
  - opencode
  - claude
---

# Form Submission Standard Check

When reviewing Vue components in `packages/**` and `apps/**`:
- Verify that every `<q-form>` or `<form>` inside a dialog has `@submit.prevent="save"` (or corresponding submit method).
- Verify that the primary save/submit `<q-btn>` has `type="submit"`.
- Avoid triggering form save only via button click `@click="save"` without form submit wiring, as keyboard Enter submission fails without it.
