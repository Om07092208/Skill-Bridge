from __future__ import annotations
import unittest
from engines import MatchingEngine, SkillEngine
from engines.matching_engine import calculate_effective_experience, evaluate_education_match, evaluate_role_match
from models.normalizers import normalize_single_education, is_known_country, load_role_taxonomy, normalize_role_title
from unittest.mock import patch


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

    def test_evaluate_role_match_aliases_same_specialization(self):
        # Backend Developer vs Backend Engineer in same specialization -> 0.90
        score = evaluate_role_match("Backend Developer", "Backend Engineer")
        self.assertEqual(score, 0.90)

    def test_explicit_specialization_similarity_matrix(self):
        # Backend Developer vs Full Stack Developer -> explicit related score 0.75
        self.assertEqual(evaluate_role_match("Backend Developer", "Full Stack Developer"), 0.75)

        # Backend Developer vs Frontend Developer -> explicit related score 0.40
        self.assertEqual(evaluate_role_match("Backend Developer", "Frontend Developer"), 0.40)

        # Data Analyst vs BI Analyst -> explicit related score 0.55
        self.assertEqual(evaluate_role_match("Data Analyst", "BI Analyst"), 0.55)

    def test_product_vs_project_manager_differentiation(self):
        # Project Manager vs Product Manager are different specializations -> explicit related score 0.45 (< 0.85)
        score = evaluate_role_match("Project Manager", "Product Manager")
        self.assertEqual(score, 0.45)
        self.assertLess(score, 0.85)

    def test_role_title_normalization_punctuation_and_roman_numerals(self):
        # "Software-Engineer" vs "Sr. Software Engineer" -> core match 0.95
        score1 = evaluate_role_match("Software-Engineer", "Sr. Software Engineer")
        self.assertEqual(score1, 0.95)

        # "ML Engineer II" vs "ML Engineer" -> core match 0.95
        score2 = evaluate_role_match("ML Engineer II", "ML Engineer")
        self.assertEqual(score2, 0.95)

    def test_unknown_role_token_overlap_capped(self):
        # Non-taxonomy roles with partial token overlap must be capped at <= 0.40
        score = evaluate_role_match("Security Engineer", "Software Systems Engineer")
        self.assertLessEqual(score, 0.40)

    def test_role_taxonomy_file_missing_raises_error(self):
        # Must fail fast with FileNotFoundError if taxonomy file does not exist
        with patch("os.path.exists", return_value=False):
            with self.assertRaises(FileNotFoundError):
                load_role_taxonomy(reload=True)
        # Restore valid taxonomy in cache afterwards
        load_role_taxonomy(reload=True)

    def test_role_taxonomy_has_no_alias_collisions(self):
        # Audit Finding 6: Ensure no duplicate alias collisions exist across different specializations
        taxonomy = load_role_taxonomy()
        seen = {}
        for family, family_data in taxonomy.items():
            for spec, spec_data in family_data.get("specializations", {}).items():
                for alias in spec_data.get("aliases", []):
                    normalized = normalize_role_title(alias)
                    if normalized:
                        self.assertNotIn(
                            normalized,
                            seen,
                            f"Alias collision detected for '{normalized}' in ({family}, {spec}) vs existing {seen.get(normalized)}"
                        )
                        seen[normalized] = (family, spec)

    def test_known_country_lookup(self):
        self.assertTrue(is_known_country("Germany"))
        self.assertTrue(is_known_country("USA"))
        self.assertFalse(is_known_country("Atlantis"))


if __name__ == "__main__":
    unittest.main()
