from __future__ import annotations
import json
import unittest
from engines import MatchingEngine, SkillEngine
from engines.matching_engine import calculate_effective_experience, evaluate_education_match, evaluate_role_match
from models.normalizers import (
    normalize_single_education,
    is_known_country,
    load_role_taxonomy,
    normalize_role_title,
    AliasCollisionError,
    InvalidSimilarityError,
    AsymmetricSimilarityError,
    AmbiguousSpecializationError,
)
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

    def test_unknown_role_token_overlap_capped_and_domain_filtered(self):
        # Unknown roles with 0 domain token overlap return 0.0
        score = evaluate_role_match("Security Engineer", "Software Systems Engineer")
        self.assertEqual(score, 0.0)

        # "Cloud Architect" vs "Solutions Architect" match same cloud_engineer specialization in taxonomy => 0.90
        score_architect = evaluate_role_match("Cloud Architect", "Solutions Architect")
        self.assertEqual(score_architect, 0.90)

        # "Cyber Security Consultant" vs "Security Analyst" share domain token "security" (weight 1.0) => capped at <= 0.40
        score_domain = evaluate_role_match("Cyber Security Consultant", "Security Analyst")
        self.assertGreater(score_domain, 0.0)
        self.assertLessEqual(score_domain, 0.40)

    def test_role_taxonomy_file_missing_raises_error(self):
        # Must fail fast with FileNotFoundError if taxonomy file does not exist
        with patch("os.path.exists", return_value=False):
            with self.assertRaises(FileNotFoundError):
                load_role_taxonomy(reload=True)
        # Restore valid taxonomy in cache afterwards
        load_role_taxonomy(reload=True)

    def test_asymmetric_similarity_score_rejected(self):
        # Forward A -> B = 0.75, Reverse B -> A = 0.55 must raise AsymmetricSimilarityError
        asymmetric_taxonomy = {
            "fam_a": {
                "specializations": {
                    "spec_a": {"aliases": ["a"], "related": {"spec_b": 0.75}},
                    "spec_b": {"aliases": ["b"], "related": {"spec_a": 0.55}},
                }
            }
        }
        with patch("builtins.open", unittest.mock.mock_open(read_data=json.dumps(asymmetric_taxonomy))):
            with patch("os.path.exists", return_value=True):
                with self.assertRaises(AsymmetricSimilarityError):
                    load_role_taxonomy(reload=True)

        load_role_taxonomy(reload=True)

    def test_atomic_cache_preserved_on_invalid_json(self):
        # Failed reload due to malformed JSON must leave previous valid cache intact
        initial_cache = load_role_taxonomy(reload=True)
        self.assertIsNotNone(initial_cache)

        with patch("builtins.open", unittest.mock.mock_open(read_data="{invalid json")):
            with patch("os.path.exists", return_value=True):
                with self.assertRaises(json.JSONDecodeError):
                    load_role_taxonomy(reload=True)

        # Cache must remain intact with initial valid data
        preserved_cache = load_role_taxonomy(reload=False)
        self.assertEqual(preserved_cache, initial_cache)

    def test_loader_rejects_alias_collision_in_production(self):
        # Production loader must raise AliasCollisionError on alias collisions
        colliding_taxonomy = {
            "fam_a": {
                "specializations": {
                    "spec_a": {"aliases": ["developer"]}
                }
            },
            "fam_b": {
                "specializations": {
                    "spec_b": {"aliases": ["developer"]}
                }
            }
        }
        with patch("builtins.open", unittest.mock.mock_open(read_data=json.dumps(colliding_taxonomy))):
            with patch("os.path.exists", return_value=True):
                with self.assertRaises(AliasCollisionError):
                    load_role_taxonomy(reload=True)

        load_role_taxonomy(reload=True)

    def test_atomic_cache_preservation_on_failed_reload(self):
        # Failed reloads on IOError must NOT corrupt or empty the existing valid cache
        initial_cache = load_role_taxonomy(reload=True)
        self.assertIsNotNone(initial_cache)

        with patch("builtins.open", side_effect=IOError("Disk read failure")):
            with patch("os.path.exists", return_value=True):
                with self.assertRaises(IOError):
                    load_role_taxonomy(reload=True)

        # Cache must remain intact with initial valid data
        preserved_cache = load_role_taxonomy(reload=False)
        self.assertEqual(preserved_cache, initial_cache)

    def test_taxonomy_validation_invalid_related_score_or_missing_target(self):
        # Out of bounds similarity score > 1.0 -> InvalidSimilarityError
        invalid_score_taxonomy = {
            "fam_a": {
                "specializations": {
                    "spec_a": {"aliases": ["a"], "related": {"spec_b": 1.5}},
                    "spec_b": {"aliases": ["b"]}
                }
            }
        }
        with patch("builtins.open", unittest.mock.mock_open(read_data=json.dumps(invalid_score_taxonomy))):
            with patch("os.path.exists", return_value=True):
                with self.assertRaises(InvalidSimilarityError):
                    load_role_taxonomy(reload=True)

        # Missing related target specialization -> InvalidSimilarityError
        missing_target_taxonomy = {
            "fam_a": {
                "specializations": {
                    "spec_a": {"aliases": ["a"], "related": {"non_existent_spec": 0.5}}
                }
            }
        }
        with patch("builtins.open", unittest.mock.mock_open(read_data=json.dumps(missing_target_taxonomy))):
            with patch("os.path.exists", return_value=True):
                with self.assertRaises(InvalidSimilarityError):
                    load_role_taxonomy(reload=True)

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

    def test_ambiguous_specialization_keys_rejected(self):
        # Unqualified specialization key "architect" in both "software" and "cloud" families must raise AmbiguousSpecializationError
        ambiguous_taxonomy = {
            "software": {
                "specializations": {
                    "architect": {"aliases": ["software architect"]}
                }
            },
            "cloud": {
                "specializations": {
                    "architect": {"aliases": ["cloud architect"]}
                }
            }
        }
        with patch("builtins.open", unittest.mock.mock_open(read_data=json.dumps(ambiguous_taxonomy))):
            with patch("os.path.exists", return_value=True):
                with self.assertRaises(AmbiguousSpecializationError):
                    load_role_taxonomy(reload=True)

        load_role_taxonomy(reload=True)

    def test_missing_reverse_relationship_link_rejected(self):
        # A -> B link present, but B does NOT define a reverse link to A -> AsymmetricSimilarityError
        one_way_taxonomy = {
            "fam_a": {
                "specializations": {
                    "spec_a": {"aliases": ["a"], "related": {"spec_b": 0.75}},
                    "spec_b": {"aliases": ["b"], "related": {}},
                }
            }
        }
        with patch("builtins.open", unittest.mock.mock_open(read_data=json.dumps(one_way_taxonomy))):
            with patch("os.path.exists", return_value=True):
                with self.assertRaises(AsymmetricSimilarityError):
                    load_role_taxonomy(reload=True)

        load_role_taxonomy(reload=True)

    def test_known_country_lookup(self):
        self.assertTrue(is_known_country("Germany"))
        self.assertTrue(is_known_country("USA"))
        self.assertFalse(is_known_country("Atlantis"))

    def test_missing_critical_skill_applies_proportional_penalty(self):
        candidate = {
            "title": "Software Engineer",
            "skills": [{"name": "Python", "proficiency": 0.9}],
            "experience_years": 3.0,
            "education": ["Bachelor of Computer Science"],
            "location": "Remote"
        }
        opp_without_veto = {
            "id": "OP-NO-VETO",
            "title": "Software Engineer",
            "required_skills": ["Python"],
            "experience_min": 3.0,
            "location": "Remote"
        }
        opp_with_veto = {
            "id": "OP-VETO",
            "title": "Software Engineer",
            "required_skills": ["Python"],
            "critical_skills": ["Penetration Testing"],
            "experience_min": 3.0,
            "location": "Remote"
        }

        engine = MatchingEngine()
        ranked = engine.rank(candidate, [opp_without_veto, opp_with_veto])

        score_without = next(r["compatibility_score"] for r in ranked if r["id"] == "OP-NO-VETO")
        score_with = next(r["compatibility_score"] for r in ranked if r["id"] == "OP-VETO")

        self.assertGreater(score_without, score_with)
        self.assertEqual(score_with, int(round((score_without / 100.0) * 0.20, 2) * 100))

    def test_missing_critical_skills_returned_in_explanation(self):
        candidate = {
            "skills": [{"name": "React", "proficiency": 0.9}]
        }
        opp = {
            "id": "OP-PENTEST",
            "title": "Cybersecurity Specialist",
            "required_skills": ["React"],
            "critical_skills": ["Penetration Testing", "Metasploit"]
        }

        engine = MatchingEngine()
        ranked = engine.rank(candidate, [opp])
        res = ranked[0]

        self.assertIn("missing_critical_skills", res)
        self.assertEqual(res["missing_critical_skills"], ["Penetration Testing", "Metasploit"])

    def test_partial_missing_critical_skills_apply_proportional_penalty(self):
        candidate = {
            "title": "Software Engineer",
            "skills": [
                {"name": "Python", "proficiency": 0.9},
                {"name": "Docker", "proficiency": 0.9}
            ],
            "experience_years": 3.0,
            "education": ["Bachelor of Computer Science"],
            "location": "Remote"
        }
        opp_base = {
            "id": "OP-BASE",
            "title": "Software Engineer",
            "required_skills": ["Python"],
            "experience_min": 3.0,
            "location": "Remote"
        }
        opp_half_missing = {
            "id": "OP-HALF",
            "title": "Software Engineer",
            "required_skills": ["Python"],
            "critical_skills": ["Docker", "Kubernetes"],
            "experience_min": 3.0,
            "location": "Remote"
        }
        opp_all_missing = {
            "id": "OP-ALL",
            "title": "Software Engineer",
            "required_skills": ["Python"],
            "critical_skills": ["Terraform", "Kubernetes"],
            "experience_min": 3.0,
            "location": "Remote"
        }

        engine = MatchingEngine()
        ranked = engine.rank(candidate, [opp_base, opp_half_missing, opp_all_missing])

        score_base = next(r["compatibility_score"] for r in ranked if r["id"] == "OP-BASE")
        score_half = next(r["compatibility_score"] for r in ranked if r["id"] == "OP-HALF")
        score_all = next(r["compatibility_score"] for r in ranked if r["id"] == "OP-ALL")

        # Base multiplier for 1 of 2 missing = 1.0 - 0.80 * 0.5 = 0.60
        expected_half = int(round((score_base / 100.0) * 0.60, 2) * 100)
        # Base multiplier for 2 of 2 missing = 0.20
        expected_all = int(round((score_base / 100.0) * 0.20, 2) * 100)

        self.assertEqual(score_half, expected_half)
        self.assertEqual(score_all, expected_all)
        self.assertGreater(score_base, score_half)
        self.assertGreater(score_half, score_all)


if __name__ == "__main__":
    unittest.main()
