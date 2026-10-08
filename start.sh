#!/bin/bash
echo "============================================================"
echo "   🚀 Launching StudyVerse AI Platform..."
echo "============================================================"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

if [ -f ".venv/bin/python" ]; then
    .venv/bin/python run.py
else
    python3 run.py
fi
