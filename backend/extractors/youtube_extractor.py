import re
import requests
from typing import List, Dict, Any, Optional
from youtube_transcript_api import YouTubeTranscriptApi
from services.youtube_video_analyzer import analyze_youtube_transcript, analyze_youtube_video


ACADEMIC_ONLY_MESSAGE = "Gemini determined that this video is not primarily academic or instructional."
UNCERTAIN_CONTENT_MESSAGE = "Gemini could not confidently verify that this video is academic from its content."


def _snippet_value(snippet: Any, key: str, default: Any = None) -> Any:
    """Read both legacy dict snippets and current dataclass snippets."""
    if isinstance(snippet, dict):
        return snippet[key] if key in snippet else default
    return getattr(snippet, key, default)


def _transcript_error_message(error: Exception, video_id: str) -> str:
    """Map transcript library errors to their actual user-facing cause."""
    error_type = type(error).__name__
    if error_type in {"RequestBlocked", "IpBlocked"}:
        return "YouTube temporarily blocked transcript requests from this network. Try again later or from another network."
    if error_type == "TranscriptsDisabled":
        return "Captions are disabled for this video, so a transcript is not available."
    if error_type == "NoTranscriptFound":
        return "YouTube has no captions in a language this app can use for this video."
    if error_type in {"VideoUnavailable", "VideoUnplayable", "AgeRestricted"}:
        return f"YouTube does not allow this video to be read here ({error_type})."
    return f"Could not retrieve captions for video {video_id} ({error_type}): {error}"


def _read_captions(video_id: str, target_langs: List[str]):
    """Return one usable caption track; don't make eligibility decisions here."""
    transcript_list = YouTubeTranscriptApi().list(video_id)
    chosen_transcript = None
    try:
        chosen_transcript = transcript_list.find_transcript(target_langs)
    except Exception:
        # An English track isn't required; retain the original speech language.
        for transcript in transcript_list:
            if not transcript.is_generated:
                chosen_transcript = transcript
                break
        if chosen_transcript is None:
            for transcript in transcript_list:
                chosen_transcript = transcript
                break
    if chosen_transcript is None:
        raise RuntimeError("YouTube returned no caption tracks for this video.")
    return chosen_transcript, chosen_transcript.fetch()


def _caption_segments(raw_snippets: Any) -> List[Dict[str, Any]]:
    segments = []
    for snippet in raw_snippets:
        text = str(_snippet_value(snippet, "text", "") or "").strip()
        if not text:
            continue
        start = max(0.0, float(_snippet_value(snippet, "start", 0.0) or 0.0))
        segments.append({"timestamp": format_seconds(start), "seconds": int(start), "text": text})
    return segments


def _gemini_segments(raw_segments: Any) -> List[Dict[str, Any]]:
    segments = []
    if not isinstance(raw_segments, list):
        return segments
    for segment in raw_segments:
        if not isinstance(segment, dict):
            continue
        text = str(segment.get("text", "")).strip()
        if not text:
            continue
        try:
            seconds = max(0.0, float(segment.get("start_seconds", 0.0)))
        except (TypeError, ValueError):
            continue
        segments.append({"timestamp": format_seconds(seconds), "seconds": int(seconds), "text": text})
    return sorted(segments, key=lambda item: item["seconds"])


def _render_segments(segments: List[Dict[str, Any]]) -> str:
    return "\n\n".join(f"[{segment['timestamp']}] {segment['text']}" for segment in segments)


def _academic_decision(analysis: Dict[str, Any]) -> None:
    if analysis["decision"] == "non_academic":
        reason = analysis.get("evidence") or analysis.get("category") or "the content is not instructional"
        raise ValueError(f"{ACADEMIC_ONLY_MESSAGE} Gemini's assessment: {reason}")
    if analysis["decision"] != "academic":
        reason = analysis.get("evidence") or "there was not enough accessible instructional content"
        raise ValueError(f"{UNCERTAIN_CONTENT_MESSAGE} Gemini's assessment: {reason}")

