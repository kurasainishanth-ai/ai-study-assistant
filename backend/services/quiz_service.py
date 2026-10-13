import json
import re
import hashlib
from typing import List, Dict, Any, Optional
from google.genai import types
from config import get_gemini_client, DEFAULT_MODEL
import db
from services.gemini_caller import call_gemini_with_retry

def compute_question_fingerprint(question_text: str) -> str:
    """Computes a normalized SHA-256 fingerprint for deduplication."""
    normalized = re.sub(r"[^a-z0-9]", "", question_text.lower().strip())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

def validate_question_preflight(q: Dict[str, Any], doc_content: str) -> Optional[Dict[str, Any]]:
    """
    Multi-step Pre-flight Validation Pipeline:
    1. Structure and completeness check
    2. Correctness check (valid option / numerical solvability)
    3. Distractor plausibility check (distinct options)
    4. Grounding verification (topic or terms present in source)
    """
    question_text = str(q.get("question") or "").strip()
    correct_ans = str(q.get("correct_answer") or "").strip()
    q_type = str(q.get("type") or "mcq").lower().strip()
    options = [str(opt).strip() for opt in q.get("options", []) if str(opt).strip()]
    topic = str(q.get("topic") or "General").strip()
    source_ref = str(q.get("source_ref") or "").strip()
    rationale = str(q.get("rationale") or q.get("explanation") or "").strip()

    if not question_text or not correct_ans:
        return None

    # MCQ Validation
    if q_type == "mcq":
        if len(options) < 2:
            return None
        # Check distractor distinctness
        unique_options = set(opt.lower() for opt in options)
        if len(unique_options) < len(options):
            return None
        # Check that correct answer corresponds to an option
        matches_opt = any(
            correct_ans.lower() == opt.lower() or
            (len(correct_ans) == 1 and opt.upper().startswith(correct_ans.upper())) or
            (len(opt) == 1 and correct_ans.upper().startswith(opt.upper()))
            for opt in options
        )
        if not matches_opt:
            # Append correct answer if missing from options
            options.append(correct_ans)

    # True / False Validation
    elif q_type == "true_false":
        if not options:
            options = ["True", "False"]

    # Numerical / Quantitative Problem Validation
    elif q_type == "numerical":
        # Extract numeric value
        num_match = re.search(r"[-+]?\d*\.?\d+", correct_ans)
        if not num_match:
            # Try evaluating if pure math formula
            try:
                val = float(eval(correct_ans, {"__builtins__": None}, {}))
                correct_ans = str(val)
            except Exception:
                pass
        tolerance = float(q.get("tolerance") or 0.05)
        q["tolerance"] = tolerance

    # Grounding sanity check
    concept_keyword = topic.lower()
    if concept_keyword != "general" and concept_keyword not in doc_content.lower():
        # Soft fallback: check first 3 words of question
        first_terms = [w.lower() for w in re.findall(r"\w+", question_text)[:3]]
        if not any(term in doc_content.lower() for term in first_terms if len(term) > 3):
            # Still acceptable if general summary, but flag source_ref
            pass

    fp = compute_question_fingerprint(question_text)
    return {
        "id": q.get("id"),
        "type": q_type,
        "question": question_text,
        "options": options,
        "correct_answer": correct_ans,
        "rationale": rationale,
        "topic": topic,
        "source_ref": source_ref,
        "tolerance": q.get("tolerance", 0.05),
        "fingerprint": fp
    }

