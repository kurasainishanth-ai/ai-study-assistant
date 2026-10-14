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

- Import PDF, DOCX, PPTX, image, and text study materials, plus academic YouTube transcripts. Gemini reviews public YouTube video content, rather than using a channel allowlist or title-only gate, to decide whether the video teaches academic material. If video review disagrees with a confident academic assessment of available captions, the caption evidence can prevent a false rejection. It can also attempt direct video analysis and timestamped transcription when captions cannot be retrieved.
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

Run the small retrieval and answer-quality checks:

```bash
python scripts/evaluate_rag.py
python scripts/evaluate_personalization.py
python scripts/evaluate_tutor_answers.py
python scripts/evaluate_ragas.py --limit 3
python scripts/evaluate_ragas.py --output docs/reports/ragas-full-report.json
```

The default retrieval runner uses a 28-case source-labeled test set. The personalization runner uses 12 synthetic learner profiles across multiple sessions and compares adaptive practice with a random-topic control; results depend on explicit simulated learning assumptions and are not evidence of real student gains. The Gemini-as-judge answer runner is retained for a lightweight smoke check. For the named framework metrics, install the optional dependencies with `python -m pip install -r requirements-evaluation.txt`, then run `scripts/evaluate_ragas.py`. The Ragas runner calls the tutor and evaluator model and can consume API quota; `--limit 3` is only an integration smoke run, while a full run evaluates all cases. It uses a temporary SQLite database, not the normal study database. All LLM-judged scores need human review and should be reported with the dataset size and limitations.

Regenerate the synthetic PDF, DOCX, PPTX, and image test assets with `python scripts/create_test_dataset.py`. For UI upload and manual test steps, see [`docs/TESTER_DATASET_AND_GUIDE.md`](docs/TESTER_DATASET_AND_GUIDE.md). For the complete source-grounding test set and multi-session student profiles, see `tests/fixtures/comprehensive_rag_eval_set.json` and `tests/fixtures/synthetic_student_profiles.json`.

The dependencies for the legacy Streamlit utilities are optional and can be installed with `python -m pip install -r requirements-optional.txt`.

## Tester pack and demo video

For a ready-to-upload synthetic dataset, 18 manual QA cases, and instructions for recording a truthful product walkthrough, see:

- [`docs/TESTER_DATASET_AND_GUIDE.md`](docs/TESTER_DATASET_AND_GUIDE.md)
- [`docs/YOUTUBE_DEMO_SCRIPT.md`](docs/YOUTUBE_DEMO_SCRIPT.md)
- Dataset files: [`sample_data/test_dataset/`](sample_data/test_dataset/)

The dataset is intended for functional smoke/regression checks, not as a validated educational benchmark. The demo script is a recording aid; no video is included until the team records one.

## Contributing

Create a feature branch, make your changes, and open a pull request with a short description of the change.
