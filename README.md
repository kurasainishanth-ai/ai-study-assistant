# 🎓 StudyVerse: Multimodal AI Study Assistant

StudyVerse is a modern, AI-powered study platform built to transform study materials into interactive learning tools. Upload document formats (PDF, DOCX, PPTX, Images, and Text) and StudyVerse will automatically extract knowledge, generate Smart Notes, create Flashcards, build Diagnostic Quizzes, render interactive Knowledge Maps, and answer your questions via a grounded AI Tutor.

---

## ⚡ 1-Click Quick Start ("Jugaad" Launchers)

No need to open multiple terminals or type long commands! We provided 1-click single-button launchers for Windows, macOS, and Linux:

### 🚀 Launch Backend + Frontend + Open Browser (1-Click)
* **Windows**: Double-click **`start.bat`** (or run `.\start.bat` in terminal).
* **macOS / Linux**: Run **`./start.sh`** (or `python3 run.py`).

> *This launcher automatically checks requirements, installs any missing Python/NPM packages, fires up both the FastAPI backend and Vite React frontend, and opens `http://localhost:5173` in your default browser automatically!*

---

### 📦 Pre-Install All Dependencies Only (1-Click)
* **Windows**: Double-click **`setup.bat`**
* **macOS / Linux**: Run **`./setup.sh`**

> *Creates virtual environment, upgrades pip, installs all Python packages, and installs all React npm modules.*

---

## 📁 Clean Directory Structure

The repository is organized into distinct, modular folders:

```
ai-study-assistant/
├── 📂 backend/               # FastAPI Backend & Core AI Logic
│   ├── 📂 agent/            # AI Orchestrator, Prompts & Parsers
│   ├── 📂 extractors/       # Document Parsing (PDF, DOCX, PPTX, OCR, Text)
│   ├── 📂 services/         # AI Tutor, Flashcards, Quiz, Knowledge Map
│   ├── config.py            # API Key & Gemini Client Configuration
│   ├── db.py                # SQLite Database & Schema Persistence
│   ├── server.py            # REST API Endpoints (FastAPI)
│   └── summarizer.py        # Multimodal Summarization Logic
├── 📂 frontend/              # Single Page Application (React 19 + Vite + Tailwind v4)
│   ├── public/              # SVG Icons & Static Assets
│   ├── src/                 # React UI Components, Views & API Services
│   └── package.json         # Frontend Package Configuration
├── 📂 tests/                 # Comprehensive Test Suite (43 Unit Tests)
├── 📂 sample_data/           # Sample Notes for Quick Testing
├── 📂 scripts/               # Legacy App & CLI Utility Scripts
├── 📄 .env.example           # Template for Environment Variables
├── 📄 .gitignore            # Git Exclusions (Secrets, Builds, DBs)
├── 📄 requirements.txt       # Python Dependencies
├── 🚀 run.py                 # Cross-Platform Master Launcher
├── ⚡ setup.bat / setup.sh   # 1-Click Requirements Installer
├── 🎮 start.bat / start.sh   # 1-Click App Launcher
└── 📘 README.md              # Project Documentation
```

---

## 🛠️ Prerequisites & Setup

### Prerequisites
* **Python**: 3.10 or higher
* **Node.js**: 18 or higher
* **Gemini API Key**: Free key from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

### 🔑 Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and enter your Google Gemini API key:
   ```env
   GEMINI_API_KEY=AIzaSy...Your_Actual_API_Key_Here
   ```

---

### 💻 Manual CLI Setup (Optional)

If you prefer to run services manually in separate terminals:

#### 1. Backend (FastAPI)
```bash
# Activate virtual environment
python -m venv .venv
source .venv/bin/activate   # Linux/Mac
# .venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Start backend server
python -m uvicorn backend.server:app --reload --port 8000
```
*Backend API docs available at: `http://localhost:8000/docs`*

#### 2. Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
*Frontend app available at: `http://localhost:5173`*

---

## 🧪 Running Unit Tests

Run the complete 43-test suite with a single command:

```bash
python -m unittest discover -s tests
```

---

## 🌟 Key Features

* 📄 **Multimodal Document Ingestion**: Process PDF, PPTX, DOCX, Images (with Gemini Vision OCR), and Text notes.
* 📝 **Smart Note Summarization**: Generate Concise, Detailed, Study Guide, or Bulleted summaries with customizable focus topics.
* 🤖 **Grounded AI Tutor**: Interactive chat trained specifically on your uploaded materials with source citations.
* 🎴 **Interactive Flashcards**: Auto-generated Q&A flashcards with mastery tracking.
* 🎯 **Diagnostic Quizzes**: Multiple-choice & short answer quizzes with instant grading and explanations.
* 🕸️ **Knowledge Maps**: Interactive 2D force-directed concept graphs mapping key relationships.

---

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m "feat: add amazing feature"`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request!
