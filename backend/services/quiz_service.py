import json
import re
from decimal import Decimal, InvalidOperation
from typing import List, Dict, Any, Optional
from google.genai import types
from config import get_gemini_client, DEFAULT_MODEL
import db
from services.material_context import selected_context, split_source_ids


def is_question_duplicate(question: str, previous_questions: List[str], threshold: float = 0.8) -> bool:
    """Shared, deterministic novelty check for generated and simulated assessments."""
    from difflib import SequenceMatcher

    candidate = re.sub(r"\s+", " ", str(question or "")).strip().casefold()
    return any(
        SequenceMatcher(None, candidate, re.sub(r"\s+", " ", str(previous or "")).strip().casefold()).ratio() >= threshold
        for previous in previous_questions if previous
    )

def generate_quiz(doc_id: str, num_questions: int = 5, difficulty: str = "medium") -> List[Dict[str, Any]]:
    """Generates source-grounded diagnostic questions, including numerical problems."""
    from services.gemini_caller import call_gemini_with_retry

    difficulty = str(difficulty or "medium").strip().lower()
    if difficulty not in {"easy", "medium", "hard"}:
        raise ValueError("Quiz difficulty must be easy, medium, or hard.")
    difficulty_guidance = {
        "easy": "Test foundational recall and direct understanding. Use clear wording and avoid multi-step inference.",
        "medium": "Balance conceptual understanding with application. Include plausible distractors and some reasoning.",
        "hard": "Test deeper application, comparisons, edge cases, and multi-step reasoning. Use subtle but fair distractors; remain strictly answerable from the source.",
    }[difficulty]
    
    material = selected_context(doc_id)
    doc_content = material.get("content", "")
    if not doc_content.strip():
        return []

    system_instruction = (
        "You are an expert psychometric test designer and educator. "
        "Create high-quality, concept-based diagnostic quiz questions strictly grounded in the provided text. "
        "When multiple labeled source materials are provided, distribute questions across them and include source titles in source_ref where possible. "
        "Return ONLY a valid JSON array of question objects with this schema:\n"
        "[\n"
        "  {\n"
        '    "id": 1,\n'
        '    "type": "mcq | true_false | short_answer | numerical",\n'
        '    "question": "Question text",\n'
        '    "options": ["A) ...", "B) ...", "C) ...", "D) ..."] or ["True", "False"] or [],\n'
        '    "correct_answer": "Exact correct option or answer text",\n'
        '    "rationale": "Clear explanation of why this answer is correct and why common traps fail",\n'
        '    "topic": "Specific subtopic tested",\n'
        '    "source_ref": "Page X, Slide Y, or [MM:SS] timestamp if identifiable",\n'
        '    "tolerance": "optional numeric absolute tolerance for numerical answers"\n'
        "  }\n"
        "]\n"
        "Do not include markdown code fence formatting. Return pure JSON text only."
    )

    # Gather bounded history
    source_ids = split_source_ids(doc_id)
    past_attempts = []
    for source_id in list(dict.fromkeys([doc_id, *source_ids])):
        past_attempts.extend(db.get_quiz_attempts(source_id))
    history_qs = []
    for att in past_attempts:
        for d in att.get("details", []):
            q_text = d.get("question")
            if q_text:
                history_qs.append(q_text)
                
    recent_past = history_qs[-30:] # bounded context
    avoid_qs = recent_past[:]
    
    final_questions = []
    needed = num_questions
    max_passes = 2
    
    for _ in range(max_passes):
        if needed <= 0:
            break
            
        prompt = (
            f"STUDY MATERIAL (Source: '{material['name']}'):\n"
            f"{doc_content}\n\n"
            f"TASK: Generate {needed} questions with difficulty '{difficulty}'. "
            f"DIFFICULTY GUIDANCE: {difficulty_guidance}\n"
            "Include mostly multiple choice questions with realistic distractors and 1 conceptual short-answer question.\n"
            "When the selected sources contain calculations or quantitative procedures, include numerical problems and provide a reasonable absolute tolerance.\n"
        )
        
        if avoid_qs:
            prompt += "\nCRITICAL RULE - DEDUPLICATION: You must NOT generate questions that are exact duplicates or semantically very similar to the following previously asked questions:\n"
            for pq in avoid_qs:
                prompt += f"- {pq}\n"
                
        raw_text = call_gemini_with_retry(
            contents=[prompt],
            system_instruction=system_instruction,
            temperature=0.3
        ).strip()
        raw_text = re.sub(r"^```(?:json)?", "", raw_text, flags=re.IGNORECASE).strip()
        raw_text = re.sub(r"```$", "", raw_text).strip()
        
        try:
            batch_qs = json.loads(raw_text)
        except Exception:
            batch_qs = []
            
        if not isinstance(batch_qs, list):
            batch_qs = []
            
        for item in batch_qs:
            if not isinstance(item, dict):
                continue
            question_text = str(item.get("question") or "").strip()
            answer_text = str(item.get("correct_answer") or "").strip()
            raw_options = item.get("options") or []
            options = [str(option).strip() for option in raw_options if str(option).strip()] if isinstance(raw_options, list) else []
            question_type = str(item.get("type") or ("mcq" if options else "short_answer")).lower()
            if not question_text or not answer_text:
                continue
            if question_type in {"mcq", "true_false"} and not options:
                continue
            if question_type not in {"mcq", "true_false", "short_answer", "numerical"}:
                continue
            if question_type == "mcq" and not any(_choice_is_correct(answer_text, option, options) for option in options):
                continue
            if question_type == "numerical" and _parse_numeric_answer(answer_text) is None:
                continue

            item = {**item, "question": question_text, "correct_answer": answer_text, "options": options, "type": question_type}
                
            # Semantic deduplication
            if not is_question_duplicate(question_text, avoid_qs):
                final_questions.append(item)
                avoid_qs.append(question_text)
                needed -= 1
                if needed <= 0:
                    break
                    
    normalized = []
    for index, item in enumerate(final_questions, start=1):
        question = str(item.get("question") or "").strip()
        answer = str(item.get("correct_answer") or "").strip()
        raw_options = item.get("options") or []
        options = [str(o).strip() for o in raw_options if str(o).strip()] if isinstance(raw_options, list) else []
        question_type = str(item.get("type") or ("mcq" if options else "short_answer")).lower()
        if not question or not answer or (question_type in ("mcq", "true_false") and not options):
            continue
        normalized.append({
            "id": index, 
            "type": question_type, 
            "question": question, 
            "options": options, 
            "correct_answer": answer, 
            "rationale": str(item.get("rationale") or item.get("explanation") or "").strip(), 
            "topic": str(item.get("topic") or "General").strip(), 
            "source_ref": str(item.get("source_ref") or "").strip(),
            "tolerance": item.get("tolerance"),
        })
    return normalized


