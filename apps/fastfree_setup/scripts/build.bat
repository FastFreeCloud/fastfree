@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   FastFree Setup - Build Installer
echo ============================================
echo.

set "ISCC_EXE="
set "ISS_FILE=%~dp0..\src\fastfree_setup.iss"
set "OUTPUT_DIR=%~dp0..\output"

REM --- Find Inno Setup Compiler ---
if exist "C:\Program Files\Inno Setup 7\ISCC.exe" (
    set "ISCC_EXE=C:\Program Files\Inno Setup 7\ISCC.exe"
) else if exist "C:\Program Files (x86)\Inno Setup 7\ISCC.exe" (
    set "ISCC_EXE=C:\Program Files (x86)\Inno Setup 7\ISCC.exe"
) else if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    set "ISCC_EXE=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
)

if "!ISCC_EXE!"=="" (
    echo [ERROR] Inno Setup Compiler not found.
    echo Please install Inno Setup 7 from: https://jrsoftware.org/isdl.php
    exit /b 1
)

echo [OK] Found: !ISCC_EXE!
echo.

REM --- Verify ISS file exists ---
if not exist "!ISS_FILE!" (
    echo [ERROR] Script not found: !ISS_FILE!
    exit /b 1
)

echo [INFO] Compiling: !ISS_FILE!
echo.

REM --- Create output directory ---
if not exist "!OUTPUT_DIR!" mkdir "!OUTPUT_DIR!"

REM --- Compile ---
"!ISCC_EXE!" "!ISS_FILE!"
if !errorlevel! neq 0 (
    echo.
    echo [ERROR] Build failed with code !errorlevel!.
    exit /b !errorlevel!
)

echo.
echo ============================================
echo   Build completed successfully!
echo ============================================
echo.

REM --- Show output ---
echo Output:
dir /B "!OUTPUT_DIR!\*.exe" 2>nul
echo.

REM --- Open output folder ---
explorer "!OUTPUT_DIR!"

endlocal
