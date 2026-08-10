@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo  FastFree Ledger - Dev Server
echo ========================================
echo.
echo  Starting dev server...
echo  App will open at http://localhost:9004
echo.
quasar dev