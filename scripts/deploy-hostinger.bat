@echo off
chcp 65001 >nul
title FastFree Hostinger Deploy
setlocal EnableDelayedExpansion

set ACTION=%~1
if "%ACTION%"=="" set ACTION=update

if /I "%ACTION%"=="install" (
  echo [!] WARNING: INSTALL will WIPE the VPS and install NixOS from scratch.
  echo     Triggering: install-hostinger.yaml  (confirm=INSTALL)
  echo.
  gh workflow run install-hostinger.yaml -f confirm=INSTALL
  echo.
  echo [+] Dispatched. Open GitHub Actions to watch progress:
  echo     https://github.com/FastFreeCloud/fastfree/actions
) else if /I "%ACTION%"=="update" (
  echo [+] Triggering: update-hostinger.yaml
  echo.
  gh workflow run update-hostinger.yaml
  echo.
  echo [+] Dispatched. Open GitHub Actions to watch progress:
  echo     https://github.com/FastFreeCloud/fastfree/actions
) else (
  echo Usage: deploy-hostinger.bat [install^|update]
  echo   install  - wipe VPS + install NixOS (nixos-anywhere, password)
  echo   update   - apply config update (colmena, SSH key)
)

endlocal
pause
