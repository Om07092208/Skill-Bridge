from __future__ import annotations
import unittest
from engines import ReadinessEngine, SkillEngine


class TestReadinessEngineUnit(unittest.TestCase):
    """Fast, deterministic unit tests for ReadinessEngine calculations."""

    def setUp(self):
        self.skill_engine = SkillEngine()
        self.readiness_engine = ReadinessEngine(self.skill_engine)

    def test_readiness_score_bounds_and_clamping(self):
        candidate = {
            "name": "Test Candidate",
            "experience_years": 3.0,
            "education": ["Bachelor"],
            "skills": [
                {"name": "Python", "normalized_name": "python", "proficiency": 2.5}, # Out of bounds
            ]
        }
        target_role = {
            "name": "Data Analyst",
            "required_skills": [{"name": "Python", "normalized_name": "python", "proficiency": 0.8}],
            "experience_min": 2.0,
        }

        readiness = self.readiness_engine.calculate(candidate, target_role)
        self.assertGreaterEqual(readiness["readiness_score"], 0)
        self.assertLessEqual(readiness["readiness_score"], 100)


if __name__ == "__main__":
    unittest.main()
