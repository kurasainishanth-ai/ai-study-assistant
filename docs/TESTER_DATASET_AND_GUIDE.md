# StudyLane tester dataset and manual QA guide

This pack is a small, synthetic, openly reusable functional test set. It contains no real student data. It is designed to exercise the product flows and common failure cases; it is not a statistically representative benchmark and does not establish learning gains or answer accuracy across subjects.

## Load the dataset

1. Start the app and open **Library**.
2. Add each `.txt` file in `sample_data/test_dataset/` as a separate material.
3. Wait until all three materials report **Ready**. If extraction fails, record the displayed error and do not proceed as if ingestion succeeded.
4. In Ask Tutor, test each-source, multi-source, and all-material selection. The JSON manifest gives expected evidence and expected behavior.
5. For other Study Studio features, select the stated material(s) before generating output.

The manifest is `sample_data/test_dataset/manifest.json`. Source-marker strings such as `[Page 1]` are intentionally included in the text so references can be checked even though these are plain-text files.

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
| T09 | Quiz grading | Answer one item correctly and one incorrectly; if a numerical item is generated, test exact and near-tolerance answers. | Score and feedback match the displayed question/key; numerical units/tolerance are handled consistently. |
| T10 | Repeated questions | Generate or retake a quiz from the same source. | Obvious duplicate questions are reduced; if content is too limited, note any repetition rather than assuming novelty. |
| T11 | Learner focus | Complete quiz items across at least two topics, including a mistake; ask tutor what to review. | Response can use available progress evidence and identifies a reasonable weak topic; it does not claim certainty from sparse attempts. |
| T12 | Revision schedule | Create or inspect a revision plan, then ask tutor for a focus recommendation. | Existing plan is not silently rewritten; recommendation can be made without changing scheduled tasks. |
| T13 | Normal prose and Markdown | Ask for a short explanation with a heading, bullet list, and inline code. | Prose, heading, list, and inline code remain legible and formatted. |
| T14 | Code rendering | Ask for a short fenced Python and JavaScript example; repeat with C/C++ if possible. | Dark code block, contrasting text, horizontal scrolling for long lines; syntax highlighting remains readable if present. |
| T15 | New chat / persistence | Create a new chat and ask an unrelated question, then revisit prior chat. | New-chat boundary behaves as expected; saved chats and relevant learner history remain accessible. |
| T16 | Upload/extraction status | Add an unsupported/bad file or interrupt extraction only in a disposable workspace. | User sees a useful failure state; other ready materials remain usable. |
| T17 | YouTube ingestion | Use a public academic video URL with captions available, then one inaccessible/non-academic control URL. | Accepted video has transcript/timestamp evidence when available; rejected/unavailable video gives an intelligible reason. External access/captions can vary. |
| T18 | Responsive layout | Repeat source selection and quiz flows at desktop and narrow vieropdown options remain visible/clickable; controls and citations do not overlapwport widths. | D or become unreachable. |

## How testers should record results

For every case, record: test ID, date, browser/viewport, source files selected, exact prompt/action, expected result, actual result, pass/fail/not-run, and a screenshot or error text. Never include a real student's name, private document, or API key in a bug report. Mark a test **not run** if a required external service (for example, Gemini or YouTube captions) was unavailable; do not count it as a pass.

## Quick reproducible checks for developers

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests
```

Then run the app with `start.bat`, load the three text files through the Library UI, and execute T01–T18 manually. These test files exercise the user-facing ingestion path; the JSON fixture files under `tests/fixtures/` serve automated retrieval/answer checks and should not be uploaded as study materials.

## Limitations

- The pack is deliberately small and hand-authored; it is suitable for smoke/regression testing, not model ranking or claims about educational effectiveness.
- Plain-text sources test source flow and citations, but do not validate PDF layout, OCR quality, image understanding, PPTX extraction, or video transcription. Add separate controlled sample files for those formats when available.
- YouTube processing depends on current public access, captions, network availability, and model API access; a URL can change availability after the pack is written.
- Expected behavior is a manual QA oracle, not a promise that the current application passes every case. Report failures as findings.
