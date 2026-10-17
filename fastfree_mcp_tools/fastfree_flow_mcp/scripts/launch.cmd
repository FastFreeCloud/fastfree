@echo off
REM Start CentBrowser with remote debugging so fastfree_flow_mcp can drive it.
REM Closes any running instance first: CDP flags only apply at launch.

set "CHROME=C:\Users\FastFree\AppData\Local\CentBrowser\Application\chrome.exe"
set "PORT=9222"

echo [1/3] Closing running browser...
taskkill /IM chrome.exe /F >nul 2>&1
timeout /t 2 >nul

echo [2/3] Launching CentBrowser with CDP on port %PORT%...
start "" "%CHROME%" --remote-debugging-port=%PORT% --remote-allow-origins=* --no-first-run --no-default-browser-check

echo [3/3] Waiting for CDP endpoint...
timeout /t 5 >nul
curl.exe -s http://127.0.0.1:%PORT%/json/version
echo.