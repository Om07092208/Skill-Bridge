from __future__ import annotations
import os
import json
import math
import unittest
from typing import List, Dict, Any, Set
from engines import MatchingEngine, SkillEngine

VALID_RELEVANCE_GRADES: Set[int] = {0, 1, 2, 3}


def calculate_dcg_at_k(relevance_scores: List[float], k: int = 5) -> float:
    """Calculates Discounted Cumulative Gain at K (DCG@K)."""
    dcg = 0.0
    for i, rel in enumerate(relevance_scores[:k]):
        rank = i + 1
        dcg += (2.0 ** rel - 1.0) / math.log2(rank + 1.0)
    return dcg


def calculate_ndcg_at_k(actual_ids: List[str], expected_relevance: Dict[str, float], k: int = 5) -> float:
    """Calculates Normalized Discounted Cumulative Gain at K (NDCG@K)."""
    actual_rel = [float(expected_relevance.get(opp_id, 0)) for opp_id in actual_ids]
    dcg = calculate_dcg_at_k(actual_rel, k=k)

    ideal_rel = sorted([float(rel) for rel in expected_relevance.values()], reverse=True)
    idcg = calculate_dcg_at_k(ideal_rel, k=k)

    if idcg <= 0:
        return 1.0
    return dcg / idcg


