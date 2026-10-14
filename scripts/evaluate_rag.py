"""Run deterministic retrieval, source-isolation, and unsupported-query checks."""

import argparse
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
        expected_evidence = case.get("expected_evidence")
        if expected_evidence is None:
            expected_evidence = [
                {"source_id": None, "reference": ref}
                for ref in case.get("expected_refs", [])
            ]
        expected_pairs = {
            (item.get("source_id"), item.get("reference"))
            for item in expected_evidence
        }
        retrieved_pairs = {
            (chunk.get("source_id"), chunk.get("reference"))
            for chunk in chunks if chunk.get("reference")
        }
        if expected_pairs and None in {source_id for source_id, _ in expected_pairs}:
            expected_pairs = {
                (chunk.get("source_id"), ref)
                for _, ref in expected_pairs
                for chunk in chunks if chunk.get("reference") == ref
            }
        matched_pairs = expected_pairs & retrieved_pairs
        expected_refs = {reference for _, reference in expected_pairs}
        retrieved_refs = {reference for _, reference in retrieved_pairs}
        isolation_ok = all(chunk["source"] in {item["name"] for item in selected} for chunk in chunks)
        isolation_passes += int(isolation_ok)

        if case["supported"]:
            supported_cases += 1
            hit_count += int(bool(matched_pairs))
            expected_total += len(expected_pairs)
            retrieved_expected += len(matched_pairs)
            relevant_retrieved += sum(
                (chunk.get("source_id"), chunk.get("reference")) in expected_pairs
                for chunk in chunks
            )
            retrieved_total += len(chunks)
        else:
            unsupported_cases += 1
            unsupported_false_retrievals += int(bool(chunks))

        case_results.append({
            "id": case["id"],
            "retrieved_evidence": sorted(
                [{"source_id": source_id, "reference": ref} for source_id, ref in retrieved_pairs],
                key=lambda item: (item["source_id"] or "", item["reference"] or ""),
            ),
            "expected_evidence": sorted(
                [{"source_id": source_id, "reference": ref} for source_id, ref in expected_pairs],
                key=lambda item: (item["source_id"] or "", item["reference"] or ""),
            ),
            "pass": bool(matched_pairs) if case["supported"] else not chunks,
            "source_isolation_pass": isolation_ok,
        })

    return {
        "dataset": dataset.get("dataset", dataset_path.name),
        "scope": "deterministic retrieval/source-location checks only; does not evaluate generated-answer faithfulness or relevancy",
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=ROOT / "tests" / "fixtures" / "comprehensive_rag_eval_set.json")
    parser.add_argument("--top-k", type=int, default=6)
    parser.add_argument("--output", type=Path, help="Optional path for a JSON result report")
    args = parser.parse_args()
    report = evaluate(args.dataset, top_k=args.top_k)
    rendered = json.dumps(report, indent=2, ensure_ascii=False)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
