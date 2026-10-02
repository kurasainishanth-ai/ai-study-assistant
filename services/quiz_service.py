import json
import re
from typing import List, Dict, Any, Optional
from google.genai import types
from config import get_gemini_client, DEFAULT_MODEL
import db

def generate_quiz(doc_id: str, num_questions: int = 5, difficulty: str = "medium") -> List[Dict[str, Any]]:
    """Generates source-grounded diagnostic questions (MCQs, True/False, Short Answer)."""
    material = db.get_material(doc_id)
    if not material:
        raise ValueError(f"Study material with ID '{doc_id}' not found.")
        
    doc_content = material.get("content", "")
    if not doc_content.strip():
        return []

    system_instruction = (
        "You are an expert psychometric test designer and educator. "
        "Create high-quality, concept-based diagnostic quiz questions strictly grounded in the provided text. "
        "Return ONLY a valid JSON array of question objects with this schema:\n"
        "[\n"
        "  {\n"
        '    "id": 1,\n'
        '    "type": "mcq | true_false | short_answer",\n'
        '    "question": "Question text",\n'
        '    "options": ["A) ...", "B) ...", "C) ...", "D) ..."] or ["True", "False"] or [],\n'
        '    "correct_answer": "Exact correct option or answer text",\n'
        '    "rationale": "Clear explanation of why this answer is correct and why common traps fail",\n'
        '    "topic": "Specific subtopic tested",\n'
        '    "source_ref": "Page X or Slide Y if identifiable"\n'
        "  }\n"
        "]\n"
        "Do not include markdown code fence formatting. Return pure JSON text only."
    )

    prompt = (
        f"STUDY MATERIAL (Source: '{material['name']}'):\n"
        f"{doc_content}\n\n"
        f"TASK: Generate {num_questions} questions with difficulty '{difficulty}'. "
        "Include mostly multiple choice questions with realistic distractors and 1 conceptual short-answer question."
    )

    from services.gemini_caller import call_gemini_with_retry
    raw_text = call_gemini_with_retry(
        contents=[prompt],
        system_instruction=system_instruction,
        temperature=0.2
    ).strip()
    raw_text = re.sub(r"^```(?:json)?", "", raw_text).strip()
    raw_text = re.sub(r"```$", "", raw_text).strip()

    try:
        questions = json.loads(raw_text)
    except Exception:
        questions = []

    return questions if isinstance(questions, list) else []



