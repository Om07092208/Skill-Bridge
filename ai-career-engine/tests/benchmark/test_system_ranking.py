from __future__ import annotations
import os
import json
import math
import unittest
from typing import List, Dict, Any
from engines import MatchingEngine, SkillEngine


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
    """Data-driven benchmark suite measuring Top-1, Top-3, Top-5 Accuracy, MRR, and NDCG@5 metrics across multi-family scenarios."""

    @classmethod
    def setUpClass(cls):
        cls.skill_engine = SkillEngine()
        cls.matching_engine = MatchingEngine(cls.skill_engine)

        cls.data_dir = os.path.join(os.path.dirname(__file__), "data")
        cls.benchmark_cases: List[Dict[str, Any]] = []

        if os.path.exists(cls.data_dir):
            for fname in sorted(os.listdir(cls.data_dir)):
                if fname.endswith(".json"):
                    fpath = os.path.join(cls.data_dir, fname)
                    with open(fpath, "r", encoding="utf-8") as f:
                        cases = json.load(f)
                        cls.benchmark_cases.extend(cases)

    def test_benchmark_data_driven_scenarios(self):
        """Runs all data-driven benchmark cases and validates relative business order by unique opportunity ID."""
        self.assertGreater(len(self.benchmark_cases), 0, "No benchmark cases loaded!")

        total_cases = len(self.benchmark_cases)
        top1_correct = 0
        top3_correct = 0
        top5_correct = 0
        reciprocal_ranks: List[float] = []
        ndcg5_scores: List[float] = []

        for case in self.benchmark_cases:
            scenario_id = case["scenario_id"]
            name = case["name"]
            candidate = case["candidate"]
            opportunities = case["opportunities"]
            expected_order = case["expected_order"]
            expected_relevance = case.get("expected_relevance", {})

            ranked = self.matching_engine.rank(candidate, opportunities)
            ranked_ids = [r["id"] for r in ranked]

            # Top-1 Check: Does the highest ranked opportunity have the maximum expected relevance grade?
            max_rel = max(expected_relevance.values()) if expected_relevance else 0
            if expected_relevance.get(ranked_ids[0], 0) == max_rel:
                top1_correct += 1

            # Top-3 Check: Is an opportunity with maximum expected relevance present in top 3?
            if any(expected_relevance.get(r_id, 0) == max_rel for r_id in ranked_ids[:3]):
                top3_correct += 1

            # Top-5 Check: Is an opportunity with maximum expected relevance present in top 5?
            if any(expected_relevance.get(r_id, 0) == max_rel for r_id in ranked_ids[:5]):
                top5_correct += 1

            # Reciprocal Rank calculation for the first occurrence of a top-relevance opportunity
            try:
                first_top_idx = min(
                    idx for idx, r_id in enumerate(ranked_ids)
                    if expected_relevance.get(r_id, 0) == max_rel
                ) + 1
                reciprocal_ranks.append(1.0 / first_top_idx)
            except ValueError:
                reciprocal_ranks.append(0.0)

            # NDCG@5 calculation
            ndcg5 = calculate_ndcg_at_k(ranked_ids, expected_relevance, k=5)
            ndcg5_scores.append(ndcg5)

            # Business Behavior Assertion by unique ID: Validate relative order score(expected[i]) >= score(expected[i+1])
            id_to_score = {r["id"]: r["compatibility_score"] for r in ranked}
            for i in range(len(expected_order) - 1):
                high_id = expected_order[i]
                low_id = expected_order[i + 1]

                if high_id in id_to_score and low_id in id_to_score:
                    # Ignore order check if both items share equal expected relevance
                    if expected_relevance.get(high_id, 0) > expected_relevance.get(low_id, 0):
                        self.assertGreaterEqual(
                            id_to_score[high_id],
                            id_to_score[low_id],
                            f"Ranking inversion in [{scenario_id} - {name}]: ID '{high_id}' ({id_to_score[high_id]}%) should rank >= ID '{low_id}' ({id_to_score[low_id]}%)"
                        )

        # Compute Metrics
        top1_acc = (top1_correct / total_cases) * 100.0
        top3_acc = (top3_correct / total_cases) * 100.0
        top5_acc = (top5_correct / total_cases) * 100.0
        mrr = (sum(reciprocal_ranks) / total_cases) if total_cases > 0 else 0.0
        mean_ndcg5 = (sum(ndcg5_scores) / total_cases) if total_cases > 0 else 0.0

        print(f"\n=======================================================")
        print(f"       SYSTEM RANKING BENCHMARK METRICS SUMMARY        ")
        print(f"=======================================================")
        print(f" Total Benchmark Scenarios Evaluated : {total_cases}")
        print(f" Top-1 Accuracy                      : {top1_acc:.2f}%")
        print(f" Top-3 Accuracy                      : {top3_acc:.2f}%")
        print(f" Top-5 Accuracy                      : {top5_acc:.2f}%")
        print(f" Mean Reciprocal Rank (MRR)          : {mrr:.4f}")
        print(f" Mean NDCG@5                         : {mean_ndcg5:.4f}")
        print(f"=======================================================\n")

        self.assertGreaterEqual(top1_acc, 80.0, "Top-1 Benchmark Accuracy fell below 80% baseline threshold!")
        self.assertGreaterEqual(mrr, 0.85, "Mean Reciprocal Rank (MRR) fell below 0.85 baseline threshold!")
        self.assertGreaterEqual(mean_ndcg5, 0.85, "Mean NDCG@5 fell below 0.85 baseline threshold!")


if __name__ == "__main__":
    unittest.main()
