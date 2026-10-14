import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from services.ai_tutor import _citation_sources, _cross_feature_study_context, _focus_topic_snapshot, ask_ai_tutor, retrieve_relevant_chunks


class TestTutorFocusSnapshot(unittest.TestCase):
    def test_rag_retrieves_matching_passage_with_source_reference(self):
        selected = [{
            "id": "doc1", "name": "Neural Networks.pdf", "status": "Ready",
            "content": "--- [Page 1] ---\nA neuron applies an activation function to a weighted sum.\n\n"
                       "--- [Page 2] ---\nMatrix multiplication combines weights and input vectors.",
        }]

        chunks = retrieve_relevant_chunks("How does an activation function work?", selected)

        self.assertTrue(chunks)
        self.assertEqual(chunks[0]["source"], "Neural Networks.pdf")
        self.assertEqual(chunks[0]["reference"], "[Page 1]")
        self.assertIn("activation function", chunks[0]["text"])
        self.assertNotIn("Page 2", chunks[0]["reference"])

    def test_rag_does_not_pull_unselected_sources(self):
        selected = [{"id": "doc1", "name": "Selected.pdf", "content": "[Page 1] ReLU returns max of zero and its input."}]
        chunks = retrieve_relevant_chunks("Explain ReLU", selected)
        self.assertTrue(chunks)
        self.assertTrue(all(chunk["source"] == "Selected.pdf" for chunk in chunks))

    def test_same_page_number_resolves_to_each_exact_source(self):
        citation_sources = _citation_sources(["[Page 3]"], [
            {"source_id": "doc-a", "source": "Algebra.pdf", "reference": "[Page 3]"},
            {"source_id": "doc-b", "source": "Geometry.pdf", "reference": "[Page 3]"},
        ])
        self.assertEqual({item["source_id"] for item in citation_sources}, {"doc-a", "doc-b"})

    def test_rag_rejects_generic_overlap_for_an_uncovered_topic(self):
        selected = [{
            "id": "doc1", "name": "Neural Networks.mp4", "status": "Ready",
            "content": "[01:35] Neural networks contain layers of neurons and activation functions.",
        }]
        chunks = retrieve_relevant_chunks("Does the selected neural-network video explain CRISPR gene editing?", selected)
        self.assertEqual(chunks, [])

    def test_single_attempt_weak_topics_are_preserved_and_sorted_first(self):
        snapshot = _focus_topic_snapshot([
            {"topic_breakdown": {
                "Weights and Biases": {"correct": 1, "total": 1},
                "Input Layer and Activations": {"correct": 0, "total": 1},
                "Activation Functions and ReLU": {"correct": 0, "total": 1},
            }},
        ])

        self.assertEqual(snapshot[0], {"topic": "Activation Functions and ReLU", "accuracy": 33.3, "attempts": 1})
        self.assertEqual(snapshot[1], {"topic": "Input Layer and Activations", "accuracy": 33.3, "attempts": 1})
        self.assertEqual(snapshot[2]["accuracy"], 66.7)

    def test_recent_topic_scores_weight_newer_attempts_more(self):
        snapshot = _focus_topic_snapshot([
            {"topic_breakdown": {"Recursion": {"correct": 2, "total": 2}}},
            {"topic_breakdown": {"Recursion": {"correct": 0, "total": 1}}},
        ])

        self.assertEqual(snapshot[0], {"topic": "Recursion", "accuracy": 62.5, "attempts": 2})

    @patch("services.ai_tutor.db.get_infographic", return_value=None)
    @patch("services.ai_tutor.db.get_knowledge_map", return_value=None)
    @patch("services.ai_tutor.db.get_revision_plan", return_value=None)
    @patch("services.ai_tutor.db.get_notes_for_material", return_value=[])
    def test_context_explicitly_reports_when_no_schedule_exists(self, _notes, _plan, _map, _infographic):
        context = _cross_feature_study_context(["doc_without_plan"], "doc_without_plan", [])
        self.assertIn("No saved revision plan exists", context)
        self.assertIn("do not claim that tasks or dates are already scheduled", context)

    @patch("services.gemini_caller.call_gemini_with_retry", return_value="Prioritize Input Layer and Activations.")
    @patch("services.ai_tutor.db.record_learning_event")
    @patch("services.ai_tutor.db.save_chat_message")
    @patch("services.ai_tutor.db.get_learning_events", return_value=[])
    @patch("services.ai_tutor.db.get_infographic", return_value={"type": "concept map", "data": {"summary": "Connect activation functions to outputs."}})
    @patch("services.ai_tutor.db.get_knowledge_map", return_value={"nodes": [{"label": "ReLU"}]})
    @patch("services.ai_tutor.db.get_revision_plan", return_value={"plan_data": {
        "doc_name": "Neural Networks", "exam_date": "2026-11-01", "completion_percentage": 20,
        "days": [{"date_display": "Wed, Oct 14", "tasks": [{"topic": "Input Layer and Activations", "completed": False}]}],
    }})
    @patch("services.ai_tutor.db.get_notes_for_material", return_value=[{"style_title": "Key Concepts", "content": "Input layers receive feature values."}])
    @patch("services.ai_tutor.db.get_flashcards", return_value=[{"doc_id": "doc1", "topic": "Input Layer and Activations", "rating": "difficult"}])
    @patch("services.ai_tutor.db.get_quiz_attempts")
    @patch("services.ai_tutor.db.get_chat_history", return_value=[])
    @patch("services.ai_tutor.db.ensure_chat_session")
    @patch("services.ai_tutor.db.get_material", return_value={
        "name": "Neural Networks.txt", "status": "Ready",
        "content": "--- [Page 3] ---\nInput Layer and Activations: input neurons receive feature values before activation functions are applied.",
    })
    @patch("services.ai_tutor.db.get_chat_session", return_value=None)
    def test_focus_question_passes_study_studio_context_to_tutor(self, _session, _material, _ensure, _history,
                                                                 get_attempts, _cards, _notes, _plan, _map,
                                                                 _infographic, _events, _save_message, _record_event,
                                                                 gemini_call):
        get_attempts.return_value = [{
            "doc_id": "doc1",
            "topic_breakdown": {
                "Input Layer and Activations": {"correct": 0, "total": 1},
                "Weights and Biases": {"correct": 1, "total": 1},
            },
            "details": [],
        }]

        result = ask_ai_tutor(
            "chat_test", "Tell me where I'm behind and what I should focus on.",
            source_doc_id="doc1", tutor_mode="teaching",
        )

        self.assertIn("Input Layer and Activations", result["answer"])
        prompt = gemini_call.call_args.kwargs["contents"][0]
        system_instruction = gemini_call.call_args.kwargs["system_instruction"]
        self.assertIn("Input Layer and Activations: 33.3%", prompt)
        self.assertIn("REFERENCE: [Page 3]", prompt)
        self.assertIn("input neurons receive feature values", prompt)
        self.assertIn("Input layers receive feature values", prompt)
        self.assertIn("Next incomplete scheduled revision tasks", prompt)
        self.assertIn("Flashcard history", prompt)
        self.assertIn("ReLU", prompt)
        self.assertIn("Connect activation functions to outputs", prompt)
        self.assertIn("do not change, move, or regenerate its dates/tasks", system_instruction)
        self.assertIn("Do not give a menu of weak topics and ask the student to choose", system_instruction)
        self.assertIn("dominant language used in the student's latest message", system_instruction)
        self.assertIn("Roman Telugu", system_instruction)


if __name__ == "__main__":
    unittest.main()