class TestDataDrivenSystemRankingBenchmark(unittest.TestCase):
    """Data-driven benchmark suite enforcing strict schema validation, relevance contract completeness, and persisted baseline regression protection."""

    @classmethod
    def setUpClass(cls):
        cls.skill_engine = SkillEngine()
        cls.matching_engine = MatchingEngine(cls.skill_engine)

        cls.benchmark_dir = os.path.dirname(__file__)
        cls.data_dir = os.path.join(cls.benchmark_dir, "data")
        cls.baseline_file = os.path.join(cls.benchmark_dir, "benchmark_baseline.json")

        cls.benchmark_cases: List[Dict[str, Any]] = []
        cls.seen_scenario_ids: Set[str] = set()

        if os.path.exists(cls.data_dir):
            for fname in sorted(os.listdir(cls.data_dir)):
                if fname.endswith(".json"):
                    fpath = os.path.join(cls.data_dir, fname)
                    with open(fpath, "r", encoding="utf-8") as f:
                        cases = json.load(f)
                        for case in cases:
                            cls.benchmark_cases.append(case)

    def test_benchmark_data_driven_scenarios(self):
        """Runs all benchmark cases with formal schema validation, contract completeness, and persisted baseline regression checks."""
        self.assertGreater(len(self.benchmark_cases), 0, "No benchmark cases loaded!")

        total_cases = len(self.benchmark_cases)
        top1_correct = 0
        top3_correct = 0
        top5_correct = 0
        reciprocal_ranks: List[float] = []
        ndcg5_scores: List[float] = []

        seen_scenarios_in_run: Set[str] = set()

        for case in self.benchmark_cases:
            scenario_id = case.get("scenario_id")
            name = case.get("name", "Unnamed Scenario")
            candidate = case.get("candidate")
            opportunities = case.get("opportunities")
            expected_relevance = case.get("expected_relevance", {})

            # 1. Global Scenario ID Uniqueness & Non-Empty Validation
            self.assertIsNotNone(scenario_id, f"Scenario [{name}] missing scenario_id!")
            self.assertNotIn(
                scenario_id,
                seen_scenarios_in_run,
                f"Global scenario ID collision detected: '{scenario_id}' defined multiple times!"
            )
            seen_scenarios_in_run.add(scenario_id)

            self.assertIsNotNone(candidate, f"Scenario [{scenario_id} - {name}] candidate profile is missing!")
            self.assertTrue(opportunities, f"Scenario [{scenario_id} - {name}] opportunities list is empty!")

            # 2. Opportunity ID Uniqueness & Non-None Validation
            ids = [opp.get("id") for opp in opportunities]
            self.assertNotIn(None, ids, f"Scenario [{scenario_id} - {name}]: every opportunity must have a non-None ID!")
            self.assertEqual(len(ids), len(set(ids)), f"Scenario [{scenario_id} - {name}]: duplicate opportunity IDs detected!")

            # 3. Contract Completeness Validation: set(opportunity_ids) == set(expected_relevance.keys())
            opportunity_ids = set(ids)
            relevance_ids = set(expected_relevance.keys())
            self.assertEqual(
                opportunity_ids,
                relevance_ids,
                f"Scenario [{scenario_id} - {name}]: expected_relevance IDs {relevance_ids} must exactly match opportunity IDs {opportunity_ids}"
            )

            # 4. Relevance Value Range Validation (grades in {0, 1, 2, 3})
            for opp_id, rel_grade in expected_relevance.items():
                self.assertIn(
                    rel_grade,
                    VALID_RELEVANCE_GRADES,
                    f"Scenario [{scenario_id} - {name}]: invalid relevance grade '{rel_grade}' for opportunity '{opp_id}' (must be 0, 1, 2, or 3)"
                )

            # Execute Engine Ranking
            ranked = self.matching_engine.rank(candidate, opportunities)
            ranked_ids = [r["id"] for r in ranked]

            max_rel = max(expected_relevance.values()) if expected_relevance else 0

            # Diagnostic Checks
            if expected_relevance.get(ranked_ids[0], 0) == max_rel:
                top1_correct += 1
            if any(expected_relevance.get(r_id, 0) == max_rel for r_id in ranked_ids[:3]):
                top3_correct += 1
            if any(expected_relevance.get(r_id, 0) == max_rel for r_id in ranked_ids[:5]):
                top5_correct += 1

            # Reciprocal Rank Calculation (Secondary Metric)
            try:
                first_top_idx = min(
                    idx for idx, r_id in enumerate(ranked_ids)
                    if expected_relevance.get(r_id, 0) == max_rel
                ) + 1
                reciprocal_ranks.append(1.0 / first_top_idx)
            except ValueError:
                reciprocal_ranks.append(0.0)

            # NDCG@5 Calculation (PRIMARY METRIC)
            ndcg5 = calculate_ndcg_at_k(ranked_ids, expected_relevance, k=5)
            ndcg5_scores.append(ndcg5)

        # Compute Final Benchmark Aggregates
        top1_acc = (top1_correct / total_cases) * 100.0
        top3_acc = (top3_correct / total_cases) * 100.0
        top5_acc = (top5_correct / total_cases) * 100.0
        mrr = (sum(reciprocal_ranks) / total_cases) if total_cases > 0 else 0.0
        mean_ndcg5 = (sum(ndcg5_scores) / total_cases) if total_cases > 0 else 0.0

        print(f"\n=======================================================")
        print(f"       SYSTEM RANKING BENCHMARK METRICS SUMMARY        ")
        print(f"=======================================================")
        print(f" Total Benchmark Scenarios Evaluated : {total_cases}")
        print(f" Primary Metric  - Mean NDCG@5      : {mean_ndcg5:.4f}")
        print(f" Secondary Metric - MRR             : {mrr:.4f}")
        print(f" Diagnostic      - Top-1 Accuracy   : {top1_acc:.2f}%")
        print(f" Diagnostic      - Top-3 Accuracy   : {top3_acc:.2f}%")
        print(f" Diagnostic      - Top-5 Accuracy   : {top5_acc:.2f}%")
        print(f"=======================================================\n")

        # 5. Persisted Baseline Regression Testing
        if os.path.exists(self.baseline_file):
            with open(self.baseline_file, "r", encoding="utf-8") as f:
                baseline_data = json.load(f)
                b_commit = baseline_data.get("baseline_commit", "unknown")
                b_metrics = baseline_data.get("metrics", {})

                b_ndcg5 = float(b_metrics.get("ndcg5", 0.90))
                b_mrr = float(b_metrics.get("mrr", 0.90))

                TOLERANCE = 0.05
                self.assertGreaterEqual(
                    mean_ndcg5,
                    b_ndcg5 - TOLERANCE,
                    f"NDCG@5 regression detected against baseline commit '{b_commit}'! Current {mean_ndcg5:.4f} vs Baseline {b_ndcg5:.4f}"
                )
                self.assertGreaterEqual(
                    mrr,
                    b_mrr - TOLERANCE,
                    f"MRR regression detected against baseline commit '{b_commit}'! Current {mrr:.4f} vs Baseline {b_mrr:.4f}"
                )


if __name__ == "__main__":
    unittest.main()
