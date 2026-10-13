# StudyVerse — System Architecture

> **Branch:** `feature/yagnesh` | **Stack:** React + Vite (frontend), Python FastAPI (backend), SQLite (database), Gemini API (AI)

---

## High-Level Architecture

```mermaid
flowchart TD
    subgraph Frontend["Frontend — React + Vite"]
        UI["App.jsx\n(Chat, Upload, Quiz, Progress)"]
        API_SVC["services/api.js\n(axios client)"]
    end

    subgraph Backend["Backend — FastAPI (server.py)"]
        UPLOAD["/api/materials/upload"]
        CHAT["/api/tutor/chat"]
        QUIZ_GEN["/api/quiz/generate"]
        QUIZ_EVAL["/api/quiz/evaluate"]
        SCHED["/api/scheduler/"]
        MASTERY["/api/learner/mastery"]
        DIAG["/api/learner/diagnostic/{doc_id}"]
    end

    subgraph Extractors["Extractors (backend/extractors/)"]
        DISP["dispatcher.py"]
        PDF["pdf_extractor.py"]
        DOCX["docx_extractor.py"]
        TXT["txt_extractor.py"]
        VID["video_extractor.py"]
    end

    subgraph Services["Services (backend/services/)"]
        TUTOR["ai_tutor.py\n(ask_ai_tutor, extract_structured_citations)"]
        QUIZ_SVC["quiz_service.py\n(generate_quiz, evaluate_quiz)"]
        LM["learner_model.py\n(BKT update, scaffolding)"]
    end

    subgraph AI["Gemini API"]
        GEMINI["gemini-3.5-flash-lite\n(via gemini_caller.py)"]
    end

    DB[("SQLite\nstudyverse.db")]

    UI --> API_SVC --> UPLOAD & CHAT & QUIZ_GEN & QUIZ_EVAL & SCHED & MASTERY & DIAG
    UPLOAD --> DISP --> PDF & DOCX & TXT & VID --> DB
    CHAT --> TUTOR --> GEMINI
    TUTOR --> LM --> DB
    QUIZ_GEN --> QUIZ_SVC --> GEMINI
    QUIZ_EVAL --> QUIZ_SVC --> LM
    MASTERY --> LM --> DB
```

---

## 1. File Upload & Extraction Pipeline

```mermaid
flowchart LR
    USER["User uploads file"] --> ENDPOINT["/api/materials/upload\n(server.py)"]
    ENDPOINT --> DISPATCH["dispatcher.dispatch_extraction()\n(dispatcher.py)"]
    DISPATCH -->|".pdf"| PDF["pdf_extractor.py\n→ pdfplumber text extraction"]
    DISPATCH -->|".docx"| DOCX["docx_extractor.py\n→ python-docx paragraphs"]
    DISPATCH -->|".txt / .md"| TXT["txt_extractor.py\n→ raw text read"]
    DISPATCH -->|".srt / .vtt"| SRT["video_extractor.py\n→ parse_srt_content / parse_vtt_content\n→ [Timestamp HH:MM:SS] segments"]
    DISPATCH -->|".mp4 / .webm / .mp3 / ..."| VID["video_extractor.py\n→ Gemini multimodal transcription\n→ [Timestamp HH:MM:SS] segments\n→ fallback: mock segments"]
    PDF & DOCX & TXT & SRT & VID --> SAVE["db.save_material()\n(db.py)\n→ materials table\n→ content nested in data.content"]
```

**Key design decisions:**
- All extracted content is stored once in `materials.data` (JSON blob with `content`, `total_units`, `unit_name`).
- Video/audio content is segmented by timestamp so citations can reference `[Timestamp HH:MM:SS]` locations.
- Failed Gemini transcription falls back to mock segments — the upload always succeeds.

---

## 2. AI Tutor Chat Flow

```mermaid
sequenceDiagram
    participant U as User (App.jsx)
    participant A as api.js
    participant S as server.py
    participant T as ai_tutor.py
    participant G as Gemini API
    participant LM as learner_model.py
    participant DB as SQLite

    U->>A: tutor(doc_id, message, history, student_id)
    A->>S: POST /api/tutor/chat
    S->>DB: get_material(doc_id) → doc_content
    S->>DB: get_chat_history(doc_id) → prior turns
    S->>T: ask_ai_tutor(question, doc_content, history, ...)
    T->>G: generate_content(system_instruction, history, question)
    G-->>T: answer_text with [Page N] / [Timestamp HH:MM:SS] markers
    T->>T: extract_structured_citations(answer_text, doc_content)
    T->>LM: update_mastery_from_chat_evidence(student_id, topic, message)
    LM->>DB: update_learner_topic_mastery(...)
    T-->>S: {answer, citations, structured_citations}
    S->>DB: save_chat_message(doc_id, question, answer, citations)
    S-->>A: {answer, citations, structured_citations, ...}
    A-->>U: render answer + citation badges (📍)
```

