# StudyVerse — Demo Script (Track D)

> **Estimated duration:** 5–8 minutes  
> **Branch:** `feature/yagnesh`  
> **Audience:** Judges evaluating Track D: Personalized Tutoring & Adaptive Learning

---

## Pre-Demo Checklist

Before starting the demo, verify:

- [ ] Backend is running: `cd backend && .venv\Scripts\uvicorn server:app --reload`
- [ ] Frontend is running: `cd frontend && npm run dev`
- [ ] App is open at `http://localhost:5173`
- [ ] A sample PDF **and** a `.srt` or `.mp4` lecture file are ready to upload
- [ ] No leftover test data — optionally reset: `del studyverse.db` then restart backend (reinitializes DB)

---

## Step 1 — Material Upload (0:00–1:00)

**Action:** Upload a PDF study material.

1. Click **"Upload Material"** or use the upload area in the sidebar.
2. Select a PDF (e.g., `Machine Learning Notes.pdf`).
3. Wait for the success toast — material appears in the sidebar with type **"PDF Document"**.

**What to say:**
> "StudyVerse accepts PDF, Word documents, plain text, and video or audio lecture files. The system extracts content and stores it for AI-grounded tutoring."

**Action:** Upload a subtitle file or video lecture.

1. Upload a `.srt` transcript file (e.g., `Lecture 3 - Gradient Descent.srt`).
2. Confirm it appears with type **"Lecture Transcript"**.

> "For video lectures, the system parses timestamps and segments the transcript so the AI can cite specific moments."

---

## Step 2 — AI Tutor with Document-Grounded Answers (1:00–2:30)

**Action:** Select the PDF material. Open the AI Tutor chat.

1. Click on the uploaded PDF material to open the tutor chat.
2. Type: **"What is the cost function for linear regression and why is there a 1/2 factor?"**
3. Wait for the AI response.

**What to show:**
- The AI answer cites `[Page 2]` or similar source location.
- A **📍 Page 2** citation badge appears under the response.
- Hover the badge to see the excerpt from the actual document.

> "Every answer is grounded in the uploaded material. The system extracts structured citations — page, slide, section, or timestamp — and displays them as clickable badges."

**Action:** Ask a question not in the material.

4. Type: **"What is the default learning rate for the Adam optimizer in our notes?"**

**What to show:**
- The AI responds: *"The uploaded material does not establish..."* — it does **not** hallucinate an answer.

> "The tutor is trained to honestly acknowledge when the material doesn't cover a topic, rather than fabricate an answer."

---

## Step 3 — Multi-Hop Synthesis (2:30–3:15)

**Action:** Ask a cross-source question.

1. Type: **"How does the training objective differ between linear regression and multiclass classification, and what happens to model complexity when we regularize?"**

**What to show:**
- The AI cites multiple source locations (e.g., `[Page 2]`, `[Slide 4]`, `[Timestamp 00:12:30]`).
- Multiple citation badges appear under the answer.

> "The AI synthesizes information across multiple source types — pages, slides, and video timestamps — in a single coherent answer."

---

## Step 4 — Adaptive Quiz with Pre-Flight Validation (3:15–4:30)

**Action:** Generate a quiz.

1. Navigate to the **Quiz** section for the PDF material.
2. Generate a 5-question mixed-type quiz.
3. Point out the question types: MCQ, True/False, Short Answer, Numerical.

> "Questions are validated before delivery — the system checks that MCQ options are distinct, that the correct answer is among the choices, and that the question is grounded in the material."

**Action:** Answer the quiz.

4. Answer a few questions — mix of correct and incorrect.
5. Submit and view the evaluation results.

**What to show:**
- MCQ and True/False are graded exactly.
- Short-answer uses Gemini semantic grading.
- Numerical uses float tolerance (e.g., ±5%).

> "After evaluation, each answer updates the student's Bayesian Knowledge Tracing model for that topic."

---

## Step 5 — Learner Model & Scaffolding (4:30–5:30)

**Action:** View learner mastery (API demo or frontend display).

Open the browser console or use a REST client:

```
GET http://localhost:8000/api/learner/mastery?student_id=default_student
```

**What to show:**
- Per-topic mastery probability (e.g., `"Linear Regression": 0.72`).
- Confidence and uncertainty scores.
- Scaffolding recommendation: `"intermediate"` → `"recommended_difficulty": "medium"`.

> "The Bayesian Knowledge Tracing model maintains a mastery estimate per topic, updated by both quiz answers and chat interactions. The scaffolding recommendation adjusts quiz difficulty and guidance level to match where the student is right now."

**Action (optional):** Show diagnostic intake.

```
POST http://localhost:8000/api/learner/diagnostic/{doc_id}
```

> "New students can take a diagnostic assessment that initializes their learner model before the first session."

---

## Step 6 — Revision Scheduler (5:30–6:15)

**Action:** Show the revision scheduler.

1. Navigate to the **Schedule** or **Progress** section.
2. Show the next scheduled review date for the uploaded material.
3. Optionally create a new scheduled review session.

> "StudyVerse implements spaced-repetition scheduling using the SM-2 algorithm. The system computes the optimal review interval based on past performance and schedules the next session automatically."

---

## Step 7 — Evaluation Results (6:15–7:00)

**Action:** Show the benchmark results summary (open `evaluation/evaluation_results.json` or read from the terminal).

> "We ran an 8-case academic grounding benchmark with real Gemini API calls:"

| Metric | Score |
|--------|-------|
| Grounding & Faithfulness | **80.9%** |
| Citation Recall | **80.0%** |
| Citation Precision | **71.9%** |
| Negative Rejection Accuracy | **100%** |
| Multi-Hop Synthesis | **100%** |

**Action:** Briefly show simulation results.

> "We also ran simulated learner experiments across three personas — Beginner, Intermediate, and Advanced — each over 5 sessions. The BKT model correctly tracks mastery growth, scaffolding level changes, and uncertainty reduction as evidence accumulates."

---

## Step 8 — Closing (7:00–8:00)

**Summary of Track D features demonstrated:**

| Feature | Status |
|---------|--------|
| Multimodal knowledge base (PDF, video, audio, subtitles) | ✅ |
| Document-grounded AI tutor with structured citations | ✅ |
| Multi-hop synthesis across source types | ✅ |
| Honest negative handling (no hallucination) | ✅ |
| Adaptive quiz: 4 question types + pre-flight validation | ✅ |
| Bayesian Knowledge Tracing learner model | ✅ |
| Scaffolding recommendations (beginner/intermediate/advanced) | ✅ |
| Spaced-repetition revision scheduler | ✅ |
| Automated evaluation benchmark + simulated experiments | ✅ |

> "All 57 unit tests pass. The frontend build is error-free. The system is ready for evaluation."

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend not starting | Check `.venv` is activated; run `pip install -r backend/requirements.txt` |
| `GEMINI_API_KEY` error | Ensure `backend/.env` contains `GEMINI_API_KEY=...` |
| Upload fails | Check file size < 10MB; check `UPLOAD_DIR` exists |
| Empty quiz generated | Material content may be too short; use a longer PDF |
| BKT endpoint 404 | Confirm backend is on the latest code and DB is re-initialized |
