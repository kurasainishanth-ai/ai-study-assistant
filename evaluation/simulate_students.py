"""
Simulated Student Multi-Session Experiments for Track D (StudyVerse).

Simulates 3 student personas (Beginner, Intermediate, Advanced) over 5 consecutive sessions,
recording Bayesian Knowledge Tracing learning curves, uncertainty reduction, and adaptive scaffolding.
"""

import sys
import os
import json
import random
from typing import Dict, Any, List

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import db
from services.learner_model import (
    update_bkt_posterior,
    compute_uncertainty,
    get_scaffolding_recommendation
)

SIMULATION_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "simulation_results.json")

PERSONAS = {
    "beginner": {
        "student_id": "sim_student_beginner",
        "description": "Novice student with limited background knowledge who struggles with technical definitions and benefits from heavy scaffolding.",
        "p_l0": 0.15,
        "true_prob_correct": 0.40,  # Tendency to answer correctly
        "p_t": 0.12,
        "p_g": 0.25,
        "p_s": 0.15
    },
    "intermediate": {
        "student_id": "sim_student_intermediate",
        "description": "Competent student with foundational knowledge who occasionally misses nuanced edge cases.",
        "p_l0": 0.45,
        "true_prob_correct": 0.75,
        "p_t": 0.15,
        "p_g": 0.20,
        "p_s": 0.10
    },
    "advanced": {
        "student_id": "sim_student_advanced",
        "description": "High-proficiency student who consistently demonstrates theoretical mastery and problem-solving fluency.",
        "p_l0": 0.80,
        "true_prob_correct": 0.95,
        "p_t": 0.20,
        "p_g": 0.15,
        "p_s": 0.05
    }
}

TOPICS = [
    "Linear Regression & Cost Functions",
    "Gradient Descent Optimization",
    "Regularization & Overfitting"
]

def run_simulation(num_sessions: int = 5, seed: int = 42) -> Dict[str, Any]:
    random.seed(seed)
    db.init_db()

    print(f"\n========================================================")
    print(f"  StudyVerse Simulated Learner Multi-Session Experiment")
    print(f"  Personas: Beginner, Intermediate, Advanced")
    print(f"  Sessions per Persona: {num_sessions}")
    print(f"========================================================\n")

    all_results = {}

    for persona_key, p_cfg in PERSONAS.items():
        student_id = p_cfg["student_id"]
        print(f"--- Simulating Persona: {persona_key.upper()} ({student_id}) ---")

        persona_trajectories = {}

        for topic in TOPICS:
            p_mastery = p_cfg["p_l0"]
            attempts = 0
            correct_total = 0
            session_history = []

            for session_num in range(1, num_sessions + 1):
                # 3 questions per topic per session
                session_correct = 0
                questions_in_session = 3

                for q_idx in range(questions_in_session):
                    attempts += 1
                    # Bernoulli trial based on true skill
                    is_correct = random.random() < p_cfg["true_prob_correct"]
                    if is_correct:
                        session_correct += 1
                        correct_total += 1

                    # BKT Update
                    p_mastery = update_bkt_posterior(
                        p_current=p_mastery,
                        is_correct=is_correct,
                        p_g=p_cfg["p_g"],
                        p_s=p_cfg["p_s"],
                        p_t=p_cfg["p_t"]
                    )

                uncertainty, confidence = compute_uncertainty(p_mastery, attempts)

                # Persist to database
                db.update_learner_topic_mastery(
                    student_id=student_id,
                    topic=topic,
                    mastery_score=p_mastery,
                    confidence=confidence,
                    uncertainty=uncertainty,
                    is_correct=(session_correct >= 2),
                    event_type="simulated_assessment",
                    evidence_basis=f"session:{session_num}; correct:{session_correct}/{questions_in_session}"
                )

                scaffolding = get_scaffolding_recommendation(topic, student_id=student_id)

                session_snapshot = {
                    "session_number": session_num,
                    "attempts_cumulative": attempts,
                    "correct_cumulative": correct_total,
                    "session_score": f"{session_correct}/{questions_in_session}",
                    "mastery_score": round(p_mastery, 3),
                    "confidence": confidence,
                    "uncertainty": uncertainty,
                    "scaffolding_level": scaffolding["level"],
                    "recommended_difficulty": scaffolding["recommended_quiz_difficulty"]
                }
                session_history.append(session_snapshot)

            persona_trajectories[topic] = session_history
            print(f"  Topic '{topic[:30]}...': Final Mastery={p_mastery:.3f}, Uncertainty={uncertainty:.3f}, Level={scaffolding['level']}")

        all_results[persona_key] = {
            "metadata": p_cfg,
            "topic_trajectories": persona_trajectories
        }

    with open(SIMULATION_OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)

    print(f"\nSimulation complete! Results recorded to: {SIMULATION_OUTPUT_PATH}\n")
    return all_results

if __name__ == "__main__":
    run_simulation()
