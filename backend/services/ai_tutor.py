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
        "You are StudyVerse AI Tutor, an empathetic, highly knowledgeable, and intellectually honest academic mentor. "
        "Strictly adhere to these rules:\n"
        "1. GROUNDING: Answer using ONLY the factual content provided in the study material below. "
        "If the material does NOT contain enough information to answer, explicitly state: 'The uploaded study material does not contain sufficient information to answer this question.'\n"
        "2. CITATIONS: Whenever stating a fact or concept, cite the exact source marker from the text if available, like [Page X], [Slide Y], or [Section Title].\n"
        f"3. TONE & DEPTH: {level_guide}\n"
        "4. PEDAGOGY: Break complex thoughts into logical steps, provide helpful analogies, and invite thoughtful follow-ups."
    )

    prompt = (
        f"STUDY MATERIAL (Source: '{material_name}'):\n"
        f"{doc_content}\n\n"
        f"CONVERSATION HISTORY:\n"
        f"{history_str}\n\n"
        f"STUDENT QUESTION:\n"
        f"{question}\n\n"
        "TUTOR RESPONSE (Include citations like [Page X] or [Slide Y] where applicable):"
    )

    from services.gemini_caller import call_gemini_with_retry
    answer_text = call_gemini_with_retry(
        contents=[prompt],
        system_instruction=system_instruction,
        temperature=0.3
    )

    # Extract citations like [Page 1], [Slide 2], etc.
    citations = list(set(re.findall(r"\[(?:Page|Slide|Section)\s*[^\]]+\]", answer_text, re.IGNORECASE)))

    # Persist messages in SQLite
    db.save_chat_message(doc_id=doc_id, role="user", content=question, level=level)
    db.save_chat_message(doc_id=doc_id, role="assistant", content=answer_text, level=level, citations=citations)

    return {
        "chat_id": doc_id,
        "answer": answer_text,
        "citations": citations,
        "level": level,
        "source_doc_id": source_doc_id,
        "source_name": material_name
    }
