import json
from typing import Any, Dict

def parse_model_response(response_text: str, is_truncated: bool) -> Dict[str, Any]:
    if not response_text:
        raise ValueError("The model returned an empty response.")
    
    cleaned = response_text.strip()
    if cleaned.startswith("`"):
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("`"):
            cleaned = cleaned[:-3].strip()
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
            
    # Attempt straightforward parsing first
    try:
        result = json.loads(cleaned)
        return validate_response(result)
    except json.JSONDecodeError:
        pass
        
    # Resilient JSON parsing: try to find first '{' and last '}'
    start_idx = cleaned.find("{")
    end_idx = cleaned.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        sub_cleaned = cleaned[start_idx:end_idx+1]
        try:
            result = json.loads(sub_cleaned)
            return validate_response(result)
        except json.JSONDecodeError:
            pass
            
    if is_truncated:
        return {
            "output_type": "text",
            "title": "Incomplete Response",
            "summary": "The response was truncated due to length limits and could not be fully parsed. Please click 'Continue generating' below to see the rest."
        }
    else:
        raise ValueError("The response was not a valid JSON object.")

def validate_response(data: Dict[str, Any]) -> Dict[str, Any]:
    output_type = data.get("output_type")
    if output_type not in {"text", "table", "flowchart", "quiz", "pdf_document"}:
        output_type = "text"
    title = data.get("title")
    summary = data.get("summary")
    if not isinstance(title, str) or not title.strip():
        title = "Response"
    if not isinstance(summary, str):
        summary = ""
    return {
        "output_type": output_type,
        "title": title.strip(),
        "summary": summary.strip(),
        "table": data.get("table"),
        "flowchart": data.get("flowchart"),
        "quiz": data.get("quiz"),
        "pdf_document": data.get("pdf_document")
    }
