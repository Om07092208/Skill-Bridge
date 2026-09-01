from __future__ import annotations
import unittest
from engines import MatchingEngine, SkillEngine
from engines.matching_engine import calculate_effective_experience, evaluate_education_match, evaluate_role_match
from models.normalizers import normalize_single_education, is_known_country


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


    def test_multi_field_education_matching(self):
        # Candidate with joint AI + ML degree matching Machine Learning requirement
        cand_edu = "B.Tech in Artificial Intelligence and Machine Learning"
        req_edu = "Machine Learning"
        score = evaluate_education_match(cand_edu, req_edu)
        # Degree level bachelor (base=1.0) + exact match on machine_learning (boost +0.10) => 1.0
        self.assertEqual(score, 1.0)

    def test_education_parent_field_pruning(self):
        # "Bachelor of Engineering in Computer Science" should detect computer_science and prune engineering
        edu = normalize_single_education("Bachelor of Engineering in Computer Science")
        self.assertIn("computer_science", edu.fields)
        self.assertNotIn("engineering", edu.fields)
        self.assertEqual(edu.primary_field, "computer_science")

    def test_evaluate_role_match_zero_overlap_fix(self):
        # Completely unrelated roles must return 0.0, not 0.30
        score = evaluate_role_match("Machine Learning Engineer", "HR Manager")
        self.assertEqual(score, 0.0)

    def test_evaluate_role_match_seniority_modifiers(self):
        # Seniority modifier stripped -> core titles match
        score = evaluate_role_match("Data Scientist", "Senior Data Scientist")
        self.assertEqual(score, 0.95)

    def test_evaluate_role_match_aliases(self):
        # Software Engineer vs Backend Developer match via role alias group
        score = evaluate_role_match("Software Engineer", "Backend Developer")
        self.assertEqual(score, 0.85)

    def test_known_country_lookup(self):
        self.assertTrue(is_known_country("Germany"))
        self.assertTrue(is_known_country("USA"))
        self.assertFalse(is_known_country("Atlantis"))


if __name__ == "__main__":
    unittest.main()
