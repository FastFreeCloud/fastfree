<div align="center">

<img src="https://img.shields.io/badge/NixOS-26.05-5277C3?style=for-the-badge&logo=nixos&logoColor=white" />
<img src="https://img.shields.io/badge/Hyper--V-Gen%202-0078D4?style=for-the-badge&logo=microsoft&logoColor=white" />
<img src="https://img.shields.io/badge/Local-NixOS-5277C3?style=for-the-badge&logo=nixos&logoColor=white" />
<img src="https://img.shields.io/badge/GitHub-Actions-2088FF?style=for-the-badge&logo=github&logoColor=white" />
<img src="https://img.shields.io/badge/WireGuard-VPN-88B84D?style=for-the-badge&logo=wireguard&logoColor=white" />
<img src="https://img.shields.io/badge/License-Private-EF4444?style=for-the-badge" />

# FastFree OS

**NixOS Multi-Client Deployment System**

Production-ready NixOS with multi-client architecture, **3 deployment types** (vps + Hyper-V + local), COSMIC desktop everywhere, WireGuard VPN, Podman containers, GitHub Actions CI/CD, and auto-release.

[Architecture](#architecture) | [Scripts](#scripts) | [CI/CD](#cicd-pipeline) | [Services](#services) | [Quick Start](#quick-start)

</div>

<br>

## Table of Contents

- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Scripts](#scripts)
- [CI/CD Pipeline](#cicd-pipeline)
- [Services](#services)
- [Quick Start](#quick-start)
- [Multi-Client Architecture](#multi-client-architecture)
- [Local Machine (client3)](#local-machine-client3)
- [Database](#database)
- [Passwords](#passwords)
- [WireGuard VPN](#wireguard-vpn)
- [Avahi mDNS](#avahi-mdns)
- [Security](#security)

---

## Architecture

### Deployment Types

```
┌─────────────────────────────────────────────────────────────────┐
│                    3 Deployment Types                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  vps                hyperv              local                    │
│  (fresh server)     (Hyper-V)           (existing machine)       │
│       │                │                  │                      │
│       ▼                ▼                  ▼                      │
│  SSH deploy       VHDX image          in-place rebuild           │
│  nixos-anywhere   7z compressed       preserves disk + desktop   │
│  disko + build=false  build=true      build=false                │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  CI auto-detects deployType:                              │ │
│  │  • vps       → skip build, deploy via SSH                 │ │
│  │  • hyperv    → build VHDX, compress, release              │ │
│  │  • local     → evaluate only, switch on the machine       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Clients:  client1 (Hyper-V) · client2 (VPS) · client3 (local)  │
└─────────────────────────────────────────────────────────────────┘
```
│       │              flake.nix               frappe_docker       │
│       │              nix build               docker build       │
│       │                     │                      │             │
│       │                     ▼                      ▼             │
│       │              ghcr.io/fastfree_backend:latest             │
│       │                     │                      │             │
│       ▼                     ▼                      ▼             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              NixOS VM (Hyper-V / VPS)                       │   │
│  │                                                          │   │
│  │  MariaDB ◄──── fastfree_backend.nix (Podman containers)    │   │
│  │       ◄──── phpmyadmin.nix                              │   │
│  │                                                          │   │
│  │  WireGuard VPN ◄── wireguard.nix                        │   │
│  │  Avahi mDNS     ◄── avahi-subdomains.nix                │   │
│  │  Caddy          ◄── caddy.nix (VPS + local)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### How the 2 Repositories Connect

```
                              fastfree_backend
                              ───────────────

                              frappe_docker
                                 │
                                 └─ docker build
                                    docker push → GHCR

        GHCR (Image Registry)
        ─────────────────────
        ghcr.io/FastFreeCloud/fastfree_backend:latest
                    │
                    ▼
        fastfree_os  (NixOS Config)
        ──────────────────────────
        fastfree_backend.nix → pulls images → runs as Podman containers
```

**Key point**: `flake.nix` in fastfree_backend **builds** the Docker images. NixOS **runs** them. You need both.

---

## Repository Structure

```
fastfree_os /
├ flake.nix                            # NixOS flake — Clan wrapper + VHDX builder + checks
├ flake.lock                           # Locked dependencies (nixpkgs, disko, clan-core, unstable)
├ clan.nix                             # Clan inventory (machines registry — canonical)
├ options.nix                          # Custom options (identity, apps, deployType, desktop)
├ cli.sh                               # FastFree CLI tool
├ modules/                             # Service modules (toggle per client via fastfree.apps)
│  ├── system.nix                      # Base system (motd, journald, docs off)
│  ├── networking.nix                  # Hostname, firewall, NetworkManager
│  ├── containers.nix                  # Podman rootful + subuid
│  ├── integration.nix                 # fastfree CLI package + GHCR auth
│  ├── shell.nix                       # zsh + rg/fd/ugrep/fzf + aliases
│  ├── herdr.nix                       # Herdr CLI docs + completion + integration
│  ├── opencode.nix                    # OpenCode web UI autostart (client3)
│  ├── shortcuts.nix                   # Desktop entries + aliases per enabled app
│  ├── mariadb.nix                     # MariaDB + vars password + state
│  ├── caddy.nix                       # Caddy reverse proxy (conditional sites)
│  ├── fastfree_backend.nix            # Frappe/ERPNext — Podman containers from GHCR
│  ├── fastfree_ledger/erp/hr/pos/website.nix  # SPA extractors served via Caddy
│  ├── phpmyadmin.nix                  # phpMyAdmin container (env from vars)
│  ├── cockpit.nix                     # Cockpit web panel (client2/3)
│  ├── desktop.nix                     # COSMIC desktop + xkb us/ara + shortcuts
│  ├── locale.nix                      # Timezone + en_US/ar_EG + Arabic fonts
│  └── avahi-subdomains.nix            # Avahi mDNS
├ machines/                            # Clan machine configs (canonical)
│  ├── client1/configuration.nix       # Hyper-V (deployType=hyperv, build=true)
│  ├── client2/configuration.nix       # VPS (deployType=vps, build=false)
│  └── client3/configuration.nix       # Local machine (deployType=local, build=false)
├ wireguard/                         # (removed: WireGuard now via clan.nix inventory)
├ .github/workflows/                   # (repo root) CI pipelines
│  ├── 09-client1.yaml                 # Validate + build client1 Hyper-V image
│  └── 10-client2.yaml                 # Deploy + install client2 VPS
└ README.md
```

---

## Scripts

> NOTE: the legacy `scripts/*.ps1` helpers, `build.yml`, and `wireguard/*.ps1`
> no longer exist. Builds run via `nix` directly or CI (`09-client1.yaml`,
> `10-client2.yaml`). WireGuard keys come from `clan vars` (wireguard instance).

### Quick validation

```bash
cd apps/fastfree_os
nix-instantiate --parse flake.nix clan.nix machines/*/configuration.nix   # syntax
nix eval .#clan.inventory.machines.client3  # evaluate (Clan inventory — canonical)
```

### Build client1 (Hyper-V VHDX)

```bash
cd apps/fastfree_os
nix build .#packages.x86_64-linux.client1   # → result/fastfree_client1.vhdx.7z (password: FastOS@2026)
```

**What happens during build**:
1. Nix evaluates `flake.nix` → resolves all dependencies
2. Builds NixOS system toplevel derivation
3. Creates disk image via `make-disk-image.nix`
4. Converts raw image to Fixed VHDX (Hyper-V format)
5. Compresses with 7z (LZMA2, password-protected)

### Deploy client2 (VPS)

```bash
gh workflow run 10-client2.yaml --ref master   # deploy (or install via nixos-anywhere)
```

### Switch client3 (local machine, on the machine itself)

```bash
cd ~/Desktop/fastfree/apps/fastfree_os
sudo nixos-rebuild switch --flake .#client3
```

---

## CI/CD Pipeline

### OS workflows (`09-client1.yaml`, `10-client2.yaml`)

OS deployment runs in two repo-root workflows (frontend/backend ship separately via `01-06`):

```
push to master (modules/**, machines/**, flake.*, 09/10 yaml)
  ├─ 09-client1: validate (parse + eval) → build VHDX → compress → artifact fastfree_client1.vhdx.7z
  └─ 10-client2: deploy (SSH + nixos-rebuild switch --flake .#client2) or fresh install (nixos-anywhere)
```

#### What each workflow does

1.  **⚡ Validate**: `nix-instantiate --parse` on all `.nix` files + `nix eval` of the client toplevel.
2.  **🏗️ Build (09 only)**: `nix build .#packages.x86_64-linux.client1` → 7z compress (LZMA2, mx=9, password-protected) → upload `fastfree_client1.vhdx.7z` (30-day artifact).
3.  **🚀 Deploy (10 only)**: copy `flake.nix + flake.lock + clan.nix + options.nix + cli.sh + machines/ + modules/` to the VPS over SSH → `nixos-rebuild switch --flake .#client2`, or fresh install via `nixos-anywhere --flake .#client2` (requires explicit confirm).
4.  **🧪 Service checks**: `checks.x86_64-linux` NixOS VM tests (`mariadb`, `wireguard`, `sshd`, `podman`, `avahi`) run with `nix flake check`.

#### GitHub Actions Versions

| Action | Version | Purpose |
|:-------|:--------|:--------|
| `actions/checkout` | **v7** | Clone repository |
| `cachix/install-nix-action` | **v31** | Install Nix package manager |
| `DeterminateSystems/magic-nix-cache-action` | **v14** | Nix build cache |
| `actions/upload-artifact` | **v7** | Upload build artifacts |
| `actions/download-artifact` | **v8** | Download artifacts for release |
| `softprops/action-gh-release` | **v3** | Create GitHub Releases |

### Trigger Conditions

The workflow runs when you push to `main` or `master` or open a PR, and any of these files change:

| Path | Why |
|:-----|:----|
| `apps/fastfree_os/{modules,machines}/**` | NixOS modules or client configs changed |
| `apps/fastfree_os/flake.nix` | Flake structure changed |
| `apps/fastfree_os/flake.lock` | Dependencies updated |
| `.github/workflows/09-client1.yaml` | client1 build workflow itself changed |
| `.github/workflows/10-client2.yaml` | client2 deploy workflow itself changed |

---

## Nix Testing and Evaluation Methods

To support development, we use several testing methods spanning from instant syntax analysis to full VM emulation. Refer to this matrix when designing or running tests:

| Method | Scope & Focus | Speed | Execution Context | Pros | Cons |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`nix-instantiate --parse`** | Syntax validation (AST parser) | Instant (< 1s) | Local & CI | Instantly catches syntax typos, unclosed strings, or missing semicolons without evaluation. | Does not check variable scopes, imports, or options validity. |
| **`nix eval`** | Value evaluation & option checking | Very Fast (~1-10s) | Local & CI | Ensures all option types match, attribute paths exist, and values compute. | Does not guarantee that code compiles, downloads succeed, or builds run. |
| **`nix flake check`** | Flake structures & schemas | Fast to Slow (secs/mins) | Local & CI | Standard flake conformance check. Best run with `--no-build` for speed. | Can trigger long builds unless restricted. |
| **`nix build --dry-run`** | Build plan validation | Fast (secs) | Local & CI | Validates that all derivations exist and can form a complete build graph. | Does not compile code or check runtime bugs. |
| **`nix build <system>`** | System compilation | Slow (mins) | Local & CI | Compiles kernel, configurations, and packages to produce the full NixOS system. | Does not test running services or configuration bugs. |
| **`nixosTest` (VM Integration)** | Functional runtime testing | Slow (mins) | CI (via KVM) & Local | Spawns sandboxed QEMU VMs. Automatically tests systemd services, networks, databases. | High resource overhead. Requires KVM for acceptable speed. |
| **`nix build ...system.build.vm`** | Local VM runner script | Medium (mins) | Local Development | Generates a run script (`result/bin/run-*-vm`) to manually inspect the VM. | Meant for interactive manual inspection rather than automation. |

### What Each Application's CI Does

#### fastfree_backend

```
git push → GitHub Actions →
  ├─ Clone frappe_docker (official Frappe Containerfiles)
  ├─ Generate apps.json (ERPNext + fastfree_backend)
  ├─ docker build with BuildKit
  ├─ Tag + push to GHCR (latest, version, sha)
  └─ Create GitHub Release
```

---

## Services

### Port Map

| Port | Service | Container | Binding |
|:-----|:--------|:----------|:--------|
| 22 | SSH | — | 0.0.0.0 |
| 3306 | MariaDB | — | 0.0.0.0 |
| 443 | Caddy | — | 0.0.0.0 (VPS) |
| 51820 | WireGuard | — | 0.0.0.0 |
| 8080 | Frappe/ERPNext | fastfree-backend-frontend | Podman |
| 8082 | phpMyAdmin | phpmyadmin | Podman |

### Podman Containers

| Container | Image | Network | Purpose |
|:----------|:------|:--------|:--------|
| `fastfree-backend-app` | `ghcr.io/FastFreeCloud/fastfree_backend` | fastfree-net | Frappe Gunicorn |
| `fastfree-backend-frontend` | `ghcr.io/FastFreeCloud/fastfree_backend` | fastfree-net | Frappe Nginx |
| `fastfree-backend-websocket` | `ghcr.io/FastFreeCloud/fastfree_backend` | fastfree-net | Socket.IO |
| `fastfree-backend-queue-short` | `ghcr.io/FastFreeCloud/fastfree_backend` | fastfree-net | Celery short tasks |
| `fastfree-backend-queue-long` | `ghcr.io/FastFreeCloud/fastfree_backend` | fastfree-net | Celery long tasks |
| `fastfree-backend-scheduler` | `ghcr.io/FastFreeCloud/fastfree_backend` | fastfree-net | Bench scheduler |
| `fastfree-redis-cache` | `redis:8.6-alpine` | fastfree-net | Redis cache |
| `fastfree-redis-queue` | `redis:8.6-alpine` | fastfree-net | Redis task queue |
| `phpmyadmin` | `phpmyadmin:5` | fastfree-net | Database management |

### Access URLs

| Service | Local (client3) | Hyper-V (client1) | VPS (client2) |
|:--------|:----|:--------|:----|
| Frappe/ERPNext | `https://erp.fastfree.local` | `http://client1.local:8080` | `https://erp.fastfree.cloud` |
| phpMyAdmin | `https://db.fastfree.local` | `http://db.client1.local:8082` | `https://db.fastfree.cloud` |
| SSH | local login | `ssh root@client1.local` | `ssh root@fastfree.cloud` |

---

## Quick Start

### Option A: Local Machine — client3 (existing NixOS install)

Rebuilds your current machine in place. Disk layout and desktop are preserved
(`deployType = "local"` never touches partitions — no disko).

#### Prerequisites

| Requirement | Details |
|:------------|:--------|
| **OS** | Existing NixOS install (x86_64) |
| **Repo** | This monorepo checked out on the machine |

#### Step 1: Validate

```bash
cd ~/Desktop/fastfree/apps/fastfree_os
nix-instantiate --parse flake.nix machines/client3/configuration.nix
nix eval .#clan.inventory.machines.client3
```

#### Step 2: Switch (needs committed files — flake inputs must be git-tracked)

```bash
git add -A
sudo nixos-rebuild switch --flake .#client3
```

#### Step 3: Manage

```bash
fastfree status    # FastFree CLI on the machine
fastfree update
```

### Option B: Hyper-V Deployment

#### Prerequisites

| Requirement | Details |
|:------------|:--------|
| **OS** | Windows with Hyper-V enabled |
| **VM Specs** | Generation 2 (UEFI), 4 GB+ RAM, Secure Boot OFF |

#### Step 1: Validate

```bash
cd apps/fastfree_os
nix eval .#clan.inventory.machines.client1
```

#### Step 2: Build VHDX

```bash
nix build .#packages.x86_64-linux.client1
# → fastfree_client1.vhdx.7z (password: FastOS@2026)
# (or download the artifact from the 09-client1 CI run)
```

#### Step 3: Create VM in Hyper-V

1. Open Hyper-V Manager, create a **Generation 2** VM (Secure Boot OFF).
2. Attach the extracted VHDX and start the VM.
3. Reach it at `client1.local` (Avahi) or its IP — `ssh root@client1.local`.

#### Step 4: Deploy Updates

```bash
gh workflow run 10-client2.yaml --ref master   # VPS only; Hyper-V updates via rebuild + re-attach
```

---

### Option C: VPS Deployment (client2)

The VPS deployment is handled via `10-client2.yaml`: fresh servers are installed
with `nixos-anywhere` (disko partitions the disk — fresh machines only),
existing servers update with `nixos-rebuild switch --flake .#client2`.

---

## Multi-Client Architecture

### Deploy Types

| Type | Build Output | Compression | Build in CI | Use Case |
|:-----|:-------------|:------------|:------------|:---------|
| `vps` | None (SSH deploy) | — | No | Fresh VPS / production server (disko) |
| `hyperv` | `.vhdx.7z` | 7z LZMA2 | Yes | Hyper-V VMs |
| `local` | None (in-place switch) | — | No | Existing physical machine (disk preserved) |

> **Auto-detection**: CI builds only `hyperv` clients with `build = true`. `vps` and `local` clients always have `build = false`.

### Client Config Files

Each client has its own config in `machines/<name>/` (Clan inventory in `clan.nix`):

```nix
# machines/client3/configuration.nix (local — in-place rebuild, no disk changes)
{
  hostName = "nixos";
  domain   = "fastfree.local";
  deployType = "local";      # "vps" | "hyperv" | "local"
  build = false;             # only hyperv images are CI-built

  passwords = {
    root        = "fastfree@2026";
    admin       = "fastfree@2026";
    mariadbRoot = "fastfree@2026";
    mariadbUser = "fastfree@2026";
  };

  apps = {
    base              = true;
    mariadb           = true;
    fastfree_backend  = true;
    phpmyadmin        = true;
  };

  wireguard = { enable = false; address = "10.100.0.1"; };
  avahi     = { enable = false; };
}
```

### Adding a New Client

1. Create `machines/client5/configuration.nix` with unique `hostName`, `domain`, WireGuard address
2. Register in `clan.nix` inventory (`inventory.machines.client5`); secrets via `clan vars`
3. Set `deployType` (`vps` for fresh servers, `hyperv` for images, `local` for existing machines)
4. `git add` the new files (flake files must be git-tracked for `nix eval`/`nixos-rebuild`)
5. Push to `master` — CI validates (and builds Hyper-V images)

---

## Local Machine (client3)

The `local` deploy type rebuilds an **existing** NixOS machine in place:

- **No disko** — partitions are never touched; hardware comes from
  `machines/client3/hardware-configuration.nix` (snapshot of the machine's own
  `hardware-configuration.nix`).
- **Desktop preserved** — `machines/client3/configuration.nix` keeps legacy GRUB (`/dev/sda` +
  OS prober), NetworkManager, the `fastfree` user, and the open GPU stack;
  server modules (networkd, xserver-disable, firmware-strip) are skipped for `local`.
- **Same services as everyone else** — MariaDB, Caddy, backend containers,
  COSMIC desktop, WireGuard (`10.100.0.8`), Avahi.

> disko is correct for **fresh** machines (VPS via nixos-anywhere, Hyper-V images).
> It must never run against a machine with data — that is exactly what `local` avoids.

---

## Database

| Database | User | Purpose |
|:---------|:-----|:--------|
| `fastfree_backend` | `fastfree_backend` | Frappe/ERPNext application |

> MariaDB binds to `0.0.0.0` — containers connect via `host.containers.internal`.

---

## Passwords

All passwords are centralized in `machines/*/configuration.nix` (+ `clan vars` secrets):

| Key | Used For |
|:----|:---------|
| `root` | System root user |
| `admin` | Admin user |
| `mariadbRoot` | MariaDB root access |
| `mariadbUser` | MariaDB application user |
| `githubToken` | GitHub PAT for repo access |

**7z Archive Password**: `FastOS@2026` (separate from system passwords)

---

## WireGuard VPN

Each client runs a built-in WireGuard interface (`wg0`) managed by NixOS.

| Interface | Address | ListenPort |
|:----------|:--------|:-----------|
| `wg0` | `10.100.0.x/24` | `51820` |

---

## Avahi mDNS

All clients publish `.local` names via Avahi (mDNS).

| Client | Domain | Published Names |
|:-------|:-------|:----------------|
| `client1` (Hyper-V) | `client1.fastfree.local` | `client1.fastfree.local`, `db.client1.fastfree.local` |
| `client2` (VPS) | `fastfree.cloud` | public domains via Caddy |
| `client3` (local) | `fastfree.local` | `nixos.fastfree.local`, `db.fastfree.local` |

---

## Security

| Feature | Implementation |
|:--------|:---------------|
| Containers | Podman (rootless) — no Docker daemon |
| MariaDB | Bound to 0.0.0.0 (container access) |
| SSH | Password + key-based auth |
| WireGuard | Encrypted VPN tunnel |
| 7z Archive | Password-protected (LZMA2) — Hyper-V only |
| Passwords | Centralized per client |
| Local machine | Disk never repartitioned (`local` skips disko) |
| CI/CD | GitHub Actions with least-privilege permissions |

---

<div align="center">

**FastFree Cloud** — Private License

</div>