def _choice_is_correct(user_answer: str, correct_answer: str, options: List[Any]) -> bool:
    """Match either option labels or option text, even when the answer key omits its label."""
    def parse(value: Any):
        text = re.sub(r"\s+", " ", str(value or "")).strip()
        match = re.match(r"^([A-Z])(?:\s*[).:]\s*|\s+)(.+)$", text, flags=re.IGNORECASE)
        label = match.group(1).upper() if match else ""
        body = match.group(2) if match else text
        normalized = re.sub(r"[^\w]+", "", body, flags=re.UNICODE).casefold()
        return label, normalized

    answer_label, answer_text = parse(correct_answer)
    user_label, user_text = parse(user_answer)
    if not answer_label and re.fullmatch(r"[A-Z]", str(correct_answer or "").strip(), flags=re.IGNORECASE):
        answer_label = str(correct_answer).strip().upper()
    if not user_label and re.fullmatch(r"[A-Z]", str(user_answer or "").strip(), flags=re.IGNORECASE):
        user_label = str(user_answer).strip().upper()

    correct_option_label = answer_label
    if not correct_option_label and answer_text:
        for index, option in enumerate(options if isinstance(options, list) else []):
            option_label, option_text = parse(option)
            if option_text == answer_text:
                correct_option_label = option_label or chr(ord("A") + index)
                break

    if correct_option_label and user_label:
        return correct_option_label == user_label
    return bool(answer_text) and answer_text == user_text


_NUMERIC_ANSWER_RE = re.compile(r"[-+]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?")


