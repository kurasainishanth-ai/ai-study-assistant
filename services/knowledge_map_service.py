import json
import re
from typing import List, Dict, Any, Optional
from google.genai import types
from config import get_gemini_client, DEFAULT_MODEL
import db

def generate_knowledge_map(doc_id: str) -> Dict[str, Any]:
    """
    Extracts authentic topic nodes and prerequisite relationships strictly grounded in the document.
    Correlates with student quiz attempts to flag topics needing revision.
    """
    material = db.get_material(doc_id)
    if not material:
        raise ValueError(f"Study material with ID '{doc_id}' not found.")
        
    doc_content = material.get("content", "")
    if not doc_content.strip():
        return {"nodes": [], "edges": [], "empty_reason": "No readable text content found."}

    # Fetch real quiz attempt data to identify weak topics
    attempts = db.get_quiz_attempts(doc_id)
    weak_topics = set()
    for a in attempts:
        for topic, stat in a.get("topic_breakdown", {}).items():
            if isinstance(stat, dict):
                correct = stat.get("correct", 0)
                tot = stat.get("total", 1)
                if (correct / tot) < 0.7:
                    weak_topics.add(topic.lower())

    system_instruction = (
        "You are an expert cognitive curriculum architect. Extract a structured knowledge map from the study material. "
        "Strictly adhere to what is mentioned in the text; do NOT invent outside concepts or ungrounded dependencies. "
        "Return ONLY a JSON object with this exact schema:\n"
        "{\n"
        '  "nodes": [\n'
        '    {"id": "node_1", "label": "Topic Name", "category": "core | foundation | advanced", "summary": "1 sentence overview", "source_ref": "Page X"}\n'
        "  ],\n"
        '  "edges": [\n'
        '    {"source": "node_1", "target": "node_2", "relationship": "prerequisite | component_of | leads_to"}\n'
        "  ]\n"
        "}\n"
        "Return pure JSON only without markdown formatting."
    )

    prompt = (
        f"STUDY MATERIAL (Source: '{material['name']}'):\n"
        f"{doc_content[:15000]}\n\n"
        "TASK: Extract 5 to 10 key topic nodes and logical conceptual edges connecting them."
    )

    try:
        from services.gemini_caller import call_gemini_with_retry
        raw_text = call_gemini_with_retry(
            contents=[prompt],
            system_instruction=system_instruction,
            temperature=0.2
        ).strip()
        raw_text = re.sub(r"^```(?:json)?", "", raw_text).strip()
        raw_text = re.sub(r"```$", "", raw_text).strip()
        graph_data = json.loads(raw_text)
    except Exception:
        # Fallback to structural heading extraction if model fails
        lines = doc_content.splitlines()
        headings = [line.strip("# -*").strip() for line in lines if line.startswith(("#", "##", "--- [Page", "--- [Slide"))][:8]
        nodes = []
        edges = []
        for i, h in enumerate(headings):
            nid = f"node_{i+1}"
            nodes.append({"id": nid, "label": h, "category": "core", "summary": f"Key section in {material['name']}", "source_ref": f"Part {i+1}"})
            if i > 0:
                edges.append({"source": f"node_{i}", "target": nid, "relationship": "leads_to"})
        graph_data = {"nodes": nodes, "edges": edges}

    # Annotate nodes with review status based on genuine student quiz attempts
    for node in graph_data.get("nodes", []):
        label_lower = node.get("label", "").lower()
        if any(w in label_lower for w in weak_topics):
            node["needs_revision"] = True
            node["status_badge"] = "Review Needed (<70% Quiz Score)"
        else:
            node["needs_revision"] = False
            node["status_badge"] = "Good Standing"

    return graph_data
