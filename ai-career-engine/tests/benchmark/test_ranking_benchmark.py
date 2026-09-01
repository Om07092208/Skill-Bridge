from __future__ import annotations
import unittest
from engines import MatchingEngine, SkillEngine
from engines.matching_engine import evaluate_role_match


class TestSystemMatchingBenchmark(unittest.TestCase):
    """System-level benchmark evaluating candidate ↔ opportunity ranking metrics across 8 core categories."""

    def setUp(self):
        self.skill_engine = SkillEngine()
        self.matching_engine = MatchingEngine(self.skill_engine)

    def test_category_1_exact_role_match(self):
        """Exact role matches should yield perfect role score (1.0)."""
        score = evaluate_role_match("Backend Developer", "Backend Developer")
        self.assertEqual(score, 1.0)

    def test_category_2_same_specialization_aliases(self):
        """Aliases within the same specialization key should yield 0.90."""
        score = evaluate_role_match("Backend Developer", "Backend Engineer")
        self.assertEqual(score, 0.90)

    def test_category_3_related_specializations(self):
        """Explicit related specializations (e.g. Backend ↔ Full Stack) should yield configured similarity (0.75)."""
        score = evaluate_role_match("Backend Developer", "Full Stack Developer")
        self.assertEqual(score, 0.75)

    def test_category_4_same_family_different_specialization(self):
        """Unmapped intra-family specializations (e.g. Frontend ↔ Backend) should yield default intra-family score (0.40)."""
        score = evaluate_role_match("Frontend Developer", "Backend Developer")
        self.assertEqual(score, 0.40)

    def test_category_5_cross_family_unrelated_roles(self):
        """Cross-family unrelated roles (e.g. ML Engineer ↔ HR Manager) must yield 0.0."""
        score = evaluate_role_match("Machine Learning Engineer", "HR Manager")
        self.assertEqual(score, 0.0)

    def test_category_6_unknown_roles_fallback(self):
        """Unknown roles lacking taxonomy resolution and domain overlap must yield 0.0."""
        score = evaluate_role_match("Security Engineer", "Software Systems Engineer")
        self.assertEqual(score, 0.0)

    def test_category_7_seniority_modifiers(self):
        """Seniority modifiers stripped to preserve core title matching (0.95)."""
        score = evaluate_role_match("Senior Data Scientist", "Data Scientist")
        self.assertEqual(score, 0.95)

    def test_category_8_ambiguous_and_punctuated_titles(self):
        """Punctuation and formatting variations match core identity (0.95)."""
        score = evaluate_role_match("Software-Engineer", "Sr. Software Engineer")
        self.assertEqual(score, 0.95)

    def test_end_to_end_candidate_opportunity_ranking_benchmark(self):
        """Verifies overall compatibility score ordering across a realistic benchmark portfolio."""
        candidate = {
            "title": "Backend Developer",
            "skills": [
                {"name": "Python", "proficiency": 0.9},
                {"name": "FastAPI", "proficiency": 0.85},
                {"name": "PostgreSQL", "proficiency": 0.8},
            ],
            "experience_years": 4.0,
            "education": ["Bachelor of Engineering in Computer Science"],
            "location": "Remote",
        }

        opportunities = [
            {
                "title": "Backend Engineer",
                "required_skills": ["Python", "FastAPI", "PostgreSQL"],
                "experience_min": 3.0,
                "education": "Computer Science",
                "location": "Remote",
            },
            {
                "title": "Full Stack Developer",
                "required_skills": ["Python", "JavaScript", "PostgreSQL"],
                "experience_min": 3.0,
                "education": "Computer Science",
                "location": "Remote",
            },
            {
                "title": "HR Specialist",
                "required_skills": ["Recruiting", "Employee Relations"],
                "experience_min": 2.0,
                "education": "Business",
                "location": "Onsite",
            },
        ]

        ranked = self.matching_engine.rank(candidate, opportunities)

        # Expected Ranking Order: Backend Engineer > Full Stack Developer > HR Specialist
        self.assertEqual(ranked[0]["title"], "Backend Engineer")
        self.assertEqual(ranked[1]["title"], "Full Stack Developer")
        self.assertEqual(ranked[2]["title"], "HR Specialist")

        self.assertGreater(ranked[0]["compatibility_score"], ranked[1]["compatibility_score"])
        self.assertGreater(ranked[1]["compatibility_score"], ranked[2]["compatibility_score"])


if __name__ == "__main__":
    unittest.main()
