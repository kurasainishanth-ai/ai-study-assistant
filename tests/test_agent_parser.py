import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import unittest
from agent.parser import parse_model_response

class TestAgentParser(unittest.TestCase):
    def test_valid_json(self):
        json_str = '{"output_type": "text", "summary": "Hello", "title": "Greet"}'
        res = parse_model_response(json_str, False)
        self.assertEqual(res["output_type"], "text")
        self.assertEqual(res["summary"], "Hello")

    def test_unescaped_latex(self):
        # A JSON string that contains unescaped \alpha and \nabla
        # In a raw python string, \\alpha represents a literal backslash followed by alpha
        json_str = '{"output_type": "text", "title": "Gradient Descent", "summary": "Math: \\alpha and \\nabla"}'
        res = parse_model_response(json_str, False)
        self.assertEqual(res["summary"], "Math: \\alpha and \\nabla")

    def test_fenced_json(self):
        json_str = "```json\n{\"output_type\": \"quiz\", \"summary\": \"Quiz time\"}\n```"
        res = parse_model_response(json_str, False)
        self.assertEqual(res["output_type"], "quiz")
        self.assertEqual(res["summary"], "Quiz time")

    def test_missing_fields(self):
        json_str = '{"summary": "No type"}'
        res = parse_model_response(json_str, False)
        self.assertEqual(res["output_type"], "text")
        self.assertEqual(res["title"], "Response")
        self.assertEqual(res["summary"], "No type")

if __name__ == '__main__':
    unittest.main()