def evaluate_quiz(doc_id: str, questions: List[Dict[str, Any]], user_answers: Dict[str, str]) -> Dict[str, Any]:
    """
    Evaluates student quiz answers, activates Misconception Detector for errors,
    records the attempt in SQLite, and provides targeted follow-ups.

    Returns a shape compatible with QuizArenaView.jsx:
      { score, total_questions, percentage, evaluations: [...], topic_breakdown, misconception_analysis }
    Each evaluation item: { id, question, student_answer, correct_answer, is_correct, explanation, topic, source_ref }
    """
    material = db.get_material(doc_id)
    doc_name = material["name"] if material else "Study Document"

    correct_count = 0
    total = len(questions)
    evaluations = []
    topic_breakdown = {}

    for idx, q in enumerate(questions):
        # Try to find the user's answer by question id first, then by 0-based index,
        # then by 1-based index. This makes the lookup robust regardless of how
        # Gemini numbers the questions.
        q_id_field = str(q.get("id", idx + 1))
        user_ans = (
            str(user_answers.get(q_id_field, "")).strip()
            or str(user_answers.get(str(idx), "")).strip()
            or str(user_answers.get(str(idx + 1), "")).strip()
        )
        correct_ans = str(q.get("correct_answer", "")).strip()
        topic = q.get("topic", "General")

        topic_breakdown.setdefault(topic, {"correct": 0, "total": 0})
        topic_breakdown[topic]["total"] += 1

        is_correct = False
        if user_ans and correct_ans:
            if user_ans.lower() == correct_ans.lower():
                is_correct = True
            elif len(user_ans) == 1 and correct_ans.upper().startswith(user_ans.upper()):
                is_correct = True
            elif len(correct_ans) == 1 and user_ans.upper().startswith(correct_ans.upper()):
                is_correct = True

        if is_correct:
            correct_count += 1
            topic_breakdown[topic]["correct"] += 1

        evaluations.append({
            "id": q_id_field,
            "question": q.get("question", ""),
            # Frontend field: student_answer (not user_answer)
            "student_answer": user_ans or "No answer submitted",
            "correct_answer": correct_ans,
            "is_correct": is_correct,
            # Frontend field: explanation (not rationale)
            "explanation": q.get("rationale", q.get("explanation", "")),
            "topic": topic,
            "source_ref": q.get("source_ref", ""),
            # Per-item misconception and follow_up placeholders — filled below
            "misconception_analysis": None,
            "targeted_follow_up": None,
        })

    # Misconception Detector — analyze incorrect answers with Gemini
    incorrect_evals = [e for e in evaluations if not e["is_correct"]]

    if incorrect_evals:
        error_summary = "\n".join([
            f"Question: {item['question']}\nStudent Answered: {item['student_answer']}\n"
            f"Correct Answer: {item['correct_answer']}\nTopic: {item['topic']}\n"
            for item in incorrect_evals[:3]
        ])

        misconception_prompt = (
            "You are the StudyVerse Misconception Detector. Analyze the student errors below.\n"
            "For each incorrect answer, respond with a JSON array matching this exact schema:\n"
            "[\n"
            "  {\n"
            '    "question": "exact question text",\n'
            '    "misconception": "one-sentence possible misconception",\n'
            '    "follow_up": "one targeted follow-up checkpoint question"\n'
            "  }\n"
            "]\n"
            "Return only pure JSON — no markdown fences, no extra text.\n\n"
            f"STUDENT ERRORS:\n{error_summary}"
        )

        misconception_map = {}
        try:
            from services.gemini_caller import call_gemini_with_retry
            raw = call_gemini_with_retry(contents=[misconception_prompt], temperature=0.25)
            raw = re.sub(r"^```(?:json)?", "", raw.strip()).strip()
            raw = re.sub(r"```$", "", raw).strip()
            mc_items = json.loads(raw)
            if isinstance(mc_items, list):
                for mc in mc_items:
                    key = mc.get("question", "").strip().lower()[:60]
                    misconception_map[key] = mc
        except Exception:
            pass  # silently degrade — evaluations still work without misconception text

        # Attach per-question misconception data
        for ev in evaluations:
            if not ev["is_correct"]:
                key = ev["question"].strip().lower()[:60]
                mc = misconception_map.get(key)
                if mc:
                    ev["misconception_analysis"] = mc.get("misconception", "")
                    ev["targeted_follow_up"] = mc.get("follow_up", "")

        # Build a combined summary string for the overall analysis field
        if misconception_map:
            summary_parts = []
            for mc in misconception_map.values():
                if mc.get("misconception"):
                    summary_parts.append(f"• {mc['misconception']}")
            misconception_analysis_text = "\n".join(summary_parts) if summary_parts else "Review incorrect answers above."
        else:
            misconception_analysis_text = "Review your incorrect answers and their explanations to clarify definitions."
    else:
        misconception_analysis_text = "Outstanding work! No misconceptions identified on this attempt."

    # Persist attempt to SQLite
    db.save_quiz_attempt(
        doc_id=doc_id,
        doc_name=doc_name,
        score=correct_count,
        total_questions=total,
        topic_breakdown=topic_breakdown,
        details=evaluations
    )

    percentage = round((correct_count / max(total, 1)) * 100, 1)

    return {
        "score": correct_count,
        "total_questions": total,   # field name matches frontend
        "percentage": percentage,
        "evaluations": evaluations,  # field name matches frontend
        "topic_breakdown": topic_breakdown,
        "misconception_analysis": misconception_analysis_text,
    }

