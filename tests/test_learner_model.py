import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from services.learner_model import estimate_topic_mastery


class TestLearnerModel(unittest.TestCase):
    def test_beta_prior_avoids_absolute_mastery_from_one_attempt(self):
        mastery = estimate_topic_mastery([
            {"topic_breakdown": {"Recursion": {"correct": 1, "total": 1}}},
        ])
        self.assertEqual(mastery["Recursion"]["average_score"], 66.7)
        self.assertEqual(mastery["Recursion"]["attempts"], 1)

    def test_recent_attempts_have_more_influence(self):
        mastery = estimate_topic_mastery([
            {"topic_breakdown": {"Recursion": {"correct": 0, "total": 1}}},
            {"topic_breakdown": {"Recursion": {"correct": 1, "total": 1}}},
        ])
        self.assertLess(mastery["Recursion"]["average_score"], 50)

    def test_repeated_successes_build_confidence_to_mastered(self):
        mastery = estimate_topic_mastery([
            {"topic_breakdown": {"Sorting": {"correct": 1, "total": 1}}}
            for _ in range(6)
        ])
        self.assertEqual(mastery["Sorting"]["status"], "Mastered")


if __name__ == "__main__":
    unittest.main()
