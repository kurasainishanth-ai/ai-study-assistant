# StudyLane tester dataset and manual QA guide

This pack is a small, synthetic, openly reusable functional test set. It contains no real student data. It is designed to exercise the product flows and common failure cases; it is not a statistically representative benchmark and does not establish learning gains or answer accuracy across subjects. The manual checklist currently contains 26 end-to-end cases.

## Load the dataset

1. Start the app and open **Library**.
2. Add the three `.txt` files in `sample_data/test_dataset/` and, for format coverage, each PDF, DOCX, PPTX, and image in `sample_data/test_dataset/formats/` as separate materials.
3. Wait until each material reports **Ready**. Image and embedded-figure OCR requires the configured Gemini service; record an extraction failure rather than treating it as a pass.
4. In Ask Tutor, test each-source, multi-source, and all-material selection. The JSON manifest gives expected evidence and expected behavior.
5. For other Study Studio features, select the stated material(s) before generating output.

The manifest is `sample_data/test_dataset/manifest.json`. It includes plain text plus synthetic PDF, DOCX, PPTX, chart-image, and diagram-image files under `sample_data/test_dataset/formats/`. Regenerate those binary samples with `python scripts/create_test_dataset.py` if needed. Text sections use markers such as `[Page 1]`; the generated PDF/DOCX/PPTX include page, section, or slide cues for reference checks.

## Core test cases

| ID | Flow | Setup / action | Expected check |
|---|---|---|---|
| T01 | Single-source grounding | Select Neural Networks; ask what the input layer does. | Answer is supported by that material and cites its page marker. |
| T02 | Different single source | Select Database Systems; ask what atomicity means. | Answer cites the database material, not another document with a colliding page number. |
| T03 | Multi-source grounding | Select Neural Networks and Database Systems; ask for a comparison of learned weights and transaction atomicity. | Relevant evidence from both selected materials appears; citations open the matching sources. |
| T04 | All-material selection | Select all three; ask what spaced practice means. | Study Skills source is available and cited; selecting all does not silently collapse to one source. |
| T05 | Unsupported question | Select only Database Systems; ask about photosynthesis. | Tutor acknowledges the selected source does not support the answer; no fabricated source citation. |
| T06 | Source isolation | Select only Study Skills; ask for the definition of ReLU. | Neural Networks content is not used as selected-source evidence. |
| T07 | Summary | Select Neural Networks and Database Systems; generate a summary. | Both requested topics appear; no unrelated Study Skills claims. |
| T08 | Quiz controls | Generate quizzes with 5 questions, then try 10/15 if available and choose easy/medium/hard. | Requested count/difficulty is honored where generation succeeds; errors are visible and recoverable. |
| T09 | Quiz grading | Answer one item correctly and one incorrectly. For numerical items, test exact, near-tolerance, wrong-unit, and clearly wrong answers. | Score and feedback match the displayed key; numeric tolerance and units behave consistently. |
| T10 | Quiz question formats | Generate separate quizzes and look for MCQ, true/false, short-answer, and numerical items. Submit correct, incorrect, blank, and equivalent short answers. | The displayed question type matches grading behavior; invalid or blank responses do not crash or receive misleading feedback. |
| T11 | Repeated questions | Generate or retake a quiz from the same source. | Obvious duplicate questions are reduced; if content is too limited, note any repetition rather than assuming novelty. |
| T12 | Learner focus | Complete quiz items across at least two topics, including a mistake; ask tutor what to review. | Response can use available progress evidence and identifies a reasonable weak topic; it does not claim certainty from sparse attempts. |
| T13 | Revision schedule | Create or inspect a revision plan, then ask tutor for a focus recommendation. | Existing plan is not silently rewritten; recommendation can be made without changing scheduled tasks. |
| T14 | Normal prose and Markdown | Ask for a short explanation with a heading, bullet list, and inline code. | Prose, heading, list, and inline code remain legible and formatted. |
| T15 | Code rendering | Ask for fenced Python, JavaScript, and C/C++ examples, including one very long line. | Dark code block, contrasting text, horizontal scrolling for long lines; syntax highlighting remains readable if present. |
| T16 | New chat / persistence | Create a new chat and ask an unrelated question, then revisit prior chat. | New-chat boundary behaves as expected; saved chats and relevant learner history remain accessible. |
| T17 | Upload/extraction status | Add an unsupported/bad file or interrupt extraction only in a disposable workspace. | User sees a useful failure state; other ready materials remain usable. |
| T18 | YouTube ingestion | Use a public academic video URL with captions available, then one inaccessible/non-academic control URL. | Accepted video has transcript/timestamp evidence when available; rejected/unavailable video gives an intelligible reason. External access/captions can vary. |
| T19 | PDF text + figures | Upload `formats/algorithm_runtime.pdf`; ask about the chart axes and trend. | Text/page references survive PDF extraction; figure OCR/description is available where supported; tutor does not invent exact values or a formal complexity proof. |
| T20 | DOCX structure | Upload `formats/study_methods.docx`; ask about the checklist table and a heading. | Paragraphs/headings and table rows are extracted and usable as grounded context. |
| T21 | PPTX structure | Upload `formats/neural_network_slides.pptx`; ask what happens before ReLU and cite the diagram/slide. | Slide text and slide citation are preserved; embedded figure OCR/description is visible where supported. |
| T22 | Image-only input | Upload `formats/neural_network_diagram.png`; ask what each labeled box and arrow represents. | OCR/vision description captures labels and relationships; missing/ambiguous details are not asserted as certain. |
| T23 | Multi-format source set | Select the TXT, PDF, DOCX, and PPTX materials together; ask which source defines spaced practice and which has a runtime chart. | Source selection spans all chosen formats and citations identify the correct document, not only matching page/slide numbers. |
| T24 | Extraction failure isolation | In a disposable workspace, upload a corrupted file next to a valid material. | Failed item shows an actionable state and does not prevent the valid source from being selected or queried. |
| T25 | Unicode / mixed-language input | Ask a simple question in Telugu script, then Roman Telugu with English technical terms. | Response follows the user's language style where supported; academic terms stay understandable. |
| T26 | Responsive layout | Repeat source selection and quiz flows at desktop and narrow viewport widths. | Dropdown options remain visible/clickable; controls and citations do not overlap or become unreachable. |

