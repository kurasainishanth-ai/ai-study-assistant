import time
import re
import random
import logging
from typing import Any, Optional, List, Tuple
from email.utils import parsedate_to_datetime
from datetime import datetime

from google.genai import types, errors
from config import get_gemini_client, DEFAULT_MODEL

logger = logging.getLogger("studyverse.gemini_caller")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(levelname)s] [%(name)s] %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

MAX_RETRIES = 3
INITIAL_RATE_LIMIT_DELAY = 4.5
INITIAL_SERVER_ERROR_DELAY = 2.0
MAX_DELAY_SECONDS = 35.0

class GeminiServiceError(Exception):
    pass

class GeminiServiceAuthError(GeminiServiceError):
    pass

class GeminiServiceRateLimitError(GeminiServiceError):
    def __init__(self, message: str, retry_after: Optional[float] = None):
        super().__init__(message)
        self.retry_after = retry_after

class GeminiServiceQuotaExhaustedError(GeminiServiceError):
    pass

class GeminiServiceTemporaryError(GeminiServiceError):
    pass


def extract_retry_after(err: Exception) -> Optional[float]:
    """Extracts recommended retry-after delay in seconds from HTTP headers or details."""
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

    msg = str(getattr(err, "message", "") or str(err))
    match = re.search(r"retry(?:\s+after|\s+in)?\s+([0-9]+(?:\.[0-9]+)?)\s*s", msg, re.IGNORECASE)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass

    return None


def classify_gemini_error(err: Exception) -> Tuple[bool, str, str, Optional[float]]:
    """Classifies an error into (is_retryable, category, message, retry_after)."""
    retry_after = extract_retry_after(err)

    if isinstance(err, errors.APIError):
        code = getattr(err, "code", None)
        status = getattr(err, "status", "")
        msg = str(getattr(err, "message", "") or str(err)).lower()

        is_daily = any(term in msg for term in [
            "requests per day", "free_tier_requests_per_day", "quota exceeded for",
            "daily quota", "quota metric", "limit '0'", "billing_disabled"
        ])
        if (code == 429 or status == "RESOURCE_EXHAUSTED") and is_daily:
            return (False, "quota_exhausted", "Google Gemini daily quota has been exhausted.", None)

        if code == 429 or status == "RESOURCE_EXHAUSTED":
            return (True, "rate_limit", "Temporary rate limit reached (requests per minute).", retry_after)

        if code == 503 or status == "UNAVAILABLE":
            return (True, "high_demand", "Model temporarily experiencing high demand (HTTP 503).", retry_after)

        if (code and 500 <= code < 600) or status in ("INTERNAL", "DEADLINE_EXCEEDED"):
            return (True, "server_error", f"Google server temporary issue (HTTP {code or 500}).", retry_after)

        if code == 401 or status == "UNAUTHENTICATED":
            return (False, "auth_error", "Invalid or unauthorized API key in .env", None)
        elif code == 403 or status == "PERMISSION_DENIED":
            return (False, "permission_denied", "Permission denied for this API key", None)
        elif code == 404 or status == "NOT_FOUND":
            return (False, "not_found", f"Model '{DEFAULT_MODEL}' was not found", None)
        elif code and 400 <= code < 500:
            return (False, "client_error", f"Client request error ({code})", None)

    err_name = type(err).__name__.lower()
    if any(keyword in err_name for keyword in ("timeout", "connect", "connection", "network")):
        return (True, "network_error", "Network connection timed out", retry_after)

    return (False, "unknown_error", str(err), None)


def call_gemini_with_retry(
    contents: List[Any],
    system_instruction: Optional[str] = None,
    temperature: float = 0.3,
    model: str = DEFAULT_MODEL
) -> str:
    """
    Executes client.models.generate_content with automatic exponential backoff retry
    and Retry-After compliance for temporary 429 / 503 errors.
    """
    client = get_gemini_client()
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=temperature,
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
    )

    last_category = ""
    last_reason = ""
    last_retry_after: Optional[float] = None

    for attempt in range(1, MAX_RETRIES + 2):
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=config
            )
            return response.text or ""
        except Exception as e:
            is_retryable, category, reason, retry_after = classify_gemini_error(e)
            last_category = category
            last_reason = reason
            last_retry_after = retry_after

            logger.warning(
                f"[Gemini Caller] Attempt {attempt}/{MAX_RETRIES + 1} failed | Category: {category} | Reason: {reason}"
            )

            if not is_retryable:
                if category == "quota_exhausted":
                    raise GeminiServiceQuotaExhaustedError(reason) from e
                elif category == "auth_error":
                    raise GeminiServiceAuthError(reason) from e
                raise GeminiServiceError(reason) from e

            if attempt <= MAX_RETRIES:
                if retry_after and retry_after > 0:
                    delay = min(max(retry_after + 1.0, 3.0), MAX_DELAY_SECONDS)
                elif category == "rate_limit":
                    delay = min(INITIAL_RATE_LIMIT_DELAY * (2.0 ** (attempt - 1)) + random.uniform(0.2, 0.8), MAX_DELAY_SECONDS)
                else:
                    delay = min(INITIAL_SERVER_ERROR_DELAY * (2.0 ** (attempt - 1)) + random.uniform(0.1, 0.4), MAX_DELAY_SECONDS)

                logger.info(f"[Gemini Caller] Waiting {delay:.1f}s before retry attempt {attempt + 1}...")
                time.sleep(delay)
            else:
                if last_category == "rate_limit":
                    raise GeminiServiceRateLimitError(
                        f"Gemini API rate limit reached. All {MAX_RETRIES} backoff retries failed. Please try again shortly.",
                        retry_after=last_retry_after
                    ) from e
                else:
                    raise GeminiServiceTemporaryError(
                        f"Gemini API temporary error: {last_reason}. Retries exhausted."
                    ) from e