def _parse_numeric_answer(value: Any):
    """Parse a numeric value and optional unit without invoking an LLM grader."""
    text = str(value or "").strip()
    match = _NUMERIC_ANSWER_RE.search(text)
    if not match or not match.group(0) or match.group(0) in {"+", "-", "."}:
        return None
    try:
        number = Decimal(match.group(0).replace(",", ""))
    except InvalidOperation:
        return None
    unit = (text[:match.start()] + text[match.end():]).strip().lower()
    unit = re.sub(r"\s+", "", unit)
    return number, unit


def _numeric_is_correct(user_answer: str, correct_answer: str, tolerance: Any = None) -> bool:
    expected = _parse_numeric_answer(correct_answer)
    submitted = _parse_numeric_answer(user_answer)
    if expected is None or submitted is None:
        return False
    expected_value, expected_unit = expected
    submitted_value, submitted_unit = submitted
    if expected_unit and submitted_unit != expected_unit:
        return False
    try:
        allowed_error = Decimal(str(tolerance)) if tolerance not in (None, "") else max(abs(expected_value) * Decimal("0.001"), Decimal("0.000001"))
    except InvalidOperation:
        allowed_error = max(abs(expected_value) * Decimal("0.001"), Decimal("0.000001"))
    if not allowed_error.is_finite() or allowed_error < 0:
        return False
    tolerance_cap = max(abs(expected_value) * Decimal("0.1"), Decimal("0.000001"))
    if allowed_error > tolerance_cap:
        return False
    return abs(submitted_value - expected_value) <= allowed_error


