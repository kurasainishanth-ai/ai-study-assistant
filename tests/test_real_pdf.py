import sys
import os
import unittest
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from extractors.pdf_extractor import extract_pdf_content

class TestRealPDFExtraction(unittest.TestCase):
    def test_real_pdf_extraction_if_available(self):
        pdf_name = "BayesianParameterEstimation.pdf"
        found = None
        for root, dirs, files in os.walk(os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))):
            if pdf_name in files:
                found = os.path.join(root, pdf_name)
                break

        if not found:
            self.skipTest("Local test PDF BayesianParameterEstimation.pdf not present in workspace.")

        result = extract_pdf_content(found)
        self.assertIsNotNone(result)
        self.assertIn("content", result)

if __name__ == '__main__':
    unittest.main()
