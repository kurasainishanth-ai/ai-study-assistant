@echo off
title Install Requirements - StudyVerse AI Platform
echo ============================================================
echo   📦 StudyVerse AI Platform - Requirements Installer
echo ============================================================

cd /d "%~dp0"

IF NOT EXIST ".env" (
    IF EXIST ".env.example" (
        echo 📄 Creating .env file from .env.example...
        copy .env.example .env
    )
)

IF NOT EXIST ".venv" (
    echo ⚙️ Creating Python virtual environment (.venv)...
    python -m venv .venv
)

echo 🐍 Installing Python backend packages...
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt

echo ⚡ Installing Frontend npm packages...
cd frontend
call npm install
cd ..

echo ============================================================
echo ✅ ALL REQUIREMENTS INSTALLED SUCCESSFULLY!
echo 👉 You can now launch the app anytime by double-clicking "start.bat"
echo ============================================================
pause
