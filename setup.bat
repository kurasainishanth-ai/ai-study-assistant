@echo off
setlocal
title StudyVerse Setup
cd /d "%~dp0"

echo =============================================
echo   StudyVerse - First-time setup
echo =============================================

where python >nul 2>nul
if errorlevel 1 (
    echo ERROR: Python was not found. Install Python 3.10 or newer and enable "Add Python to PATH".
    pause
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js was not found. Install Node.js 18 or newer, then reopen this window.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm was not found. Reinstall Node.js with npm included, then reopen this window.
    pause
    exit /b 1
)

python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)"
if errorlevel 1 (
    echo ERROR: Python 3.10 or newer is required.
    pause
    exit /b 1
)

node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)"
if errorlevel 1 (
    echo ERROR: Node.js 18 or newer is required.
    pause
    exit /b 1
)

if not exist ".env" if exist ".env.example" (
    echo Creating .env from .env.example...
    copy /y ".env.example" ".env" >nul
    if errorlevel 1 goto :failed
)

if not exist ".venv\Scripts\python.exe" (
    echo Creating Python virtual environment...
    python -m venv .venv
    if errorlevel 1 goto :failed
)

echo Installing Python packages...
".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 goto :failed
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto :failed

echo Installing frontend packages...
call npm --prefix frontend install
if errorlevel 1 goto :failed

echo.
echo Setup completed. Add your Gemini API key to .env before using AI features.
echo Start the app with start.bat.
pause
exit /b 0

:failed
echo.
echo ERROR: Setup did not finish. Review the message above, fix the issue, and run setup.bat again.
pause
exit /b 1
