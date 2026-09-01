from __future__ import annotations
import json
import os
import unittest
from unittest.mock import patch
from orchestrator import AgentOrchestrator


class TestIntegrationInvariantsMocked(unittest.TestCase):
    """Integration test suite executing every candidate against every target role with mocked LLM provider."""

    @classmethod
    def setUpClass(cls):
        cls.data_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data"
        )
        with open(os.path.join(cls.data_dir, "candidates.json"), "r", encoding="utf-8") as f:
            cls.candidates = json.load(f)
        with open(os.path.join(cls.data_dir, "target_roles.json"), "r", encoding="utf-8") as f:
            cls.target_roles = json.load(f)
        with open(os.path.join(cls.data_dir, "courses.json"), "r", encoding="utf-8") as f:
            cls.courses = json.load(f)
        with open(os.path.join(cls.data_dir, "opportunities.json"), "r", encoding="utf-8") as f:
            cls.opportunities = json.load(f)
        with open(os.path.join(cls.data_dir, "jobs.json"), "r", encoding="utf-8") as f:
            cls.jobs = json.load(f)

        cls.orchestrator = AgentOrchestrator()

    @patch("llm.provider.LLMProvider.generate_explanation")
    def test_all_candidates_x_roles_invariants(self, mock_llm):
        mock_llm.return_value = "[Mocked Pipeline Explanation]"
        for candidate in self.candidates:
            for role in self.target_roles:
                ctx = {
                    "candidate": candidate,
                    "target_role": role,
                    "courses": self.courses,
                    "opportunities": self.opportunities,
                    "jobs": self.jobs,
                }
                res = self.orchestrator.run_career_pipeline(ctx)

                # Invariant 1: Pipeline output keys
                required_keys = ["candidate_id", "target_role", "readiness", "matched_opportunities", "roadmap", "skill_gaps"]
                for k in required_keys:
                    self.assertIn(k, res, f"Missing key '{k}' in candidate {candidate.get('candidate_id')} x role {role.get('role_id')}")

                # Invariant 2: Readiness Score bounds [0, 100]
                readiness = res["readiness"].get("readiness_score", -1)
                self.assertGreaterEqual(readiness, 0, f"Readiness < 0 for candidate {candidate.get('candidate_id')}")
                self.assertLessEqual(readiness, 100, f"Readiness > 100 for candidate {candidate.get('candidate_id')}")

                # Invariant 3: Opportunities sorted descending by compatibility score
                opps = res["matched_opportunities"]
                for i in range(len(opps) - 1):
                    self.assertGreaterEqual(
                        opps[i]["compatibility_score"],
                        opps[i + 1]["compatibility_score"],
                        f"Opportunities not sorted descending for candidate {candidate.get('candidate_id')}"
                    )


if __name__ == "__main__":
    unittest.main()
