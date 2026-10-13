"""
Bayesian Knowledge Tracing (BKT) and Evidence-Weighted Learner Model.

Provides mathematically explicit per-student, per-topic knowledge state tracking,
uncertainty estimation, diagnostic intake assessments, conversational evidence updating,
and dynamic pedagogical scaffolding adaptation.
"""

import math
import json
import re
from typing import Dict, Any, List, Optional, Tuple
import db

# Standard Bayesian Knowledge Tracing parameters
DEFAULT_BKT_PARAMS = {
    "p_l0": 0.25,  # Prior probability of initial mastery (cold start)
    "p_t": 0.15,   # Probability of transition/learning per attempt
    "p_g": 0.20,   # Probability of guessing correctly without mastery (4-choice MCQ)
    "p_s": 0.10,   # Probability of slipping (error despite mastery)
}

QUESTION_TYPE_PARAMS = {
    "mcq": {"p_g": 0.25, "p_s": 0.10},
    "true_false": {"p_g": 0.50, "p_s": 0.08},
    "short_answer": {"p_g": 0.05, "p_s": 0.12},
    "numerical": {"p_g": 0.02, "p_s": 0.10},
    "chat_evidence": {"p_g": 0.20, "p_s": 0.15},
}

def compute_uncertainty(p_mastery: float, attempts: int) -> Tuple[float, float]:
    """
    Computes uncertainty and confidence for a given mastery probability.
    Returns (uncertainty, confidence) in [0.0, 1.0].
    """
    # Bernoulli variance is p * (1 - p), normalized to [0, 1] by multiplying by 4
    variance_norm = 4.0 * p_mastery * (1.0 - p_mastery)
    
    # Evidence factor dampens uncertainty as observations accumulate
    evidence_damping = math.exp(-0.35 * attempts)
    uncertainty = round(min(1.0, max(0.05, variance_norm * 0.5 + evidence_damping * 0.5)), 3)
    confidence = round(1.0 - uncertainty, 3)
    return uncertainty, confidence

def update_bkt_posterior(
    p_current: float,
    is_correct: bool,
    p_g: float = 0.20,
    p_s: float = 0.10,
    p_t: float = 0.15,
    weight: float = 1.0
) -> float:
    """
    Computes standard Bayesian Knowledge Tracing posterior update and transit:
    P(L | obs) followed by P(L_{t+1}) = P(L | obs) + (1 - P(L | obs)) * P(T).
    Supports fractional evidence weight for conversational chat cues.
    """
    p_current = min(0.99, max(0.01, p_current))

    if is_correct:
        # P(L | obs=1) = [P(L) * (1 - P(S))] / [P(L) * (1 - P(S)) + (1 - P(L)) * P(G)]
        numerator = p_current * (1.0 - p_s)
        denominator = numerator + (1.0 - p_current) * p_g
    else:
        # P(L | obs=0) = [P(L) * P(S)] / [P(L) * P(S) + (1 - P(L)) * (1 - P(G))]
        numerator = p_current * p_s
        denominator = numerator + (1.0 - p_current) * (1.0 - p_g)

    p_posterior = numerator / max(1e-6, denominator)

    # Apply fractional weight if conversational evidence
    if weight < 1.0:
        p_posterior = (1.0 - weight) * p_current + weight * p_posterior

    # Knowledge Transition: P(L_{t+1}) = P(L | obs) + (1 - P(L | obs)) * P(T)
    p_next = p_posterior + (1.0 - p_posterior) * p_t
    return round(min(0.99, max(0.01, p_next)), 4)

def get_learner_topic_state(topic: str, student_id: str = "default_student") -> Dict[str, Any]:
    """Returns the current BKT state for a topic, initializing cold-start if untracked."""
    all_data = db.get_learner_mastery_data(student_id=student_id)
    if topic in all_data:
        return all_data[topic]

    # Cold start baseline
    p_init = DEFAULT_BKT_PARAMS["p_l0"]
    uncertainty, confidence = compute_uncertainty(p_init, 0)
    return {
        "mastery_score": p_init,
        "confidence": confidence,
        "uncertainty": uncertainty,
        "attempts_count": 0,
        "correct_count": 0,
        "accuracy": 0.0,
        "last_practiced": None,
        "updated_at": "Baseline Cold Start",
        "is_cold_start": True
    }

