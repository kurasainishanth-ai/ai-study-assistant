"""Small, explainable Bayesian topic-mastery estimates from quiz evidence."""

import json
from typing import Any, Dict, Iterable


def estimate_topic_mastery(topic_rows: Iterable[Any], decay: float = 0.8) -> Dict[str, Dict[str, Any]]:
    """Estimate topic accuracy with a Beta(1, 1) prior and recency-weighted attempts.

    Newer quiz attempts carry more weight, but older evidence is never discarded.
    A neutral prior keeps tiny samples from appearing as certain 0% or 100% mastery.
    """
    evidence: Dict[str, Dict[str, float]] = {}
    attempt_index = 0
    for row in topic_rows:
        raw_breakdown = row.get("topic_breakdown") if isinstance(row, dict) else row[0]
        if isinstance(raw_breakdown, str):
            try:
                raw_breakdown = json.loads(raw_breakdown)
            except (TypeError, json.JSONDecodeError):
                continue
        if not isinstance(raw_breakdown, dict):
            continue
        weight = max(0.05, decay ** attempt_index)
        attempt_index += 1
        for topic, stat in raw_breakdown.items():
            if isinstance(stat, dict):
                try:
                    total = max(0.0, float(stat.get("total", 0) or 0))
                    correct = max(0.0, min(total, float(stat.get("correct", 0) or 0)))
                except (TypeError, ValueError):
                    continue
            else:
                try:
                    total = 1.0
                    correct = max(0.0, min(1.0, float(stat) / 100.0))
                except (TypeError, ValueError):
                    continue
            bucket = evidence.setdefault(str(topic), {"correct": 0.0, "incorrect": 0.0, "attempts": 0.0})
            bucket["correct"] += correct * weight
            bucket["incorrect"] += (total - correct) * weight
            bucket["attempts"] += 1

    mastery: Dict[str, Dict[str, Any]] = {}
    for topic, bucket in evidence.items():
        # Beta(1, 1) prior; weighted evidence controls how quickly confidence grows.
        alpha = 1.0 + bucket["correct"]
        beta = 1.0 + bucket["incorrect"]
        average = round(alpha / (alpha + beta) * 100, 1)
        attempts = int(bucket["attempts"])
        mastery[topic] = {
            "average_score": average,
            "attempts": attempts,
            "status": "Mastered" if average >= 82 and attempts >= 3 else ("Review Recommended" if average < 60 else "In Progress"),
        }
    return mastery