def evaluate_quiz(doc_id: str, questions: List[Dict[str, Any]], user_answers: Dict[str, str]) -> Dict[str, Any]:
    material = db.get_material(doc_id)
    doc_name = material['name'] if material else 'Study Document'

    correct_count = 0
    total = len(questions)
    evaluations = []
    topic_breakdown = {}
    
    # We will gather all descriptive questions that need LLM evaluation
    descriptive_to_eval = []
    
    for idx, q in enumerate(questions):
        q_id_field = str(q.get('id', idx + 1))
        # Support dict format (e.g. from frontend) where answers might be keyed by id or index
        user_ans = (
            str(user_answers.get(q_id_field, '')).strip()
            or str(user_answers.get(str(idx), '')).strip()
            or str(user_answers.get(str(idx + 1), '')).strip()
        )
        correct_ans = str(q.get('correct_answer', '')).strip()
        topic = q.get('topic', 'General')
        q_type = str(q.get('type', 'mcq')).lower()
        options = q.get('options', [])

        topic_breakdown.setdefault(topic, {'correct': 0, 'total': 0})
        topic_breakdown[topic]['total'] += 1

        is_correct = False
        needs_llm = False
        
        if not user_ans:
            is_correct = False
        elif q_type == "numerical":
            is_correct = _numeric_is_correct(user_ans, correct_ans, q.get("tolerance"))
        elif q_type in ('mcq', 'true_false') or options:
            # Deterministic matching
            is_correct = _choice_is_correct(user_ans, correct_ans, options)
        else:
            # Short answer / descriptive. Try deterministic first.
            if user_ans.lower() == correct_ans.lower():
                is_correct = True
            else:
                needs_llm = True
                
        eval_item = {
            'id': q_id_field,
            'question': q.get('question', ''),
            'student_answer': user_ans or 'No answer submitted',
            'correct_answer': correct_ans,
            'is_correct': is_correct,
            'explanation': q.get('rationale', q.get('explanation', '')),
            'topic': topic,
            'source_ref': q.get('source_ref', ''),
            'misconception_analysis': None,
            'targeted_follow_up': None,
            'needs_llm': needs_llm, # Temporary flag
            'idx': idx # Temporary flag
        }
        evaluations.append(eval_item)
        
        if needs_llm:
            descriptive_to_eval.append(eval_item)

    # Batch LLM Evaluation for descriptive answers
    if descriptive_to_eval:
        llm_prompt = (
            "You are an expert academic evaluator. Grade the following student answers.\n"
            "Respond with a JSON array where each object has 'id' (the question id), "
            "'is_correct' (boolean, true if the student demonstrates understanding, false otherwise), "
            "and 'feedback' (concise explanation of why it is right or wrong).\n\n"
        )
        
        for item in descriptive_to_eval:
            llm_prompt += f"Question ID: {item['id']}\nQ: {item['question']}\nExpected Answer: {item['correct_answer']}\nStudent Answer: {item['student_answer']}\n\n"
            
        try:
            raw = call_gemini_with_retry(contents=[llm_prompt], temperature=0.1)
            raw = re.sub(r'^```(?:json)?', '', raw.strip()).strip()
            raw = re.sub(r'```$', '', raw).strip()
            llm_results = json.loads(raw)
            if isinstance(llm_results, list):
                for res in llm_results:
                    # Find corresponding evaluation item
                    for ev in evaluations:
                        if ev['id'] == str(res.get('id')):
                            ev['is_correct'] = bool(res.get('is_correct', False))
                            if res.get('feedback'):
                                ev['explanation'] = res['feedback']
                            break
        except Exception:
            # If LLM evaluation fails, default to false (which it already is)
            pass

    # Post-process and count correct
    for ev in evaluations:
        # Remove temporary flags
        ev.pop('needs_llm', None)
        idx = ev.pop('idx', 0)
        
        if ev['is_correct']:
            correct_count += 1
            topic_breakdown[ev['topic']]['correct'] += 1

    # Misconception Detector 
    incorrect_evals = [e for e in evaluations if not e['is_correct'] and e['student_answer'] != 'No answer submitted']

    if incorrect_evals:
        error_summary = "\n".join([
            f"Question: {item['question']}\nStudent Answered: {item['student_answer']}\n"
            f"Correct Answer: {item['correct_answer']}\nTopic: {item['topic']}\n"
            for item in incorrect_evals[:3]
        ])

        misconception_prompt = (
            "You are the StudyVerse Misconception Detector. Analyze the student errors below.\n"
            "For each incorrect answer, respond with a JSON array matching this exact schema:\n"
            "[\n  {\n    \"question\": \"exact question text\",\n    \"misconception\": \"one-sentence possible misconception\",\n    \"follow_up\": \"one targeted follow-up checkpoint question\"\n  }\n]\n"
            "Return only pure JSON.\n\n"
            f"STUDENT ERRORS:\n{error_summary}"
        )

        misconception_map = {}
        try:
            raw = call_gemini_with_retry(contents=[misconception_prompt], temperature=0.25)
            raw = re.sub(r'^```(?:json)?', '', raw.strip()).strip()
            raw = re.sub(r'```$', '', raw).strip()
            mc_items = json.loads(raw)
            if isinstance(mc_items, list):
                for mc in mc_items:
                    key = mc.get('question', '').strip().lower()[:60]
                    misconception_map[key] = mc
        except Exception:
            pass 

        for ev in evaluations:
            if not ev['is_correct'] and ev['student_answer'] != 'No answer submitted':
                key = ev['question'].strip().lower()[:60]
                mc = misconception_map.get(key)
                if mc:
                    ev['misconception_analysis'] = mc.get('misconception', '')
                    ev['targeted_follow_up'] = mc.get('follow_up', '')

        if misconception_map:
            summary_parts = [f" {mc['misconception']}" for mc in misconception_map.values() if mc.get('misconception')]
            misconception_analysis_text = "\n".join(summary_parts) if summary_parts else "Review incorrect answers above."
        else:
            misconception_analysis_text = "Review your incorrect answers and their explanations to clarify definitions."
    else:
        misconception_analysis_text = "Outstanding work! No misconceptions identified on this attempt."

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
        "total_questions": total,
        "percentage": percentage,
        "evaluations": evaluations,
        "topic_breakdown": topic_breakdown,
        "misconception_analysis": misconception_analysis_text,
    }
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
            # Per-item misconception and follow_up placeholders â filled below
            "misconception_analysis": None,
            "targeted_follow_up": None,
        })

    # Misconception Detector â analyze incorrect answers with Gemini
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
            "Return only pure JSON â no markdown fences, no extra text.\n\n"
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
            pass  # silently degrade â evaluations still work without misconception text

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
                    summary_parts.append(f"â¢ {mc['misconception']}")
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
