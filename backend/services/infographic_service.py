"""
infographic_service.py — feature/yagnesh

Generates structured, visual study infographics from uploaded study materials.
Grounded strictly in the document content using Google Gemini.
Supports:
  1. Concept Overview
  2. Topic Summary
  3. Process / Workflow
  4. Comparison
  5. Exam Revision
  6. Timeline
  7. Step-by-Step
"""

import json
import logging
import re
from typing import Dict, Any, Optional

import db
from services.gemini_caller import call_gemini_with_retry

logger = logging.getLogger("studyverse.infographic")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(levelname)s] [%(name)s] %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

DOC_CONTEXT_LIMIT = 20_000

INFOGRAPHIC_TYPES = {
    "concept_overview": {
        "title": "Concept Overview",
        "description": "Visual breakdown of core concepts, definitions, and relationships",
        "focus": "Focus on high-level architecture, primary definitions, and structural connections."
    },
    "topic_summary": {
        "title": "Topic Summary",
        "description": "Comprehensive visual digest of key ideas and formulas",
        "focus": "Summarize major themes, key definitions, and essential properties."
    },
    "process_flow": {
        "title": "Process / Workflow",
        "description": "Sequential flow of steps, algorithms, operations, or lifecycles",
        "focus": "Emphasize sequential order, inputs/outputs, conditions, and transitions between stages."
    },
    "comparison": {
        "title": "Comparison",
        "description": "Side-by-side comparison of contrasting concepts, mechanisms, or trade-offs",
        "focus": "Contrast differences, operational trade-offs, advantages/disadvantages, and use cases."
    },
    "exam_revision": {
        "title": "Exam Revision",
        "description": "High-yield revision sheet with pitfalls, traps, and exam takeaways",
        "focus": "Emphasize high-frequency exam questions, critical definitions, common student errors, and key formulas."
    },
    "timeline": {
        "title": "Timeline",
        "description": "Chronological progression of phases, history, or development stages",
        "focus": "Arrange milestones, events, or developmental phases sequentially with context."
    },
    "step_by_step": {
        "title": "Step-by-Step Guide",
        "description": "Numbered operational procedure or execution walkthrough",
        "focus": "Provide concrete step-by-step instructions or derivations with checkpoints."
    },
}

SYSTEM_INSTRUCTION = (
    "You are an expert academic visual information designer for StudyVerse. "
    "Your mission is to analyze study material and generate a dense, rigorous, and visually organized "
    "JSON infographic payload.\n\n"
    "STRICT GROUNDING RULES:\n"
    "1. Rely ONLY on the provided study material. Never hallucinate terms, facts, or citations.\n"
    "2. If citations like [Page X], [Slide Y], or [Section Z] appear in the source, cite them in source_ref.\n"
    "3. Never fabricate page numbers. If no page marker is present in text, leave source_ref as null.\n"
    "4. Return ONLY a single raw JSON object without markdown code fences."
)


