"""Content-based academic review and caption fallback for public YouTube videos."""

import json
from typing import Any, Dict, List, Optional

from google.genai import types

from config import DEFAULT_MODEL
from services.gemini_caller import call_gemini_with_retry


ANALYSIS_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "decision": {"type": "STRING", "enum": ["academic", "non_academic", "uncertain"]},
        "confidence": {"type": "NUMBER"},
        "category": {"type": "STRING"},
        "evidence": {"type": "STRING"},
        "transcript_segments": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "start_seconds": {"type": "NUMBER"},
                    "text": {"type": "STRING"},
                },
                "required": ["start_seconds", "text"],
            },
        },
        "language": {"type": "STRING"},
    },
    "required": ["decision", "confidence", "category", "evidence", "transcript_segments", "language"],
}

CONTENT_POLICY = """Judge the video's actual instructional content, not its title, creator, channel,
popularity, or metadata. Analyze the spoken audio/transcript and visual presentation across the
video. Accept substantive teaching or learning material: lectures, course lessons, subject
tutorials, worked examples, educational demonstrations, and explainers that teach concepts.
Reject content whose main purpose is entertainment, trailers, music, gaming, reaction, lifestyle,
vlogs, or general news rather than teaching, even if it mentions an academic subject. A video may
use animation, humor, or informal production and still be academic if it substantively teaches.
Do not infer a decision from the creator's reputation. If there is not enough actual video content
to decide, return uncertain. Return concise evidence describing observed content, not hidden
chain-of-thought. Use only the requested JSON fields."""


def _validate_analysis(raw: str) -> Dict[str, Any]:
    try:
        result = json.loads(raw)
    except (TypeError, json.JSONDecodeError) as exc:
        raise ValueError("Gemini returned an unreadable video assessment.") from exc
    if not isinstance(result, dict):
        raise ValueError("Gemini returned an invalid video assessment.")

    decision = str(result.get("decision", "uncertain")).strip().lower()
    if decision not in {"academic", "non_academic", "uncertain"}:
        decision = "uncertain"
    try:
        confidence = min(1.0, max(0.0, float(result.get("confidence", 0.0))))
    except (TypeError, ValueError):
        confidence = 0.0

    segments: List[Dict[str, Any]] = []
    raw_segments = result.get("transcript_segments", [])
    if isinstance(raw_segments, list):
        for item in raw_segments:
            if not isinstance(item, dict):
                continue
            text = str(item.get("text", "")).strip()
            if not text:
                continue
            try:
                seconds = max(0.0, float(item.get("start_seconds", 0.0)))
            except (TypeError, ValueError):
                continue
            segments.append({"start_seconds": seconds, "text": text})
    segments.sort(key=lambda segment: segment["start_seconds"])

    return {
        "decision": decision,
        "confidence": confidence,
        "category": str(result.get("category", "unspecified")).strip()[:120],
        "evidence": str(result.get("evidence", "")).strip()[:1200],
        "transcript_segments": segments,
        "language": str(result.get("language", "unknown")).strip()[:50] or "unknown",
    }


def _generate_assessment(contents: List[Any], prompt: str) -> Dict[str, Any]:
    raw = call_gemini_with_retry(
        contents=[*contents, types.Part(text=prompt)],
        system_instruction=CONTENT_POLICY,
        temperature=0.1,
        model=DEFAULT_MODEL,
        response_mime_type="application/json",
        response_schema=ANALYSIS_SCHEMA,
        max_output_tokens=8192,
    )
    return _validate_analysis(raw)


def analyze_youtube_video(
    video_url: str,
    title: str = "",
    include_transcript: bool = False,
) -> Dict[str, Any]:
    """Ask Gemini to inspect the public video's audiovisual content directly."""
    task = (
        "Assess whether the actual video content is academic/instructional."
        if not include_transcript
        else "Assess the actual video content. If it is academic, also return a faithful, "
             "as-complete-as-possible transcript in chronological timestamped segments. "
             "Preserve the spoken language and do not invent speech. If exact wording is "
             "unclear, mark that in the segment text rather than guessing."
    )
    prompt = (
        f"Video title for identification only (do not use it to decide): {title or 'unavailable'}\n"
        f"Task: {task}\n"
        "Return the required assessment fields. If you cannot inspect enough of the actual video, "
        "set decision to uncertain and explain the access/content limitation in evidence."
    )
    video_part = types.Part(file_data=types.FileData(file_uri=video_url))
    return _generate_assessment([video_part], prompt)


def analyze_youtube_transcript(title: str, transcript: str) -> Dict[str, Any]:
    """Use transcript speech content as the fallback when direct video review fails."""
    prompt = (
        f"Video title for identification only (do not use it to decide): {title or 'unavailable'}\n"
        "Assess the following full transcript's actual subject matter and instructional purpose. "
        "The captions are the video content evidence. Return an academic/non_academic/uncertain "
        "decision with a concise reason. Do not generate transcript segments for this request.\n\n"
        f"TRANSCRIPT START\n{transcript}\nTRANSCRIPT END"
    )
    return _generate_assessment([], prompt)
