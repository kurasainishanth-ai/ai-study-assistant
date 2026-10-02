import json
import re
from typing import List, Dict, Any, Optional
from google.genai import types
from config import get_gemini_client, DEFAULT_MODEL
import db

def generate_flashcards(doc_id: str, count: int = 8, difficulty: str = "mixed") -> List[Dict[str, Any]]:
    """Generates source-grounded flashcards from material and stores them in SQLite."""
    material = db.get_material(doc_id)
    if not material:
        raise ValueError(f"Study material with ID '{doc_id}' not found.")
        
    doc_content = material.get("content", "")
    if not doc_content.strip():
        return []

    system_instruction = (
        "You are an expert educational flashcard creator. Your task is to extract high-yield, conceptually sound "
        "flashcards strictly from the provided text. Return ONLY a valid JSON array of objects with the exact schema:\n"
        "[\n"
        "  {\n"
        '    "front": "Clear question testing a key concept",\n'
        '    "back": "Concise, unambiguous answer with memory aid",\n'
        '    "topic": "Subtopic heading",\n'
        '    "difficulty": "easy | medium | hard",\n'
        '    "source_ref": "Page X or Slide Y if identifiable"\n'
        "  }\n"
        "]\n"
        "Do not include markdown code block formatting (like ```json). Return pure JSON text only."
    )

    prompt = (
        f"STUDY MATERIAL (Source: '{material['name']}'):\n"
        f"{doc_content}\n\n"
        f"TASK: Generate {count} high-quality study flashcards with difficulty '{difficulty}'. "
        "Focus on key terms, processes, formulas, and fundamental mechanisms."
    )

    from services.gemini_caller import call_gemini_with_retry
    raw_text = call_gemini_with_retry(
        contents=[prompt],
        system_instruction=system_instruction,
        temperature=0.2
    ).strip()
    # Strip markdown backticks if returned
    raw_text = re.sub(r"^```(?:json)?", "", raw_text).strip()
    raw_text = re.sub(r"```$", "", raw_text).strip()

    try:
        cards = json.loads(raw_text)
    except json.JSONDecodeError:
        # Fallback regex extraction if raw json failed
        cards = []
        matches = re.findall(r'\{\s*"front":.*?"back":.*?"topic":.*?"difficulty":.*?\}', raw_text, re.DOTALL)
        for m in matches:
            try:
                cards.append(json.loads(m))
            except Exception:
                pass

    if not isinstance(cards, list):
        cards = []

    # Store in SQLite
    if cards:
        db.save_flashcards(doc_id, cards)

    return db.get_flashcards(doc_id)
