from __future__ import annotations
import unittest
from engines import MatchingEngine, SkillEngine
from engines.matching_engine import calculate_effective_experience


class TestMatchingEngineUnit(unittest.TestCase):
    """Fast, deterministic unit tests for MatchingEngine calculations."""

    def setUp(self):
        self.skill_engine = SkillEngine()
        self.matching_engine = MatchingEngine(self.skill_engine)

    def test_calculate_effective_experience_strict_protected_check(self):
        # Protected = True -> Actual work experience is preserved without fake inflation
        exp_protected = calculate_effective_experience(2.0, [{"duration_months": 12, "protected": True}])
        self.assertEqual(exp_protected, 2.0)

        # Protected = False -> Experience NOT restored
        exp_unprotected = calculate_effective_experience(2.0, [{"duration_months": 12, "protected": False}])
        self.assertEqual(exp_unprotected, 2.0)

        # Missing flag -> Experience NOT restored
        exp_missing = calculate_effective_experience(2.0, [{"duration_months": 12}])
        self.assertEqual(exp_missing, 2.0)

    def test_ranking_and_score_bounds(self):
        candidate = {
            "skills": [{"name": "Python", "proficiency": 0.9}, {"name": "SQL", "proficiency": 0.8}],
            "experience_years": 5.0,
            "education": ["Bachelor of Science"],
            "location": "Remote",
        }
        opportunities = [
            {"title": "Low Match", "required_skills": ["C++", "Rust"], "experience_min": 10.0, "location": "Onsite"},
            {"title": "High Match", "required_skills": ["Python", "SQL"], "experience_min": 3.0, "location": "Remote"},
        ]

        ranked = self.matching_engine.rank(candidate, opportunities)
        self.assertEqual(ranked[0]["title"], "High Match")
        self.assertGreater(ranked[0]["compatibility_score"], ranked[1]["compatibility_score"])
        for r in ranked:
            self.assertGreaterEqual(r["compatibility_score"], 0)
            self.assertLessEqual(r["compatibility_score"], 100)


if __name__ == "__main__":
    unittest.main()
