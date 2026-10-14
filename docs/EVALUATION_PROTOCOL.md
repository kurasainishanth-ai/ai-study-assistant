# Evaluation protocol and interpretation

## What is in the test set

The main retrieval set is `tests/fixtures/comprehensive_rag_eval_set.json`: 28 cases across neural networks, database systems, data structures/algorithms, and study skills. It contains 21 supported questions with expected source IDs and page/slide/section markers, 2 cross-source questions, 2 all-material questions, and 7 unsupported or source-isolation controls. Expected references are hand-authored; they have not yet been independently verified by subject-matter experts.

The interactive upload pack in `sample_data/test_dataset/` includes text files and generated PDF, DOCX, PPTX, chart image, and diagram image samples. The PDF/PPTX contain figures to exercise extraction/OCR. YouTube tests are manual because public URLs, captions, and access change; no external URL is treated as a fixed reproducible benchmark case.

## Pipeline and measures

| Check | Runner | Interpretation |
|---|---|---|
| Retrieval hit@k, context precision/recall, source isolation, unsupported false retrieval | `scripts/evaluate_rag.py` | Deterministic scoring against known source IDs and markers; no answer-generation claim. |
| Faithfulness, answer relevancy, context precision, context recall | `scripts/evaluate_ragas.py` | Ragas metrics on generated tutor answers, Gemini as evaluator; supported cases only. Scores are model-judged estimates, not human labels. |
| Unsupported/refusal and citation checks | `scripts/evaluate_ragas.py` | Separate checks; refusal text matching is a heuristic and needs human review. Citation presence/validity are case-level counts. |
| Multi-session personalization | `scripts/evaluate_personalization.py` | 12 fixed synthetic profiles, 5 course topics, adaptive vs random practice, six sessions by default. Uses the production mastery estimator and novelty filter. |

Ragas is used for the four named generation/retrieval metrics with the current collections API and Gemini adapter. See the [Ragas Gemini integration](https://docs.ragas.io/en/stable/howtos/integrations/gemini/) and [metric documentation](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/). A full run makes many generation and judge calls; save the JSON report and disclose the model, case count, API date, and any failed cases.

The deterministic retrieval evaluator defines a relevant retrieved context as a retrieved `(source_id, reference marker)` pair included in the annotated expected evidence. It reports hit@k as the fraction of supported questions with at least one expected evidence pair retrieved; context precision as relevant returned chunks divided by all returned chunks; context recall as expected evidence pairs retrieved divided by all expected pairs. Unsupported false-retrieval rate is the fraction of unsupported controls that retrieve any context. These exact-match metrics are intentionally strict and can mark semantically useful but differently chunked evidence as a miss.

## Personalization simulation assumptions

Each synthetic profile has latent per-topic accuracy values. The simulation samples a four-question diagnostic per topic, estimates mastery with StudyLane's production recency-weighted Beta(1,1) estimator, then runs an adaptive weakest-estimated-topic policy and a random-topic control for the same number of sessions. Each simulated practice session adds an assumed 1.5–2.5 percentage points to latent ability, with a larger increment when more answers were missed. That learning rule is invented for a transparent policy simulation; it is not fitted to learners and cannot establish real mastery gains. Question repetition is measured from a pool that intentionally includes a recurring candidate; after-filter repetition is necessarily zero when the filter drops all identified duplicates.

## Latest local deterministic results

The current 28-case deterministic retrieval run is recorded in `docs/reports/rag-retrieval-report.json`. It returned hit@k **0.571**, context precision **1.000**, context recall **0.522**, unsupported false-retrieval rate **0.000**, and source isolation **1.000**. This indicates high precision on the passages that were returned, but weak recall: many paraphrased questions failed to retrieve the expected passage. It is not evidence of answer faithfulness.

The seeded personalization output in `docs/reports/personalization-simulation-report.json` reports 12 profiles × 6 sessions per arm, weakest-topic selection accuracy **0.514**, mean simulated latent gain **2.39 points adaptive vs 2.27 random**, estimated-mastery change **−1.12 points**, and post-filter repetition **0.000**. The negative mastery estimate movement and near-zero adaptive-control difference are findings/limitations, not successes; do not present the assumed simulated gains as observed student outcomes.

Ragas generation metrics have not been recorded in this report yet. Run `scripts/evaluate_ragas.py` with the optional dependency and configured key, inspect its per-case JSON, and add the measured aggregate only after the run completes. Do not substitute the deterministic retrieval numbers or a limited `--limit` smoke run for full Ragas results.
