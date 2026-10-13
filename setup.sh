#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "StudyVerse - first-time setup"

command -v python3 >/dev/null 2>&1 || { echo "ERROR: Python 3.10 or newer is required." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js 18 or newer is required." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "ERROR: npm is required (it is included with Node.js)." >&2; exit 1; }

python3 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' || { echo "ERROR: Python 3.10 or newer is required." >&2; exit 1; }
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)' || { echo "ERROR: Node.js 18 or newer is required." >&2; exit 1; }

if [[ ! -f .env && -f .env.example ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Add your Gemini API key before using AI features."
fi

if [[ ! -x .venv/bin/python ]]; then
  python3 -m venv .venv
fi

.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
npm --prefix frontend install

echo "Setup completed. Launch the app with ./start.sh."
