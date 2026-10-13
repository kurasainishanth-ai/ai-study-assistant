import re
import requests
from typing import List, Dict, Any, Optional
from youtube_transcript_api import YouTubeTranscriptApi


ACADEMIC_SUBJECT_HINTS = (
    "operating system", "interprocess communication", "process scheduling", "semaphore",
    "deadlock", "memory management", "computer network", "database", "data structure",
    "algorithm", "discrete mathematics", "linear algebra", "differential equation",
    "organic chemistry", "electromagnetism", "thermodynamics", "cell biology",
    "mathematics", "math", "algebra", "calculus", "equation", "geometry", "statistics",
    "physics", "chemistry", "biology", "anatomy", "neuroscience", "medicine",
    "computer science", "programming", "coding", "engineering", "economics", "history",
    "geography", "literature", "grammar", "linguistics", "philosophy", "psychology",
    "sociology", "political science", "climate science", "quantum", "neural network",
    "artificial intelligence", "machine learning", "deep learning", "research methods", "data science",
    "evolution", "fibonacci", "cryptography", "black hole",
)
ACADEMIC_INTENT_HINTS = (
    "lecture", "lesson", "tutorial", "course", "class", "chapter", "unit ", "topic",
    "how to", "how does", "how do", "what is", "why does", "why do", "introduction",
    "fundamentals", "explained", "explanation", "concept", "worked example", "problem solving",
    "exam prep", "revision", "curriculum", "syllabus", "principles of",
)
NON_ACADEMIC_FORMAT_HINTS = (
    "official trailer", "movie trailer", "film trailer", "teaser trailer", "official teaser",
    "full movie", "full film", "official music video", "music video", "official audio",
    "official song", "soundtrack", "live performance", "gameplay", "playthrough",
    "let's play", "lets play", "gaming stream", "reaction video", "reacts to",
    "prank video", "daily vlog", "vlog", "sports highlights", "movie review",
    "marvel", "avengers",
    "doomsday", "superhero", "cinematic universe", "box office",
)
ACADEMIC_ONLY_MESSAGE = (
    "This video does not appear to be academic or instructional. StudyVerse only accepts "
    "course material such as lectures, lessons, tutorials, and subject-focused explainers."
)


def is_academic_context(title: str, author: str = "") -> bool:
    """Classify from title signals only; author remains for API compatibility."""
    normalized_title = " ".join((title or "").casefold().split())
    if not normalized_title or normalized_title.startswith("youtube video ("):
        return False
    if any(hint in normalized_title for hint in NON_ACADEMIC_FORMAT_HINTS):
        return False
    has_subject = any(hint in normalized_title for hint in ACADEMIC_SUBJECT_HINTS)
    has_instructional_intent = any(hint in normalized_title for hint in ACADEMIC_INTENT_HINTS)
    has_specific_topic = any(hint in normalized_title for hint in (
        "operating system", "interprocess communication", "process scheduling", "semaphore",
        "deadlock", "memory management", "computer network", "database", "data structure",
        "algorithm", "discrete mathematics", "linear algebra", "differential equation",
        "organic chemistry", "electromagnetism", "thermodynamics", "cell biology",
        "evolution", "fibonacci", "cryptography", "black hole",
    ))
    # Known course concepts can stand alone (e.g. "Interprocess Communication").
    # Broad subject labels require an instructional cue. Creator identity is ignored.
    return has_specific_topic or (has_subject and has_instructional_intent)


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

    # Reject entertainment and ambiguous videos before requesting captions.
    if not is_academic_context(title, author):
        raise ValueError(ACADEMIC_ONLY_MESSAGE)

    target_langs = languages or ["en", "en-US", "en-GB", "hi"]

    try:
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)

        # Try to find transcript matching target languages
        chosen_transcript = None
        try:
            chosen_transcript = transcript_list.find_transcript(target_langs)
        except Exception:
            # Fallback: find any manually created or generated transcript
            for t in transcript_list:
                if not t.is_generated:
                    chosen_transcript = t
                    break
            if not chosen_transcript:
                for t in transcript_list:
                    chosen_transcript = t
                    break

        if not chosen_transcript:
            raise ValueError(f"No transcripts/captions available for video '{video_id}'.")

        raw_snippets = chosen_transcript.fetch()
    except Exception as e:
        raise ValueError(_transcript_error_message(e, video_id)) from e

    if not raw_snippets:
        raise ValueError(f"Transcript for YouTube video '{video_id}' is empty.")

    # Group transcript snippets into coherent paragraphs with timestamps
    # Grouping rule: start a new chunk every 35-45 seconds or after ~60 words
    chunks = []
    current_chunk_snippets = []
    current_chunk_start = 0.0
    current_chunk_word_count = 0

    for snippet in raw_snippets:
        text = str(_snippet_value(snippet, "text", "") or "").strip()
        start = float(_snippet_value(snippet, "start", 0.0) or 0.0)
        duration = float(_snippet_value(snippet, "duration", 0.0) or 0.0)

        if not text:
            continue

        words = len(text.split())

        if not current_chunk_snippets:
            current_chunk_start = start
            current_chunk_snippets.append(text)
            current_chunk_word_count = words
        else:
            time_diff = start - current_chunk_start
            if time_diff >= 35.0 or current_chunk_word_count >= 50:
                # Save previous chunk
                ts_str = format_seconds(current_chunk_start)
                chunk_body = " ".join(current_chunk_snippets)
                chunks.append({
                    "timestamp": ts_str,
                    "seconds": int(current_chunk_start),
                    "text": chunk_body
                })
                # Start new chunk
                current_chunk_start = start
                current_chunk_snippets = [text]
                current_chunk_word_count = words
            else:
                current_chunk_snippets.append(text)
                current_chunk_word_count += words

    # Add trailing chunk
    if current_chunk_snippets:
        ts_str = format_seconds(current_chunk_start)
        chunks.append({
            "timestamp": ts_str,
            "seconds": int(current_chunk_start),
            "text": " ".join(current_chunk_snippets)
        })

    # Calculate total duration
    last_snippet = raw_snippets[-1]
    last_start = float(_snippet_value(last_snippet, "start", 0.0) or 0.0)
    last_dur = float(_snippet_value(last_snippet, "duration", 0.0) or 0.0)
    total_seconds = last_start + last_dur
    formatted_total_duration = format_seconds(total_seconds)

    # Format full grounded text
    header = (
        f"=== YOUTUBE LECTURE: {title} ===\n"
        f"Channel: {author}\n"
        f"Video URL: {video_url}\n"
        f"Total Duration: {formatted_total_duration}\n"
        f"Timestamped Transcript Units: {len(chunks)} sections\n\n"
    )
    formatted_body_lines = []
    for c in chunks:
        formatted_body_lines.append(f"[{c['timestamp']}] {c['text']}")

    full_content = header + "\n\n".join(formatted_body_lines)

    return {
        "type": "youtube",
        "youtube_id": video_id,
        "video_url": video_url,
        "title": title,
        "author": author,
        "thumbnail_url": thumbnail_url,
        "duration_seconds": int(total_seconds),
        "duration_formatted": formatted_total_duration,
        "total_units": len(chunks),
        "unit_name": "timestamps",
        "segments": chunks,
        "content": full_content,
        "file_name": f"{title} (YouTube)",
        "language": chosen_transcript.language if hasattr(chosen_transcript, "language") else "en",
        "academic_context_validated": True,
    }
