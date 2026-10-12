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

if __name__ == '__main__':
    unittest.main()
