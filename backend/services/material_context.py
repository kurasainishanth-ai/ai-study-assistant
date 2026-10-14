"""Shared helpers for study tools that accept one or several selected sources."""

from typing import Any, Dict, List

import db


def split_source_ids(source_ids: str) -> List[str]:
    return list(dict.fromkeys(part.strip() for part in str(source_ids or "").split(",") if part.strip()))


def load_selected_materials(source_ids: str) -> List[Dict[str, Any]]:
    ids = split_source_ids(source_ids)
    materials = [db.get_material(source_id) for source_id in ids]
    missing = [source_id for source_id, material in zip(ids, materials) if not material]
    if missing:
        raise ValueError(f"Study material '{missing[0]}' not found.")
    return [material for material in materials if material]


def combine_materials(materials: List[Dict[str, Any]], max_total_chars: int = 120000) -> Dict[str, Any]:
    """Build a labeled context so model-generated results can use every selected source."""
    ready = [
        material for material in materials
        if material.get("status", "Ready") == "Ready" and str(material.get("content") or "").strip()
    ]
    if not ready:
        raise ValueError("Selected materials have no readable content available.")
    names = [str(material.get("name") or material.get("id") or "Study material") for material in ready]
    per_source_budget = max(1000, max_total_chars // len(ready))
    sections = []
    for name, material in zip(names, ready):
        source_content = str(material.get("content") or "")
        if len(source_content) > per_source_budget:
            source_content = source_content[:per_source_budget].rstrip() + "\n[Source excerpt truncated to fit the shared context budget.]"
        sections.append(f"=== SOURCE MATERIAL: {name} ===\n{source_content}")
    content = (
        f"SELECTED SOURCE SET ({len(ready)} materials). Use information across all labeled materials; "
        "do not treat the first material as the only source. Keep each source's title attached to its evidence.\n\n"
        + "\n\n".join(sections)
    )
    return {
        "id": ",".join(str(material.get("id") or "") for material in ready),
        "name": " + ".join(names),
        "content": content,
        "status": "Ready",
        "materials": ready,
    }


def selected_context(source_ids: str, max_total_chars: int = 120000) -> Dict[str, Any]:
    return combine_materials(load_selected_materials(source_ids), max_total_chars)
