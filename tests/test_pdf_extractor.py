import unittest
from unittest.mock import patch, MagicMock
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from extractors.pdf_extractor import extract_pdf_content, _needs_ocr

class TestPDFExtractor(unittest.TestCase):

    def test_heuristic_normal_text(self):
        text = "This is a normal page of text with standard length lines and no excessive math.\n" * 20
        self.assertFalse(_needs_ocr(text))
        
    def test_heuristic_math_density(self):
        text = "A\n=\nB\n+\nC\n~\n" * 10
        self.assertTrue(_needs_ocr(text)) # high short line density

    def test_heuristic_missing_glyph(self):
        text = "This text has a missing \uFFFD glyph."
        self.assertTrue(_needs_ocr(text))

    @patch('services.ocr_service.ocr_image')
    @patch('os.path.exists')
    def test_pdf_extraction_normal(self, mock_exists, mock_ocr):
        mock_exists.return_value = True
        
        mock_doc = MagicMock()
        mock_doc.__len__.return_value = 1
        
        mock_page = MagicMock()
        mock_page.get_text.return_value = "Normal readable text page with multiple lines.\n" * 15
        mock_page.get_images.return_value = []
        
        mock_doc.__iter__.return_value = [mock_page]
        
        mock_fitz = MagicMock()
        mock_fitz.open.return_value = mock_doc
        
        with patch.dict('sys.modules', {'fitz': mock_fitz}):
            res = extract_pdf_content("dummy.pdf")
            
        self.assertEqual(res['total_units'], 1)
        self.assertIn("--- [Page 1] ---", res['content'])
        self.assertNotIn("(OCR)", res['content'])
        mock_ocr.assert_not_called()

    @patch('services.ocr_service.ocr_image')
    @patch('os.path.exists')
    def test_pdf_extraction_ocr_fallback(self, mock_exists, mock_ocr):
        mock_exists.return_value = True
        
        mock_doc = MagicMock()
        mock_doc.__len__.return_value = 1
        
        mock_page = MagicMock()
        mock_page.get_text.return_value = "a\n=\nb\n+\nc\n" * 10
        mock_page.get_images.return_value = []
        
        mock_pix = MagicMock()
        mock_pix.width = 100
        mock_pix.height = 100
        mock_pix.samples = b'\x00' * 30000
        mock_page.get_pixmap.return_value = mock_pix
        
        mock_doc.__iter__.return_value = [mock_page]
        
        mock_fitz = MagicMock()
        mock_fitz.open.return_value = mock_doc
        
        mock_ocr.return_value = "OCR processed math LaTeX text"
        
        with patch.dict('sys.modules', {'fitz': mock_fitz}):
            res = extract_pdf_content("dummy.pdf")
            
        mock_ocr.assert_called_once()
        self.assertIn("--- [Page 1 (OCR)] ---", res['content'])
        self.assertIn("OCR processed math LaTeX text", res['content'])

    @patch('services.ocr_service.ocr_image')
    @patch('os.path.exists')
    def test_pdf_extraction_ocr_failure(self, mock_exists, mock_ocr):
        mock_exists.return_value = True
        
        mock_doc = MagicMock()
        mock_doc.__len__.return_value = 1
        
        mock_page = MagicMock()
        mock_page.get_text.return_value = "a\n=\nb\n+\nc\n" * 10
        mock_page.get_images.return_value = []
        
        mock_pix = MagicMock()
        mock_pix.width = 100
        mock_pix.height = 100
        mock_pix.samples = b'\x00' * 30000
        mock_page.get_pixmap.return_value = mock_pix
        
        mock_doc.__iter__.return_value = [mock_page]
        
        mock_fitz = MagicMock()
        mock_fitz.open.return_value = mock_doc
        
        mock_ocr.return_value = "[OCR Failed: Something broke]"
        
        with patch.dict('sys.modules', {'fitz': mock_fitz}):
            res = extract_pdf_content("dummy.pdf")
            
        mock_ocr.assert_called_once()
        self.assertIn("--- [Page 1] ---", res['content'])
        self.assertNotIn("OCR processed", res['content'])
        self.assertIn("a\n=\nb", res['content'])

if __name__ == '__main__':
    unittest.main()
