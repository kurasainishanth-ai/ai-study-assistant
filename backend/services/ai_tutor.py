import re
from typing import List, Dict, Any, Optional
from google.genai import types
from config import get_gemini_client, DEFAULT_MODEL
import db

LEVEL_INSTRUCTIONS = {
    "simple": "Explain in simple, everyday language as if talking to a middle school or early high school student. Use friendly analogies and avoid unnecessary jargon.",
    "intermediate": "Explain at a standard college or AP high school level. Balance clarity, accurate scientific/academic terminology, and practical examples.",
    "university": "Provide rigorous, university-level explanations. Analyze theoretical nuances, underlying mechanisms, edge cases, and formal academic concepts."
}

def extract_structured_citations(answer_text: str, doc_content: str, source_doc_id: Optional[str], material_name: str) -> List[Dict[str, Any]]:
    """Extracts structured citation objects with location type, value, source, and excerpt."""
    matches = re.finditer(r"\[(Page|Slide|Section|Timestamp)\s*([^\]]+)\]", answer_text, re.IGNORECASE)
    structured = []
    seen = set()

    for m in matches:
        loc_type = m.group(1).lower()
        loc_val = m.group(2).strip()
        raw_tag = m.group(0)
        key = (loc_type, loc_val)
        if key in seen:
            continue
        seen.add(key)

        # Attempt to find excerpt around the section marker in doc_content
        excerpt = ""
        pattern = re.compile(rf"---\s*\[{loc_type}\s*{re.escape(loc_val)}[^\]]*\]\s*---\s*\n(.*?)(?=(?:---\s*\[|$))", re.IGNORECASE | re.DOTALL)
        doc_match = pattern.search(doc_content)
        if doc_match:
            snippet = doc_match.group(1).strip()
            excerpt = (snippet[:200] + "...") if len(snippet) > 200 else snippet

        structured.append({
            "raw_citation": raw_tag,
            "source_id": source_doc_id or "workspace",
            "source_name": material_name,
            "location_type": loc_type,
            "location_val": loc_val,
            "excerpt": excerpt
        })

    return structured

