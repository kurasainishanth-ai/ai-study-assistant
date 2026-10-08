"""Tests for agent prompt and behavior."""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import unittest
from agent.prompts import build_system_instruction
from agent.parser import parse_model_response


class TestAgentBehavior(unittest.TestCase):
    def test_prompt_includes_key_capabilities(self):
        prompt = build_system_instruction()
        self.assertIn('"flashcard"', prompt)
        self.assertIn('Document-grounded', prompt)
        self.assertIn('General academic', prompt)
        self.assertIn('Out of scope', prompt)
        self.assertIn('Intent detection', prompt)
        self.assertIn('Conversation continuity', prompt)

    def test_parser_allows_flashcards(self):
        json_resp = '{"output_type": "flashcard", "summary": "Here are some flashcards", "flashcard": {"cards": []}}'
        parsed = parse_model_response(json_resp, False)
        self.assertEqual(parsed["output_type"], "flashcard")

    def test_prompt_supports_general_knowledge(self):
        prompt = build_system_instruction()
        self.assertIn('general knowledge', prompt.lower())

    def test_prompt_supports_quiz_intent(self):
        prompt = build_system_instruction()
        self.assertIn('quiz', prompt.lower())


if __name__ == '__main__':
    unittest.main()