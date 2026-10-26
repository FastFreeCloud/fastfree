---
description: Verify that FastFree Desktop Installer builds frontend and passes Rust cargo check cleanly
name: check-installer
user-invocable: true
# Content-Hash: blake3:be7add01c89a5008b92e4e6bef0f8eb829a3bc711a8df269faf9f0c82d2ee38a
---

# Check FastFree Desktop Installer

```bash
cd apps/fastfree_installer && npm run build && cargo check --manifest-path src-tauri/Cargo.toml
```
