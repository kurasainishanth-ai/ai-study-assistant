import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import os
import tempfile
import unittest

import db


class StudyOutputPersistenceTests(unittest.TestCase):
    def setUp(self):
        self.previous_path = db.DB_PATH
        self.path = os.path.join(tempfile.gettempdir(), "studyverse_output_persistence_test.db")
        if os.path.exists(self.path):
            try:
                os.remove(self.path)
            except PermissionError:
                pass
        db.DB_PATH = self.path
        db.init_db()

    def tearDown(self):
        db.DB_PATH = self.previous_path
        if os.path.exists(self.path):
            try:
                os.remove(self.path)
            except PermissionError:
                pass

    def test_quiz_and_map_restore_independently_by_document(self):
        db.save_generated_quiz("biology", [{"id": 1, "question": "What is a cell?"}])
        db.save_generated_quiz("physics", [{"id": 1, "question": "What is force?"}])
        db.save_knowledge_map("biology", {"nodes": [{"id": "cell", "label": "Cell"}], "edges": []})

        self.assertEqual(db.get_generated_quiz("biology")["questions"][0]["question"], "What is a cell?")
        self.assertEqual(db.get_generated_quiz("physics")["questions"][0]["question"], "What is force?")
        self.assertEqual(db.get_knowledge_map("biology")["nodes"][0]["label"], "Cell")
        self.assertIsNone(db.get_knowledge_map("physics"))


if __name__ == "__main__":
    unittest.main()
