# FastFree Dev Toolkit — Installer

Professional installer for Windows that bundles portable development tools (7-Zip, Docker CLI, Docker Compose) into a single `.exe`.

## Features

- Modern dark theme UI
- Component selection (pick which tools to install)
- Automatic PATH configuration
- Silent install support (`/SILENT`, `/VERYSILENT`)
- Clean uninstaller
- Windows 10/11 64-bit support

## Requirements

- Windows 10/11 64-bit (build 19045+)
- 8 GB RAM (for Docker)
- Hardware Virtualization enabled
- WSL2 or Hyper-V enabled (for Docker)
- Inno Setup 7 (to compile)

## Project Structure

```
fastfree_setup/
├── tools/              # Portable binaries (download first)
│   ├── 7zip/
│   ├── docker/
│   └── docker-compose/
├── resources/          # Icons and images
├── src/                # Inno Setup script
├── scripts/            # Build and download scripts
├── output/             # Compiled installer
└── README.md
```

## Quick Start

1. Run `scripts\download-tools.bat` to download tools
2. Run `scripts\build.bat` to compile installer
3. Find output in `output\` folder

## Tools Included

| Tool | Version | License |
|------|---------|---------|
| 7-Zip | 26.02 | LGPL |
| Docker CLI | 29.7.2 | Apache 2.0 |
| Docker Compose | 5.5.0 | Apache 2.0 |

## Silent Install

```batch
fastfree-setup-v1.0.0.exe /SILENT
fastfree-setup-v1.0.0.exe /VERYSILENT
fastfree-setup-v1.0.0.exe /SILENT /COMPONENTS="7zip,docker"
```

## License

FastFree OS - MIT License
