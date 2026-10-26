---
name: check-installer
description: "Verify that FastFree Desktop Installer builds frontend and passes Rust cargo check cleanly"
---

# Check FastFree Desktop Installer

```bash
cd apps/fastfree_installer && npm run build && cargo check --manifest-path src-tauri/Cargo.toml
```