---

## 3. Adaptive Quiz Pipeline

```mermaid
flowchart TD
    GEN["POST /api/quiz/generate\n{doc_id, num_questions, question_type, topic_filter}"]
    GEN --> GQ["quiz_service.generate_quiz()"]
    GQ --> GEMINI["Gemini API\n→ JSON array of questions"]
    GEMINI --> PREFLIGHT["validate_question_preflight()\nper question:\n• MCQ: ≥2 distinct options, correct answer in options\n• Numerical: extract float, set tolerance\n• True/False: auto-populate options\n• Grounding sanity check vs doc_content"]
    PREFLIGHT -->|pass| FINGERPRINT["compute_question_fingerprint()\nSHA-256 of normalized text"]
    FINGERPRINT -->|not seen before| STORE["db.record_question_fingerprints()\nINSERT OR IGNORE into quiz_question_fingerprints"]
    PREFLIGHT -->|fail| DISCARD["discard, request replacement"]
    STORE --> DELIVER["Return validated quiz to frontend"]

    EVAL["POST /api/quiz/evaluate\n{doc_id, answers, student_id}"]
    EVAL --> EQ["quiz_service.evaluate_quiz()"]
    EQ -->|MCQ / T-F| EXACT["exact string match"]
    EQ -->|numerical| NUM["evaluate_numerical_answer()\nfloat parse + ±5% / abs 0.01 tolerance"]
    EQ -->|short_answer| LLM["Gemini semantic grading"]
    EXACT & NUM & LLM --> BKT["update_mastery_from_quiz()\n(learner_model.py)"]
    BKT --> DB2["update_learner_topic_mastery()\n(db.py)"]
```

---

## 4. Learner Model Update Flows

```mermaid
flowchart LR
    QUIZ_EVAL["Quiz evaluation complete"] --> UMQ["update_mastery_from_quiz()\n• per question, per topic\n• calls update_bkt_posterior()"]
    CHAT["Chat message processed"] --> UMCE["update_mastery_from_chat_evidence()\n• detects confusion / mastery phrases\n• fractional weight = 0.4\n• calls update_bkt_posterior()"]
    UMQ & UMCE --> BKT_FN["update_bkt_posterior(p_current, is_correct, p_g, p_s, p_t, weight)\n→ new P(L_n)\n→ uncertainty score"]
    BKT_FN --> DB["update_learner_topic_mastery(student_id, topic, p_mastery, attempts, correct, confidence)\n(db.py → learner_mastery table)"]
    DB --> SCAFFOLD["get_scaffolding_recommendation(topic, student_id)\n→ beginner / intermediate / advanced\n→ recommended quiz difficulty"]
```

---

## 5. Database Schema (Key Tables)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `materials` | Uploaded study materials + extracted content | `id`, `name`, `type`, `data` (JSON) |
| `chat_messages` | Tutor conversation history per material | `doc_id`, `role`, `content`, `citations` |
| `quiz_results` | Per-question quiz evaluation results | `doc_id`, `student_id`, `question`, `is_correct` |
| `quiz_question_fingerprints` | SHA-256 deduplication of generated questions | `doc_id`, `fingerprint` (UNIQUE) |
| `learner_mastery` | BKT mastery state per student per topic | `student_id`, `topic`, `p_mastery`, `attempts`, `confidence` |
| `learner_events` | Append-only log of mastery update events | `student_id`, `topic`, `event_type`, `weight`, `is_correct` |
| `revision_schedule` | Spaced-repetition schedule per material | `doc_id`, `student_id`, `next_review`, `interval_days` |
| `notes` | User study notes per material | `doc_id`, `student_id`, `content` |
| `flashcards` | AI-generated flashcards per material | `doc_id`, `front`, `back` |

---

## 6. API Endpoints Summary

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/materials/upload` | `server.py` | Upload and extract material |
| GET | `/api/materials` | `server.py` | List all materials |
| POST | `/api/tutor/chat` | `ai_tutor.ask_ai_tutor` | Send message to AI tutor |
| GET | `/api/tutor/history/{doc_id}` | `server.py` | Fetch chat history |
| POST | `/api/quiz/generate` | `quiz_service.generate_quiz` | Generate adaptive quiz |
| POST | `/api/quiz/evaluate` | `quiz_service.evaluate_quiz` | Evaluate quiz answers |
| GET | `/api/learner/mastery` | `server.py` | Get BKT mastery + scaffolding |
| POST | `/api/learner/diagnostic/{doc_id}` | `server.py` | Generate diagnostic intake quiz |
| GET/POST | `/api/scheduler/` | `server.py` | Revision schedule CRUD |
| GET | `/api/progress/{doc_id}` | `server.py` | Learning progress + BKT state |
| POST | `/api/notes/` | `server.py` | Create study note |
| GET | `/api/flashcards/{doc_id}` | `server.py` | Retrieve flashcards |
