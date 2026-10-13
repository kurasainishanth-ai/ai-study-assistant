import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from server import app
from extractors.youtube_extractor import (
    extract_youtube_id,
    format_seconds,
    extract_youtube_content
)

class TestYouTubeIngestion(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_extract_youtube_id_various_formats(self):
        urls = [
            ("https://www.youtube.com/watch?v=aircAruvnKk", "aircAruvnKk"),
            ("https://youtu.be/aircAruvnKk", "aircAruvnKk"),
            ("https://www.youtube.com/embed/aircAruvnKk", "aircAruvnKk"),
            ("https://www.youtube.com/shorts/aircAruvnKk", "aircAruvnKk"),
            ("https://m.youtube.com/watch?v=aircAruvnKk&feature=share", "aircAruvnKk"),
            ("aircAruvnKk", "aircAruvnKk"),
        ]
        for url, expected in urls:
            self.assertEqual(extract_youtube_id(url), expected, f"Failed for url: {url}")

    def test_extract_youtube_id_invalid(self):
        self.assertIsNone(extract_youtube_id(""))
        self.assertIsNone(extract_youtube_id("https://google.com"))
        self.assertIsNone(extract_youtube_id("invalid-id"))

    def test_format_seconds(self):
        self.assertEqual(format_seconds(0), "00:00")
        self.assertEqual(format_seconds(65), "01:05")
        self.assertEqual(format_seconds(3665), "01:01:05")

    @patch('extractors.youtube_extractor.get_youtube_metadata')
    @patch('extractors.youtube_extractor.YouTubeTranscriptApi')
    def test_extract_youtube_content_success(self, mock_yt_api, mock_meta):
        mock_meta.return_value = {
            "title": "Deep Learning Lecture",
            "author": "Prof AI",
            "thumbnail_url": "https://img.youtube.com/vi/test1234567/hqdefault.jpg",
            "video_url": "https://www.youtube.com/watch?v=test1234567"
        }

        mock_instance = MagicMock()
        mock_yt_api.return_value = mock_instance
        
        mock_transcript = MagicMock()
        mock_transcript.language = "en"
        mock_transcript.is_generated = False
        mock_transcript.fetch.return_value = [
            {"text": "Welcome to neural networks.", "start": 0.0, "duration": 4.0},
            {"text": "Today we discuss backpropagation.", "start": 5.0, "duration": 5.0},
            {"text": "Let us look at gradient descent formula.", "start": 50.0, "duration": 6.0},
        ]
        mock_transcript_list = MagicMock()
        mock_transcript_list.find_transcript.return_value = mock_transcript
        mock_instance.list.return_value = mock_transcript_list

        result = extract_youtube_content("https://www.youtube.com/watch?v=test1234567")
        
        self.assertEqual(result["type"], "youtube")
        self.assertEqual(result["youtube_id"], "test1234567")
        self.assertEqual(result["title"], "Deep Learning Lecture")
        self.assertIn("[00:00] Welcome to neural networks", result["content"])
        self.assertIn("[00:50] Let us look at gradient descent", result["content"])
        self.assertTrue(len(result["segments"]) >= 2)

    @patch('extractors.youtube_extractor.get_youtube_metadata')
    @patch('extractors.youtube_extractor.YouTubeTranscriptApi')
    def test_extract_youtube_content_with_fetched_transcript_snippets(self, mock_yt_api, mock_meta):
        from youtube_transcript_api._transcripts import FetchedTranscriptSnippet

        mock_meta.return_value = {
            "title": "Data Structures Lecture",
            "author": "CS Professor",
            "thumbnail_url": "https://img.youtube.com/vi/abc12345678/hqdefault.jpg",
            "video_url": "https://www.youtube.com/watch?v=abc12345678"
        }

        mock_instance = MagicMock()
        mock_yt_api.return_value = mock_instance

        mock_transcript = MagicMock()
        mock_transcript.language = "en"
        mock_transcript.is_generated = False
        # Returning actual FetchedTranscriptSnippet objects (which do not have .get)
        mock_transcript.fetch.return_value = [
            FetchedTranscriptSnippet(text="Welcome to arrays and linked lists.", start=0.0, duration=4.5),
            FetchedTranscriptSnippet(text="Arrays provide O(1) random access.", start=5.0, duration=6.0),
            FetchedTranscriptSnippet(text="Linked lists allow dynamic memory growth.", start=42.0, duration=5.0),
        ]
        mock_transcript_list = MagicMock()
        mock_transcript_list.find_transcript.return_value = mock_transcript
        mock_instance.list.return_value = mock_transcript_list

        result = extract_youtube_content("https://www.youtube.com/watch?v=abc12345678")

        self.assertEqual(result["type"], "youtube")
        self.assertEqual(result["youtube_id"], "abc12345678")
        self.assertEqual(result["title"], "Data Structures Lecture")
        self.assertIn("[00:00] Welcome to arrays and linked lists.", result["content"])
        self.assertIn("[00:42] Linked lists allow dynamic memory growth.", result["content"])
        self.assertTrue(len(result["segments"]) >= 2)
        # Total duration: 42.0 + 5.0 = 47 seconds -> 00:47
        self.assertEqual(result["duration_seconds"], 47)
        self.assertEqual(result["duration_formatted"], "00:47")

    @patch('extractors.youtube_extractor.get_youtube_metadata')
    @patch('extractors.youtube_extractor.YouTubeTranscriptApi')
    def test_extract_youtube_content_with_fetched_transcript_container(self, mock_yt_api, mock_meta):
        from youtube_transcript_api._transcripts import FetchedTranscript, FetchedTranscriptSnippet

        mock_meta.return_value = {
            "title": "Quantum Computing",
            "author": "Physics Dept",
            "thumbnail_url": "https://img.youtube.com/vi/q1234567890/hqdefault.jpg",
            "video_url": "https://www.youtube.com/watch?v=q1234567890"
        }

        mock_instance = MagicMock()
        mock_yt_api.return_value = mock_instance

        mock_transcript = MagicMock()
        mock_transcript.language = "en"
        mock_transcript.is_generated = False
        snippets = [
            FetchedTranscriptSnippet(text="Superposition of states.", start=0.0, duration=3.0),
            FetchedTranscriptSnippet(text="Qubits can be in 0 and 1 simultaneously.", start=10.0, duration=4.0),
        ]
        mock_transcript.fetch.return_value = FetchedTranscript(
            snippets=snippets,
            video_id="q1234567890",
            language="en",
            language_code="en",
            is_generated=False
        )
        mock_transcript_list = MagicMock()
        mock_transcript_list.find_transcript.return_value = mock_transcript
        mock_instance.list.return_value = mock_transcript_list

        result = extract_youtube_content("https://www.youtube.com/watch?v=q1234567890")
        self.assertEqual(result["youtube_id"], "q1234567890")
        self.assertIn("[00:00] Superposition of states.", result["content"])
        self.assertEqual(result["duration_seconds"], 14)

    @patch('extractors.youtube_extractor.get_youtube_metadata')
    @patch('extractors.youtube_extractor.YouTubeTranscriptApi')
    def test_transcripts_disabled_error(self, mock_yt_api, mock_meta):
        from youtube_transcript_api import TranscriptsDisabled
        mock_instance = MagicMock()
        mock_instance.list.side_effect = TranscriptsDisabled("test1234567")
        mock_yt_api.return_value = mock_instance

        with self.assertRaises(ValueError) as ctx:
            extract_youtube_content("https://www.youtube.com/watch?v=test1234567")
        self.assertIn("Subtitles/transcripts are disabled", str(ctx.exception))

    @patch('extractors.youtube_extractor.get_youtube_metadata')
    @patch('extractors.youtube_extractor.YouTubeTranscriptApi')
    def test_no_transcript_found_error(self, mock_yt_api, mock_meta):
        from youtube_transcript_api import NoTranscriptFound
        mock_instance = MagicMock()
        mock_instance.list.side_effect = NoTranscriptFound("test1234567", ["en"], None)
        mock_yt_api.return_value = mock_instance

        with self.assertRaises(ValueError) as ctx:
            extract_youtube_content("https://www.youtube.com/watch?v=test1234567")
        self.assertIn("No transcripts found", str(ctx.exception))

    @patch('extractors.youtube_extractor.get_youtube_metadata')
    @patch('extractors.youtube_extractor.YouTubeTranscriptApi')
    def test_video_unavailable_error(self, mock_yt_api, mock_meta):
        from youtube_transcript_api import VideoUnavailable
        mock_instance = MagicMock()
        mock_instance.list.side_effect = VideoUnavailable("test1234567")
        mock_yt_api.return_value = mock_instance

        with self.assertRaises(ValueError) as ctx:
            extract_youtube_content("https://www.youtube.com/watch?v=test1234567")
        self.assertIn("unavailable", str(ctx.exception))

    @patch('extractors.youtube_extractor.get_youtube_metadata')
    @patch('extractors.youtube_extractor.YouTubeTranscriptApi')
    def test_empty_transcript_error(self, mock_yt_api, mock_meta):
        mock_instance = MagicMock()
        mock_transcript = MagicMock()
        mock_transcript.fetch.return_value = []
        mock_transcript_list = MagicMock()
        mock_transcript_list.find_transcript.return_value = mock_transcript
        mock_instance.list.return_value = mock_transcript_list
        mock_yt_api.return_value = mock_instance

        with self.assertRaises(ValueError) as ctx:
            extract_youtube_content("https://www.youtube.com/watch?v=test1234567")
        self.assertIn("empty", str(ctx.exception))

    def test_extract_snippet_data_helper(self):
        from extractors.youtube_extractor import _extract_snippet_data
        from youtube_transcript_api._transcripts import FetchedTranscriptSnippet

        # From dict
        d = {"text": "  hello  ", "start": 0.0, "duration": 2.5}
        t, s, dur = _extract_snippet_data(d)
        self.assertEqual(t, "hello")
        self.assertEqual(s, 0.0)
        self.assertEqual(dur, 2.5)

        # From FetchedTranscriptSnippet
        snip = FetchedTranscriptSnippet(text=" world ", start=0.0, duration=1.0)
        t, s, dur = _extract_snippet_data(snip)
        self.assertEqual(t, "world")
        self.assertEqual(s, 0.0)
        self.assertEqual(dur, 1.0)

        # Missing attributes/invalid numbers
        t, s, dur = _extract_snippet_data({"text": None, "start": "bad", "duration": None})
        self.assertEqual(t, "")
        self.assertEqual(s, 0.0)
        self.assertEqual(dur, 0.0)

    @patch('server.extract_youtube_content')
    def test_youtube_endpoint(self, mock_extract):
        mock_extract.return_value = {
            "type": "youtube",
            "youtube_id": "test1234567",
            "video_url": "https://www.youtube.com/watch?v=test1234567",
            "title": "Introduction to AI",
            "author": "Tech Academy",
            "thumbnail_url": "https://img.youtube.com/vi/test1234567/hqdefault.jpg",
            "duration_seconds": 120,
            "duration_formatted": "02:00",
            "total_units": 3,
            "unit_name": "timestamps",
            "segments": [{"timestamp": "00:00", "seconds": 0, "text": "Intro"}],
            "content": "=== YOUTUBE LECTURE ===\n\n[00:00] Intro",
            "file_name": "Introduction to AI (YouTube)"
        }

        resp = self.client.post("/api/materials/youtube", json={"url": "https://www.youtube.com/watch?v=test1234567"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["material"]["name"], "Introduction to AI")
        self.assertEqual(data["material"]["type"], "YouTube Lecture")

    def test_youtube_endpoint_empty_url(self):
        resp = self.client.post("/api/materials/youtube", json={"url": "   "})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("YouTube URL or video ID is required", resp.json()["detail"])

    @patch('server.extract_youtube_content')
    def test_youtube_endpoint_value_error(self, mock_extract):
        mock_extract.side_effect = ValueError("Subtitles/transcripts are disabled for YouTube video 'test1234567'.")
        resp = self.client.post("/api/materials/youtube", json={"url": "https://www.youtube.com/watch?v=test1234567"})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Subtitles/transcripts are disabled", resp.json()["detail"])

if __name__ == '__main__':
    unittest.main()