def extract_youtube_id(url_or_id: str) -> Optional[str]:
    """
    Extracts the 11-character YouTube video ID from various URL formats or raw ID.
    Supports:
      - https://www.youtube.com/watch?v=VIDEO_ID
      - https://youtu.be/VIDEO_ID
      - https://www.youtube.com/embed/VIDEO_ID
      - https://www.youtube.com/v/VIDEO_ID
      - https://www.youtube.com/shorts/VIDEO_ID
      - https://www.youtube.com/live/VIDEO_ID
      - https://m.youtube.com/watch?v=VIDEO_ID
      - Raw 11-char ID
    """
    if not url_or_id:
        return None
    url_or_id = url_or_id.strip()

    # Raw 11-character video ID
    if re.fullmatch(r"[0-9A-Za-z_-]{11}", url_or_id):
        return url_or_id

    patterns = [
        r"(?:v=|\/vi\/|embed\/|shorts\/|live\/)([0-9A-Za-z_-]{11})",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
        r"(?:watch\?.*v=)([0-9A-Za-z_-]{11})",
        r"(?:v%3D)([0-9A-Za-z_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url_or_id)
        if m:
            return m.group(1)
    return None


def format_seconds(seconds: float) -> str:
    """Formats seconds into [MM:SS] or [HH:MM:SS]."""
    total_secs = int(round(seconds))
    hrs = total_secs // 3600
    mins = (total_secs % 3600) // 60
    secs = total_secs % 60
    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"


def get_youtube_metadata(video_id: str) -> Dict[str, Any]:
    """Retrieves title, author, and thumbnail via YouTube oEmbed."""
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    metadata = {
        "title": f"YouTube Video ({video_id})",
        "author": "YouTube Creator",
        "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
        "video_url": video_url,
    }
    try:
        resp = requests.get(
            f"https://www.youtube.com/oembed?url={video_url}&format=json",
            timeout=6,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        )
        if resp.status_code == 200:
            data = resp.json()
            metadata["title"] = data.get("title") or metadata["title"]
            metadata["author"] = data.get("author_name") or metadata["author"]
            metadata["thumbnail_url"] = data.get("thumbnail_url") or metadata["thumbnail_url"]
    except Exception:
        pass
    return metadata


def extract_youtube_content(url_or_id: str, languages: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Ingests a YouTube video and extracts high-fidelity timestamped transcriptions.
    Returns structured content ready for grounding, adaptive quizzes, and citations.
    """
    video_id = extract_youtube_id(url_or_id)
    if not video_id:
        raise ValueError(f"Invalid YouTube URL or video ID: '{url_or_id}'")

    metadata = get_youtube_metadata(video_id)
    title = metadata["title"]
    author = metadata["author"]
    thumbnail_url = metadata["thumbnail_url"]
    video_url = metadata["video_url"]
    target_langs = languages or ["en", "en-US", "en-GB", "hi"]

    chosen_transcript = None
    caption_error = None
    caption_segments: List[Dict[str, Any]] = []
    raw_snippets = None
    try:
        chosen_transcript, raw_snippets = _read_captions(video_id, target_langs)
        caption_segments = _caption_segments(raw_snippets)
        if not caption_segments:
            raise RuntimeError("YouTube returned an empty or unreadable caption track.")
    except Exception as error:
        caption_error = error

    transcript_text = "\n".join(segment["text"] for segment in caption_segments)
    analysis = None
    video_analysis_error = None
    try:
        analysis = analyze_youtube_video(
            video_url,
            title=title,
            include_transcript=not bool(caption_segments),
        )
    except Exception as error:
        video_analysis_error = error

    # Direct video understanding evaluates speech and visuals. If Gemini cannot
    # access the URL or cannot decide, use the retrieved speech as content evidence.
    if caption_segments and (
        analysis is None or analysis.get("decision") == "uncertain"
    ):
        try:
            analysis = analyze_youtube_transcript(title, transcript_text)
        except Exception as transcript_analysis_error:
            raise ValueError(
                "Gemini could not review the video's content. "
                f"Video review: {video_analysis_error or 'inconclusive'}. "
                f"Caption review: {transcript_analysis_error}"
            ) from transcript_analysis_error

    if analysis is None:
        caption_details = (
            _transcript_error_message(caption_error, video_id)
            if caption_error else "YouTube returned no usable captions."
        )
        raise ValueError(
            "Gemini could not inspect this YouTube video, and caption retrieval also failed. "
            f"Video review: {video_analysis_error}. Captions: {caption_details}"
        ) from video_analysis_error

    _academic_decision(analysis)

    transcript_source = "youtube_captions"
    segments = caption_segments
    if not segments:
        segments = _gemini_segments(analysis.get("transcript_segments"))
        transcript_source = "gemini_video_analysis"
        if not segments:
            caption_details = (
                _transcript_error_message(caption_error, video_id)
                if caption_error else "YouTube returned no usable captions."
            )
            raise ValueError(
                "Gemini verified the video as academic but could not produce timestamped study text. "
                f"Caption retrieval: {caption_details}"
            )

    last_segment = segments[-1]
    if transcript_source == "youtube_captions" and raw_snippets:
        last_snippet = raw_snippets[-1]
        last_start = float(_snippet_value(last_snippet, "start", 0.0) or 0.0)
        last_duration = float(_snippet_value(last_snippet, "duration", 0.0) or 0.0)
        total_seconds = last_start + last_duration
    else:
        total_seconds = last_segment["seconds"] + 30.0
    total_seconds = max(0.0, total_seconds)
    formatted_total_duration = format_seconds(total_seconds)

    source_label = "YouTube captions" if transcript_source == "youtube_captions" else "Gemini video transcription"
    header = (
        f"=== ACADEMIC YOUTUBE VIDEO: {title} ===\n"
        f"Channel: {author}\n"
        f"Video URL: {video_url}\n"
        f"Content review: {analysis.get('category', 'academic instruction')} "
        f"(confidence {analysis.get('confidence', 0.0):.0%})\n"
        f"Content evidence: {analysis.get('evidence', 'Gemini verified instructional content')}\n"
        f"Transcript source: {source_label}\n"
        f"Duration: {formatted_total_duration}\n"
        f"Timestamped sections: {len(segments)}\n\n"
    )
    full_content = header + _render_segments(segments)

    return {
        "type": "youtube",
        "youtube_id": video_id,
        "video_url": video_url,
        "title": title,
        "author": author,
        "thumbnail_url": thumbnail_url,
        "duration_seconds": int(total_seconds),
        "duration_formatted": formatted_total_duration,
        "total_units": len(segments),
        "unit_name": "timestamps",
        "segments": segments,
        "content": full_content,
        "file_name": f"{title} (YouTube)",
        "language": (
            getattr(chosen_transcript, "language", None)
            if transcript_source == "youtube_captions" else analysis.get("language", "unknown")
        ) or "unknown",
        "academic_context_validated": True,
        "academic_context_category": analysis.get("category", "academic instruction"),
        "academic_context_confidence": analysis.get("confidence", 0.0),
        "academic_context_evidence": analysis.get("evidence", ""),
        "transcript_source": transcript_source,
    }
