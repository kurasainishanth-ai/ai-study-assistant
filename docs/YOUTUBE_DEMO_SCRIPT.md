# StudyLane demo video script

**Target runtime:** 4–5 minutes  
**Audience:** Hackathon judges and first-time users  
**Recording note:** This is a recording script, not a claim that a video has already been recorded. Use a clean test account/workspace and the bundled tester dataset. Avoid showing API keys, personal files, or real student records.

## 0:00–0:20 — Opening

**On screen:** StudyLane dashboard.

**Say:** “Students often have notes, slides, and videos in different places, while their weak topics and study progress are tracked somewhere else. StudyLane brings those materials and study tools into one learning workspace, with an AI tutor that can use the selected study sources.”

## 0:20–0:55 — Add and select learning materials

**On screen:** Library. Add the three text files from `sample_data/test_dataset/` (and optionally a PDF or YouTube link that you have permission to use). Wait until extraction finishes and the materials show Ready. Open Ask Tutor’s source selector and select all three materials.

**Say:** “For this demo I’ve loaded a small, deliberately cross-topic test pack: neural networks, database transactions, and study skills. Selecting more than one source lets us check that answers are not silently limited to a single document.”

## 0:55–1:40 — Grounded tutor and source references

**On screen:** Ask Tutor. Ask: “Compare atomicity in database transactions with the idea of updating model weights.” Then open the displayed references.

**Say:** “The tutor should combine relevant material from the selected sources and show where its evidence came from. I can open a reference to inspect the source. If the selected material does not contain an answer, the tutor should say so instead of presenting an unsupported claim as sourced.”

**On screen:** Ask: “What does the study-skills note say about spaced practice?” Then ask an unsupported question such as “What is the capital of Japan?”

**Say:** “This also checks a focused question and an out-of-scope question. Grounding is useful only when the student can tell which statements are supported.”

## 1:40–2:25 — Study Studio outputs

**On screen:** Select the neural-network and database documents; generate a summary or notes, then create flashcards or a knowledge map.

**Say:** “Study Studio turns selected materials into revision formats. I’m checking that the output reflects the chosen sources and preserves important terms, rather than just looking polished.”

## 2:25–3:15 — Quiz and feedback

**On screen:** Create a quiz. Choose 5 questions and a difficulty. If numerical questions are offered, answer one correctly and one incorrectly; otherwise demonstrate another available question type. Review the score and topic feedback.

**Say:** “The quiz supports configurable length and difficulty. After answering, the student can review correctness and topic-level feedback. This sample pack is small, so this is a product-flow demonstration—not proof of assessment validity.”

## 3:15–4:00 — Progress and next focus

**On screen:** Dashboard progress / topic mastery, then Ask Tutor. Ask: “Based on my recent quiz results, what should I review next?” If the test account has no quiz history, complete the short quiz first.

**Say:** “The intended loop is practice, feedback, and a targeted next step. Progress estimates are signals from recorded activity, not a diagnosis or a guarantee of learning. The student remains in control of their revision plan.”

## 4:00–4:35 — Close and honest limitations

**On screen:** Show the README or tester guide and end on the app.

**Say:** “StudyLane connects uploaded learning sources with tutoring, study tools, and progress tracking. This prototype still needs broader human evaluation across real subjects and learners; the bundled test data is for repeatable functional checks, not a substitute for that evaluation. The goal is to make studying more connected, inspectable, and responsive to the learner.”

## Recording checklist

- Confirm the backend and frontend are running and the API key is not visible.
- Use a fresh demo workspace; upload the bundled dataset and wait for Ready status.
- Select all three sources before the cross-source question; check each citation opens the expected material.
- Do not imply unsupported questions are always refused perfectly; show the observed result accurately.
- Keep the video between 3 and 10 minutes, enable captions if available, and include the repository/setup link in the description.
- Re-record or narrate around any failed feature; do not edit a failure into a success claim.
