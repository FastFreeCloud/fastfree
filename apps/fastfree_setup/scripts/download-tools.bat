@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   FastFree Setup - Download Portable Tools
echo ============================================
echo.

set "ROOT_DIR=%~dp0.."
set "TOOLS_DIR=%ROOT_DIR%\tools"
set "TEMP_DIR=%ROOT_DIR%\_dl_temp"

set "SEVENZIP_URL=https://github.com/ip7z/7zip/releases/download/26.02/7z2602-extra.7z"
set "DOCKER_CLI_URL=https://download.docker.com/win/static/stable/x86_64/docker-29.7.2.zip"
set "DOCKER_COMPOSE_URL=https://github.com/docker/compose/releases/download/v5.5.0/docker-compose-windows-x86_64.exe"

REM --- Create directories ---
echo [1/7] Creating directories...
if not exist "%TOOLS_DIR%\7zip"           mkdir "%TOOLS_DIR%\7zip"
if not exist "%TOOLS_DIR%\docker-cli"     mkdir "%TOOLS_DIR%\docker-cli"
if not exist "%TOOLS_DIR%\docker-compose" mkdir "%TOOLS_DIR%\docker-compose"
if not exist "%TEMP_DIR%"                 mkdir "%TEMP_DIR%"
echo.

REM --- Download 7-Zip Extra ---
echo [2/7] Downloading 7-Zip Extra (7z2602-extra.7z)...
powershell -NoProfile -Command "Invoke-WebRequest -Uri '%SEVENZIP_URL%' -OutFile '%TEMP_DIR%\7z2602-extra.7z' -UseBasicParsing"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to download 7-Zip Extra.
    exit /b 1
)
echo [OK] 7-Zip Extra downloaded.
echo.

REM --- Download Docker CLI ---
echo [3/7] Downloading Docker CLI (docker-29.7.2.zip)...
powershell -NoProfile -Command "Invoke-WebRequest -Uri '%DOCKER_CLI_URL%' -OutFile '%TEMP_DIR%\docker.zip' -UseBasicParsing"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to download Docker CLI.
    exit /b 1
)
echo [OK] Docker CLI downloaded.
echo.

REM --- Download Docker Compose ---
echo [4/7] Downloading Docker Compose (v5.5.0)...
powershell -NoProfile -Command "Invoke-WebRequest -Uri '%DOCKER_COMPOSE_URL%' -OutFile '%TOOLS_DIR%\docker-compose\docker-compose.exe' -UseBasicParsing"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to download Docker Compose.
    exit /b 1
)
echo [OK] Docker Compose downloaded.
echo.

REM --- Extract 7-Zip Extra ---
echo [5/7] Extracting 7-Zip Extra...
REM The .7z archive contains: 7z.exe, 7z.dll, 7za.exe, 7zCon.sfx, FarManager\
powershell -NoProfile -Command "Expand-Archive -Path '%TEMP_DIR%\7z2602-extra.7z' -DestinationPath '%TEMP_DIR%\7zip-extracted' -Force" 2>nul
if %errorlevel% neq 0 (
    echo [INFO] PowerShell cannot extract .7z files directly.
    echo [INFO] Trying alternative: copying raw files if any existing 7z is available...
    REM If user has 7-Zip installed elsewhere, try to use it
    where 7z.exe >nul 2>&1
    if %errorlevel% equ 0 (
        7z x "%TEMP_DIR%\7z2602-extra.7z" -o"%TEMP_DIR%\7zip-extracted" -y
    ) else (
        echo [WARNING] Cannot extract .7z archive automatically.
        echo [ACTION REQUIRED] Please manually extract 7z2602-extra.7z and copy files to tools\7zip\
        echo.
    )
)
REM Copy extracted files if extraction succeeded
if exist "%TEMP_DIR%\7zip-extracted" (
    xcopy /Y /Q /E "%TEMP_DIR%\7zip-extracted\*" "%TOOLS_DIR%\7zip\" >nul 2>&1
    echo [OK] 7-Zip files copied to tools\7zip\
) else (
    echo [SKIP] 7-Zip extraction requires manual step.
)
echo.

REM --- Extract Docker CLI ---
echo [6/7] Extracting Docker CLI...
powershell -NoProfile -Command "Expand-Archive -Path '%TEMP_DIR%\docker.zip' -DestinationPath '%TEMP_DIR%\docker-extracted' -Force"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to extract Docker CLI.
    exit /b 1
)
REM The zip contains docker\ subfolder with all files
if exist "%TEMP_DIR%\docker-extracted\docker" (
    xcopy /Y /Q /E "%TEMP_DIR%\docker-extracted\docker\*" "%TOOLS_DIR%\docker-cli\" >nul 2>&1
    echo [OK] Docker CLI copied to tools\docker-cli\
) else (
    xcopy /Y /Q /E "%TEMP_DIR%\docker-extracted\*" "%TOOLS_DIR%\docker-cli\" >nul 2>&1
    echo [OK] Docker CLI files copied to tools\docker-cli\
)
echo.

REM --- Clean up temp files ---
echo [7/7] Cleaning up temp files...
rmdir /S /Q "%TEMP_DIR%" 2>nul
echo.

echo ============================================
echo   All tools downloaded successfully!
echo ============================================
echo.
echo Installed tools:
echo   tools\7zip\            - 7-Zip Extra (7zr.exe)
echo   tools\docker-cli\      - Docker CLI (docker.exe)
echo   tools\docker-compose\  - Docker Compose (docker-compose.exe)
echo.
echo Next step: Run scripts\build.bat to compile the installer.
echo.

endlocal