def _build_prompt(doc_content: str, doc_name: str, inf_type: str, type_meta: dict) -> str:
    snippet = doc_content[:DOC_CONTEXT_LIMIT]

    return f"""STUDY MATERIAL (Source: "{doc_name}"):
{snippet}

TASK:
Generate a structured JSON infographic of type "{type_meta['title']}".
{type_meta['focus']}

Return a strictly valid JSON object adhering to this schema:
{{
  "title": "Accurate, descriptive title reflecting document content",
  "subtitle": "Informative subtitle capturing the scope",
  "type": "{inf_type}",
  "type_title": "{type_meta['title']}",
  "doc_name": "{doc_name}",
  "summary": "2-3 sentence executive synopsis of the topic based strictly on the material",
  "sections": [
    {{
      "heading": "Section Heading",
      "icon": "one of: concept, workflow, compare, exam, timeline, step, key",
      "color": "one of: emerald, sky, purple, amber, rose, indigo",
      "items": [
        {{
          "label": "Concept or Subtopic Name",
          "content": "Precise explanation, definition, or detail (1-3 sentences)",
          "source_ref": "Page or Slide reference if explicitly marked in text, otherwise null"
        }}
      ]
    }}
  ],
  "flow_steps": [
    {{
      "step_number": 1,
      "title": "Stage or Step Title",
      "description": "Concise description of what occurs at this stage",
      "source_ref": "e.g. Slide 12 or null"
    }}
  ],
  "comparison_matrix": {{
    "headers": ["Feature / Dimension", "Option A", "Option B"],
    "rows": [
      ["Criteria 1", "Value A", "Value B"],
      ["Criteria 2", "Value A", "Value B"]
    ]
  }},
  "key_takeaways": [
    "High-impact takeaway directly supported by source",
    "Another critical insight"
  ],
  "exam_tips": [
    "Exam tip or pitfall to avoid"
  ],
  "source_refs": ["List of unique citations found in source text, e.g. Slide 4, Slide 7"]
}}

Instructions:
- Provide 3-5 rich sections with 2-4 items each.
- For process_flow, step_by_step, and timeline: ensure flow_steps has 3-6 meaningful steps.
- For comparison: populate comparison_matrix with 3-6 comparative rows contrasting primary concepts in the text.
- If comparison or flow_steps are not applicable for this style, they can be empty arrays/null.
- Output ONLY valid JSON."""


def generate_infographic(doc_id: str, infographic_type: str = "concept_overview") -> Dict[str, Any]:
    """
    Analyzes document text and returns a structured infographic data payload.
    """
    if infographic_type not in INFOGRAPHIC_TYPES:
        infographic_type = "concept_overview"

    # Support comma-separated IDs (multi-source workspace)
    doc_ids = [d.strip() for d in doc_id.split(",") if d.strip()]
    first_id = doc_ids[0] if doc_ids else doc_id

    materials = []
    combined_content = []
    for d_id in doc_ids:
        mat = db.get_material(d_id)
        if mat and mat.get("content"):
            materials.append(mat)
            combined_content.append(f"--- Document: {mat.get('name', 'Material')} ---\n" + mat.get("content", ""))

    if not materials:
        raise ValueError(f"Study material '{doc_id}' not found or has no readable text.")

    doc_name = " & ".join(m.get("name", "Document") for m in materials[:2])
    if len(materials) > 2:
        doc_name += f" (+{len(materials)-2} more)"

    content_str = "\n\n".join(combined_content).strip()
    if not content_str:
        raise ValueError("Selected material contains no readable text content.")

    type_meta = INFOGRAPHIC_TYPES[infographic_type]
    logger.info(f"[Infographic] Generating '{infographic_type}' for {len(materials)} doc(s), {len(content_str)} chars.")

    prompt = _build_prompt(content_str, doc_name, infographic_type, type_meta)

    raw_response = call_gemini_with_retry(
        contents=[prompt],
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.2,
    )

    # Clean code fences if present
    cleaned = raw_response.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
    except Exception as e:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(0))
            except Exception:
                raise ValueError(f"Failed to parse AI response into structured JSON: {str(e)[:150]}")
        else:
            raise ValueError(f"AI response did not contain valid JSON: {str(e)[:150]}")

    # Ensure required root keys
    data.setdefault("title", f"{type_meta['title']} — {doc_name}")
    data.setdefault("type", infographic_type)
    data.setdefault("type_title", type_meta["title"])
    data.setdefault("doc_name", doc_name)
    data.setdefault("sections", [])
    data.setdefault("key_takeaways", [])
    data.setdefault("exam_tips", [])
    data.setdefault("source_refs", [])

    # Persist in SQLite
    try:
        db.save_infographic(first_id, infographic_type, data)
    except Exception as db_err:
        logger.warning(f"[Infographic] Could not cache to database: {db_err}")

    return {
        "doc_id": doc_id,
        "type": infographic_type,
        "data": data
    }
