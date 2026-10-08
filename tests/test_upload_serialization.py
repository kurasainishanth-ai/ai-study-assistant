import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import unittest
import json
from fastapi.testclient import TestClient
from unittest.mock import patch
from server import app
import os
import tempfile

client = TestClient(app)

class TestUploadSerialization(unittest.TestCase):
    @patch('server.extract_content')
    def test_upload_material_serialization(self, mock_extract):
        mock_extract.return_value = {
            'content': 'Mock PDF Content',
            'images': [{'bytes': b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR', 'ext': 'png'}]
        }
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(b"%PDF-1.4 mock content")
            tmp_path = tmp.name

        try:
            with open(tmp_path, "rb") as f:
                response = client.post("/api/materials/upload", files={"file": ("test.pdf", f, "application/pdf")})
            
            self.assertEqual(response.status_code, 200)
            
            json_resp = response.json()
            self.assertTrue(json_resp["success"])
            self.assertNotIn("data", json_resp["material"])
            self.assertEqual(json_resp["material"]["name"], "test.pdf")
        finally:
            os.remove(tmp_path)

if __name__ == '__main__':
    unittest.main()