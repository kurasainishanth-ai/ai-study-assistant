import time
import re
import random
import logging
from typing import Optional, Callable, Tuple
from email.utils import parsedate_to_datetime
from datetime import datetime

from google.genai import types, errors
from config import get_gemini_client, DEFAULT_MODEL

# Configure logger (does not log API keys or confidential data)
logger = logging.getLogger("studyverse.summarizer")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(levelname)s] [%(name)s] %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

MAX_RETRIES = 3
INITIAL_RATE_LIMIT_DELAY_SECONDS = 4.5
INITIAL_SERVER_ERROR_DELAY_SECONDS = 2.0
MAX_DELAY_SECONDS = 35.0


class GeminiAPIError(Exception):
    """Base exception for Gemini Study Assistant errors."""
    pass

class GeminiRateLimitError(GeminiAPIError):
    """Raised when temporary rate limit (HTTP 429) persists after all retries."""
    def __init__(self, message: str, retry_after: Optional[float] = None):
        super().__init__(message)
        self.retry_after = retry_after

class GeminiQuotaExhaustedError(GeminiAPIError):
    """Raised when daily/project quota is permanently exhausted (not retryable)."""
    pass

class GeminiTemporaryUnavailableError(GeminiAPIError):
    """Raised when Gemini is temporarily unavailable (HTTP 503/500) after all retries fail."""
    pass

class GeminiClientAuthError(GeminiAPIError):
    """Raised when API key is missing, unauthorized, or invalid."""
    pass


SUMMARY_STYLES = {
    "quick": {
        "title": "Quick Overview (3-5 Sentences)",
        "prompt": (
            "Provide a crisp, high-level executive summary of this material in 3 to 5 sentences. "
            "Highlight the core theme, the primary objective, and the main conclusion."
        )
    },
    "bullet": {
        "title": "Bullet Points & Key Takeaways",
        "prompt": (
            "Summarize this study material in clear, categorized bullet points. "
            "Group points under logical topic headings, bold key terms, and summarize each concept concisely."
        )
    },
    "flashcards": {
        "title": "Study Flashcards (Q&A)",
        "prompt": (
            "Create a set of high-yield study flashcards based on this material. "
            "Format each flashcard as:\n"
            "**Card [Number]**\n"
            "- **Front (Question):** [Clear question]\n"
            "- **Back (Answer):** [Concise, accurate answer]\n"
            "- **Key Concept / Memory Trick:** [Brief mnemonic or context]"
        )
    },
    "cheat_sheet": {
        "title": "Exam Cheat Sheet & Cram Guide",
        "prompt": (
            "Generate an exam-ready revision cheat sheet from this material. Include:\n"
            "1. **Core Terminology & Definitions**\n"
            "2. **Crucial Principles / Formulas / Rules**\n"
            "3. **Frequent Pitfalls & Common Mistakes to Avoid**\n"
            "4. **Quick 30-Second Summary Recap**"
        )
    },
    "deep_dive": {
        "title": "Comprehensive Deep Dive",
        "prompt": (
            "Provide an in-depth, pedagogical explanation of this material. "
            "Break down complex ideas into first principles, provide clear real-world analogies, "
            "and explain step-by-step how the concepts connect."
        )
    },
    "beginner": {
        "title": "Beginner-Friendly Explanation",
        "prompt": (
            "Explain this study material in simple, approachable language suitable for a beginner. "
            "Use clear real-world analogies, define technical jargon immediately, and avoid overwhelming "
            "mathematical or dense academic notation while preserving core conceptual accuracy."
        )
    },
    "exam_revision": {
        "title": "High-Yield Exam Revision Mode",
        "prompt": (
            "Create a high-impact, targeted exam revision guide. Focus strictly on concepts most likely "
            "to appear on an exam: high-priority definitions, crucial formulas/theorems, step-by-step "
            "problem-solving techniques, and typical exam question patterns."
        )
    },
    "concept_breakdown": {
        "title": "Concept-by-Concept Breakdown",
        "prompt": (
            "Deconstruct this material into modular concept units. For each key concept, provide:\n"
            "1. **Concept Name & Core Definition**\n"
            "2. **Why It Matters** (Context & Relevance)\n"
            "3. **How It Works** (Mechanism / Logic)\n"
            "4. **Concrete Micro-Example**"
        )
    },
    "detailed": {
        "title": "Detailed Comprehensive Notes",
        "prompt": (
            "Create comprehensive, highly detailed study notes covering every topic and subtopic in the material. "
            "Use clear headings, structured subsections, bullet points for specifics, bold key terms, and thorough explanations."
        )
    },
    "definitions": {
        "title": "Important Definitions & Terminology",
        "prompt": (
            "Extract and compile an authoritative glossary of all critical definitions, keywords, acronyms, and technical terms. "
            "For each term, provide its exact definition, context in this subject, and a brief memory anchor."
        )
    },
    "formula_sheet": {
        "title": "Formula, Laws & Principles Sheet",
        "prompt": (
            "Compile all mathematical formulas, scientific laws, key equations, and governing principles from this material. "
            "For each formula/law: 1) State equation/law, 2) Define each variable and unit, 3) Conditions of applicability, and 4) Common calculation pitfalls."
        )
    },
    "chapter_wise": {
        "title": "Chapter & Section-wise Notes",
        "prompt": (
            "Organize these notes strictly by chapters, sections, or slides as structured in the source material. "
            "Include explicit page/slide references, summarizing each section's objectives, key mechanisms, and summary takeaways."
        )
    },
    "comparisons": {
        "title": "Concept Comparisons & Distinctions",
        "prompt": (
            "Identify closely related, contrasting, or easily confused concepts in this material. "
            "Create side-by-side comparison tables and contrast analyses highlighting similarities, fundamental differences, and distinction rules."
        )
    },
    "questions": {
        "title": "Important Exam Questions & Model Answers",
        "prompt": (
            "Generate a set of high-probability exam questions based directly on this material. Include short-answer conceptual questions, "
            "analytical application questions, and provide complete, high-scoring model answers for each with explanation."
        )
    },
    "comprehensive": {
        "title": "Comprehensive Master Study Guide",
        "prompt": (
            "Synthesize this material into an all-in-one Master Study Guide. Include an executive overview, detailed topic breakdown, "
            "glossary of essential terms, key formulas/rules, common misconceptions to avoid, and self-test checkpoints."
        )
    },
    # Backwards-compatible aliases
    "key_concepts": {
        "title": "Key Concepts & Principles",
        "prompt": (
            "Extract core principles, underlying theories, and fundamental concepts from this material. "
            "Explain each principle clearly with an intuitive mental model or analogy."
        )
    }
}

