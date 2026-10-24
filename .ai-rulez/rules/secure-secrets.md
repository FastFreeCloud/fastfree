---
title: Zero Plaintext Secrets Governance
priority: critical
paths:
  - "**/*.nix"
  - "**/*.yaml"
  - "**/*.yml"
  - "**/*.json"
activation: glob
---

# Zero Plaintext Secrets Policy

1. **Nix Expressions**: Never embed plaintext passwords, private keys, hashes, or API secrets inside `.nix` files.
2. **Clan Vars**: In Clan 26.05, secrets must always be managed via `clan vars generate <machine>` or `clan vars set <machine> <key>`.
3. **Frontend & Mobile**: Never bake private API tokens or keystore passwords directly into client bundles or git commits. Use environment placeholders (`${VAR}`) or secure CI secrets.
