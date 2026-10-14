"""Reproducible multi-session synthetic personalization simulation.

This runs StudyLane's production mastery estimator and quiz novelty filter
against a fixed synthetic cohort. The learning-effect rule is an explicit
simulation assumption, not observed evidence about real learners.
"""

import argparse
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from services.learner_model import estimate_topic_mastery  # noqa: E402
from services.quiz_service import is_question_duplicate  # noqa: E402

PROFILE_PATH = ROOT / "tests" / "fixtures" / "synthetic_student_profiles.json"


def _estimated(history, topic):
    return estimate_topic_mastery(history).get(topic, {}).get("average_score", 50.0)


def _quiz_record(topic, accuracy, rng, count=4):
    correct = sum(rng.random() < accuracy for _ in range(count))
    return {"topic_breakdown": {topic: {"correct": correct, "total": count}}}, correct


def _run_arm(profile, sessions, rng, adaptive):
    ability = dict(profile["initial_accuracy"])
    initial = dict(ability)
    history = []
    for topic in profile["topics"]:
        diagnostic, _ = _quiz_record(topic, ability[topic], rng, count=4)
        history.append(diagnostic)
    initial_estimates = {topic: _estimated(history, topic) for topic in profile["topics"]}
    choices, gains = [], []
    for _ in range(sessions):
        if adaptive:
            estimates = estimate_topic_mastery(history)
            selected = min(profile["topics"], key=lambda topic: estimates.get(topic, {}).get("average_score", 50.0))
        else:
            selected = rng.choice(profile["topics"])
        choices.append(selected)
        quiz, correct = _quiz_record(selected, ability[selected], rng, count=4)
        history.insert(0, quiz)
        # Explicit counterfactual assumption: targeted feedback/practice raises
        # latent accuracy slightly more when the learner missed more questions.
        practice_gain = 0.015 + 0.01 * (4 - correct) / 4
        ability[selected] = min(0.98, ability[selected] + practice_gain)
        gains.append(practice_gain * 100)
    final_estimates = {topic: _estimated(history, topic) for topic in profile["topics"]}
    return {
        "start_ability": initial,
        "end_ability": ability,
        "start_estimates": initial_estimates,
        "end_estimates": final_estimates,
        "choices": choices,
        "latent_gain": sum(ability.values()) / len(ability) - sum(initial.values()) / len(initial),
        "estimated_gain": sum(final_estimates[t] - initial_estimates[t] for t in profile["topics"]) / len(profile["topics"]),
        "practice_gain_points": gains,
    }


def run_simulation(seed=31, sessions=6, profiles_path=PROFILE_PATH):
    profiles_data = json.loads(Path(profiles_path).read_text(encoding="utf-8"))
    rng = random.Random(seed)
    results = []
    adaptive_weak_hits = adaptive_choices = 0
    candidate_total = candidate_repeated = accepted_total = accepted_repeated = 0
    adaptive_gain, control_gain, estimated_gains, calibration_errors = [], [], [], []

    for index, profile in enumerate(profiles_data["profiles"]):
        adaptive = _run_arm(profile, sessions, random.Random(rng.randrange(2**32)), True)
        control = _run_arm(profile, sessions, random.Random(rng.randrange(2**32)), False)
        true_weak = min(profile["topics"], key=lambda topic: profile["initial_accuracy"][topic])
        for choice in adaptive["choices"]:
            adaptive_choices += 1
            adaptive_weak_hits += int(choice == true_weak)

        history, accepted = [], []
        for session_index, topic in enumerate(adaptive["choices"]):
            candidates = [
                f"Explain the core idea of {topic}.",
                f"Apply {topic} to a new example in session {session_index + 1}.",
            ]
            for candidate in candidates:
                candidate_total += 1
                duplicate = is_question_duplicate(candidate, history)
                candidate_repeated += int(duplicate)
                if not duplicate:
                    accepted.append(candidate)
                    history.append(candidate)
                    accepted_total += 1
                    accepted_repeated += int(is_question_duplicate(candidate, accepted[:-1]))

        adaptive_gain.append(adaptive["latent_gain"] * 100)
        control_gain.append(control["latent_gain"] * 100)
        estimated_gains.append(adaptive["estimated_gain"])
        calibration_errors.extend(
            abs(adaptive["end_estimates"][topic] / 100 - adaptive["end_ability"][topic])
            for topic in profile["topics"]
        )
        results.append({
            "profile_id": profile["id"],
            "profile_type": profile["profile_type"],
            "true_weak_topic": true_weak,
            "adaptive_topic_choices": adaptive["choices"],
            "adaptive_final_mastery_estimate": adaptive["end_estimates"],
            "adaptive_latent_gain_percentage_points": round(adaptive["latent_gain"] * 100, 2),
            "random_control_latent_gain_percentage_points": round(control["latent_gain"] * 100, 2),
            "adaptive_estimated_mastery_change_points": round(adaptive["estimated_gain"], 2),
        })

    return {
        "dataset": profiles_data["dataset"],
        "scope": "seeded synthetic simulation; not real student evidence; improvement depends on the documented assumed practice effect",
        "seed": seed,
        "profiles": len(results),
        "sessions_per_arm": sessions,
        "topic_count": len(profiles_data["topics"]),
        "topics": profiles_data["topics"],
        "weakest_topic_selection_accuracy": round(adaptive_weak_hits / max(1, adaptive_choices), 3),
        "mean_adaptive_estimated_mastery_change_percentage_points": round(sum(estimated_gains) / max(1, len(estimated_gains)), 2),
        "mean_adaptive_latent_gain_percentage_points": round(sum(adaptive_gain) / max(1, len(adaptive_gain)), 2),
        "mean_random_control_latent_gain_percentage_points": round(sum(control_gain) / max(1, len(control_gain)), 2),
        "adaptive_minus_random_simulated_gain_points": round(sum(adaptive_gain) / max(1, len(adaptive_gain)) - sum(control_gain) / max(1, len(control_gain)), 2),
        "final_mastery_calibration_mae_0_to_1": round(sum(calibration_errors) / max(1, len(calibration_errors)), 3),
        "candidate_question_repetition_rate_before_filter": round(candidate_repeated / max(1, candidate_total), 3),
        "repetition_rate_after_filter": round(accepted_repeated / max(1, accepted_total), 3),
        "repeated_candidates_filtered": candidate_repeated,
        "accepted_questions": accepted_total,
        "profiles_summary": results,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=31)
    parser.add_argument("--sessions", type=int, default=6)
    parser.add_argument("--profiles", type=Path, default=PROFILE_PATH)
    parser.add_argument("--output", type=Path, help="Optional JSON report path")
    args = parser.parse_args()
    result = run_simulation(seed=args.seed, sessions=args.sessions, profiles_path=args.profiles)
    rendered = json.dumps(result, indent=2, ensure_ascii=False)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