SYSTEM_INSTRUCTION = (
    "You are an expert AI Study Assistant and educator. Your goal is to help students "
    "master complex topics quickly and thoroughly. Always organize content cleanly using markdown, "
    "highlight critical terms, maintain high academic accuracy, and keep explanations engaging and easy to understand."
)


def extract_retry_after(err: Exception) -> Optional[float]:
    """
    Extracts recommended retry-after delay in seconds from HTTP headers or Google RPC error details.
    """
    # 1. Check HTTP response headers (Retry-After)
    response = getattr(err, "response", None)
    if response is not None and hasattr(response, "headers"):
        retry_header = response.headers.get("retry-after") or response.headers.get("Retry-After")
        if retry_header:
            try:
                return float(retry_header)
            except ValueError:
                try:
                    dt = parsedate_to_datetime(retry_header)
                    delay = (dt - datetime.now(dt.tzinfo)).total_seconds()
                    if delay > 0:
                        return delay
                except Exception:
                    pass

    # 2. Check Google RPC RetryInfo in error details dictionary
    details = getattr(err, "details", None)
    if isinstance(details, dict):
        error_dict = details.get("error", {})
        err_details_list = error_dict.get("details", []) if isinstance(error_dict, dict) else []
        for d in err_details_list:
            if isinstance(d, dict) and "retryDelay" in d:
                raw_delay = str(d["retryDelay"]).rstrip("s")
                try:
                    return float(raw_delay)
                except ValueError:
                    pass

    # 3. Check error message string for regex matching e.g. "retry after 15s" or "in 12 seconds"
    msg = str(getattr(err, "message", "") or str(err))
    match = re.search(r"retry(?:\s+after|\s+in)?\s+([0-9]+(?:\.[0-9]+)?)\s*s", msg, re.IGNORECASE)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass

    return None


