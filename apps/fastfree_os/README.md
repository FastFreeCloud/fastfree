<div align="center">

<img src="https://img.shields.io/badge/NixOS-26.05-5277C3?style=for-the-badge&logo=nixos&logoColor=white" />
<img src="https://img.shields.io/badge/Hyper--V-Gen%202-0078D4?style=for-the-badge&logo=microsoft&logoColor=white" />
<img src="https://img.shields.io/badge/WSL-2-0078D4?style=for-the-badge&logo=windows&logoColor=white" />
<img src="https://img.shields.io/badge/GitHub-Actions-2088FF?style=for-the-badge&logo=github&logoColor=white" />
<img src="https://img.shields.io/badge/WireGuard-VPN-88B84D?style=for-the-badge&logo=wireguard&logoColor=white" />
<img src="https://img.shields.io/badge/License-Private-EF4444?style=for-the-badge" />

# FastFree OS

**NixOS Multi-Client Deployment System**

Production-ready NixOS with multi-client architecture, **3 deployment types** (hostinger + Hyper-V + WSL), WireGuard VPN, Podman containers, GitHub Actions CI/CD, and auto-release.

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
- [WSL Configuration](#wsl-configuration)
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
│  hostinger        hyperv              wsl                        │
│  (VPS)            (Hyper-V)           (WSL2)                    │
│       │                │                  │                      │
│       ▼                ▼                  ▼                      │
│  SSH deploy       VHDX image          .wsl.7z tarball           │
│  nixos-anywhere   7z compressed       7z compressed             │
│  build=false      build=true          build=true                │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  CI auto-detects deployType:                              │ │
│  │  • hostinger → skip build, force build=false              │ │
│  │  • hyperv    → build VHDX, compress, release              │ │
│  │  • wsl       → build WSL, compress, release               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Clients:  dev (WSL) · client1 (Hyper-V) · client2 (Hyper-V)   │
│            server (hostinger)                                    │
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
│  │              NixOS VM (Hyper-V / hostinger)                   │   │
│  │                                                          │   │
│  │  MariaDB ◄──── fastfree_backend.nix (Podman containers)    │   │
│  │       ◄──── phpmyadmin.nix                              │   │
│  │                                                          │   │
│  │  WireGuard VPN ◄── wireguard.nix                        │   │
│  │  Avahi mDNS     ◄── avahi-subdomains.nix                │   │
│  │  Caddy          ◄── caddy.nix (hostinger only)                │   │
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
├ flake.nix                            # NixOS flake — multi-client builder (mkVHDX + mkWSL)
├ flake.lock                           # Locked dependencies (nixpkgs, disko, colmena, nixos-wsl)
├ nix/
│  ├── options.nix                     # Custom options (identity, passwords, apps, deployType, WSL)
│  ├── cli.nix                         # FastFree CLI tool
│  ├── disko.nix                       # hostinger disk partitioning
│  ├── modules/                        # Service modules (toggle per client)
│  │  ├── base.nix                     # Base system (Podman, SSH, users)
│  │  ├── mariadb.nix                  # MariaDB database server
│  │  ├── caddy.nix                    # Caddy reverse proxy (hostinger)
│  │  ├── fastfree_backend.nix         # Frappe/ERPNext — Podman containers from GHCR
│  │  ├── phpmyadmin.nix               # phpMyAdmin container
│  │  ├── wireguard.nix                # WireGuard VPN (NixOS built-in)
│  │  └── avahi-subdomains.nix         # Avahi mDNS
│  └── clients/                        # Client configurations
│     ├── server.nix                   # Hostinger (deployType=hostinger, build=false)
│     ├── client1.nix                  # Hyper-V (deployType=hyperv, build=false)
│     ├── client2.nix                  # Hyper-V (deployType=hyperv, build=false)
│     └── dev.nix                      # WSL (deployType=wsl, build=true)
├ scripts/
│  ├── 01_test.ps1                     # PowerShell — syntax, flake validation & system builds
│  ├── 02_build.ps1                    # PowerShell — build and compress VHDX/WSL image
│  ├── 03_check_vm.ps1                 # PowerShell — SSH service and port health check
│  ├── 04_deploy.ps1                   # PowerShell — sync and deploy configuration to VM
│  ├── 05_setup_vm.ps1                 # PowerShell — automated Hyper-V VM provisioner
│  └── logs/                           # Auto-generated log files
├ .github/workflows/
│  └── build.yml                        # GitHub Actions — 9-job CI pipeline + auto-release
└ README.md
```

---

## Scripts

All scripts are PowerShell (`.ps1`) and run from Windows. They use WSL internally to execute Nix commands.

### `01_test.ps1` — Validate Configuration

Runs Nix checks inside the `fastfree` WSL distribution. Supports three testing depths:

```powershell
.\scripts\01_test.ps1              # Default: 5 basic evaluation & build tests
.\scripts\01_test.ps1 -Quick       # Quick: 2 tests (Syntax/Flake check + flake metadata)
.\scripts\01_test.ps1 -Full        # Full: 15 comprehensive evaluation, dry-run, VHDX build & GC tests
```

| Test Depth | Number of Tests | Key Validations | Typical Duration |
|:---|:---:|:---|:---|
| **Quick** | 2 | Flake structural check (`--no-build`), flake metadata evaluation. | ~10-15 seconds |
| **Default** | 5 | Syntax/Flake checks, custom option evaluation, flake show structure, rebuild build. | ~1-2 minutes |
| **Full** | 15 | Quick checks, multiple option evaluations, build dry-runs for systems/packages, complete VHDX packaging build, multiple client evaluations, and garbage collection. | ~10-30 minutes |

**Output**: `scripts/logs/test_YYYYMMDD_HHMMSS.log`

---

### `02_build.ps1` — Build VHDX Image

```powershell
.\scripts\02_build.ps1                    # Build dev client
.\scripts\02_build.ps1 -Client client1    # Build specific client
```

| Stage | What It Does | Duration |
|:------|:-------------|:---------|
| 1. Syntax Check | Validates all `.nix` files (excluding cli.nix) | ~5 sec |
| 2. Flake Check | Validates flake structure and outputs | ~10 sec |
| 3. Build VHDX | `nix build` → Fixed VHDX → 7z compress | ~20-40 min |

**Output**: `result/fastfree_dev.vhdx.7z` (password: `FastOS@2026`) / `fastfree_dev.wsl.7z` (password: `FastOS@2026`)

**What happens during build**:
1. Nix evaluates `flake.nix` → resolves all dependencies
2. Builds NixOS system toplevel derivation
3. Creates disk image via `make-disk-image.nix`
4. Converts raw image to Fixed VHDX (Hyper-V format)
5. Compresses with 7z (LZMA2, password-protected)

---

### `03_check_vm.ps1` — VM Health Check

```powershell
.\scripts\03_check_vm.ps1                       # Check dev.local
.\scripts\03_check_vm.ps1 -Host 192.168.1.42    # Check by IP
```

| Stage | What It Does |
|:------|:-------------|
| 1. Connection | SSH connection test |
| 2. System Info | OS version, NixOS version |
| 3. Services | Check systemd services (sshd, mysql, caddy, etc.) |
| 4. Ports | Check listening ports (22, 3306, 443, 51820, 8081, 8082) |
| 5. Containers | List running Podman containers |
| 6. Errors | Recent journal errors |

**Output**: `scripts/logs/check_YYYYMMDD_HHMMSS.log`

---

### `04_deploy.ps1` — Deploy to Running VM

```powershell
.\scripts\04_deploy.ps1                       # Deploy to dev.local
.\scripts\04_deploy.ps1 -Host 192.168.1.42    # Deploy by IP
```

| Stage | What It Does |
|:------|:-------------|
| 1. Check Connection | SSH connection test |
| 2. Sync Files | SCP entire `nix` directory and flake configurations to VM |
| 3. Commit + Rebuild | `git add -A && git commit` → `nixos-rebuild switch` |
| 4. Verify Services | Check systemd services after rebuild |

**Output**: `scripts/logs/deploy_YYYYMMDD_HHMMSS.log`

**What happens during deploy**:
1. Copies local Nix configurations folder to VM via SCP
2. Commits changes in the VM's `/etc/fastfree/` git repo
3. Runs `nixos-rebuild switch --flake /etc/fastfree#dev`
4. NixOS evaluates the flake, downloads dependencies, rebuilds system
5. Services restart automatically

---

### `05_setup_vm.ps1` — Provision Hyper-V VM (Admin required)

Automates the provisioning of a NixOS Hyper-V Gen 2 virtual machine using a built VHDX image.

```powershell
# Run from an Administrator PowerShell prompt:
.\scripts\05_setup_vm.ps1                                              # Default (dev client)
.\scripts\05_setup_vm.ps1 -ClientName client1 -VMName "FastFree-Prod"  # Custom client
```

| Step | Operation | Purpose |
|:---|:---|:---|
| **1. Find & Extract VHDX** | Locates the latest `.vhdx.7z` in `result/` and extracts it using 7-Zip. | Prepares the virtual disk for provisioning. |
| **2. Clean Pre-existing VM** | Checks if a VM with the same name exists, stops it, and clears checkpoints and hard disks. | Prevents creation conflicts. |
| **3. Create VM** | Provisions a Gen 2 VM with custom memory, CPU cores (default: 2), and a network adapter. | Instantiates VM with proper hardware allocations. |
| **4. Attach Disk** | Copies the extracted VHDX to the VM storage directory and mounts it to SCSI Controller 0. | Assigns NixOS system disk to the VM. |
| **5. Compatibility Setup** | Disables Secure Boot (to support systemd-boot) and enables TPM. | Ensures compatibility with modern UEFI standards. |
| **6. Integration Features**| Enables Hyper-V "Guest Service Interface" and sets checkpoint type to Standard. | Improves management and connection reliability. |

**Output**: `scripts/logs/setup_vm_YYYYMMDD_HHMMSS.log`

---

## CI/CD Pipeline

### The Build Workflow (`build.yml`)

When you push code or open a pull request, the comprehensive build pipeline defined in `.github/workflows/build.yml` triggers automatically. It features **9 jobs** arranged across 4 phases:

```
                  ┌──────────────────────────────────────┐
                  │          Phase 1: Fast Checks        │
                  │   ┌──────────────────────────────┐   │
                  │   │ syntax_check  ⚡             │   │
                  │   ├──────────────────────────────┤   │
                  │   │ nix_lint (optional) 🔍       │   │
                  │   ├──────────────────────────────┤   │
                  │   │ flake_validate 📦            │   │
                  │   ├──────────────────────────────┤   │
                  │   │ evaluation 🔧                │   │
                  │   └──────────────┬───────────────┘   │
                  └──────────────────┼───────────────────┘
                                     ▼
                  ┌──────────────────────────────────────┐
                  │      Phase 2: Build & Integration    │
                  │   ┌──────────────────────────────┐   │
                  │   │ dry_build 🏗️                  │   │
                  │   ├──────────────────────────────┤   │
                  │   │ build_packages 📦            │   │
                  │   ├──────────────────────────────┤   │
                  │   │ service_tests 🧪 (KVM VM)    │   │
                  │   └──────────────┬───────────────┘   │
                  └──────────────────┼───────────────────┘
                                     ▼
                  ┌──────────────────────────────────────┐
                  │           Phase 3: Reporting         │
                  │   ┌──────────────────────────────┐   │
                  │   │ test_report 📊               │   │
                  │   └──────────────┬───────────────┘   │
                  └──────────────────┼───────────────────┘
                                     ▼
                  ┌──────────────────────────────────────┐
                  │           Phase 4: Release           │
                  │   ┌──────────────────────────────┐   │
                  │   │ release 🚀 (auto-tag)        │   │
                  │   └──────────────────────────────┘   │
                  └──────────────────────────────────────┘
```

#### Pipeline Job Breakdown

1.  **⚡ Syntax Check (`syntax_check`)**:
    *   Validates all `.nix` files syntax using `nix-instantiate --parse` (excluding `cli.nix`).
    *   Verifies balanced curly braces `{ }` and checks that all local file `import` paths exist.
2.  **🔍 Code Quality (`nix_lint`)**:
    *   Runs `statix` to search for anti-patterns.
    *   Runs `deadnix` to locate dead code and unused arguments.
    *   *Non-blocking*: Warnings are flagged but do not break the build.
3.  **📦 Flake Check (`flake_validate`)**:
    *   Validates flake structure and exports via `nix flake check --no-build`, `nix flake show`, and `nix flake metadata`.
    *   Performs Python-based JSON integrity checks on `flake.lock`.
    *   Ensures 20 core configuration files/folders exist in the repository structure.
4.  **🔧 Config Evaluation (`evaluation`)**:
    *   Uses `nix eval` to parse all client system closures (those with `build = true`) to verify configuration option definitions.
5.  **🏗️ Dry-Run Build (`dry_build`)**:
    *   Ensures a valid build plan can be constructed using `nix build --dry-run` for system configurations and VHDX/WSL packages.
6.  **📦 Build Packages (`build_packages`)**:
    *   Builds actual NixOS packages for clients with `build = true`.
    *   **WSL**: `nix build` → `sudo tarball-builder` → `7z compress` → upload `fastfree_dev.wsl.7z`.
    *   **Hyper-V**: `nix build` → `7z compress` (LZMA2, mx=9, password-protected) → upload `.vhdx.7z`.
    *   `hostinger` clients are automatically excluded (build=false).
7.  **🧪 Service Integration Tests (`service_tests`)**:
    *   Runs NixOS system VM integration tests (`nixosTest` defined in `checks.x86_64-linux`) for 5 system services: `sshd`, `mariadb`, `wireguard`, `phpmyadmin`, and `podman`.
    *   Spawns complete sandboxed VMs and executes Python testing scripts inside them.
    *   *Performance Optimization*: Leverages GitHub Actions runner virtualization by granting read/write permissions to `/dev/kvm` and setting `system-features = kvm nixos-test`, accelerating VM execution from hours to minutes.
8.  **📊 Results Report (`test_report`)**:
    *   Executes always (even if previous steps fail).
    *   Generates a structured Markdown test report (`test-report.md`) uploaded as an Actions artifact.
    *   Publishes results directly to the GitHub Action run summary (`GITHUB_STEP_SUMMARY`) and outputs an ASCII results table in the job log.
9.  **🚀 Release (`release`)**:
    *   Creates a Git tag with format `vYYYY.MM.DD.RUN_NUMBER` on every successful build to `master`.
    *   Creates a **GitHub Release** with the compressed build artifacts (`.wsl.7z`, `.vhdx.7z`).
    *   **Requires all 8 previous jobs to pass** before creating the release.

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
| `nix/**` | NixOS modules or client configs changed |
| `flake.nix` | Flake structure changed |
| `flake.lock` | Dependencies updated |
| `.github/workflows/build.yml` | Build workflow itself changed |

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
| 443 | Caddy | — | 0.0.0.0 (hostinger) |
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

| Service | WSL | Hyper-V | hostinger |
|:--------|:----|:--------|:----|
| Frappe/ERPNext | `http://localhost:8080` | `http://client1.local:8080` | `https://erp.fastfree.cloud` |
| phpMyAdmin | `http://localhost:8082` | `http://db.client1.local:8082` | `https://db.fastfree.cloud` |
| SSH | `wsl -d fastfree` | `ssh root@client1.local` | `ssh root@fastfree.cloud` |

---

## Quick Start

### Option A: WSL Deployment (Recommended for dev)

#### Prerequisites

| Requirement | Details |
|:------------|:--------|
| **OS** | Windows 10/11 with WSL2 enabled |
| **WSL** | NixOS-WSL installed as `fastfree` distro |

#### Step 1: Validate

```powershell
.\scripts\01_test.ps1 -Quick
```

#### Step 2: Download from GitHub Release

The CI automatically builds `fastfree_dev.wsl.7z` on every push to `master`.

1. Go to [Releases](https://github.com/FastFreeCloud/fastfree_os/releases)
2. Download `fastfree_dev.wsl.7z` from the latest release
3. Extract and import:
   ```powershell
   7z x fastfree_dev.wsl.7z -pFastOS@2026
   wsl --import fastfree D:\fastfree\fastos fastfree_dev.wsl --version 2
   ```

#### Step 3: Access

```powershell
wsl -d fastfree
```

#### Step 4: Update (optional)

```bash
# From inside WSL
fastfree update
```

### Option A2: GUI Setup Scripts

Use the GUI tools in `scripts/setup/`:

| Script | Purpose |
|:-------|:--------|
| `1_fastfree_installer.ps1` | First-time installation from GitHub Release |
| `2_fastfree_backup.ps1` | Backup and restore WSL distribution |
| `3_fastfree_tools.ps1` | Install required tools (7-Zip, Docker CLI) |
| `4_fastfree_update.ps1` | Update system (nixos-rebuild switch) |

---

### Option B: Hyper-V Deployment

#### Prerequisites

| Requirement | Details |
|:------------|:--------|
| **OS** | Windows with Hyper-V enabled |
| **VM Specs** | Generation 2 (UEFI), 4 GB+ RAM, Secure Boot OFF |

#### Step 1: Validate

```powershell
.\scripts\01_test.ps1 -Quick
```

#### Step 2: Build VHDX

```powershell
.\scripts\02_build.ps1
```

#### Step 3: Create VM in Hyper-V

1. Open a PowerShell prompt as **Administrator**.
2. Run the VM provisioning script:
   ```powershell
   .\scripts\05_setup_vm.ps1 -ClientName client1 -VMName FastFree-Client1
   ```
   *Note: This script will extract your freshly built VHDX image, stop and clean up any pre-existing "FastFree-Dev" VM, provision a new Gen 2 VM, disable Secure Boot (for systemd-boot compatibility), enable Guest Integration Services, and automatically start the virtual machine.*

#### Step 4: Check VM

```powershell
.\scripts\03_check_vm.ps1
```

#### Step 5: Deploy Updates

```powershell
.\scripts\04_deploy.ps1
```

---

### Option C: Hostinger (VPS) Deployment

The VPS deployment is handled automatically via `nixos-anywhere`. No VHDX/WSL build needed.

---

## Multi-Client Architecture

### Deploy Types

| Type | Build Output | Compression | Build in CI | Use Case |
|:-----|:-------------|:------------|:------------|:---------|
| `hostinger` | None (SSH deploy) | — | No | VPS / Production server |
| `hyperv` | `.vhdx.7z` | 7z LZMA2 | Yes | Hyper-V VMs |
| `wsl` | `.wsl.7z` | 7z LZMA2 | Yes | WSL2 distributions |

> **Auto-detection**: CI automatically detects `deployType` and builds the correct format. `hostinger` clients always have `build = false`.

### Client Config Files

Each client has its own config in `nix/clients/`:

```nix
# nix/clients/dev.nix (WSL — builds .wsl.7z)
{
  hostName = "fastfree";
  domain   = "fastfree.local";
  deployType = "wsl";      # "hostinger" | "hyperv" | "wsl"
  build = true;             # true = CI builds this client

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

1. Create `nix/clients/client2.nix` with unique `hostName`, `domain`, `passwords`
2. Register in `flake.nix`: `clients.client2 = import ./nix/clients/client2.nix;`
3. Set `deployType` and `build` in the client config
4. Push to `master` — CI auto-detects and builds

---

## WSL Configuration

### Available WSL Options

Configure WSL clients using `fastfree.wsl.*` options in your client config:

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `defaultUser` | string | `"root"` | Default non-root user |
| `useWindowsDriver` | bool | `true` | Enable OpenGL/GPU from Windows host |
| `startMenuLaunchers` | bool | `true` | Create Start Menu shortcuts for GUI apps |
| `dockerDesktop` | bool | `false` | Enable Docker Desktop WSL integration |
| `wrapBinSh` | bool | `true` | Wrap `/bin/sh` with correct env vars |
| `interop.includePath` | bool | `true` | Include Windows PATH in WSL |
| `interop.register` | bool | `false` | Register binfmt_misc for Windows executables |
| `wslConf.boot.systemd` | bool | `true` | Use systemd as init |
| `wslConf.automount.root` | string | `"/mnt"` | Mount point for Windows drives |
| `wslConf.automount.options` | string | `"metadata,uid=1000,gid=100"` | Default mount options |
| `wslConf.network.generateResolvConf` | bool | `true` | Generate `/etc/resolv.conf` through WSL |
| `sshAgent` | bool | `false` | Enable ssh-agent passthrough to Windows |
| `usbip` | bool | `false` | Enable USB/IP integration |

### WSL Example Config

```nix
# nix/clients/dev.nix
{
  hostName = "fastfree";
  deployType = "wsl";
  build = true;

  fastfree.wsl = {
    defaultUser = "root";
    useWindowsDriver = true;
    startMenuLaunchers = true;
    interop.includePath = true;
    wslConf.boot.systemd = true;
    wslConf.automount.root = "/mnt";
  };
}
```

### Building WSL Locally

```bash
# Build the WSL tarball
nix build .#packages.x86_64-linux.dev

# Run the tarball builder (requires sudo)
sudo ./result/bin/nixos-wsl-tarball-builder fastfree_dev.wsl

# Compress
7z a -t7z -m0=lzma2 -mx=9 fastfree_dev.wsl.7z fastfree_dev.wsl
```

---

## Database

| Database | User | Purpose |
|:---------|:-----|:--------|
| `fastfree_backend` | `fastfree_backend` | Frappe/ERPNext application |

> MariaDB binds to `0.0.0.0` — containers connect via `host.containers.internal`.

---

## Passwords

All passwords are centralized in `nix/clients/*.nix`:

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

Hyper-V clients use Avahi for zero-conf `.local` name resolution. WSL clients use `localhost` for port forwarding.

| Client | Domain | Published Names |
|:-------|:-------|:----------------|
| `dev` (WSL) | `localhost` | `localhost:8080`, `localhost:8081`, `localhost:8082` |
| `client1` (Hyper-V) | `client1.fastfree.local` | `client1.fastfree.local`, `db.client1.fastfree.local` |

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
| WSL | System isolation via WSL2 kernel |
| CI/CD | GitHub Actions with least-privilege permissions |

---

<div align="center">

**FastFree Cloud** — Private License

</div>
