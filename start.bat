@echo off
title Launch - StudyVerse AI Platform
echo ============================================================
echo   🚀 Launching StudyVerse AI Platform...
echo ============================================================

cd /d "%~dp0"

IF EXIST ".venv\Scripts\python.exe" (
    .venv\Scripts\python.exe run.py
) ELSE (
    python run.py
)

pause
