from typing import Dict, Any, List
from google.genai import types
import db
import logging

from agent.prompts import build_system_instruction
from agent.parser import parse_model_response
from services.gemini_caller import call_gemini_with_retry_full

logger = logging.getLogger(__name__)


def generate_dynamic_response(doc_id: str, user_request: str) -> Dict[str, Any]:
    """Generate a dynamic AI response for the given user request."""
    # 1. Retrieve document context
    material = None
    extracted_content = ""
    if doc_id:
        material = db.get_material(doc_id)
        if material:
            extracted_content = material.get("content", "")

    # 2. Retrieve conversation history
    history_records = []
    if doc_id:
        history_records = db.get_chat_history(doc_id)

    # 3. Build the conversation contents
    sys_instruction = build_system_instruction()
    contents = []

    if extracted_content:
        doc_name = material.get("name", "document") if material else "document"
        doc_msg = (
            f"Active study material: \"{doc_name}\"\n\n"
            f"{extracted_content}\n\n"
            "[System: Material loaded. Respond to the student's next message.]"
        )
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=doc_msg)]))
        contents.append(types.Content(role="model", parts=[types.Part.from_text(text='Acknowledged. I have read the study material and am ready to help.')]))

    # Add recent conversation history (last 10 messages for better context)
    for msg in history_records[-10:]:
        role = "model" if msg.get("role") == "assistant" else "user"
        content = msg.get("content", "")
        if content.strip():
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=content)]))

    # Add current user message
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_request)]))

    # 4. Call Gemini
    try:
        response = call_gemini_with_retry_full(
            contents=contents,
            system_instruction=sys_instruction,
            temperature=0.4
        )
        response_text = response.text or ""
        
        # Check for truncation
        is_truncated = False
        try:
            if response.candidates and response.candidates[0].finish_reason:
                finish_reason = str(response.candidates[0].finish_reason)
                if "MAX_TOKENS" in finish_reason or "LENGTH" in finish_reason:
                    is_truncated = True
                    logger.info(f"Response was truncated (finish_reason={finish_reason})")
        except (AttributeError, IndexError):
            pass
        
        logger.debug(f"Raw response length: {len(response_text)} chars")
        
    except Exception as e:
        logger.error(f"Gemini API call failed: {type(e).__name__}: {e}")
        return {
            "output_type": "text",
            "title": "Error",
            "summary": f"Failed to generate response: {str(e)}"
        }

    # 5. Parse the response
    try:
        result = parse_model_response(response_text, is_truncated=is_truncated)
    except Exception as e:
        logger.error(f"Parse error: {e}. Response preview: {response_text[:200]}")
        return {
            "output_type": "text",
            "title": "Response Error",
            "summary": f"I had trouble formatting my response. Here is what I generated:\n\n{response_text[:2000]}"
        }

    # 6. Save to chat history
    if doc_id:
        try:
            db.save_chat_message(doc_id=doc_id, role="user", content=user_request, level="intermediate")
            db.save_chat_message(
                doc_id=doc_id, role="assistant",
                content=result.get("summary", ""),
                level="intermediate", citations=[]
            )
        except Exception as e:
            logger.warning(f"Failed to save chat history: {e}")

    return result
