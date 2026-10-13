import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import unittest
from services.quiz_service import (
    compute_question_fingerprint,
    validate_question_preflight,
    evaluate_numerical_answer
)

class TestAdaptiveQuiz(unittest.TestCase):
    def test_compute_fingerprint_normalization(self):
        fp1 = compute_question_fingerprint("What is Gradient Descent?")
        fp2 = compute_question_fingerprint("what is gradient descent?   ")
        fp3 = compute_question_fingerprint("What IS gradient descent?!")
        self.assertEqual(fp1, fp2)
        self.assertEqual(fp1, fp3)

    def test_preflight_validation_mcq(self):
        doc = "Gradient descent optimizes neural networks."
        valid_mcq = {
            "question": "Which algorithm minimizes loss in neural networks?",
            "type": "mcq",
            "options": ["Gradient Descent", "Bubble Sort", "Linear Search", "Dijkstra"],
            "correct_answer": "Gradient Descent",
            "topic": "Optimization",
            "rationale": "Gradient descent computes gradients to minimize loss."
        }
        res = validate_question_preflight(valid_mcq, doc)
        self.assertIsNotNone(res)
        self.assertEqual(res["type"], "mcq")
        self.assertTrue(len(res["fingerprint"]) > 0)

    def test_preflight_rejects_duplicate_distractors(self):
        doc = "Testing duplicate options"
        bad_mcq = {
            "question": "What is 2+2?",
            "type": "mcq",
            "options": ["4", "4", "3", "5"],
            "correct_answer": "4"
        }
        res = validate_question_preflight(bad_mcq, doc)
        self.assertIsNone(res)

    def test_preflight_validation_numerical(self):
        doc = "Ohm's Law: V = I * R. With 10V and 2 Ohms, current is 5A."
        num_q = {
            "question": "Calculate current I when V = 10V and R = 2 Ohms.",
            "type": "numerical",
            "correct_answer": "5.0",
            "tolerance": 0.05,
            "topic": "Circuits"
        }
        res = validate_question_preflight(num_q, doc)
        self.assertIsNotNone(res)
        self.assertEqual(res["type"], "numerical")

    def test_evaluate_numerical_within_tolerance(self):
        self.assertTrue(evaluate_numerical_answer("5.0", "5.0", tolerance=0.05))
        self.assertTrue(evaluate_numerical_answer("5.02", "5.0", tolerance=0.05))
        self.assertTrue(evaluate_numerical_answer("4.98 A", "5.0", tolerance=0.05))
        self.assertFalse(evaluate_numerical_answer("6.0", "5.0", tolerance=0.05))

if __name__ == "__main__":
    unittest.main()