def update_mastery_from_quiz(
    student_id: str,
    evaluations: List[Dict[str, Any]],
    doc_id: str
):
    """Updates BKT mastery for each question evaluation in a quiz attempt."""
    for ev in evaluations:
        topic = str(ev.get("topic") or "General").strip()
        is_correct = bool(ev.get("is_correct", False))
        q_type = str(ev.get("type") or "mcq").lower()
        params = QUESTION_TYPE_PARAMS.get(q_type, QUESTION_TYPE_PARAMS["mcq"])

        state = get_learner_topic_state(topic, student_id=student_id)
        p_current = state["mastery_score"]
        attempts = state["attempts_count"] + 1

        p_new = update_bkt_posterior(
            p_current=p_current,
            is_correct=is_correct,
            p_g=params["p_g"],
            p_s=params["p_s"],
            p_t=DEFAULT_BKT_PARAMS["p_t"],
            weight=1.0
        )
        uncertainty, confidence = compute_uncertainty(p_new, attempts)

        db.update_learner_topic_mastery(
            student_id=student_id,
            topic=topic,
            mastery_score=p_new,
            confidence=confidence,
            uncertainty=uncertainty,
            is_correct=is_correct,
            event_type=f"quiz_{q_type}",
            evidence_basis=f"doc:{doc_id}; q:{ev.get('id', '')}"
        )

def update_mastery_from_chat_evidence(
    student_id: str,
    topic: str,
    user_message: str,
    doc_id: str
):
    """
    Detects conversational cues of comprehension or confusion in student chat,
    and performs a fractional evidence-weighted BKT update.
    """
    msg_lower = user_message.lower()

    # Confusion indicators -> soft negative update
    confusion_phrases = [
        "i don't understand", "i dont understand", "confused", "what does that mean",
        "explain again", "why does", "i'm lost", "im lost", "not getting this"
    ]
    # Mastery indicators -> soft positive update
    mastery_phrases = [
        "i understand", "makes sense", "got it", "i get it now", "aha",
        "so basically", "that clarifies", "exactly"
    ]

    is_confusion = any(phrase in msg_lower for phrase in confusion_phrases)
    is_mastery = any(phrase in msg_lower for phrase in mastery_phrases)

    if not is_confusion and not is_mastery:
        return

    is_correct = is_mastery and not is_confusion
    params = QUESTION_TYPE_PARAMS["chat_evidence"]
    state = get_learner_topic_state(topic, student_id=student_id)
    p_current = state["mastery_score"]
    attempts = state["attempts_count"] + 1

    # Fractional weight (0.4) for conversational evidence
    p_new = update_bkt_posterior(
        p_current=p_current,
        is_correct=is_correct,
        p_g=params["p_g"],
        p_s=params["p_s"],
        p_t=DEFAULT_BKT_PARAMS["p_t"] * 0.5,
        weight=0.4
    )
    uncertainty, confidence = compute_uncertainty(p_new, attempts)

    db.update_learner_topic_mastery(
        student_id=student_id,
        topic=topic,
        mastery_score=p_new,
        confidence=confidence,
        uncertainty=uncertainty,
        is_correct=is_correct,
        event_type="chat_dialogue",
        evidence_basis=f"doc:{doc_id}; cue:{'mastery' if is_correct else 'confusion'}"
    )

def get_scaffolding_recommendation(topic: str, student_id: str = "default_student") -> Dict[str, Any]:
    """
    Returns personalized pedagogical scaffolding based on BKT mastery state:
    - Mastery < 0.40: High scaffolding (foundational analogies, prerequisite review, explicit hints)
    - 0.40 <= Mastery < 0.75: Medium scaffolding (guided problem solving, terminology balance)
    - Mastery >= 0.75: Minimal scaffolding (theoretical edge cases, challenging synthesis)
    """
    state = get_learner_topic_state(topic, student_id=student_id)
    p = state["mastery_score"]

    if p < 0.40:
        return {
            "level": "beginner",
            "mastery_score": p,
            "uncertainty": state["uncertainty"],
            "guidance": "High Scaffolding: Break concepts into bite-sized steps, use concrete everyday analogies, provide hints before solutions, and check prerequisite knowledge.",
            "recommended_quiz_difficulty": "easy"
        }
    elif p < 0.75:
        return {
            "level": "intermediate",
            "mastery_score": p,
            "uncertainty": state["uncertainty"],
            "guidance": "Medium Scaffolding: Balance technical rigor with practical examples, guide through derivations, and prompt with active recall questions.",
            "recommended_quiz_difficulty": "medium"
        }
    else:
        return {
            "level": "advanced",
            "mastery_score": p,
            "uncertainty": state["uncertainty"],
            "guidance": "Low Scaffolding / Autonomous: Challenge with nuanced edge cases, multi-hop synthesis, and real-world transfer problems.",
            "recommended_quiz_difficulty": "hard"
        }

def generate_diagnostic_intake(doc_id: str) -> List[Dict[str, Any]]:
    """
    Generates a structured diagnostic assessment designed to calibrate
    the initial mastery state across prerequisite and core concepts of a document.
    """
    from services.quiz_service import generate_quiz
    # Generate 5 diagnostic questions with mixed difficulty
    return generate_quiz(doc_id, num_questions=5, difficulty="mixed")
