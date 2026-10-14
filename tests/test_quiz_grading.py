import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from services.quiz_service import _choice_is_correct, _numeric_is_correct, evaluate_quiz


class TestQuizGrading(unittest.TestCase):
    def test_answer_text_matches_labeled_selected_option(self):
        self.assertTrue(_choice_is_correct("B) Paris", "Paris", ["A) Berlin", "B) Paris"]))

    def test_answer_label_matches_selected_option_text(self):
        self.assertTrue(_choice_is_correct("B) Paris", "B", ["A) Berlin", "B) Paris"]))

    def test_different_choice_is_not_accepted(self):
        self.assertFalse(_choice_is_correct("A) Berlin", "Paris", ["A) Berlin", "B) Paris"]))

    def test_numeric_grading_accepts_small_rounding_difference(self):
        self.assertTrue(_numeric_is_correct("3.141", "3.14", "0.002"))

    def test_numeric_grading_respects_tolerance_and_units(self):
        self.assertFalse(_numeric_is_correct("3.2 m", "3.14 m", "0.01"))
        self.assertFalse(_numeric_is_correct("3.14 s", "3.14 m", "0.01"))

    def test_numeric_grading_accepts_scientific_notation(self):
        self.assertTrue(_numeric_is_correct("1.2e3", "1200", "0.1"))

    def test_numeric_grading_rejects_unreasonably_large_tolerance(self):
        self.assertFalse(_numeric_is_correct("99", "100", "Infinity"))
        self.assertFalse(_numeric_is_correct("99", "100", "50"))

    @patch("services.quiz_service.db.save_quiz_attempt")
    @patch("services.quiz_service.db.get_material", return_value={"name": "Geography"})
    def test_evaluation_counts_matching_option_text_as_correct(self, _material, _save):
        result = evaluate_quiz(
            "doc1",
            [{"id": 1, "type": "mcq", "question": "Capital?", "options": ["A) Berlin", "B) Paris"], "correct_answer": "Paris", "topic": "Capitals"}],
            {"1": "B) Paris"},
        )
        self.assertEqual(result["score"], 1)
        self.assertTrue(result["evaluations"][0]["is_correct"])

    @patch("services.quiz_service.db.save_quiz_attempt")
    @patch("services.quiz_service.db.get_material", return_value={"name": "Physics"})
    def test_numerical_quiz_answers_are_graded_deterministically(self, _material, _save):
        result = evaluate_quiz(
            "doc1",
            [{"id": 1, "type": "numerical", "question": "Calculate speed", "correct_answer": "3.14 m/s", "tolerance": 0.01, "topic": "Motion"}],
            {"1": "3.145 m/s"},
        )
        self.assertEqual(result["score"], 1)
        self.assertTrue(result["evaluations"][0]["is_correct"])


if __name__ == "__main__":
    unittest.main()