def classify_gemini_error(err: Exception) -> Tuple[bool, str, str, Optional[float]]:
    """
    Classifies an error into:
    (is_retryable, category, user_friendly_message, retry_after_seconds)
    Never exposes API keys, tokens, or raw request payloads.
    """
    retry_after = extract_retry_after(err)

    if isinstance(err, errors.APIError):
        code = getattr(err, "code", None)
        status = getattr(err, "status", "")
        msg = str(getattr(err, "message", "") or str(err)).lower()

        # Check for permanent Quota Exhaustion (daily limit / billing disabled)
        is_daily_quota = any(term in msg for term in [
            "requests per day", "free_tier_requests_per_day", "quota exceeded for",
            "daily quota", "quota metric", "limit '0'", "billing_disabled"
        ])
        if (code == 429 or status == "RESOURCE_EXHAUSTED") and is_daily_quota:
            return (
                False,
                "quota_exhausted",
                "Your Google Gemini API daily request quota has been exhausted. Please wait until your daily quota resets in Google AI Studio or switch to a paid API key.",
                None
            )

        # Temporary rate limit (per-minute RPM/TPM limit): RETRYABLE
        if code == 429 or status == "RESOURCE_EXHAUSTED":
            wait_hint = f" (Suggested delay: {int(retry_after)}s)" if retry_after else ""
            return (
                True,
                "rate_limit",
                f"Gemini API rate limit reached (requests per minute){wait_hint}. Retrying with exponential backoff...",
                retry_after
            )

        # High Demand / Server unavailable (503): RETRYABLE
        if code == 503 or status == "UNAVAILABLE":
            return (
                True,
                "high_demand",
                "Model temporarily experiencing high demand (HTTP 503). Retrying...",
                retry_after
            )

        # Internal Server error (500, 502, 504): RETRYABLE
        if (code and 500 <= code < 600) or status in ("INTERNAL", "DEADLINE_EXCEEDED"):
            return (
                True,
                "server_error",
                f"Google server temporary issue (HTTP {code or 500}). Retrying...",
                retry_after
            )

        # Permanent client errors: DO NOT RETRY
        if code == 401 or status == "UNAUTHENTICATED":
            return (
                False,
                "auth_error",
                "Invalid or unauthorized API key. Please check your GEMINI_API_KEY in the .env file.",
                None
            )
        elif code == 403 or status == "PERMISSION_DENIED":
            return (
                False,
                "permission_denied",
                "Permission denied for this API key or requested Gemini service.",
                None
            )
        elif code == 404 or status == "NOT_FOUND":
            return (
                False,
                "not_found",
                f"Model '{DEFAULT_MODEL}' was not found. Please verify DEFAULT_MODEL in config.py.",
                None
            )
        elif code and 400 <= code < 500:
            return (
                False,
                "client_error",
                f"Client request error ({code}): {getattr(err, 'message', None) or 'Bad request'}",
                None
            )

    # General network / connection timeouts
    err_name = type(err).__name__.lower()
    if any(keyword in err_name for keyword in ("timeout", "connect", "connection", "network", "remote")):
        return (
            True,
            "network_error",
            "Network connection timed out while reaching Gemini API. Retrying...",
            retry_after
        )

    return (False, "unknown_error", str(err), None)


