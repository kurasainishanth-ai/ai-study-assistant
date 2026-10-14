import os
import sys
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

from scripts.evaluate_personalization import run_simulation


class TestPersonalizationEvaluation(unittest.TestCase):
    def test_simulation_is_repeatable_and_reports_bounded_metrics(self):
        first = run_simulation(seed=7, sessions=3)
        second = run_simulation(seed=7, sessions=3)
        self.assertEqual(first, second)
        self.assertEqual(first["profiles"], 12)
        self.assertEqual(first["sessions_per_arm"], 3)
        self.assertGreaterEqual(first["weakest_topic_selection_accuracy"], 0)
        self.assertLessEqual(first["weakest_topic_selection_accuracy"], 1)
        self.assertEqual(first["repetition_rate_after_filter"], 0)
        self.assertIn("adaptive_minus_random_simulated_gain_points", first)
        self.assertIn("synthetic", first["scope"])


if __name__ == "__main__":
    unittest.main()
