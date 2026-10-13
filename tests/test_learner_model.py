import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import unittest
from services.learner_model import (
    update_bkt_posterior,
    compute_uncertainty,
    get_scaffolding_recommendation
)

class TestLearnerModel(unittest.TestCase):
    def test_bkt_posterior_increases_on_correct(self):
        p_init = 0.25
        p_next = update_bkt_posterior(p_init, is_correct=True, p_g=0.20, p_s=0.10, p_t=0.15)
        # Correct answer should significantly increase belief in mastery
        self.assertGreater(p_next, p_init)
        self.assertGreater(p_next, 0.50)

    def test_bkt_posterior_decreases_on_incorrect(self):
        p_init = 0.60
        p_next = update_bkt_posterior(p_init, is_correct=False, p_g=0.20, p_s=0.10, p_t=0.15)
        # Incorrect answer should reduce belief in mastery
        self.assertLess(p_next, p_init)

    def test_uncertainty_and_confidence(self):
        unc_cold, conf_cold = compute_uncertainty(0.25, 0)
        unc_trained, conf_trained = compute_uncertainty(0.90, 8)
        self.assertGreater(unc_cold, unc_trained)
        self.assertGreater(conf_trained, conf_cold)

    def test_scaffolding_levels(self):
        scaff_low = get_scaffolding_recommendation("Topic A", student_id="test_mock_1")
        # Cold start defaults to beginner level scaffolding
        self.assertIn("level", scaff_low)
        self.assertIn("guidance", scaff_low)
        self.assertIn("recommended_quiz_difficulty", scaff_low)

if __name__ == "__main__":
    unittest.main()
