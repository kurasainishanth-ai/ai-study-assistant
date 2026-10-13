import re
import requests
from typing import List, Dict, Any, Optional
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    VideoUnplayable,
    YouTubeTranscriptApiException,
)

def _clean_youtube_error(err_str: str) -> str:
    """Strips boilerplate GitHub issue instructions from youtube_transcript_api error strings."""
    lines = [
        line.strip()
        for line in err_str.splitlines()
        if line.strip()
        and not line.strip().startswith("If you are sure")
        and not line.strip().startswith("Could not retrieve a transcript for the video")
        and "https://github.com/jdepoix" not in line
    ]
    return " - ".join(lines) if lines else err_str.strip()


def _extract_snippet_data(snippet: Any) -> tuple[str, float, float]:
    """
    Safely extracts (text, start, duration) from either a dictionary or
    a snippet object (like FetchedTranscriptSnippet) without crashing on .get().
    """
    if isinstance(snippet, dict):
        raw_text = snippet.get("text")
        raw_start = snippet.get("start")
        raw_duration = snippet.get("duration")
    else:
        raw_text = getattr(snippet, "text", None)
        raw_start = getattr(snippet, "start", None)
        raw_duration = getattr(snippet, "duration", None)

    if raw_text is None and hasattr(snippet, "get"):
        try:
            raw_text = snippet.get("text")
            raw_start = snippet.get("start")
            raw_duration = snippet.get("duration")
        except Exception:
            pass

    text = str(raw_text or "").strip()
    try:
        start = float(raw_start) if raw_start is not None else 0.0
    except (ValueError, TypeError):
        start = 0.0

    try:
        duration = float(raw_duration) if raw_duration is not None else 0.0
    except (ValueError, TypeError):
        duration = 0.0

    return text, max(0.0, start), max(0.0, duration)


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
                if not getattr(t, "is_generated", False):
                    chosen_transcript = t
                    break
            if not chosen_transcript:
                for t in transcript_list:
                    chosen_transcript = t
                    break

        if not chosen_transcript:
            raise ValueError(f"No transcripts/captions available for video '{video_id}'.")

        raw_snippets = chosen_transcript.fetch()
    except TranscriptsDisabled:
        raise ValueError(f"Subtitles/transcripts are disabled for YouTube video '{video_id}'.")
    except NoTranscriptFound:
        raise ValueError(
            f"No transcripts found for YouTube video '{video_id}' in supported languages."
        )
    except VideoUnavailable:
        raise ValueError(
            f"YouTube video '{video_id}' is unavailable, private, or has been removed."
        )
    except VideoUnplayable:
        raise ValueError(
            f"YouTube video '{video_id}' is unplayable or restricted."
        )
    except YouTubeTranscriptApiException as e:
        clean_msg = _clean_youtube_error(str(e))
        raise ValueError(
            f"Could not retrieve transcript for YouTube video ({video_id}): {clean_msg}"
        )
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(
            f"Could not retrieve transcript for YouTube video ({video_id}): {str(e)}. "
            "Please ensure the video has English, Hindi, or auto-generated captions enabled."
        )

    if not raw_snippets:
        raise ValueError(f"Transcript for YouTube video '{video_id}' is empty.")

    # Convert FetchedTranscript to list of dicts if supported, while snippet extractor handles both
    if hasattr(raw_snippets, "to_raw_data") and callable(raw_snippets.to_raw_data):
        try:
            raw_snippets = raw_snippets.to_raw_data()
        except Exception:
            pass

    # Group transcript snippets into coherent paragraphs with timestamps
    # Grouping rule: start a new chunk every 35-45 seconds or after ~60 words
    chunks = []
    current_chunk_snippets = []
    current_chunk_start = 0.0
    current_chunk_word_count = 0

    for snippet in raw_snippets:
        text, start, duration = _extract_snippet_data(snippet)

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

    if not chunks:
        raise ValueError(f"No readable speech or text found in transcript for YouTube video '{video_id}'.")

    # Calculate total duration
    last_snippet = raw_snippets[-1]
    _, last_start, last_dur = _extract_snippet_data(last_snippet)
    total_seconds = max(0.0, last_start + last_dur)
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
        "language": getattr(chosen_transcript, "language", None) or getattr(chosen_transcript, "language_code", None) or "en",
    }
