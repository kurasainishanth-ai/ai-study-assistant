import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import unittest
from services.ai_tutor import extract_structured_citations

class TestCitationsGrounding(unittest.TestCase):
    def test_extract_structured_citations_with_pages_and_slides(self):
        doc_content = (
            "--- [Page 1] ---\n"
            "Supervised learning algorithms map inputs to outputs using labeled training datasets.\n\n"
            "--- [Slide 4] ---\n"
            "The cost function measures discrepancy between predictions and ground truth labels.\n\n"
            "--- [Timestamp 00:03:15] ---\n"
            "Gradient descent calculates partial derivatives with respect to each parameter."
        )

        answer_text = (
            "Supervised learning requires labeled datasets [Page 1]. "
            "To measure discrepancy we use a cost function [Slide 4]. "
            "Optimization is performed via partial derivatives [Timestamp 00:03:15]."
        )

        structured = extract_structured_citations(
            answer_text=answer_text,
            doc_content=doc_content,
            source_doc_id="doc_ml_test",
            material_name="Intro to ML"
        )

        self.assertEqual(len(structured), 3)

        # Verify page citation
        page_cit = next((c for c in structured if c["location_type"] == "page"), None)
        self.assertIsNotNone(page_cit)
        self.assertEqual(page_cit["location_val"], "1")
        self.assertEqual(page_cit["source_name"], "Intro to ML")
        self.assertIn("Supervised learning", page_cit["excerpt"])

        # Verify slide citation
        slide_cit = next((c for c in structured if c["location_type"] == "slide"), None)
        self.assertIsNotNone(slide_cit)
        self.assertEqual(slide_cit["location_val"], "4")
        self.assertIn("cost function", slide_cit["excerpt"])

        # Verify timestamp citation
        ts_cit = next((c for c in structured if c["location_type"] == "timestamp"), None)
        self.assertIsNotNone(ts_cit)
        self.assertEqual(ts_cit["location_val"], "00:03:15")
        self.assertIn("Gradient descent", ts_cit["excerpt"])

    def test_citations_empty_when_no_markers(self):
        answer = "This is a general response without citations."
        structured = extract_structured_citations(answer, "Doc content", "doc_1", "Notes")
        self.assertEqual(len(structured), 0)

if __name__ == "__main__":
    unittest.main()
