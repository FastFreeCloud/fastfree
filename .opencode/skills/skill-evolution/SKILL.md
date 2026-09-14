---
name: skill-evolution
description: Keep opencode skills accurate by harvesting failure lessons into skill rules after every fix. Use after any bug fix, failed run, or UI surprise.
---

# Skill Evolution Loop

Skills rot. This loop keeps them true: **every failure → one encoded rule → verify → commit**.
Run it after any bug fix, failed workflow run, or UI surprise — never let a lesson live
only in chat history.

## The loop (in order)

1. **Collect evidence** (read-only): the error line + timestamp, the fail screenshot /
   trace / log tail if any, and the `git log` fix commit that resolved it.
2. **Distill ONE rule**: symptom → root cause → fix → a single imperative sentence
   ("Never X; always Y"). If it takes two sentences, it is two rules.
3. **Place it**: the most specific skill that owns the step (console create/invite/upload
   → `play-console-setup`; publish API → `play-publish-automation`; builds →
   `android-build-release`; gates → `quasar-quality-gates`; hosts →
   `nixos-host-deploy`; images → `web-backend-release`; domain code →
   `erp-domain-development`). Cross-skill facts (keystore, WIF, app table) go in
   exactly one skill; others link to it.
4. **Verify**: re-read the edited section; grep for contradictions across all 7 skills
   (same fact must read identically everywhere); validate frontmatter
   (`^[a-z0-9]+(-[a-z0-9]+)*$`, dir match, description 1–1024 chars).
5. **Commit**: `docs(skills): <what changed> + <failure it prevents>`.

## Hard prohibitions

- Never encode secrets or live credentials (passwords, keys, tokens, cookies). Name the
  env var / file path, never the value.
- Never encode transient noise (one-off network blip, user closed the window) as a rule.
- Never duplicate a rule across skills — link to the owning skill instead.
- Never delete a rule without replacing it with the corrected one + reason.
- Docs (`AGENTS.md`, READMEs, `scripts/fastfree_android.md`) are second priority:
  fix them in the same commit only when the skill change contradicts them.

## Rule format (copy-paste)

```markdown
- <Imperative rule>. (Seen <date>: <symptom> → <cause>; fixed in <commit>.)
```
