from __future__ import annotations
import unittest
from engines import SkillGapEngine, SkillEngine


class TestSkillGapEngineUnit(unittest.TestCase):
    """Fast, deterministic unit tests for SkillGapEngine calculations."""

    def setUp(self):
        self.skill_engine = SkillEngine()
        self.gap_engine = SkillGapEngine(self.skill_engine)

    def test_skill_gap_priority_boundaries(self):
        candidate_skills = [{"name": "Docker", "normalized_name": "docker", "proficiency": 0.3}]
        required_skills = [{"name": "Docker", "normalized_name": "docker", "proficiency": 0.8}]
        gaps = self.gap_engine.analyze(candidate_skills, required_skills, candidate_experience_years=1.0)

        self.assertEqual(len(gaps), 1)
        self.assertEqual(gaps[0]["gap"], 0.5)
        self.assertEqual(gaps[0]["priority"], "high")

    def test_proficiency_clamping_in_gap_engine(self):
        candidate_skills = [{"name": "Python", "normalized_name": "python", "proficiency": 5.0}]
        required_skills = [{"name": "Python", "normalized_name": "python", "proficiency": 0.8}]
        gaps = self.gap_engine.analyze(candidate_skills, required_skills)
        self.assertEqual(len(gaps), 0)


if __name__ == "__main__":
    unittest.main()
