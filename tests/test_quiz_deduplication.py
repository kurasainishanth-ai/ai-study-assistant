import unittest
from unittest.mock import patch, MagicMock
import os
import sys
import json
import sqlite3

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import db
from services.quiz_service import generate_quiz

shared_conn = sqlite3.connect(":memory:", check_same_thread=False)
shared_conn.row_factory = sqlite3.Row

class TestQuizDeduplication(unittest.TestCase):
    def setUp(self):
        # Monkey-patch get_connection
        self.original_get_connection = db.get_connection
        db.get_connection = lambda: shared_conn
        
        # Clear all tables for isolation
        with shared_conn:
            shared_conn.execute("DROP TABLE IF EXISTS materials")
            shared_conn.execute("DROP TABLE IF EXISTS quiz_attempts")
            
        db.init_db()
        db.save_material({
            "id": "doc_dedup",
            # Material loading filters unsupported names; use a supported suffix.
            "name": "Testing Context.txt",
            "type": "Text",
            "size_kb": 10,
            "upload_time": "Now",
            "data": {"content": "This is test content for deduplication."},
            "status": "Ready",
            "error": None
        })

    def tearDown(self):
        db.get_connection = self.original_get_connection

    def test_quiz_mistakes_are_saved_in_shared_learner_memory(self):
        db.save_quiz_attempt(
            doc_id="doc_dedup",
            doc_name="Testing Context",
            score=0,
            total_questions=1,
            topic_breakdown={"recursion": {"correct": 0, "total": 1}},
            details=[{
                "topic": "recursion",
                "question": "What is the base case?",
                "student_answer": "The recursive call",
                "correct_answer": "The stopping condition",
                "is_correct": False,
                "misconception_analysis": "The recursive call is being confused with the stopping condition.",
            }],
        )

        events = db.get_learning_events(["doc_dedup"], limit=10)
        quiz_event = next(event for event in events if event["activity_type"] == "quiz_submitted")
        mistake = quiz_event["details"]["incorrect_answers"][0]
        self.assertEqual(mistake["topic"], "recursion")
        self.assertEqual(mistake["student_answer"], "The recursive call")
        self.assertEqual(mistake["correct_answer"], "The stopping condition")
        self.assertIn("stopping condition", mistake["misconception"])

    @patch('services.gemini_caller.call_gemini_with_retry')
    def test_empty_history(self, mock_gemini):
        # Mock returns 3 unique questions
        mock_gemini.return_value = json.dumps([
            {"type": "mcq", "question": "Q1", "options": ["A","B"], "correct_answer": "A"},
            {"type": "mcq", "question": "Q2", "options": ["C","D"], "correct_answer": "C"},
            {"type": "mcq", "question": "Q3", "options": ["E","F"], "correct_answer": "E"}
        ])
        
        result = generate_quiz("doc_dedup", num_questions=3)
        self.assertEqual(len(result), 3)
        self.assertEqual(result[0]["question"], "Q1")
        self.assertEqual(result[1]["question"], "Q2")
        self.assertEqual(result[2]["question"], "Q3")
        
        # Verify prompt did not include DEDUPLICATION block
        prompt_used = mock_gemini.call_args.kwargs.get('contents')[0]
        self.assertNotIn("CRITICAL RULE - DEDUPLICATION", prompt_used)

    @patch('services.gemini_caller.call_gemini_with_retry')
    def test_requested_hard_difficulty_and_count_reach_generation_prompt(self, mock_gemini):
        mock_gemini.return_value = json.dumps([
            {"type": "short_answer", "question": question, "options": [], "correct_answer": f"Answer {i}"}
            for i, question in enumerate([
                "Define the alpha operator?", "Why is beta transformation invertible?",
                "When does gamma convergence hold?", "Contrast delta and epsilon stability?",
                "How can zeta recursion terminate?",
            ], start=1)
        ])

        result = generate_quiz("doc_dedup", num_questions=5, difficulty="hard")

        self.assertEqual(len(result), 5)
        prompt = mock_gemini.call_args.kwargs["contents"][0]
        self.assertIn("Generate 5 questions with difficulty 'hard'", prompt)
        self.assertIn("multi-step reasoning", prompt)

    def test_invalid_difficulty_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "difficulty must be"):
            generate_quiz("doc_dedup", difficulty="expert")

    @patch('services.gemini_caller.call_gemini_with_retry')
    def test_exact_and_semantic_duplicates(self, mock_gemini):
        # Seed history
        db.save_quiz_attempt(
            doc_id="doc_dedup",
            doc_name="Testing Context",
            score=0, total_questions=2, topic_breakdown={},
            details=[
                {"question": "What is the capital of France?"},
                {"question": "How many states are in the USA?"}
            ]
        )

        def side_effect(*args, **kwargs):
            prompt = kwargs.get('contents')[0]
            if "CRITICAL RULE - DEDUPLICATION" in prompt:
                # LLM ignores instructions and returns one exact dup, one semantic dup, and one new
                return json.dumps([
                    {"type": "short_answer", "question": "What is the capital of France?", "options": [], "correct_answer": "Paris"},
                    {"type": "short_answer", "question": "How many states in the US?", "options": [], "correct_answer": "50"},
                    {"type": "short_answer", "question": "Which city serves as the official capital of Germany?", "options": [], "correct_answer": "Berlin"}
                ])
            return "[]"

        mock_gemini.side_effect = side_effect
        
        result = generate_quiz("doc_dedup", num_questions=3) # asks for 3
        # Should filter out the first two, keeping only the 3rd.
        print('RESULT:', result); self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["question"], "Which city serves as the official capital of Germany?")
        
    @patch('services.gemini_caller.call_gemini_with_retry')
    def test_intra_batch_duplicates(self, mock_gemini):
        # LLM returns duplicates within the same batch
        mock_gemini.return_value = json.dumps([
            {"type": "short_answer", "question": "What is 2+2?", "options": [], "correct_answer": "4"},
            {"type": "short_answer", "question": "What is 2 + 2?", "options": [], "correct_answer": "4"},
            {"type": "short_answer", "question": "Calculate the product of 7 and 8.", "options": [], "correct_answer": "6"}
        ])
        
        result = generate_quiz("doc_dedup", num_questions=3)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["question"], "What is 2+2?")
        self.assertEqual(result[1]["question"], "Calculate the product of 7 and 8.")

    @patch('services.gemini_caller.call_gemini_with_retry', return_value=json.dumps([
        {"type": "numerical", "question": "Compute 2 + 2", "correct_answer": "4", "tolerance": 0.01, "topic": "Arithmetic"}
    ]))
    def test_numerical_questions_are_preserved_with_tolerance(self, _mock_gemini):
        result = generate_quiz("doc_dedup", num_questions=1)
        self.assertEqual(result[0]["type"], "numerical")
        self.assertEqual(result[0]["tolerance"], 0.01)

    @patch('services.gemini_caller.call_gemini_with_retry', return_value=json.dumps([
        {"type": "mcq", "question": "Capital?", "options": ["A) Berlin", "B) Rome"], "correct_answer": "Paris"}
    ]))
    def test_invalid_mcq_answer_key_is_filtered(self, _mock_gemini):
        self.assertEqual(generate_quiz("doc_dedup", num_questions=1), [])

if __name__ == '__main__':
    unittest.main()