## How testers should record results

For every case, record: test ID, date, browser/viewport, source files selected, exact prompt/action, expected result, actual result, pass/fail/not-run, and a screenshot or error text. Never include a real student's name, private document, or API key in a bug report. Mark a test **not run** if a required external service (for example, Gemini or YouTube captions) was unavailable; do not count it as a pass.

## Quick reproducible checks for developers

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests
```

Then run the app with `start.bat`, load the three text files and generated format assets through the Library UI, and execute T01–T26 manually. These test files exercise the user-facing ingestion path; the JSON fixture files under `tests/fixtures/` serve automated retrieval/answer checks and should not be uploaded as study materials.

Run the deterministic retrieval benchmark and seeded personalization simulation:

```powershell
.\.venv\Scripts\python.exe scripts/evaluate_rag.py --output docs/reports/rag-retrieval-report.json
.\.venv\Scripts\python.exe scripts/evaluate_personalization.py --output docs/reports/personalization-simulation-report.json
```

For framework-based generation metrics, install `requirements-evaluation.txt` and configure `GEMINI_API_KEY` in `.env`:

```powershell
python -m pip install -r requirements-evaluation.txt
.\.venv\Scripts\python.exe scripts/evaluate_ragas.py --limit 3
.\.venv\Scripts\python.exe scripts/evaluate_ragas.py --output docs/reports/ragas-full-report.json
```

The limited run is a wiring check, not representative evaluation. The full run evaluates every benchmark case and can use substantial model quota. Supported questions are scored with Ragas faithfulness, answer relevancy, context precision, and context recall; unsupported-query handling and citation behavior are reported separately. Keep the JSON case-level report with any aggregate scores.

## Limitations

- The pack is deliberately small and hand-authored; it is suitable for smoke/regression testing, not model ranking or claims about educational effectiveness.
- Plain-text sources test source flow and citations, but do not validate PDF layout, OCR quality, image understanding, PPTX extraction, or video transcription. Add separate controlled sample files for those formats when available.
- YouTube processing depends on current public access, captions, network availability, and model API access; a URL can change availability after the pack is written.
- Expected behavior is a manual QA oracle, not a promise that the current application passes every case. Report failures as findings.
