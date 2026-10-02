from typing import Dict, Any, List
from google.genai import types
import db

from agent.prompts import build_system_instruction
from agent.parser import parse_model_response
from services.gemini_caller import call_gemini_with_retry
import logging

logger = logging.getLogger(__name__)

def generate_dynamic_response(doc_id: str, user_request: str) -> Dict[str, Any]:
    # 1. Retrieve Document
    material = None
    extracted_content = ""
    if doc_id:
        material = db.get_material(doc_id)
        if material:
            extracted_content = material.get("content", "")

    # 2. Retrieve History
    history_records = []
    if doc_id:
        history_records = db.get_chat_history(doc_id)
    
    sys_instruction = build_system_instruction()
    contents = []
    
    if extracted_content:
        # Prepend the extracted text to context 
        doc_msg = (
            f"Here is the study material context:\n\n{extracted_content}\n\n"
            "[System message: Please acknowledge receipt and do not generate any educational output yet.]"
        )
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=doc_msg)]))
        contents.append(types.Content(role="model", parts=[types.Part.from_text(text="Acknowledged.")]))

    for msg in history_records[-6:]:  # Limit history size
        role = "user" if msg.get("role") == "user" else "model"
        # Map assistant -> model for Gemini API
        if role == "assistant":
            role = "model"
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg.get("content", ""))]))
        
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_request)]))

    try:
        response_text = call_gemini_with_retry(
            contents=contents,
            system_instruction=sys_instruction,
            temperature=0.3
        )
    except Exception as e:
        logger.error(f"Error calling Gemini: {e}")
        return {
            "output_type": "text",
            "title": "Error",
            "summary": f"Failed to generate response: {str(e)}"
        }

    try:
        # We assume is_truncated is False for now since call_gemini_with_retry returns text
        result = parse_model_response(response_text, is_truncated=False)
        
        # Save to DB
        if doc_id:
            db.save_chat_message(doc_id=doc_id, role="user", content=user_request, level="intermediate")
            db.save_chat_message(doc_id=doc_id, role="assistant", content=result.get("summary", ""), level="intermediate", citations=[])

        return result
    except Exception as e:
        logger.error(f"Error parsing response: {e}")
        return {
            "output_type": "text",
            "title": "Parsing Error",
            "summary": "The model returned an invalid response format."
        }
