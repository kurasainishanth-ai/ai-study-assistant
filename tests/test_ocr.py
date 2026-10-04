import unittest
from unittest.mock import patch, MagicMock
from PIL import Image
from extractors.pdf_extractor import extract_pdf_content
from extractors.image_extractor import extract_image_content
from extractors.ppt_extractor import extract_ppt_content
from services.ocr_service import ocr_image

class TestOCRIntegration(unittest.TestCase):
    @patch('services.ocr_service.call_gemini_with_retry')
    def test_ocr_image(self, mock_gemini):
        mock_gemini.return_value = "Mocked OCR Handwritten Text"
        img = Image.new('RGB', (100, 100))
        result = ocr_image(img)
        self.assertIn("Mocked OCR Handwritten Text", result)

    @patch('services.ocr_service.ocr_image')
    @patch('extractors.image_extractor.Image.open')
    @patch('os.path.exists')
    def test_image_extractor(self, mock_exists, mock_open, mock_ocr):
        mock_exists.return_value = True
        mock_img = MagicMock()
        mock_img.format = "PNG"
        mock_img.width = 100
        mock_img.height = 100
        mock_open.return_value = mock_img
        mock_ocr.return_value = "Mocked OCR Handwriting"
        
        data = extract_image_content("dummy.png")
        self.assertEqual(data["type"], "text")
        self.assertEqual(data["content"], "Mocked OCR Handwriting")
        self.assertEqual(data["unit_name"], "image")

if __name__ == '__main__':
    unittest.main()