def ask_ai_tutor(doc_id: str, question: str, level: str = "intermediate", source_doc_id: Optional[str] = None) -> Dict[str, Any]:
    """Generates a conversational response grounded in the uploaded material with citations."""
    # 1. Check existing session for source_doc_id if not explicitly provided
    existing_session = db.get_chat_session(doc_id)
    if existing_session and existing_session.get("source_doc_id"):
        source_doc_id = existing_session["source_doc_id"]
    elif not source_doc_id and not doc_id.startswith("chat_"):
        source_doc_id = doc_id

    # 2. Get document content for grounding
    material_name = "All Workspace Materials"
    doc_content = ""
    if source_doc_id:
        material = db.get_material(source_doc_id)
        if material:
            doc_content = material.get("content", "") or ""
            material_name = material['name']

    if not doc_content.strip():
        all_mats = db.get_all_materials()
        doc_content = ""
        material_name = "All Workspace Materials"
        for m in all_mats:
            doc_content += f"--- MATERIAL: {m['name']} ---\n{m.get('content', '')}\n\n"
        if not doc_content.strip():
            doc_content = "No study materials uploaded to the workspace yet."

    # 3. Ensure the chat session exists and is persisted in SQLite
    db.ensure_chat_session(doc_id, title=question[:40], source_doc_id=source_doc_id)

    # 4. Fetch recent chat history
    history = db.get_chat_history(doc_id)
    history_context = []
    for msg in history[-6:]:
        prefix = "Student: " if msg["role"] == "user" else "Tutor: "
        history_context.append(f"{prefix}{msg['content']}")
    history_str = "\n".join(history_context)

    level_guide = LEVEL_INSTRUCTIONS.get(level, LEVEL_INSTRUCTIONS["intermediate"])

    system_instruction = (
        "You are StudyVerse AI Tutor, an empathetic, highly knowledgeable, and intellectually honest academic mentor.\n"
        "CENTRAL RULE: Uploaded material is the primary contextual source. Ground your answers primarily in the uploaded course notes and lecture materials whenever they contain the answer.\n\n"
        "Strictly adhere to these guidelines:\n"
        "1. SOURCE GROUNDING & CITATIONS: When the document contains relevant information, prioritize and preserve its terminology. Cite specific locations with markers like [Page X], [Slide Y], or [Timestamp HH:MM:SS] directly adjacent to each grounded claim.\n"
        "2. INTELLECTUAL HONESTY & NEGATIVE RECOGNITION: If the uploaded material does not establish the answer or lacks necessary details, explicitly state that the uploaded material does not establish this. You may then supplement with external academic knowledge, but clearly distinguish it by stating: 'While not covered in your uploaded notes, in general academic theory...' Never fabricate claims or claim outside knowledge comes from the document.\n"
        "3. MULTI-HOP SYNTHESIS: For complex synthesis questions requiring multiple sections, combine the concepts systematically, providing distinct citations for each component fact.\n"
        "4. STRICT ACADEMIC SCOPE & FICTION BOUNDARIES:\n"
        "   - Your permanent identity is an Academic Tutor. Non-academic topics (shopping, entertainment) MUST be rejected and redirected.\n"
        "   - ACADEMIC FRAMING: Fiction/pop culture can be used as a teaching aid (e.g., 'Use Hulk to explain conservation of mass'), but the REAL academic concept must remain central.\n"
        "   - DISGUISED ENTERTAINMENT: If a request just adds 'scientifically' to a fictional debate (e.g., 'Explain Doctor Doom\\'s powers scientifically' or 'Compare Thor and Hulk scientifically'), DO NOT indulge in a lore discussion. You MUST reply ONLY with this brief redirection and STOP GENERATING: 'If you\\'d like, I can use that fictional example to teach a specific scientific concept. For example, I can explain gamma radiation, biomechanics, electromagnetism, energy, or conservation laws using them as an example.' Do not provide any scientific breakdown until the user specifies the concept.\n"
        "   - CONTEXT DRIFT: Do NOT inherit academic intent from a previous message. If a user follows an academic explanation with 'Okay, now Thor and Hulk', do not automatically generate a new scientific comparison. Instead, ask which specific scientific concept they want to explore.\n"
        "   - DO NOT FAKE SCIENCE: Clearly distinguish canon from real science. Never present invented fictional mechanisms as established science. Explicitly label speculative explanations as speculation, focusing on where fiction aligns with or violates real science.\n"
        "5. NO SOURCE HALLUCINATION: Cite [Page X], [Slide Y], or [Timestamp HH:MM:SS] only when stating a fact directly from the source material.\n"
        f"6. TONE & DEPTH: {level_guide}\n"
        "7. PEDAGOGY: Break complex thoughts into logical steps, provide helpful analogies, and invite thoughtful follow-ups."
    )

    prompt = (
        f"STUDY MATERIAL (Source: '{material_name}'):\n"
        f"{doc_content}\n\n"
        f"CONVERSATION HISTORY:\n"
        f"{history_str}\n\n"
        f"STUDENT QUESTION:\n"
        f"{question}\n\n"
        "TUTOR RESPONSE (Include specific citations like [Page X], [Slide Y], or [Timestamp HH:MM:SS] where applicable):"
    )

    from services.gemini_caller import call_gemini_with_retry
    answer_text = call_gemini_with_retry(
        contents=[prompt],
        system_instruction=system_instruction,
        temperature=0.3
    )

    # Extract raw citation tags
    citations = list(set(re.findall(r"\[(?:Page|Slide|Section|Timestamp)\s*[^\]]+\]", answer_text, re.IGNORECASE)))
    structured_citations = extract_structured_citations(answer_text, doc_content, source_doc_id, material_name)

    # Persist messages in SQLite (saving structured citations for richer retrieval)
    db.save_chat_message(doc_id=doc_id, role="user", content=question, level=level)
    db.save_chat_message(doc_id=doc_id, role="assistant", content=answer_text, level=level, citations=structured_citations or citations)

    # Conversational Evidence Update for Learner Model
    try:
        from services.learner_model import update_mastery_from_chat_evidence
        topic_target = material_name if material_name and not material_name.startswith("All Workspace") else "General"
        update_mastery_from_chat_evidence(
            student_id="default_student",
            topic=topic_target,
            user_message=question,
            doc_id=doc_id
        )
    except Exception:
        pass

    return {
        "chat_id": doc_id,
        "answer": answer_text,
        "citations": citations,
        "structured_citations": structured_citations,
        "level": level,
        "source_doc_id": source_doc_id,
        "source_name": material_name
    }
