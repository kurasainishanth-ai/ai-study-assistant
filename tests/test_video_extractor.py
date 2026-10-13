import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import unittest
import tempfile
from extractors.dispatcher import extract_content, SUPPORTED_EXTENSIONS
from extractors.video_extractor import extract_video_content, parse_subtitles

class TestVideoExtractor(unittest.TestCase):
    def test_supported_extensions_include_video_and_audio(self):
        self.assertIn(".mp4", SUPPORTED_EXTENSIONS["video"])
        self.assertIn(".webm", SUPPORTED_EXTENSIONS["video"])
        self.assertIn(".mp3", SUPPORTED_EXTENSIONS["audio"])
        self.assertIn(".wav", SUPPORTED_EXTENSIONS["audio"])

    def test_subtitle_parsing(self):
        srt_content = """1
00:00:10,000 --> 00:00:15,000
Welcome to Machine Learning 101.

2
00:00:16,000 --> 00:00:22,000
Today we discuss gradient descent optimization.
"""
        with tempfile.NamedTemporaryFile("w", suffix=".srt", delete=False, encoding="utf-8") as f:
            f.write(srt_content)
            temp_path = f.name

        try:
            segments = parse_subtitles(temp_path)
            self.assertEqual(len(segments), 2)
            self.assertEqual(segments[0]["timestamp"], "00:00:10")
            self.assertIn("Machine Learning", segments[0]["text"])

            data = extract_video_content(temp_path)
            self.assertEqual(data["type"], "video_transcript")
            self.assertIn("--- [Timestamp 00:00:10] ---", data["content"])
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_video_media_fallback_extraction(self):
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"\x00\x00\x00\x20ftypisom" + b"\x00" * 200)
            temp_path = f.name

        try:
            data = extract_content(temp_path)
            self.assertEqual(data["type"], "video_transcript")
            self.assertIn("--- [Timestamp", data["content"])
            self.assertGreater(data["total_units"], 0)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

if __name__ == "__main__":
    unittest.main()
