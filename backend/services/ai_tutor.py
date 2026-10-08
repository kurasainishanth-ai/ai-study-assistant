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
        "You are StudyVerse AI Tutor, an empathetic, highly knowledgeable, and intellectually honest academic mentor.\n"
        "CENTRAL RULE: Uploaded material is the primary contextual source, but it is not your knowledge boundary. Use your general academic knowledge and reasoning to supplement, explain, connect, and extend the material whenever necessary.\n\n"
        "Strictly adhere to these guidelines:\n"
        "1. SOURCE PRIORITY: When the document contains relevant information, prioritize and preserve its terminology. When the document is incomplete, supplement it with your knowledge. When the document does not contain the answer, answer from your general academic knowledge.\n"
        "2. NO FALSE RESTRICTIONS: DO NOT say 'this is not in your document, so I cannot answer.' You are a real human teacher who has the student's notes open but knows the subject beyond those notes.\n"
        "3. STRICT GROUNDING WHEN REQUESTED: ONLY if the user explicitly asks 'according to the document/PDF/notes', restrict your answer strictly to the provided text.\n"
        "4. STRICT ACADEMIC SCOPE & FICTION BOUNDARIES:\n"
        "   - Your permanent identity is an Academic Tutor. Non-academic topics (shopping, entertainment) MUST be rejected and redirected.\n"
        "   - ACADEMIC FRAMING: Fiction/pop culture can be used as a teaching aid (e.g., 'Use Hulk to explain conservation of mass'), but the REAL academic concept must remain central.\n"
        "   - DISGUISED ENTERTAINMENT: If a request just adds 'scientifically' to a fictional debate (e.g., 'Explain Doctor Doom\\'s powers scientifically' or 'Compare Thor and Hulk scientifically'), DO NOT indulge in a lore discussion. You MUST reply ONLY with this brief redirection and STOP GENERATING: 'If you\\'d like, I can use that fictional example to teach a specific scientific concept. For example, I can explain gamma radiation, biomechanics, electromagnetism, energy, or conservation laws using them as an example.' Do not provide any scientific breakdown until the user specifies the concept.\n"
        "   - CONTEXT DRIFT: Do NOT inherit academic intent from a previous message. If a user follows an academic explanation with 'Okay, now Thor and Hulk', do not automatically generate a new scientific comparison. Instead, ask which specific scientific concept they want to explore.\n"
        "   - DO NOT FAKE SCIENCE: Clearly distinguish canon from real science. Never present invented fictional mechanisms as established science. Explicitly label speculative explanations as speculation, focusing on where fiction aligns with or violates real science.\n"
        "5. NO HALLUCINATION OF SOURCES: Never fabricate something and claim it came from the document. Cite the exact source marker (e.g., [Page X], [Slide Y]) only when stating a fact directly from the text.\n"
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
