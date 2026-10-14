import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from services.material_context import selected_context
from services.quiz_service import generate_quiz


class TestMultiSourceStudyTools(unittest.TestCase):
    def setUp(self):
        self.materials = {
            "doc-a": {"id": "doc-a", "name": "Algebra.pdf", "status": "Ready", "content": "Linear equations isolate an unknown."},
            "doc-b": {"id": "doc-b", "name": "Geometry.pdf", "status": "Ready", "content": "A triangle has three sides."},
        }

    @patch("services.material_context.db.get_material")
    def test_selected_context_includes_each_named_source(self, get_material):
        get_material.side_effect = self.materials.get

        context = selected_context("doc-a,doc-b")

        self.assertIn("SOURCE MATERIAL: Algebra.pdf", context["content"])
        self.assertIn("isolate an unknown", context["content"])
        self.assertIn("SOURCE MATERIAL: Geometry.pdf", context["content"])
        self.assertIn("three sides", context["content"])
        self.assertEqual(context["id"], "doc-a,doc-b")

    @patch("services.gemini_caller.call_gemini_with_retry")
    @patch("services.quiz_service.db.get_quiz_attempts", return_value=[])
    @patch("services.material_context.db.get_material")
    def test_quiz_generation_prompt_receives_all_selected_sources(self, get_material, _attempts, gemini_call):
        get_material.side_effect = self.materials.get
        gemini_call.return_value = '[{"type":"short_answer","question":"What isolates an unknown?","correct_answer":"A linear equation","topic":"Algebra"}]'

        questions = generate_quiz("doc-a,doc-b", num_questions=1, difficulty="easy")

        self.assertEqual(len(questions), 1)
        prompt = gemini_call.call_args.kwargs["contents"][0]
        self.assertIn("Algebra.pdf", prompt)
        self.assertIn("Geometry.pdf", prompt)
        self.assertIn("triangle has three sides", prompt)


if __name__ == "__main__":
    unittest.main()
