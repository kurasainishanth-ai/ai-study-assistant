"""Run a small, transparent retrieval-only evaluation for StudyLane's tutor."""

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from services.ai_tutor import retrieve_relevant_chunks  # noqa: E402


def evaluate(dataset_path: Path, top_k: int = 6) -> dict:
    dataset = json.loads(dataset_path.read_text(encoding="utf-8"))
    materials = {item["id"]: item for item in dataset["materials"]}
    supported_cases = 0
    hit_count = 0
    expected_total = 0
    retrieved_expected = 0
    relevant_retrieved = 0
    retrieved_total = 0
    unsupported_cases = 0
    unsupported_false_retrievals = 0
    isolation_passes = 0
    case_results = []

    for case in dataset["cases"]:
        selected_ids = case["selected_material_ids"]
        selected = [materials[source_id] for source_id in selected_ids]
        chunks = retrieve_relevant_chunks(case["query"], selected, top_k=top_k)
        expected_refs = set(case["expected_refs"])
        retrieved_refs = {chunk["reference"] for chunk in chunks if chunk["reference"]}
        matched_refs = expected_refs & retrieved_refs
        isolation_ok = all(chunk["source"] in {item["name"] for item in selected} for chunk in chunks)
        isolation_passes += int(isolation_ok)

        if case["supported"]:
            supported_cases += 1
            hit_count += int(bool(matched_refs))
            expected_total += len(expected_refs)
            retrieved_expected += len(matched_refs)
            relevant_retrieved += sum(chunk["reference"] in expected_refs for chunk in chunks)
            retrieved_total += len(chunks)
        else:
            unsupported_cases += 1
            unsupported_false_retrievals += int(bool(chunks))

        case_results.append({
            "id": case["id"],
            "retrieved_refs": sorted(retrieved_refs),
            "expected_refs": sorted(expected_refs),
            "pass": bool(matched_refs) if case["supported"] else not chunks,
            "source_isolation_pass": isolation_ok,
        })

    return {
        "scope": "retrieval only; does not evaluate generated-answer faithfulness or relevancy",
        "dataset_cases": len(dataset["cases"]),
        "supported_cases": supported_cases,
        "hit_at_k": round(hit_count / supported_cases, 3) if supported_cases else 0,
        "context_precision": round(relevant_retrieved / retrieved_total, 3) if retrieved_total else 0,
        "context_recall": round(retrieved_expected / expected_total, 3) if expected_total else 0,
        "unsupported_queries": unsupported_cases,
        "unsupported_false_retrieval_rate": round(unsupported_false_retrievals / unsupported_cases, 3) if unsupported_cases else 0,
        "source_isolation_pass_rate": round(isolation_passes / len(dataset["cases"]), 3) if dataset["cases"] else 0,
        "cases": case_results,
    }


if __name__ == "__main__":
    fixture = ROOT / "tests" / "fixtures" / "rag_eval_set.json"
    print(json.dumps(evaluate(fixture), indent=2))
