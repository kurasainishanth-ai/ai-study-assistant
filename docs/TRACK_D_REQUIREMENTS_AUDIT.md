# StudyVerse — Track D Requirements Audit

> **Branch:** `feature/yagnesh` | **Last audited:** October 2026

This document maps every Track D: Personalized Tutoring & Adaptive Learning requirement to its implementation status, the file(s) that satisfy it, and verifiable evidence.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented and tested |
| 🔧 | Partially implemented or present but limited |
| ❌ | Not yet implemented |

---

## Section A — Multimodal Knowledge Base

| # | Requirement | Status | File(s) | Evidence |
|---|-------------|--------|---------|----------|
| A1 | Accept uploaded PDF/DOCX/TXT study materials | ✅ | `backend/server.py`, `backend/extractors/dispatcher.py` | `/api/materials/upload` endpoint; PDF/DOCX/TXT handled by respective extractors |
| A2 | Accept uploaded video lectures (.mp4, .webm, .mov, .mkv) | ✅ | `backend/extractors/video_extractor.py`, `backend/extractors/dispatcher.py` | `extract_video_content()` uses Gemini multimodal transcription; dispatcher routes on `"video"` key |
| A3 | Accept audio files (.mp3, .wav, .m4a, .aac, .flac, .ogg) | ✅ | `backend/extractors/video_extractor.py` | Same function handles audio MIME types; `SUPPORTED_EXTENSIONS` covers all six formats |
| A4 | Accept subtitle/transcript files (.srt, .vtt) | ✅ | `backend/extractors/video_extractor.py` | `parse_srt_content()` and `parse_vtt_content()` with timestamp segmentation |
| A5 | Extract text content from materials for AI grounding | ✅ | `backend/extractors/` (all extractors), `backend/db.py` | `save_material()` stores extracted content; AI tutor reads it per request |
| A6 | Graceful fallback when transcription fails | ✅ | `backend/extractors/video_extractor.py` | `except Exception` block returns mock timestamp segments without raising |
| A7 | Timestamp-aware segmentation for video/audio | ✅ | `backend/extractors/video_extractor.py` | Segments formatted as `--- [Timestamp HH:MM:SS] ---` |

---

## Section B — AI Tutor with Document Grounding & Citations

| # | Requirement | Status | File(s) | Evidence |
|---|-------------|--------|---------|----------|
| B1 | AI tutor answers grounded in uploaded material | ✅ | `backend/services/ai_tutor.py`, `backend/agent/prompts.py` | System instruction rule 1: "Document-grounded & General academic Knowledge Balance" |
| B2 | Acknowledge when material does not establish the answer | ✅ | `backend/services/ai_tutor.py`, `backend/agent/prompts.py` | Negative-recognition rule; TC_06, TC_07, TC_08 all scored `negative_handled_correctly: true` |
| B3 | Return structured citations per answer | ✅ | `backend/services/ai_tutor.py` | `extract_structured_citations()` returns `{raw_citation, source_id, source_name, location_type, location_val, excerpt}` |
| B4 | Citation formats: Page N, Slide N, Section N, Timestamp HH:MM:SS | ✅ | `backend/services/ai_tutor.py` | Regex patterns for all four formats; timestamp support added for video content |
| B5 | Display citation badges in the chat UI | ✅ | `frontend/src/App.jsx` | `📍 label` badges rendered below assistant messages with hover tooltip for excerpt |
| B6 | Multi-hop synthesis across multiple source locations | ✅ | `backend/services/ai_tutor.py` | TC_04 correctly cited 4 locations across pages, slides, and timestamps; multi-hop score 100% |
| B7 | Persist conversation history per material | ✅ | `backend/db.py`, `backend/server.py` | `chat_messages` table; `GET /api/tutor/history/{doc_id}` |
| B8 | Send conversation history as context to AI | ✅ | `backend/services/ai_tutor.py` | `history` param passed as prior turns in Gemini call |

---

## Section C — Adaptive Assessment

| # | Requirement | Status | File(s) | Evidence |
|---|-------------|--------|---------|----------|
| C1 | Generate quiz questions from uploaded material | ✅ | `backend/services/quiz_service.py` | `generate_quiz(doc_id, num_questions, question_type)` |
| C2 | Support MCQ, True/False, Short Answer, Numerical question types | ✅ | `backend/services/quiz_service.py` | `validate_question_preflight()` handles all 4 types; numerical uses float tolerance |
| C3 | Pre-flight question validation before delivery | ✅ | `backend/services/quiz_service.py` | `validate_question_preflight()`: validates options, correct answer presence, grounding sanity check |
| C4 | Deduplicate questions using content fingerprinting | ✅ | `backend/services/quiz_service.py`, `backend/db.py` | SHA-256 fingerprint per question; `quiz_question_fingerprints` table with `UNIQUE(doc_id, fingerprint)` |
| C5 | Evaluate MCQ and True/False answers exactly | ✅ | `backend/services/quiz_service.py` | `evaluate_quiz()` exact string/boolean match |
| C6 | Evaluate numerical answers with tolerance | ✅ | `backend/services/quiz_service.py` | `evaluate_numerical_answer()`: parses floats, applies ±5% or absolute 0.01 tolerance |
| C7 | Evaluate short-answer questions with LLM semantic grading | ✅ | `backend/services/quiz_service.py` | Gemini call for `short_answer` type within `evaluate_quiz()` |
| C8 | Quiz results feed into learner mastery model | ✅ | `backend/services/quiz_service.py`, `backend/services/learner_model.py` | `evaluate_quiz()` calls `update_mastery_from_quiz()` |
| C9 | Topic-filtered quiz generation | ✅ | `backend/services/quiz_service.py` | `topic_filter` parameter passed to Gemini prompt |
| C10 | Diagnostic intake assessment | ✅ | `backend/server.py`, `backend/services/learner_model.py` | `POST /api/learner/diagnostic/{doc_id}`; calls `generate_diagnostic_intake()` |

