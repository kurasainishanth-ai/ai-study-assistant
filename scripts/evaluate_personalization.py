"""Transparent synthetic multi-session check for personalization behavior.

This is a deterministic policy simulation, not a measured user study or an
LLM-quality benchmark. It exercises the production mastery estimator and quiz
novelty filter on simulated learners.
"""

import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from services.learner_model import estimate_topic_mastery  # noqa: E402
from services.quiz_service import is_question_duplicate  # noqa: E402


def run_simulation(seed: int = 31, profile_count: int = 12, sessions: int = 5) -> dict:
    rng = random.Random(seed)
    topics = ("Foundations", "Applications", "Edge Cases")
    profile_results = []
    total_weak_topic_choices = 0
    total_weak_topic_hits = 0
    repeated_candidates = 0
    candidate_questions = 0
    generated_questions = 0
    estimated_gains = []
    actual_gains = []
    calibration_errors = []

    for profile_index in range(profile_count):
        true_ability = {
            topic: rng.uniform(0.25, 0.8) for topic in topics
        }
        initial_true = dict(true_ability)
        # New-student diagnostic: observe each topic before adaptive sessions.
        history = [{
            "topic_breakdown": {
                topic: {
                    "correct": sum(rng.random() < true_ability[topic] for _ in range(5)),
                    "total": 5,
                }
                for topic in topics
            }
        }]
        question_history = []
        before = estimate_topic_mastery(history)
        initial_estimate = {topic: before.get(topic, {}).get("average_score", 50.0) for topic in topics}

        for session_index in range(sessions):
            current_estimate = estimate_topic_mastery(history)
            selected_topic = min(
                topics,
                key=lambda topic: current_estimate.get(topic, {}).get("average_score", 50.0),
            )
            true_weak_topic = min(topics, key=true_ability.get)
            total_weak_topic_choices += 1
            total_weak_topic_hits += int(selected_topic == true_weak_topic)

            # A transparent simulated practice intervention; real gains must be
            # established with users and are not implied by this script.
            score = sum(rng.random() < true_ability[selected_topic] for _ in range(3))
            history.insert(0, {"topic_breakdown": {selected_topic: {"correct": score, "total": 3}}})
            true_ability[selected_topic] = min(0.98, true_ability[selected_topic] + 0.04)

            candidates = [
                f"Explain {selected_topic}: session {session_index + 1} concept check",
                f"In {selected_topic}, derive a fresh example for learner {profile_index + 1} session {session_index + 1}",
            ]
            accepted = []
            for candidate in candidates:
                candidate_questions += 1
                if is_question_duplicate(candidate, question_history):
                    repeated_candidates += 1
                    continue
                accepted.append(candidate)
                question_history.append(candidate)
            generated_questions += len(accepted)

        final_estimate = estimate_topic_mastery(history)
        for topic in topics:
            estimated_start = initial_estimate[topic]
            estimated_end = final_estimate.get(topic, {}).get("average_score", estimated_start)
            estimated_gains.append(estimated_end - estimated_start)
            actual_gains.append((true_ability[topic] - initial_true[topic]) * 100)
            calibration_errors.append(abs(estimated_end / 100 - true_ability[topic]))
        profile_results.append({
            "profile": profile_index + 1,
            "initial_lowest_topic": min(topics, key=initial_true.get),
            "final_estimated_mastery": {topic: final_estimate.get(topic, {}).get("average_score", 50.0) for topic in topics},
        })

    return {
        "scope": "synthetic policy simulation only; no real users or LLM answers",
        "seed": seed,
        "profiles": profile_count,
        "sessions_per_profile": sessions,
        "weakest_topic_selection_accuracy": round(total_weak_topic_hits / max(1, total_weak_topic_choices), 3),
        "mean_estimated_mastery_change_percentage_points": round(sum(estimated_gains) / max(1, len(estimated_gains)), 2),
        "mean_simulated_ability_change_percentage_points": round(sum(actual_gains) / max(1, len(actual_gains)), 2),
        "mean_final_mastery_calibration_error_0_to_1": round(sum(calibration_errors) / max(1, len(calibration_errors)), 3),
        "quiz_question_repetition_rate_before_filter": round(repeated_candidates / max(1, candidate_questions), 3),
        "quiz_question_repetition_rate_after_filter": 0.0,
        "repeated_candidates_filtered": repeated_candidates,
        "generated_novel_questions": generated_questions,
        "profiles_summary": profile_results,
    }


if __name__ == "__main__":
    print(json.dumps(run_simulation(), indent=2))
