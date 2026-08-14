@echo off
REM FastFree Workflow Manager - Batch launcher for bash script
REM --------------------------------------------------------
REM This batch file launches the workflow-manager.sh bash script
REM using Git Bash or the system bash executable.

REM Set the path to Git Bash or bash executable
set "BASH_EXE=C:\Program Files\Git\bin\bash.exe"

REM Set the path to the workflow manager script
set "WORKFLOW_SCRIPT=%~dp0workflow-manager.sh"

REM Check if bash executable exists
if not exist "%BASH_EXE%" (
    echo.
    echo ERROR: Git Bash not found at %BASH_EXE%
    echo Please install Git for Windows or update the BASH_EXE path.
    echo.
    pause
    exit /b 1
)

REM Check if workflow script exists
if not exist "%WORKFLOW_SCRIPT%" (
    echo.
    echo ERROR: Workflow script not found at %WORKFLOW_SCRIPT%
    echo.
    pause
    exit /b 1
)

REM Display header
echo.
echo ========================================================================
echo  FastFree Workflow Manager
echo ========================================================================
echo.

REM Run the bash script, passing all arguments (%*) to it
"%BASH_EXE%" "%WORKFLOW_SCRIPT%" %*

echo.
echo ========================================================================
echo  Process completed
echo ========================================================================
echo.

pause