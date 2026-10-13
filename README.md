# StudyVerse: AI Study Assistant

StudyVerse turns study materials into notes, flashcards, quizzes, knowledge maps, and tutor conversations grounded in your documents. The project uses a FastAPI backend, a React/Vite frontend, SQLite for local storage, and Google Gemini for AI features.

## Quick start on Windows

### Requirements

- Python 3.10 or newer
- Node.js 18 or newer (includes npm)
- A Gemini API key for AI features: [Google AI Studio](https://aistudio.google.com/app/apikey)

### Install and run

1. Clone the repository, or download and extract the GitHub ZIP. Open the project folder (the folder containing `setup.bat`).
2. Double-click `setup.bat`. It creates a Python virtual environment, installs the backend and frontend dependencies, and creates `.env` from `.env.example` if needed.
3. Open `.env` and replace the placeholder with your key:

   ```env
   GEMINI_API_KEY=your_real_api_key
   ```

4. Double-click `start.bat`. It starts the backend and frontend and opens the app in your browser. Keep the console window open while using StudyVerse; press Ctrl+C there to stop the servers.

On first launch, `start.bat` runs setup if the Python environment is missing and installs frontend packages if needed. If installation fails, the script reports the failure and exits instead of continuing with a broken setup.

## macOS and Linux

Install Python 3.10+, Node.js 18+, and npm, then run:

```bash
chmod +x setup.sh start.sh
./setup.sh
```

Add your Gemini key to `.env`, then launch with `./start.sh`. You can also run `python3 run.py` after dependencies are installed.

## Manual setup

Create and activate a virtual environment, then install backend dependencies:

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
```

Install and run the frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Run the backend from the project root in another terminal:

```bash
python -m uvicorn backend.server:app --reload --host 127.0.0.1 --port 8000
```

The web app is at <http://localhost:5173>; the API documentation is at <http://localhost:8000/docs>.

## Project layout

```text
backend/          FastAPI app, AI services, document extractors, and SQLite access
frontend/         React application and Vite configuration
sample_data/      Small sample study note
scripts/          Optional utilities and legacy Streamlit entry points
tests/            Maintained Python test suite
.env.example      Environment variable template (safe to commit)
requirements.txt  Backend Python dependencies
requirements-optional.txt  Optional dependencies for legacy Streamlit utilities
run.py            Cross-platform launcher used by start.bat and start.sh
setup.*           Dependency setup scripts
start.*           Application launch scripts
```

Runtime files such as `.env`, the local database, uploaded documents, Python environments, and npm packages are created or kept locally and are excluded from GitHub downloads.

## Features

- Import PDF, DOCX, PPTX, image, and text study materials, plus academic YouTube transcripts. Gemini reviews public YouTube video content, rather than using a channel allowlist or title-only gate, to decide whether the video teaches academic material. It uses YouTube captions when available and can attempt direct video analysis and timestamped transcription when captions cannot be retrieved.
- Upload one or multiple files. Files appear in the Library while text extraction runs in the background; they become available to Study Studio and AI Tutor when their status changes to **Ready**.
- Generate summaries in multiple styles and ask questions grounded in uploaded material.
- Create flashcards, diagnostic quizzes, interactive knowledge maps, downloadable infographics, and personalized revision schedules with trackable daily tasks.
- Store study materials and generated outputs in a local SQLite database.

## Troubleshooting

- **Python or npm not found:** Install Python 3.10+ and Node.js 18+, enable Python on PATH, then reopen the terminal and run `setup.bat` again.
- **AI features report an API key error:** Confirm `.env` is in the project root and contains a valid `GEMINI_API_KEY` value. Restart the app after changing it.
- **A port is already in use:** Stop the other process using port 8000 or 5173, then run `start.bat` again.
- **Dependencies are incomplete:** Run `setup.bat` again. It is safe to rerun.
- **A YouTube video is rejected or has no transcript:** The app asks Gemini to review video content and uses its assessment evidence in the error message. Direct analysis requires a public YouTube video and a working Gemini API key. When both Gemini video access and caption retrieval fail, the error reports both causes; private, age-restricted, or otherwise inaccessible videos may not be ingestible.

## Tests

Run the maintained Python tests from the project root:

```bash
python -m unittest discover -s tests
```

The dependencies for the legacy Streamlit utilities are optional and can be installed with `python -m pip install -r requirements-optional.txt`.

## Contributing

Create a feature branch, make your changes, and open a pull request with a short description of the change.
