@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo  FastFree Ledger - Clear Cache
echo ========================================
echo.
if exist ".quasar" (
    rmdir /s /q ".quasar"
    echo  .quasar [DELETED]
)
if exist "dist" (
    rmdir /s /q "dist"
    echo  dist [DELETED]
)

:: Create bootstrap .quasar directory with tsconfig so AE can load
echo  Rebuilding...
if not exist ".quasar" mkdir ".quasar"
echo {"extends":"../../../tsconfig.json"}> ".quasar\tsconfig.json"
quasar prepare --silent 2>nul
echo.
echo  Done! Run start-dev.bat to launch.
echo.
echo  IMPORTANT: Open DevTools (F12) > Console and run:
echo    localStorage.removeItem('lc-groups')
echo  Then refresh the page to start fresh.
echo.
pause
