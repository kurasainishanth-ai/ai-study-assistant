"""Comprehensive tests for the agent JSON parser."""
import unittest
from agent.parser import (
    parse_model_response, validate_response, 
    _fix_json_backslashes, _strip_markdown_fences,
    _fix_latex_collisions
)


class TestStripMarkdownFences(unittest.TestCase):
    def test_strips_json_fence(self):
        text = '```json\n{"a": 1}\n```'
        self.assertEqual(_strip_markdown_fences(text), '{"a": 1}')
    
    def test_strips_plain_fence(self):
        text = '```\n{"a": 1}\n```'
        self.assertEqual(_strip_markdown_fences(text), '{"a": 1}')
    
    def test_no_fence(self):
        text = '{"a": 1}'
        self.assertEqual(_strip_markdown_fences(text), '{"a": 1}')


class TestFixJsonBackslashes(unittest.TestCase):
    def test_fixes_latex_alpha(self):
        result = _fix_json_backslashes('\\alpha')
        self.assertIn('\\\\', result)
    
    def test_preserves_valid_newline(self):
        # \n is a valid JSON escape and should be preserved
        result = _fix_json_backslashes('\\n')
        self.assertEqual(result, '\\n')
    
    def test_preserves_valid_tab(self):
        result = _fix_json_backslashes('\\t')
        self.assertEqual(result, '\\t')


class TestFixLatexCollisions(unittest.TestCase):
    def test_fixes_nabla(self):
        result = _fix_latex_collisions('\\nabla')
        self.assertIn('\\\\n', result)
    
    def test_fixes_theta(self):
        result = _fix_latex_collisions('\\theta')
        self.assertIn('\\\\t', result)
    
    def test_fixes_beta(self):
        result = _fix_latex_collisions('\\beta')
        self.assertIn('\\\\b', result)
    
    def test_fixes_frac(self):
        result = _fix_latex_collisions('\\frac')
        self.assertIn('\\\\f', result)
    
    def test_preserves_real_newline(self):
        # A real \n (newline) NOT followed by abla etc should be preserved
        result = _fix_latex_collisions('line1\\nline2')
        self.assertEqual(result, 'line1\\nline2')


class TestParseModelResponse(unittest.TestCase):
    def test_valid_json(self):
        text = '{"output_type": "text", "title": "Hello", "summary": "Hi there"}'
        result = parse_model_response(text, False)
        self.assertEqual(result['output_type'], 'text')
        self.assertEqual(result['summary'], 'Hi there')
    
    def test_json_with_latex_backslashes(self):
        # Simulates Gemini returning \alpha (invalid JSON escape) 
        text = '{"output_type": "text", "title": "Math", "summary": "Uses \\alpha and \\nabla"}'
        result = parse_model_response(text, False)
        self.assertEqual(result['output_type'], 'text')
        self.assertIn('alpha', result['summary'])
        self.assertIn('nabla', result['summary'])
    
    def test_fenced_json(self):
        text = '```json\n{"output_type": "quiz", "title": "Test", "summary": "Quiz time"}\n```'
        result = parse_model_response(text, False)
        self.assertEqual(result['output_type'], 'quiz')
    
    def test_missing_output_type_defaults_to_text(self):
        text = '{"summary": "Hello"}'
        result = parse_model_response(text, False)
        self.assertEqual(result['output_type'], 'text')
        self.assertEqual(result['title'], 'Response')
    
    def test_empty_response_raises(self):
        with self.assertRaises(ValueError):
            parse_model_response('', False)
    
    def test_truncated_response(self):
        result = parse_model_response('{"output_type": "text", "summary": "incom', True)
        self.assertEqual(result['output_type'], 'text')
        self.assertIn('truncated', result['summary'].lower())
    
    def test_invalid_json_not_truncated_raises(self):
        with self.assertRaises(ValueError):
            parse_model_response('This is not JSON at all', False)
    
    def test_flashcard_type(self):
        text = '{"output_type": "flashcard", "title": "Cards", "summary": "Here are cards", "flashcard": {"cards": [{"front": "Q", "back": "A"}]}}'
        result = parse_model_response(text, False)
        self.assertEqual(result['output_type'], 'flashcard')
        self.assertIsNotNone(result['flashcard'])
    
    def test_json_with_extra_text_before(self):
        text = 'Here is the response:\n{"output_type": "text", "title": "Hi", "summary": "Hello"}'
        result = parse_model_response(text, False)
        self.assertEqual(result['summary'], 'Hello')
    
    def test_properly_escaped_latex(self):
        # This is what well-behaved Gemini output looks like (double-escaped)
        text = '{"output_type": "text", "title": "Math", "summary": "Formula: $\\\\alpha + \\\\beta = \\\\gamma$"}'
        result = parse_model_response(text, False)
        self.assertIn('alpha', result['summary'])
    
    def test_greeting(self):
        text = '{"output_type": "text", "title": "Greeting", "summary": "Hello! How can I help you study today?"}'
        result = parse_model_response(text, False)
        self.assertEqual(result['output_type'], 'text')
        self.assertIn('Hello', result['summary'])

    def test_table_output(self):
        text = '{"output_type": "table", "title": "Comparison", "summary": "Here is a comparison:", "table": {"columns": ["A", "B"], "rows": [["1", "2"]]}}'
        result = parse_model_response(text, False)
        self.assertEqual(result['output_type'], 'table')
        self.assertIsNotNone(result['table'])


class TestValidateResponse(unittest.TestCase):
    def test_unknown_type_becomes_text(self):
        result = validate_response({'output_type': 'unknown', 'summary': 'test'})
        self.assertEqual(result['output_type'], 'text')
    
    def test_missing_title_gets_default(self):
        result = validate_response({'output_type': 'text', 'summary': 'test'})
        self.assertEqual(result['title'], 'Response')
    
    def test_all_output_types_pass(self):
        for t in ['text', 'table', 'flowchart', 'quiz', 'flashcard', 'pdf_document']:
            result = validate_response({'output_type': t, 'title': 'T', 'summary': 'S'})
            self.assertEqual(result['output_type'], t)
    
    def test_non_string_summary(self):
        result = validate_response({'output_type': 'text', 'summary': 123})
        self.assertEqual(result['summary'], '')


if __name__ == '__main__':
    unittest.main()
