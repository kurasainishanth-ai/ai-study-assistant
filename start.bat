@echo off
setlocal
title StudyVerse
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo First-time setup is required. Starting setup now...
    call setup.bat
    if errorlevel 1 exit /b 1
)

if not exist "frontend\node_modules" (
    echo Frontend packages are missing. Installing them now...
    where npm >nul 2>nul
    if errorlevel 1 (
        echo ERROR: npm was not found. Install Node.js 18 or newer and run setup.bat.
        pause
        exit /b 1
    )
    call npm --prefix frontend install
    if errorlevel 1 (
        echo ERROR: Frontend setup failed. Run setup.bat again and review the error.
        pause
        exit /b 1
    )
)

".venv\Scripts\python.exe" run.py
set "APP_EXIT=%ERRORLEVEL%"
if not "%APP_EXIT%"=="0" (
    echo.
    echo StudyVerse stopped with an error. Review the output above.
    pause
)
exit /b %APP_EXIT%
