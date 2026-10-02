import unittest
from google.genai import errors
from summarizer import (
    extract_retry_after,
    classify_gemini_error,
    GeminiRateLimitError,
    GeminiQuotaExhaustedError
)

class TestGeminiRateLimitHandling(unittest.TestCase):
    def test_extract_retry_after_from_header(self):
        class MockResponse:
            headers = {"retry-after": "17.5"}
        class MockErr(Exception):
            response = MockResponse()
        self.assertEqual(extract_retry_after(MockErr()), 17.5)

    def test_extract_retry_after_from_rpc_details(self):
        class MockErr(Exception):
            response = None
            details = {
                "error": {
                    "details": [
                        {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "21s"}
                    ]
                }
            }
        self.assertEqual(extract_retry_after(MockErr()), 21.0)

    def test_classify_quota_exhausted_daily_limit(self):
        err = errors.ClientError(
            429,
            {
                "error": {
                    "code": 429,
                    "message": "Quota exceeded for quota metric 'Generate Content API requests per day'",
                    "status": "RESOURCE_EXHAUSTED"
                }
            }
        )
        is_retryable, category, msg, delay = classify_gemini_error(err)
        self.assertFalse(is_retryable)
        self.assertEqual(category, "quota_exhausted")
        self.assertIn("daily request quota has been exhausted", msg)

    def test_classify_temporary_rate_limit_per_minute(self):
        err = errors.ClientError(
            429,
            {
                "error": {
                    "code": 429,
                    "message": "Resource has been exhausted (e.g. check quota).",
                    "status": "RESOURCE_EXHAUSTED",
                    "details": [
                        {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "14s"}
                    ]
                }
            }
        )
        is_retryable, category, msg, delay = classify_gemini_error(err)
        self.assertTrue(is_retryable)
        self.assertEqual(category, "rate_limit")
        self.assertEqual(delay, 14.0)

if __name__ == "__main__":
    unittest.main()
