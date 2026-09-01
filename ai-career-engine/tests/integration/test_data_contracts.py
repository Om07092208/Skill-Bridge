from __future__ import annotations
import json
import os
import unittest


class TestDataContracts(unittest.TestCase):
    """Data contract test suite for validating integrity and schema requirements across dataset JSON files."""

    @classmethod
    def setUpClass(cls):
        cls.data_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data"
        )

    def _load_data_file(self, filename: str):
        filepath = os.path.join(self.data_dir, filename)
        self.assertTrue(os.path.exists(filepath), f"Missing data file: {filename}")
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)

    def test_json_files_exist_and_parse(self):
        filenames = ["candidates.json", "target_roles.json", "jobs.json", "opportunities.json", "courses.json", "test_scenarios.json"]
        for fname in filenames:
            data = self._load_data_file(fname)
            self.assertIsNotNone(data)

    def test_candidate_contract_uniqueness_and_proficiencies(self):
        candidates = self._load_data_file("candidates.json")
        cand_ids = set()
        for cand in candidates:
            cid = cand.get("candidate_id")
            self.assertIsNotNone(cid, "Candidate missing candidate_id")
            self.assertNotIn(cid, cand_ids, f"Duplicate candidate_id found: {cid}")
            cand_ids.add(cid)

            # Validate skill proficiencies 0.0 - 1.0
            for skill in cand.get("skills", []):
                prof = skill.get("proficiency")
                self.assertIsNotNone(prof, f"Skill missing proficiency in candidate {cid}")
                self.assertGreaterEqual(prof, 0.0, f"Proficiency < 0.0 in candidate {cid}")
                self.assertLessEqual(prof, 1.0, f"Proficiency > 1.0 in candidate {cid}")

            # Validate career gaps protection flag explicit contract
            for gap in cand.get("career_gaps", []):
                self.assertIn("duration_months", gap, f"Gap missing duration_months in candidate {cid}")

    def test_target_role_contract_uniqueness_and_requirements(self):
        target_roles = self._load_data_file("target_roles.json")
        role_ids = set()
        for role in target_roles:
            rid = role.get("role_id")
            self.assertIsNotNone(rid, "Role missing role_id")
            self.assertNotIn(rid, role_ids, f"Duplicate role_id found: {rid}")
            role_ids.add(rid)

            for req in role.get("required_skills", []):
                prof = req.get("proficiency", 0.7)
                self.assertGreaterEqual(prof, 0.0)
                self.assertLessEqual(prof, 1.0)

    def test_opportunities_contract_integrity(self):
        opportunities = self._load_data_file("opportunities.json")
        self.assertGreater(len(opportunities), 0)
        for opp in opportunities:
            self.assertIn("title", opp)
            self.assertIn("company", opp)


if __name__ == "__main__":
    unittest.main()
