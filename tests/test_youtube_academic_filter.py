import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from youtube_transcript_api import FetchedTranscript, FetchedTranscriptSnippet
from extractors.youtube_extractor import extract_youtube_content, is_academic_context


class TestYouTubeAcademicFilter(unittest.TestCase):
    # A mixed creator set ensures the gate is driven by title content, not a
    # small allowlist of channels. These are metadata classification cases;
    # transcript availability is an independent YouTube-side constraint.
    CASES = [
        ("Neso Academy", "Interprocess Communication", True),
        ("Neso Academy", "Process Synchronization in Operating System", True),
        ("Gate Smashers", "Deadlock in Operating System", True),
        ("Khan Academy", "Introduction to Calculus: Derivatives", True),
        ("3Blue1Brown", "What Is a Neural Network?", True),
        ("MIT OpenCourseWare", "Linear Algebra Lecture 1", True),
        ("Harvard CS50", "Introduction to Computer Science", True),
        ("freeCodeCamp.org", "Python Programming Full Course", True),
        ("CrashCourse", "World History Course: The Industrial Revolution", True),
        ("TED-Ed", "Psychology: Why Do We Dream?", True),
        ("Veritasium", "Physics: How Does Gravity Work?", True),
        ("Kurzgesagt", "Evolution Explained", True),
        ("Numberphile", "The Fibonacci Sequence in Mathematics", True),
        ("Computerphile", "Cryptography Explained", True),
        ("Stanford Online", "Machine Learning Introduction", True),
        ("Oxford University", "Shakespeare: Literature Lecture", True),
        ("BBC Learning English", "English Grammar Lesson", True),
        ("NASA", "Black Holes Explained: An Astronomy Lesson", True),
        ("SmarterEveryDay", "How Does a Rocket Engine Work? Engineering Lesson", True),
        ("The Organic Chemistry Tutor", "Quadratic Equations Worked Examples", True),
        ("Jenny's Lectures", "Database Normalization", True),
        ("MIT OpenCourseWare", "Marvel's Avengers: Doomsday Official Trailer", False),
        ("Neso Academy", "Campus Life Daily Vlog", False),
        ("Khan Academy", "Official Music Video", False),
        ("3Blue1Brown", "Gaming Stream: Quantum Quest", False),
        ("TED-Ed", "Doomsday Explained", False),
        ("MrBeast", "I Built a School for 100 Kids", False),
        ("Gate Smashers", "Reaction Video: New Superhero Movie", False),
        ("Veritasium", "Physics Prank Video", False),
        ("Kurzgesagt", "Star Wars Gameplay", False),
        ("CrashCourse", "How to Cook Pasta", False),
        ("Neso Academy", "Daily Vlog from Campus", False),
        ("Unknown Creator", "YouTube Video (abc123)", False),
        ("Unknown Creator", "", False),
    ]

    def test_varied_video_titles_across_creators(self):
        for channel, title, expected in self.CASES:
            with self.subTest(channel=channel, title=title):
                self.assertEqual(is_academic_context(title, channel), expected)

    def test_creator_identity_never_changes_classification(self):
        creators = [channel for channel, _, _ in self.CASES] + [
            "Khan Academy", "Neso Academy", "Unknown Creator", "Official Channel"
        ]
        for _, title, _ in self.CASES:
            results = {is_academic_context(title, creator) for creator in creators}
            with self.subTest(title=title):
                self.assertEqual(len(results), 1)

    @patch("extractors.youtube_extractor.get_youtube_metadata")
    @patch("extractors.youtube_extractor.YouTubeTranscriptApi")
    def test_current_transcript_objects_ingest_without_dict_assumptions(self, mock_api, mock_metadata):
        video_id = "p2b2Vb-cYCs"
        mock_metadata.return_value = {
            "title": "Introduction to Discrete Mathematics",
            "author": "Neso Academy",
            "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
            "video_url": f"https://www.youtube.com/watch?v={video_id}",
        }

        transcript = MagicMock()
        transcript.language = "English"
        transcript.is_generated = False
        transcript.fetch.return_value = FetchedTranscript(
            snippets=[
                FetchedTranscriptSnippet("This is the first sentence.", 0.0, 2.0),
                FetchedTranscriptSnippet("This is the next sentence.", 3.0, 2.0),
            ],
            video_id=video_id,
            language="English",
            language_code="en",
            is_generated=False,
        )
        mock_transcript_list = MagicMock()
        mock_transcript_list.find_transcript.return_value = transcript
        mock_api.return_value.list.return_value = mock_transcript_list

        result = extract_youtube_content(f"https://youtu.be/{video_id}")

        self.assertEqual(result["youtube_id"], video_id)
        self.assertEqual(result["duration_seconds"], 5)
        self.assertIn("[00:00] This is the first sentence.", result["content"])
        self.assertTrue(result["academic_context_validated"])


if __name__ == "__main__":
    unittest.main()