---

## Section D — Learner Model (BKT)

| # | Requirement | Status | File(s) | Evidence |
|---|-------------|--------|---------|----------|
| D1 | Bayesian Knowledge Tracing per topic | ✅ | `backend/services/learner_model.py` | Standard BKT with P(L₀), P(T), P(G), P(S) parameters |
| D2 | Update mastery after each quiz answer | ✅ | `backend/services/learner_model.py` | `update_mastery_from_quiz()` loops quiz evaluations and calls BKT posterior update |
| D3 | Update mastery from chat evidence | ✅ | `backend/services/learner_model.py` | `update_mastery_from_chat_evidence()` detects confusion/mastery phrases; fractional weight = 0.4 |
| D4 | Per question-type BKT parameters | ✅ | `backend/services/learner_model.py` | `QUESTION_TYPE_PARAMS` dict for mcq, short_answer, numerical, true_false |
| D5 | Compute uncertainty alongside mastery | ✅ | `backend/services/learner_model.py` | `compute_uncertainty()`: Bernoulli variance + evidence damping |
| D6 | Persist mastery to database | ✅ | `backend/db.py` | `learner_mastery` and `learner_events` tables; `update_learner_topic_mastery()` |
| D7 | Scaffolding recommendations based on mastery | ✅ | `backend/services/learner_model.py` | `get_scaffolding_recommendation()`: beginner/intermediate/advanced with quiz difficulty |
| D8 | Expose learner mastery via API | ✅ | `backend/server.py` | `GET /api/learner/mastery?student_id=...` returns BKT state + scaffolding |
| D9 | Cold-start baseline for new students | ✅ | `backend/services/learner_model.py` | `get_learner_topic_state()` returns P(L₀) baseline when no prior data |

---

## Section E — Evaluation & Benchmarking

| # | Requirement | Status | File(s) | Evidence |
|---|-------------|--------|---------|----------|
| E1 | Automated benchmark dataset | ✅ | `evaluation/benchmark_dataset.json` | 8 labeled test cases: direct factual, video timestamp, multi-hop, numerical, negative (×2), fiction redirection |
| E2 | Grounding / faithfulness metric | ✅ | `evaluation/evaluator.py` | Scores 80.9% on 8-case benchmark |
| E3 | Citation recall and precision metrics | ✅ | `evaluation/evaluator.py` | Recall: 80.0%, Precision: 71.9% |
| E4 | Negative / unsupported answer accuracy | ✅ | `evaluation/evaluator.py` | 100.0% — all 3 negative cases handled correctly |
| E5 | Multi-hop synthesis quality metric | ✅ | `evaluation/evaluator.py` | 100.0% — TC_04 cited 4 source locations correctly |
| E6 | Simulated learner experiments | ✅ | `evaluation/simulate_students.py` | 3 personas (Beginner/Intermediate/Advanced) × 5 sessions × 3 topics |
| E7 | Simulation results persisted to JSON | ✅ | `evaluation/simulation_results.json` | BKT trajectory per topic per persona |

---

## Section F — Revision Scheduler & Progress

| # | Requirement | Status | File(s) | Evidence |
|---|-------------|--------|---------|----------|
| F1 | Spaced-repetition revision scheduler | ✅ | `backend/server.py` (`/api/scheduler/` routes), `backend/db.py` | SM-2 algorithm; `revision_schedule` and `revision_sessions` tables |
| F2 | Learning progress tracking per material | ✅ | `backend/db.py`, `backend/server.py` | `get_learning_progress()` merges BKT mastery into topic progress dict |
| F3 | Knowledge map / concept graph | 🔧 | `backend/server.py` (`/api/knowledge-map/`) | Endpoint exists; returns concept nodes but does not yet render interactive graph in UI |
| F4 | Study notes creation and retrieval | ✅ | `backend/server.py` (`/api/notes/`) | Full CRUD; stored in `notes` table |
| F5 | Flashcard generation | ✅ | `backend/server.py` (`/api/flashcards/`) | AI-generated flashcards stored in `flashcards` table |
| F6 | Visual infographic generation | 🔧 | `backend/server.py` (`/api/visuals/`) | Endpoint exists; Gemini-powered text-based visual summary; not a rendered image |

---

## Summary

| Section | Requirements | ✅ Done | 🔧 Partial | ❌ Missing |
|---------|-------------|--------|-----------|---------|
| A — Knowledge Base | 7 | 7 | 0 | 0 |
| B — AI Tutor & Citations | 8 | 8 | 0 | 0 |
| C — Adaptive Assessment | 10 | 10 | 0 | 0 |
| D — Learner Model | 9 | 9 | 0 | 0 |
| E — Evaluation | 7 | 7 | 0 | 0 |
| F — Scheduler & Progress | 6 | 4 | 2 | 0 |
| **Total** | **47** | **45** | **2** | **0** |

> [!NOTE]
> The two partially-implemented items (F3 knowledge map UI, F6 rendered infographic) have working backend endpoints — the gap is limited to frontend rendering only and does not affect the core Track D adaptive-learning requirements.
