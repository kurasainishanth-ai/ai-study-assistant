#!/bin/bash
echo "============================================================"
echo "   📦 StudyVerse AI Platform - Requirements Installer"
echo "============================================================"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📄 Creating .env file from .env.example..."
        cp .env.example .env
    fi
fi

if [ ! -d ".venv" ]; then
    echo "⚙️ Creating Python virtual environment (.venv)..."
    python3 -m venv .venv
fi

echo "🐍 Installing Python backend packages..."
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "⚡ Installing Frontend npm packages..."
cd frontend
npm install
cd ..

echo "============================================================"
echo "✅ ALL REQUIREMENTS INSTALLED SUCCESSFULLY!"
echo "👉 You can now launch the app anytime by running './start.sh'"
echo "============================================================"
