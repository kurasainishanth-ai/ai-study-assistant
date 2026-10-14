# StudyLane — record-ready demonstration video

**Target duration:** 6–7 minutes (comfortably within the required 3–10 minutes)<br>
**Audience:** Hackathon judges and first-time users<br>
**Format:** Screen recording with narration; no special effects required.

This is a script for a video the team still needs to record. It is written around the current StudyLane prototype and synthetic demo materials. Read the quoted narration naturally; bracketed instructions are actions for the presenter, not spoken lines. Do not claim a behavior worked unless it is visible in the recording.

## Before recording

- Start the backend and frontend; open StudyLane in a clean demo workspace.
- Check that the Gemini API key is configured, but never show `.env`, credentials, terminals containing secrets, or personal student data.
- Upload these synthetic files in **Library** before recording, and wait for **Ready**: `neural_networks.txt`, `database_systems.txt`, `study_skills.txt`, and `formats/algorithm_runtime.pdf` from `sample_data/test_dataset/`. Optionally add `formats/neural_network_slides.pptx` to show slide ingestion. Pre-uploading avoids dead air while extraction runs.
- Have one quiz ready or plan to generate one during recording. Use a fresh demo workspace so progress is easy to explain.
- If an API result or citation is wrong, pause and re-record that section. Do not edit a failure to look like a successful result.

## 0:00–0:35 — Hook and product

**On screen:** StudyLane dashboard, then a brief view of Library, Study Studio, and Ask Tutor.

**Say:**

“When students study from slides, textbooks, and videos, their materials, practice, and progress often end up disconnected. StudyLane is a study workspace that brings those pieces together: add learning materials, create study activities, ask a tutor grounded in selected sources, and use practice history to guide what to review next. I’ll show the full path using synthetic course materials.”

## 0:35–1:25 — Source-upload workflow

**On screen:** Open **Library**. Show the four preloaded materials and their Ready status. Briefly open a material’s details or preview. Point out the PDF and, if uploaded, the slide deck.

**Say:**

“First, materials enter through the Library. StudyLane accepts common study formats such as text, PDF, Word documents, presentations, and images, and can also process supported public YouTube videos. Extraction runs before a material is ready to use. Page, slide, or timestamp markers are kept with extracted content where available, so the tutor and study tools can point back to evidence.”

**Action:** If showing upload live, add one small file and wait for Ready. Otherwise, show the completed extraction status; do not imply the upload is still processing.

## 1:25–2:35 — Grounded tutor interaction

**On screen:** Open **Ask Tutor**. Select **Database Systems** in the source picker. Ask: “What does atomicity mean in a database transaction?” Wait for the response. Show the citation/reference and open it if the UI allows.

**Say:**

“In Ask Tutor, I choose the source I want the answer grounded in. I’ll ask: ‘What does atomicity mean in a database transaction?’ The tutor retrieves relevant passages from that selected material, sends the evidence with my question to the language model, and returns an answer with a source reference. I can inspect the cited material instead of treating the response as a black box.”

**Action:** Read or paraphrase only what the actual answer says. Open its source reference and show the matching page or material name.

**On screen:** Switch the selected material to **Neural Networks**. Ask: “What range of values does sigmoid produce?” Show the resulting reference.

**Say:**

“Now I’ve changed the selected source, so this question is about a different course. The answer should be grounded in the neural-network notes, not the database material. Source selection and citations make that boundary visible.”

**Optional, only if the result is clear:** Select **Database Systems** and ask about a topic not in that file, such as photosynthesis. Show how the actual response handles missing evidence. Do not describe this as perfect refusal behavior; the prototype still needs broader testing.

## 2:35–3:35 — Assessment pipeline

**On screen:** Open the quiz tool in Study Studio. Select a material, set **5 questions**, choose a difficulty, and generate the quiz. Answer at least one item; show feedback or the result screen.

**Say:**

“Next is the assessment loop. I select the material, set the quiz length and difficulty, and generate questions from the study content. The prototype supports several question formats, including multiple choice, short answer, true/false, and numerical questions when appropriate. After a response, it checks the answer, shows feedback, and records topic-level quiz evidence for progress tracking.”

**Action:** Use an actual question from the generated quiz. Answer it, then point to the displayed correctness and explanation. If the generated quiz does not include a numerical question, say “This run generated [actual type] questions”; do not imply every quiz contains every type.

## 3:35–4:25 — Study tools and progress

**On screen:** Use **Study Studio** to create one quick output—notes, flashcards, or a knowledge map—from a selected material. Then show the dashboard’s topic/progress view.

**Say:**

“The same selected materials can also be turned into revision formats such as notes, flashcards, or a knowledge map. Quiz activity contributes topic-level evidence to the learner view. The mastery estimate is a lightweight, recency-aware summary of recorded attempts—not a diagnosis, and not proof that a student has mastered a topic.”

**Action:** Show one generated output and one topic progress indicator. Keep personal or unrelated data out of frame.

## 4:25–5:25 — Technical architecture

**On screen:** Show this simple architecture slide or draw the flow on screen:

```text
Student
  ↓
React + Vite interface
  ↓ HTTP API
FastAPI backend ──→ format extractors / OCR / transcript processing
  ↓                              ↓
SQLite persistence ← extracted text + page/slide/time references
  ↓
Selected-source retrieval → Gemini tutor / study-tool generation
  ↓
Answer + citations / quiz grading + topic evidence
  ↓
Saved chat, study outputs, and learner progress
```

**Say:**

“At a high level, the browser interface is built with React and Vite, and communicates with a FastAPI backend. Format-specific extractors prepare uploaded material; OCR or transcript processing is used where supported. The backend stores materials, chats, generated study outputs, and learning activity in SQLite. For Ask Tutor, the selected-source retrieval step supplies relevant passages to Gemini. Quiz results update the learner context, which can inform later recommendations. This is a prototype architecture: the current retrieval and personalization evaluations show areas that still need improvement.”

## 5:25–6:05 — Close

**On screen:** Return to Ask Tutor or the dashboard. Keep the app visible for the final line.

**Say:**

“That’s the StudyLane workflow: upload learning sources, study and practice from them, inspect tutor references, and use recorded attempts to guide revision. Our test pack and evaluation runners make it possible to check source retrieval and simulated learner behavior, but synthetic results are not a substitute for testing with real courses and students. The next step is broader human review of answer quality, source citations, and personalization. Thanks for watching.”

## Final recording checklist

- Final duration is between **3 and 10 minutes**; this script is paced for about 6–7 minutes.
- The recording visibly demonstrates material upload/readiness, grounded tutor questions and source references, quiz generation and feedback, and the architecture.
- Keep API credentials, private study files, and personal student information off screen.
- Use captions if available; check audio and screen text are readable.
- Include the repository/setup instructions and note that the supplied test materials are synthetic.
- Report observed behavior honestly; do not present simulated gains as real learning outcomes or a smoke test as a full benchmark.
