# Track D implementation and evidence

This is an engineering self-audit against the Track D brief, not an official judging score. A working feature is not the same as independently verified quality; synthetic evaluation is not evidence of real student learning gains.

## Current prototype flow

1. Library ingestion extracts text from PDFs, presentations, Word documents, images, and academic video transcripts. PDF pages retain page markers; slide decks retain slide markers. OCR/vision descriptions are added for scanned pages and a bounded set of embedded PDF/PPT figures.
2. Ready materials selected in the shared source picker are passed as a labeled source set to Study Studio generators and Ask Tutor. Tutor retrieval returns page/slide/timestamp evidence and source-aware references; unsupported questions are flagged instead of being represented as sourced.
3. Quizzes support multiple-choice, true/false, short-answer, and numerical questions. Question novelty is checked against prior attempts. Choice keys are checked against options; numerical answers use deterministic tolerance grading. Incorrect responses are persisted for misconception and learner context.
4. Topic progress uses a small Beta-prior mastery estimate with recency weighting. Tutor focus and dashboard use the same estimate. Quiz evidence, flashcard ratings, tutoring activity, saved notes, maps, infographics, and the existing revision plan feed appropriate tutor context; activity is not itself treated as proof of mastery.
5. Revision planning remains saved and trackable. Ask Tutor is instructed not to silently reschedule a student's existing plan.

## Requirement coverage

| Track D area | Implementation status | Evidence / remaining limitation |
|---|---|---|
| Multimodal knowledge base | Partial | Ingestion and OCR/figure descriptions are implemented. Figure extraction is bounded; complex visual reasoning and extraction quality need broader human review. |
| Source grounding | Strong prototype | Retrieval preserves page/slide/timestamp markers, filters unsupported questions, scopes selected sources, and resolves tutor citations back to their source document. Current benchmark is small. |
| Adaptive assessment | Strong prototype | Difficulty/count controls, several question formats including numerical problems, novelty checks, answer feedback, topic breakdown, and misconception reporting. No independent cross-model answer-key verifier is in the generation path. |
| Learner model | Partial | Recency-aware Bayesian estimates, persistent quiz mistakes, tutor history, flashcard ratings, and weak-topic focus exist. The synthetic focus-alignment result is not yet strong enough to claim reliable personalization. |
| System evaluation | Partial | Retrieval and synthetic personalization runners are repeatable. The Gemini-as-judge answer runner is a small smoke test, not a validated RAGAS/DeepEval study. Human-reviewed and real multi-session evaluation remains needed. |
| Optional enhancements | Partial | Knowledge maps, targeted study tools, revision scheduling, and language-matched tutoring exist. Audio tutoring and a complete mixed-language ingestion/evaluation workflow are not implemented. |
| Project deliverables | Partial | README and this evidence note describe setup, architecture, and evaluation. A real 3-10 minute demonstration video still needs to be recorded by the team. |

## Reproducible checks

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests
cd frontend
npm run build
npm run lint
cd ..
.\.venv\Scripts\python.exe scripts/evaluate_rag.py
.\.venv\Scripts\python.exe scripts/evaluate_personalization.py
```

At the time this note was written, the backend suite ran 97 tests: 96 passed and one was skipped; the frontend build succeeded. Lint exits successfully with existing warnings, and the Vite bundle-size warning remains.

The 15-case retrieval fixture currently reports hit@k 1.000, context precision 0.846, context recall 1.000, unsupported false-retrieval rate 0.000, and source-isolation pass rate 1.000. These are retrieval-only results, not answer faithfulness scores.

The seeded 12-profile / 5-session personalization simulation reports weakest-topic selection accuracy 0.483 and question repetition after filtering 0.000. Simulated ability gains are based on an explicit assumed practice effect and must not be presented as observed student gains. The low focus-alignment result is a known weakness to improve, not a success claim.

## Short demo recording outline (3-5 minutes)

1. Upload a textbook PDF and slide deck; show extraction status and page/slide references.
2. Select both materials and ask a question whose answer appears in each source; open the source-aware citations.
3. Generate a quiz, show difficulty and question-count controls, answer a numerical item, and review the topic feedback.
4. Mark a flashcard difficult, show weak-topic progress, and ask Ask Tutor what to focus on.
5. Show Study Studio notes/map/revision plan and explain that tutor context respects the saved schedule.
6. Close with the retrieval metrics and clearly label the personalization run as synthetic.