def generate_study_summary(
    extracted_data: dict,
    style_key: str = "bullet",
    custom_instructions: Optional[str] = None,
    on_retry: Optional[Callable[[int, int, float, str], None]] = None
) -> str:
    """
    Sends the extracted study material (text or image) to Gemini and generates a specialized summary.
    Automatically retries temporary errors (429 Rate Limit, 503 High Demand) with exponential backoff
    and respects any retry-after headers provided by the API.
    """
    if style_key not in SUMMARY_STYLES:
        raise ValueError(f"Unknown style '{style_key}'. Choose from: {list(SUMMARY_STYLES.keys())}")

    client = get_gemini_client()
    style_info = SUMMARY_STYLES[style_key]
    style_prompt = style_info["prompt"]

    user_instructions = f"\nAdditional Instructions: {custom_instructions}" if custom_instructions else ""

    if extracted_data.get("type") == "image":
        prompt_text = (
            f"Analyze this study image/diagram.\n"
            f"Task: {style_prompt}{user_instructions}"
        )
        contents = [extracted_data["image"], prompt_text]
    else:
        content_text = extracted_data.get("content", "")
        if not content_text.strip():
            return "No readable text content was found in the provided file."

        prompt_text = (
            f"Task: {style_prompt}{user_instructions}\n\n"
            f"--- STUDY MATERIAL ({extracted_data.get('file_name', 'Document')}) ---\n"
            f"{content_text}"
        )
        contents = [prompt_text]

    last_error_category = ""
    last_error_reason = ""
    last_retry_after: Optional[float] = None

    # 1 initial attempt + MAX_RETRIES (3) = 4 attempts total
    for attempt in range(1, MAX_RETRIES + 2):
        try:
            logger.info(
                f"[StudyVerse] Requesting Smart Notes ({style_key}) attempt {attempt}/{MAX_RETRIES + 1} "
                f"using model '{DEFAULT_MODEL}'..."
            )
            response = client.models.generate_content(
                model=DEFAULT_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0.3,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
                )
            )
            logger.info(f"[StudyVerse] Smart Notes ({style_key}) successfully generated on attempt {attempt}.")
            return response.text or ""

        except Exception as e:
            is_retryable, category, reason, retry_after = classify_gemini_error(e)
            last_error_category = category
            last_error_reason = reason
            last_retry_after = retry_after

            # Log diagnostic info (without exposing API key or private data)
            logger.warning(
                f"[StudyVerse Error] Attempt {attempt}/{MAX_RETRIES + 1} failed | Category: {category} | Reason: {reason}"
            )

            # Permanent error: fail fast without retrying
            if not is_retryable:
                if category == "quota_exhausted":
                    raise GeminiQuotaExhaustedError(reason) from e
                elif category == "auth_error":
                    raise GeminiClientAuthError(reason) from e
                else:
                    raise GeminiAPIError(reason) from e

            # Temporary error: compute backoff and retry if attempts remain
            if attempt <= MAX_RETRIES:
                # Determine backoff delay:
                # If API provided retry-after, respect it plus a small buffer.
                if retry_after and retry_after > 0:
                    delay = min(max(retry_after + 1.0, 3.0), MAX_DELAY_SECONDS)
                elif category == "rate_limit":
                    # For 429 rate limit without retry-after: 4.5s -> 9.0s -> 18.0s (+ jitter)
                    delay = min(INITIAL_RATE_LIMIT_DELAY_SECONDS * (2.0 ** (attempt - 1)) + random.uniform(0.2, 0.8), MAX_DELAY_SECONDS)
                else:
                    # For 503 / 500: 2.0s -> 4.0s -> 8.0s (+ jitter)
                    delay = min(INITIAL_SERVER_ERROR_DELAY_SECONDS * (2.0 ** (attempt - 1)) + random.uniform(0.1, 0.4), MAX_DELAY_SECONDS)

                logger.info(f"[StudyVerse Backoff] Waiting {delay:.1f}s before retry attempt {attempt + 1}...")

                if on_retry:
                    on_retry(attempt, MAX_RETRIES, delay, reason)

                time.sleep(delay)
            else:
                # All retries exhausted
                if last_error_category == "rate_limit":
                    wait_advice = f" (Suggested wait: ~{int(last_retry_after or 20)} seconds)" if last_retry_after else ""
                    raise GeminiRateLimitError(
                        f"Gemini API rate limit reached (requests per minute){wait_advice}. "
                        f"All {MAX_RETRIES} automatic backoff retry attempts were exhausted. "
                        "Please wait a moment and click Generate Notes again.",
                        retry_after=last_retry_after
                    ) from e
                else:
                    raise GeminiTemporaryUnavailableError(
                        f"Gemini API is temporarily experiencing high demand or temporary server issues. "
                        f"All {MAX_RETRIES} retry attempts failed ({last_error_reason}). Please try again in a few moments."
                    ) from e
