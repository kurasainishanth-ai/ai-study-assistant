"""Run the tutor against the synthetic set and score with Ragas metrics.

This invokes the configured Gemini model to generate tutor answers and Ragas'
Gemini-backed evaluators. It can make many API calls. Use --limit for a smoke
run; omit it to evaluate the complete dataset. Metrics are LLM-judged estimates
and should be reviewed against the saved per-case evidence and human labels.
"""

import argparse
import atexit
import asyncio
import json
import os
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = ROOT / "tests" / "fixtures" / "comprehensive_rag_eval_set.json"
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT))


def _citation_refs(answer):
    return re.findall(r"\[(?:Page|Slide|Section|Part)\s*[^\]]+\]|\[(?:\d{1,2}:)?\d{1,2}:\d{2}\]", answer, re.IGNORECASE)


def _register_temp_db_cleanup(db, temp_dir):
    open_connections = []
    original_get_connection = db.get_connection

    def tracked_connection():
        connection = original_get_connection()
        open_connections.append(connection)
        return connection

    db.get_connection = tracked_connection

    def cleanup():
        for connection in open_connections:
            try:
                connection.close()
            except Exception:
                pass
        temp_dir.cleanup()

    atexit.register(cleanup)


async def run(dataset_path, limit=None, output_path=None):
    try:
        from ragas.embeddings import GoogleEmbeddings
        from ragas.llms import llm_factory
        from ragas.metrics.collections import AnswerRelevancy, ContextPrecision, ContextRecall, Faithfulness
    except ImportError as exc:
        raise RuntimeError("Install evaluation dependencies with: python -m pip install -r requirements-evaluation.txt") from exc

    # Keep all evaluation writes out of the user's normal StudyLane database.
    temp_dir = tempfile.TemporaryDirectory(prefix="studylane-ragas-")
    os.environ["DB_PATH"] = str(Path(temp_dir.name) / "evaluation.sqlite3")
    # db reads DB_PATH at import time, so set the isolated path first.
    import db

    _register_temp_db_cleanup(db, temp_dir)
    if Path(db.DB_PATH).resolve().parent != Path(temp_dir.name).resolve():
        raise RuntimeError("Evaluation database isolation failed; refusing to write to any non-temporary database")
    from google import genai
    from config import DEFAULT_MODEL, get_gemini_api_key
    from services.ai_tutor import _chunk_material, ask_ai_tutor, retrieve_relevant_chunks

    db.init_db()

    dataset = json.loads(dataset_path.read_text(encoding="utf-8"))
    materials_by_id = {item["id"]: item for item in dataset["materials"]}
    cases = dataset["cases"][:limit] if limit else dataset["cases"]
    for material in dataset["materials"]:
        db.save_material({
            "id": material["id"], "name": material["name"], "type": "Text", "size_kb": 1,
            "upload_time": "ragas-evaluation", "status": "Ready",
            "data": {"content": material["content"], "total_units": 1, "unit_name": "pages"},
        })

    client = genai.Client(api_key=get_gemini_api_key())
    evaluator_llm = llm_factory(DEFAULT_MODEL, provider="google", client=client)
    evaluator_embeddings = GoogleEmbeddings(client=client, model="gemini-embedding-001")
    metrics = {
        "faithfulness": Faithfulness(llm=evaluator_llm),
        "answer_relevancy": AnswerRelevancy(llm=evaluator_llm, embeddings=evaluator_embeddings),
        "context_precision": ContextPrecision(llm=evaluator_llm),
        "context_recall": ContextRecall(llm=evaluator_llm),
    }

    rows, unsupported_handled = [], []
    for case in cases:
        selected_ids = case["selected_material_ids"]
        selected = [materials_by_id[source_id] for source_id in selected_ids]
        query = case["query"]
        contexts = retrieve_relevant_chunks(query, selected, top_k=6)
        result = ask_ai_tutor(
            f"ragas_{case['id']}", query, source_doc_id=",".join(selected_ids), tutor_mode="teaching"
        )
        answer = str(result.get("answer") or "")
        retrieved_texts = [f"{chunk['source']} {chunk['reference']} {chunk['text']}".strip() for chunk in contexts]
        citation_refs = _citation_refs(answer)
        valid_refs = {chunk["reference"].lower() for chunk in contexts if chunk.get("reference")}
        citation_validity = all(ref.lower() in valid_refs for ref in citation_refs)
        row = {
            "id": case["id"], "supported": case["supported"], "question": query,
            "selected_material_ids": selected_ids,
            "expected_evidence": case.get("expected_evidence", []),
            "retrieved_contexts": retrieved_texts,
            "answer": answer,
            "citations": citation_refs,
            "citations_valid": bool(citation_refs) and citation_validity if case["supported"] else citation_validity,
        }
        if case["supported"]:
            reference_chunks = []
            for evidence in case.get("expected_evidence", []):
                material = materials_by_id[evidence["source_id"]]
                reference_chunks.extend(
                    chunk["text"] for chunk in _chunk_material(material)
                    if chunk.get("reference") == evidence["reference"]
                )
            reference = "\n".join(reference_chunks)
            if not reference:
                row["error"] = "No reference context found for expected evidence markers"
            else:
                scores = {}
                for name, metric in metrics.items():
                    kwargs = {"user_input": query, "response": answer, "retrieved_contexts": retrieved_texts}
                    if name in {"context_precision", "context_recall"}:
                        kwargs["reference"] = reference
                    try:
                        score = await metric.ascore(**kwargs)
                        scores[name] = float(score.value)
                    except Exception as exc:  # Include case-level failures; continue remaining cases.
                        scores[name] = None
                        row.setdefault("metric_errors", {})[name] = f"{type(exc).__name__}: {exc}"
                row["metrics"] = scores
        else:
            # This is a separate behavioral check; Ragas' faithfulness and
            # relevance averages below are intentionally reported for supported cases.
            has_evidence = bool(contexts)
            refusal = bool(re.search(r"not (?:covered|contain|provide)|does not (?:cover|contain|provide)|can't find|cannot find|not enough (?:information|context)|no (?:relevant )?(?:information|evidence)", answer, re.IGNORECASE))
            check = {"id": case["id"], "retrieved_any_context": has_evidence, "acknowledged_lack_of_evidence": refusal,
                     "pass": not has_evidence and refusal and not citation_refs,
                     "citations": citation_refs, "citations_valid": citation_validity}
            unsupported_handled.append(check)
            row["unsupported_check"] = check
        rows.append(row)

    metric_names = list(metrics)
    supported_rows = [row for row in rows if row.get("supported") and row.get("metrics")]
    averages = {
        name: round(sum(row["metrics"][name] for row in supported_rows if row["metrics"].get(name) is not None) /
                    max(1, sum(row["metrics"].get(name) is not None for row in supported_rows)), 4)
        for name in metric_names
    }
    citation_cases = [row for row in rows if row["supported"]]
    report = {
        "dataset": dataset.get("dataset", dataset_path.name),
        "framework": "Ragas collections API",
        "evaluator_model": DEFAULT_MODEL,
        "scope": "LLM-as-judge estimates on synthetic materials; not human-validated; unsupported-query checks are separate deterministic/text checks",
        "cases_requested": len(cases),
        "supported_cases": sum(bool(case["supported"]) for case in cases),
        "unsupported_cases": sum(not bool(case["supported"]) for case in cases),
        "supported_cases_scored": len(supported_rows),
        "mean_metrics_supported_cases_only_0_to_1": averages,
        "unsupported_handled": sum(item["pass"] for item in unsupported_handled),
        "unsupported_total": len(unsupported_handled),
        "supported_citation_coverage": sum(bool(row["citations"]) for row in citation_cases),
        "supported_citation_cases": len(citation_cases),
        "supported_citation_validity": sum(bool(row["citations_valid"]) for row in citation_cases),
        "cases": rows,
    }
    rendered = json.dumps(report, indent=2, ensure_ascii=False)
    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--limit", type=int, help="Run only the first N examples (smoke test; not representative)")
    parser.add_argument("--output", type=Path, help="Optional path to save the JSON report")
    args = parser.parse_args()
    asyncio.run(run(args.dataset, args.limit, args.output))
