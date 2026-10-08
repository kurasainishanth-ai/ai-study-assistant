import json
import re
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)

VALID_OUTPUT_TYPES = {"text", "table", "flowchart", "quiz", "flashcard", "pdf_document"}


def _strip_markdown_fences(text: str) -> str:
    """Remove markdown code fences (```json ... ```) wrapping JSON."""
    text = text.strip()
    if text.startswith("```"):
        first_nl = text.find("\n")
        if first_nl != -1:
            text = text[first_nl + 1:]
        else:
            text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


# LaTeX commands whose first letter collides with a JSON escape character.
# \n -> newline, \t -> tab, \b -> backspace, \r -> carriage return, \f -> form feed
# We must fix these BEFORE json.loads, because json.loads silently converts
# \nabla to newline+abla, \theta to tab+heta, etc.
_LATEX_COLLISION_PATTERNS = [
    # \n + abla/eq/ot/otin/i/u/... -> \\n...
    (r'\\n(?=abla|eq|ot(?:in)?|i[^"]|u[^"0-9a-fA-F]|ewline|ormalsize|cap|cup|pm)',
     r'\\\\n'),
    # \t + heta/imes/ilde/an/au/ext/riangle -> \\t...
    (r'\\t(?=heta|imes|ilde|an[^"\\]|au|ext|riangle)',
     r'\\\\t'),
    # \b + eta/ar/f/egin/oldsymbol/ig/inom/oxed -> \\b...
    (r'\\b(?=eta|ar[^"\\]|egin|oldsymbol|ig[^"\\]|inom|oxed)',
     r'\\\\b'),
    # \r + ightarrow/ho/angle/ight -> \\r...
    (r'\\r(?=ightarrow|ho[^"\\]|angle|ight|m[^"\\])',
     r'\\\\r'),
    # \f + rac/orall/lat -> \\f...
    (r'\\f(?=rac|orall|lat)',
     r'\\\\f'),
]


def _fix_latex_collisions(text: str) -> str:
    """Fix LaTeX commands that collide with valid JSON escape sequences."""
    result = text
    for pattern, replacement in _LATEX_COLLISION_PATTERNS:
        result = re.sub(pattern, replacement, result)
    return result


def _fix_json_backslashes(text: str) -> str:
    r"""Fix unescaped backslashes (common in LaTeX like \alpha, \sum) for valid JSON.
    
    JSON only allows: \" \\ \/ \b \f \n \r \t \uXXXX
    Any other \X sequence is invalid. We double-escape those.
    """
    return re.sub(r'\\(?!["\\bfnrtu/])', r'\\\\', text)


def _try_parse_json(text: str) -> dict:
    """Try parsing JSON, with progressive backslash repair on failure."""
    # Step 1: Fix LaTeX/JSON escape collisions first (\\nabla -> \\\\nabla etc.)
    # This prevents json.loads from silently eating LaTeX as control chars.
    safe_text = _fix_latex_collisions(text)
    
    # Step 2: Try direct parse (works if Gemini properly double-escaped)
    try:
        return json.loads(safe_text)
    except json.JSONDecodeError:
        pass
    
    # Step 3: Fix remaining invalid backslashes (e.g. \alpha -> \\alpha)
    fixed = _fix_json_backslashes(safe_text)
    try:
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass
    
    # Step 4: Extract JSON substring between first { and last }
    for candidate_text in [safe_text, text]:
        start = candidate_text.find("{")
        end = candidate_text.rfind("}")
        if start != -1 and end > start:
            substr = candidate_text[start:end + 1]
            substr_safe = _fix_latex_collisions(substr)
            for attempt in [substr_safe, _fix_json_backslashes(substr_safe)]:
                try:
                    return json.loads(attempt)
                except json.JSONDecodeError:
                    pass
    
    return None


def parse_model_response(response_text: str, is_truncated: bool) -> Dict[str, Any]:
    """Parse the model's JSON response text into a validated dictionary."""
    if not response_text or not response_text.strip():
        if is_truncated:
            return _truncated_fallback()
        raise ValueError("The model returned an empty response.")
    
    cleaned = _strip_markdown_fences(response_text)
    result = _try_parse_json(cleaned)
    
    if result is not None and isinstance(result, dict):
        return validate_response(result)
    
    if is_truncated:
        return _truncated_fallback()
    
    logger.warning(f"Failed to parse model response as JSON. First 500 chars: {cleaned[:500]}")
    raise ValueError("The model response could not be parsed as valid JSON.")


def _truncated_fallback() -> Dict[str, Any]:
    return {
        "output_type": "text",
        "title": "Incomplete Response",
        "summary": "The response was truncated due to length limits. Please try a shorter or more specific question.",
        "table": None,
        "flowchart": None,
        "quiz": None,
        "flashcard": None,
        "pdf_document": None
    }


def validate_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize and validate the parsed response dictionary."""
    output_type = data.get("output_type", "text")
    if output_type not in VALID_OUTPUT_TYPES:
        output_type = "text"
    
    title = data.get("title")
    if not isinstance(title, str) or not title.strip():
        title = "Response"
    
    summary = data.get("summary")
    if not isinstance(summary, str):
        summary = ""
    
    return {
        "output_type": output_type,
        "title": title.strip(),
        "summary": summary.strip(),
        "table": data.get("table"),
        "flowchart": data.get("flowchart"),
        "quiz": data.get("quiz"),
        "flashcard": data.get("flashcard"),
        "pdf_document": data.get("pdf_document")
    }