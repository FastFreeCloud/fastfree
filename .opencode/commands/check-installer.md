---
description: Verify that FastFree Desktop Installer builds frontend and passes Rust cargo check cleanly
# Content-Hash: blake3:c0bf1716ca5fcbee448a1a7f8be8f26bc89d1f933f5c52697c29d49ebf95b658
---

```bash
cd apps/fastfree_installer && npm run build && cargo check --manifest-path src-tauri/Cargo.toml
```
