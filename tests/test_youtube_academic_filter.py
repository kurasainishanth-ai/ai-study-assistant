import json
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from google.genai import types
from youtube_transcript_api import FetchedTranscript, FetchedTranscriptSnippet
from extractors.youtube_extractor import extract_youtube_content
from services.youtube_video_analyzer import analyze_youtube_video


def assessment(decision="academic", evidence="The instructor explains the subject step by step.", segments=None):
    return {
        "decision": decision,
        "confidence": 0.96,
        "category": "subject lecture",
        "evidence": evidence,
        "transcript_segments": segments or [],
        "language": "English",
    }


class TestYouTubeContentAnalysis(unittest.TestCase):
    def _metadata(self, title, video_id="p2b2Vb-cYCs", author="Any Channel"):
        return {
            "title": title,
            "author": author,
            "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
            "video_url": f"https://www.youtube.com/watch?v={video_id}",
        }

    def _caption_objects(self, video_id="p2b2Vb-cYCs"):
        chosen = MagicMock()
        chosen.language = "English"
        chosen.is_generated = False
        raw = FetchedTranscript(
            snippets=[
                FetchedTranscriptSnippet("The first educational sentence.", 0.0, 2.0),
                FetchedTranscriptSnippet("The next explanation.", 3.0, 2.0),
            ],
            video_id=video_id,
            language="English",
            language_code="en",
            is_generated=False,
        )
        return chosen, raw

    @patch("extractors.youtube_extractor.analyze_youtube_video")
    @patch("extractors.youtube_extractor.analyze_youtube_transcript")
    @patch("extractors.youtube_extractor._read_captions")
    @patch("extractors.youtube_extractor.get_youtube_metadata")
    def test_content_decisions_cover_varied_subjects_and_untrusted_metadata(
        self, mock_metadata, mock_read_captions, mock_analyze_transcript, mock_analyze_video
    ):
        # This matrix exercises the integration contract with diverse content
        # decisions while deliberately varying misleading titles and creators.
        cases = [
            ("Computer science", "Neso Academy", "Marvel trailer", "academic"),
            ("Discrete mathematics", "Unknown Creator", "Daily vlog", "academic"),
            ("Calculus", "Khan Academy", "Official movie trailer", "academic"),
            ("Operating systems", "Independent Tutor", "Reaction to a film", "academic"),
            ("Organic chemistry", "Music Channel", "Chemistry lesson", "academic"),
            ("World history", "Gaming Channel", "History explained", "academic"),
            ("Physics", "University", "Physics prank compilation", "non_academic"),
            ("Biology", "Popular Educator", "Lifestyle vlog", "non_academic"),
            ("Literature", "Unknown Creator", "Official music video", "non_academic"),
            ("Statistics", "Course Channel", "Doomsday trailer", "uncertain"),
            ("Economics", "Unknown Creator", "Introduction to economics", "uncertain"),
            ("Language learning", "University", "Campus tour", "non_academic"),
        ]
        chosen, raw = self._caption_objects()
        mock_read_captions.return_value = (chosen, raw)
        mock_analyze_transcript.return_value = assessment("uncertain", "Caption evidence is insufficient.")

        for index, (subject, channel, title, decision) in enumerate(cases):
            with self.subTest(subject=subject, channel=channel, title=title, decision=decision):
                mock_metadata.return_value = self._metadata(title, author=channel)
                mock_analyze_video.return_value = assessment(
                    decision,
                    f"Gemini reviewed the actual video and classified its {subject} content.",
                )
                if decision == "academic":
                    result = extract_youtube_content("https://youtu.be/p2b2Vb-cYCs")
                    self.assertTrue(result["academic_context_validated"])
                    self.assertIn(subject, result["academic_context_evidence"])
                else:
                    with self.assertRaises(ValueError):
                        extract_youtube_content("https://youtu.be/p2b2Vb-cYCs")

        self.assertEqual(mock_analyze_video.call_count, len(cases))

    @patch("services.youtube_video_analyzer.call_gemini_with_retry")
    def test_gemini_receives_actual_youtube_video_and_json_schema(self, mock_gemini):
        mock_gemini.return_value = json.dumps(assessment())
        result = analyze_youtube_video("https://www.youtube.com/watch?v=p2b2Vb-cYCs", "Example title")

        self.assertEqual(result["decision"], "academic")
        kwargs = mock_gemini.call_args.kwargs
        video_part = kwargs["contents"][0]
        self.assertIsInstance(video_part, types.Part)
        self.assertEqual(
            video_part.file_data.file_uri,
            "https://www.youtube.com/watch?v=p2b2Vb-cYCs",
        )
        self.assertEqual(kwargs["response_mime_type"], "application/json")
        self.assertEqual(kwargs["response_schema"]["properties"]["decision"]["enum"], [
            "academic", "non_academic", "uncertain"
        ])
        self.assertIn("do not use it to decide", kwargs["contents"][1].text)

    @patch("extractors.youtube_extractor.analyze_youtube_video")
    @patch("extractors.youtube_extractor._read_captions")
    @patch("extractors.youtube_extractor.get_youtube_metadata")
    def test_exact_neso_video_accepts_current_transcript_objects(
        self, mock_metadata, mock_read_captions, mock_analyze_video
    ):
        video_id = "p2b2Vb-cYCs"
        mock_metadata.return_value = self._metadata("Introduction to Discrete Mathematics", video_id, "Neso Academy")
        chosen, raw = self._caption_objects(video_id)
        mock_read_captions.return_value = (chosen, raw)
        mock_analyze_video.return_value = assessment()

        result = extract_youtube_content(f"https://youtu.be/{video_id}")

        self.assertEqual(result["youtube_id"], video_id)
        self.assertEqual(result["transcript_source"], "youtube_captions")
        self.assertEqual(result["duration_seconds"], 5)
        self.assertIn("[00:00] The first educational sentence.", result["content"])
        self.assertTrue(result["academic_context_validated"])
        mock_analyze_video.assert_called_once()

    @patch("extractors.youtube_extractor.analyze_youtube_video")
    @patch("extractors.youtube_extractor._read_captions")
    @patch("extractors.youtube_extractor.get_youtube_metadata")
    def test_actual_content_overrides_misleading_entertainment_title(
        self, mock_metadata, mock_read_captions, mock_analyze_video
    ):
        mock_metadata.return_value = self._metadata("Avengers Doomsday Official Trailer")
        chosen, raw = self._caption_objects()
        mock_read_captions.return_value = (chosen, raw)
        mock_analyze_video.return_value = assessment(evidence="The video teaches discrete mathematics using worked logic examples.")

        result = extract_youtube_content("https://youtu.be/p2b2Vb-cYCs")

        self.assertTrue(result["academic_context_validated"])
        self.assertIn("academic_context_evidence", result)

    @patch("extractors.youtube_extractor.analyze_youtube_video")
    @patch("extractors.youtube_extractor._read_captions")
    @patch("extractors.youtube_extractor.get_youtube_metadata")
    def test_actual_content_overrides_academic_sounding_title(
        self, mock_metadata, mock_read_captions, mock_analyze_video
    ):
        mock_metadata.return_value = self._metadata("Introduction to Operating Systems")
        chosen, raw = self._caption_objects()
        mock_read_captions.return_value = (chosen, raw)
        mock_analyze_video.return_value = assessment(
            "non_academic", "The actual video is a movie trailer and does not teach the title's subject."
        )

        with self.assertRaisesRegex(ValueError, "actual video is a movie trailer"):
            extract_youtube_content("https://youtu.be/p2b2Vb-cYCs")

    @patch("extractors.youtube_extractor.analyze_youtube_video")
    @patch("extractors.youtube_extractor._read_captions")
    @patch("extractors.youtube_extractor.get_youtube_metadata")
    def test_gemini_transcribes_when_youtube_captions_are_unavailable(
        self, mock_metadata, mock_read_captions, mock_analyze_video
    ):
        mock_metadata.return_value = self._metadata("Ambiguous title", author="Unknown Creator")
        mock_read_captions.side_effect = RuntimeError("captions disabled")
        mock_analyze_video.return_value = assessment(
            segments=[
                {"start_seconds": 0, "text": "A timestamped instructional explanation."},
                {"start_seconds": 42, "text": "The next course concept."},
            ]
        )

        result = extract_youtube_content("https://youtu.be/p2b2Vb-cYCs")

        self.assertEqual(result["transcript_source"], "gemini_video_analysis")
        self.assertEqual(result["total_units"], 2)
        self.assertIn("[00:42] The next course concept.", result["content"])
        mock_analyze_video.assert_called_once_with(
            "https://www.youtube.com/watch?v=p2b2Vb-cYCs",
            title="Ambiguous title",
            include_transcript=True,
        )

    @patch("extractors.youtube_extractor.analyze_youtube_transcript")
    @patch("extractors.youtube_extractor.analyze_youtube_video")
    @patch("extractors.youtube_extractor._read_captions")
    @patch("extractors.youtube_extractor.get_youtube_metadata")
    def test_caption_content_is_fallback_when_gemini_cannot_open_video_url(
        self, mock_metadata, mock_read_captions, mock_analyze_video, mock_analyze_transcript
    ):
        mock_metadata.return_value = self._metadata("Unrecognized title")
        chosen, raw = self._caption_objects()
        mock_read_captions.return_value = (chosen, raw)
        mock_analyze_video.side_effect = RuntimeError("video URL could not be opened")
        mock_analyze_transcript.return_value = assessment(evidence="Caption content teaches database normalization.")

        result = extract_youtube_content("https://youtu.be/p2b2Vb-cYCs")

        self.assertEqual(result["transcript_source"], "youtube_captions")
        mock_analyze_transcript.assert_called_once()
        self.assertIn("The first educational sentence", mock_analyze_transcript.call_args.args[1])

    @patch("extractors.youtube_extractor.analyze_youtube_video")
    @patch("extractors.youtube_extractor._read_captions")
    @patch("extractors.youtube_extractor.get_youtube_metadata")
    def test_error_reports_both_failures_when_video_and_captions_are_unavailable(
        self, mock_metadata, mock_read_captions, mock_analyze_video
    ):
        mock_metadata.return_value = self._metadata("Unknown")
        mock_read_captions.side_effect = RuntimeError("no captions available")
        mock_analyze_video.side_effect = RuntimeError("Gemini cannot access this video")

        with self.assertRaisesRegex(ValueError, "Gemini cannot access this video.*no captions available"):
            extract_youtube_content("https://youtu.be/p2b2Vb-cYCs")


if __name__ == "__main__":
    unittest.main()