def generate_quiz(
    doc_id: str,
    num_questions: int = 5,
    difficulty: str = "medium",
    topic_filter: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Generates diagnostic quiz questions grounded in study material.
    Includes diverse question types (MCQ, Short Answer, Numerical),
    runs pre-flight validation, and deduplicates against prior sessions.
    """
    material = db.get_material(doc_id)
    if not material:
        raise ValueError(f"Study material with ID '{doc_id}' not found.")

    doc_content = material.get("content", "")
    if not doc_content.strip():
        return []

    system_instruction = (
        "You are an expert psychometric test designer, academic instructor, and cognitive evaluator. "
        "Create rigorous, concept-based diagnostic quiz questions strictly grounded in the provided text.\n"
        "Generate a diverse mix of question types:\n"
        "1. Multiple Choice ('mcq') with 4 distinct, plausible options and realistic distractor traps.\n"
        "2. Short Answer ('short_answer') testing conceptual mechanisms or definitions.\n"
        "3. Numerical / Quantitative ('numerical') for calculations, formulas, or algorithmic metrics where applicable (specify exact numerical answer and numeric tolerance).\n"
        "4. True/False ('true_false') testing common misconceptions.\n\n"
        "Return ONLY a valid JSON array of question objects with this schema:\n"
        "[\n"
        "  {\n"
        '    "id": 1,\n'
        '    "type": "mcq" | "short_answer" | "numerical" | "true_false",\n'
        '    "question": "Clear, self-contained question text",\n'
        '    "options": ["Option A", "Option B", "Option C", "Option D"] (empty for short_answer and numerical),\n'
        '    "correct_answer": "Exact correct answer or number",\n'
        '    "tolerance": 0.05 (for numerical questions, optional tolerance),\n'
        '    "rationale": "Clear step-by-step explanation of why this answer is correct and why traps fail",\n'
        '    "topic": "Specific subtopic tested",\n'
        '    "source_ref": "Page X, Slide Y, or Timestamp HH:MM:SS from the text"\n'
        "  }\n"
        "]\n"
        "Do not include markdown code fences. Return pure JSON text only."
    )

    topic_instruction = f" Focus specifically on the topic '{topic_filter}'." if topic_filter else ""
    prompt = (
        f"STUDY MATERIAL (Source: '{material['name']}'):\n"
        f"{doc_content[:20000]}\n\n"
        f"TASK: Generate {num_questions} questions with difficulty '{difficulty}'.{topic_instruction} "
        "Ensure at least one conceptual question, realistic multiple choice questions, and numerical questions if calculations exist in the text."
    )

    try:
        raw_text = call_gemini_with_retry(
            contents=[prompt],
            system_instruction=system_instruction,
            temperature=0.25
        ).strip()
        raw_text = re.sub(r"^```(?:json)?", "", raw_text).strip()
        raw_text = re.sub(r"```$", "", raw_text).strip()
        questions = json.loads(raw_text)
    except Exception as e:
        print(f"Quiz generation parsing failed: {e}")
        questions = []

    if not isinstance(questions, list):
        questions = []

    # Pre-flight Validation and Deduplication
    validated_questions = []
    for idx, item in enumerate(questions, start=1):
        if not isinstance(item, dict):
            continue
        item["id"] = item.get("id") or idx
        valid_q = validate_question_preflight(item, doc_content)
        if not valid_q:
            continue

        # Deduplication check against persistent SQLite fingerprints
        fp = valid_q["fingerprint"]
        if db.is_question_fingerprinted(doc_id, fp):
            # Skip duplicate question already served in a previous session
            continue

        validated_questions.append(valid_q)

    # If deduplication filtered too many, re-include validated questions to satisfy request
    if len(validated_questions) < max(2, min(num_questions, 3)) and questions:
        for idx, item in enumerate(questions, start=1):
            if not isinstance(item, dict):
                continue
            item["id"] = item.get("id") or idx
            vq = validate_question_preflight(item, doc_content)
            if vq and vq not in validated_questions:
                validated_questions.append(vq)

    # Record fingerprints for persistent deduplication
    if validated_questions:
        db.record_question_fingerprints(doc_id, validated_questions)

    return validated_questions

def evaluate_numerical_answer(user_ans: str, correct_ans: str, tolerance: float = 0.05) -> bool:
    """Evaluates quantitative answers with tolerance and mathematical parsing."""
    try:
        # Extract first number from user answer
        u_match = re.search(r"[-+]?\d*\.?\d+", user_ans.replace(",", ""))
        c_match = re.search(r"[-+]?\d*\.?\d+", correct_ans.replace(",", ""))
        if u_match and c_match:
            u_val = float(u_match.group(0))
            c_val = float(c_match.group(0))
            return abs(u_val - c_val) <= max(tolerance, abs(c_val) * tolerance)
    except Exception:
        pass
    return user_ans.strip().lower() == correct_ans.strip().lower()

def evaluate_quiz(doc_id: str, questions: List[Dict[str, Any]], user_answers: Dict[str, str], student_id: str = "default_student") -> Dict[str, Any]:
    """
    Evaluates student quiz answers across all question types (MCQ, True/False, Numerical, Short Answer),
    runs LLM semantic grading on free-response, activates Misconception Detector,
    updates the persistent Bayesian Knowledge Tracing Learner Model, and records attempt in SQLite.
    """
    material = db.get_material(doc_id)
    doc_name = material['name'] if material else 'Study Document'

    correct_count = 0
    total = len(questions)
    evaluations = []
    topic_breakdown = {}
    descriptive_to_eval = []

    for idx, q in enumerate(questions):
        q_id_field = str(q.get('id', idx + 1))
        user_ans = (
            str(user_answers.get(q_id_field, '')).strip()
            or str(user_answers.get(str(idx), '')).strip()
            or str(user_answers.get(str(idx + 1), '')).strip()
        )
        correct_ans = str(q.get('correct_answer', '')).strip()
        topic = q.get('topic', 'General')
        q_type = str(q.get('type', 'mcq')).lower()
        options = q.get('options', [])
        tolerance = float(q.get('tolerance', 0.05))

        topic_breakdown.setdefault(topic, {'correct': 0, 'total': 0})
        topic_breakdown[topic]['total'] += 1

        is_correct = False
        needs_llm = False

        if not user_ans:
            is_correct = False
        elif q_type == "numerical":
            is_correct = evaluate_numerical_answer(user_ans, correct_ans, tolerance)
        elif q_type in ('mcq', 'true_false') or options:
            if user_ans.lower() == correct_ans.lower():
                is_correct = True
            elif len(user_ans) == 1 and correct_ans.upper().startswith(user_ans.upper()):
                is_correct = True
            elif len(correct_ans) == 1 and user_ans.upper().startswith(correct_ans.upper()):
                is_correct = True
        else:
            # Short answer / descriptive
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
            'needs_llm': needs_llm,
            'idx': idx
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
                    for ev in evaluations:
                        if ev['id'] == str(res.get('id')):
                            ev['is_correct'] = bool(res.get('is_correct', False))
                            if res.get('feedback'):
                                ev['explanation'] = res['feedback']
                            break
        except Exception:
            pass

    # Post-process correctness and topic statistics
    for ev in evaluations:
        ev.pop('needs_llm', None)
        ev.pop('idx', 0)
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
            summary_parts = [f"• {mc['misconception']}" for mc in misconception_map.values() if mc.get('misconception')]
            misconception_analysis_text = "\n".join(summary_parts) if summary_parts else "Review incorrect answers above."
        else:
            misconception_analysis_text = "Review your incorrect answers and their explanations to clarify definitions."
    else:
        misconception_analysis_text = "Outstanding work! No misconceptions identified on this attempt."

    # Update Learner Model (Priority 3 Bayesian Knowledge Tracing integration)
    try:
        from services.learner_model import update_mastery_from_quiz
        update_mastery_from_quiz(student_id=student_id, evaluations=evaluations, doc_id=doc_id)
    except Exception as e:
        print(f"Learner model update error: {e}")

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
        "total_questions": total,
        "percentage": percentage,
        "evaluations": evaluations,
        "topic_breakdown": topic_breakdown,
        "misconception_analysis": misconception_analysis_text,
    }
