import re
with open(r"C:\Users\kuras\Desktop\ai-study-assistant\backend\services\quiz_service.py", "r", encoding="utf-8") as f:
    text = f.read()

pattern = r'def generate_quiz\(doc_id: str.*?return normalized'

replacement = """def generate_quiz(doc_id: str, num_questions: int = 5, difficulty: str = "medium") -> List[Dict[str, Any]]:
    \"\"\"Generates source-grounded diagnostic questions (MCQs, True/False, Short Answer).\"\"\"
    import difflib
    from services.gemini_caller import call_gemini_with_retry
    
    material = db.get_material(doc_id)
    if not material:
        raise ValueError(f"Study material with ID '{doc_id}' not found.")
        
    doc_content = material.get("content", "")
    if not doc_content.strip():
        return []

    system_instruction = (
        "You are an expert psychometric test designer and educator. "
        "Create high-quality, concept-based diagnostic quiz questions strictly grounded in the provided text. "
        "Return ONLY a valid JSON array of question objects with this schema:\\n"
        "[\\n  {\\n    \\"id\\": 1,\\n    \\"type\\": \\"mcq | true_false | short_answer\\",\\n"
        "    \\"question\\": \\"Question text\\",\\n    \\"options\\": [\\"A) ...\\", \\"B) ...\\", \\"C) ...\\", \\"D) ...\\"] or [\\"True\\", \\"False\\"] or [],\\n"
        "    \\"correct_answer\\": \\"Exact correct option or answer text\\",\\n    \\"rationale\\": \\"Clear explanation of why this answer is correct and why common traps fail\\",\\n"
        "    \\"topic\\": \\"Specific subtopic tested\\",\\n    \\"source_ref\\": \\"Page X or Slide Y if identifiable\\"\\n  }\\n]\\n"
        "Do not include markdown code fence formatting. Return pure JSON text only."
    )

    # Gather bounded history
    past_attempts = db.get_quiz_attempts(doc_id)
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
            f"STUDY MATERIAL (Source: '{material['name']}'):\\n"
            f"{doc_content}\\n\\n"
            f"TASK: Generate {needed} questions with difficulty '{difficulty}'. "
            "Include mostly multiple choice questions with realistic distractors and 1 conceptual short-answer question.\\n"
        )
        
        if avoid_qs:
            prompt += "\\nCRITICAL RULE - DEDUPLICATION: You must NOT generate questions that are exact duplicates or semantically very similar to the following previously asked questions:\\n"
            for pq in avoid_qs:
                prompt += f"- {pq}\\n"
                
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
            if not question_text:
                continue
                
            # Semantic deduplication
            is_dup = False
            for pq in avoid_qs:
                if difflib.SequenceMatcher(None, question_text.lower(), pq.lower()).ratio() >= 0.8:
                    is_dup = True
                    break
                    
            if not is_dup:
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
            "source_ref": str(item.get("source_ref") or "").strip()
        })
    return normalized"""

text = re.sub(pattern, replacement, text, flags=re.DOTALL)
with open(r"C:\Users\kuras\Desktop\ai-study-assistant\backend\services\quiz_service.py", "w", encoding="utf-8") as f:
    f.write(text)
print("done")
