from __future__ import annotations
import os
import json
import unittest
from typing import List, Dict, Any
from engines import MatchingEngine, SkillEngine


class TestDataDrivenSystemRankingBenchmark(unittest.TestCase):
    """Data-driven benchmark suite measuring Top-1 Accuracy, Top-3 Accuracy, and MRR metrics across multi-family scenarios."""

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
        """Runs all data-driven benchmark cases and validates relative business order and ranking metrics."""
        self.assertGreater(len(self.benchmark_cases), 0, "No benchmark cases loaded!")

        total_cases = len(self.benchmark_cases)
        top1_correct = 0
        top3_correct = 0
        reciprocal_ranks: List[float] = []

        for case in self.benchmark_cases:
            scenario_id = case["scenario_id"]
            name = case["name"]
            candidate = case["candidate"]
            opportunities = case["opportunities"]
            expected_order = case["expected_order"]

            ranked = self.matching_engine.rank(candidate, opportunities)
            ranked_titles = [r["title"] for r in ranked]

            # Top-1 Check: Is the highest ranked opportunity matching the top expected title?
            top_expected = expected_order[0]
            if ranked_titles[0] == top_expected:
                top1_correct += 1

            # Top-3 Check: Is the top expected title present in the top 3 ranked results?
            if top_expected in ranked_titles[:3]:
                top3_correct += 1

            # Reciprocal Rank calculation for the top expected title
            try:
                rank_idx = ranked_titles.index(top_expected) + 1
                reciprocal_ranks.append(1.0 / rank_idx)
            except ValueError:
                reciprocal_ranks.append(0.0)

            # Business Behavior Assertion: Validate relative order score(expected[i]) >= score(expected[i+1])
            title_to_score = {r["title"]: r["compatibility_score"] for r in ranked}
            for i in range(len(expected_order) - 1):
                high_title = expected_order[i]
                low_title = expected_order[i + 1]

                if high_title in title_to_score and low_title in title_to_score:
                    # Ignore assertion if both opportunities have identical titles in trade-off cases
                    if high_title != low_title:
                        self.assertGreaterEqual(
                            title_to_score[high_title],
                            title_to_score[low_title],
                            f"Ranking inversion in [{scenario_id} - {name}]: '{high_title}' ({title_to_score[high_title]}%) should rank >= '{low_title}' ({title_to_score[low_title]}%)"
                        )

        # Compute Metrics
        top1_acc = (top1_correct / total_cases) * 100.0
        top3_acc = (top3_correct / total_cases) * 100.0
        mrr = (sum(reciprocal_ranks) / total_cases) if total_cases > 0 else 0.0

        print(f"\n=======================================================")
        print(f"       SYSTEM RANKING BENCHMARK METRICS SUMMARY        ")
        print(f"=======================================================")
        print(f" Total Benchmark Scenarios Evaluated : {total_cases}")
        print(f" Top-1 Accuracy                      : {top1_acc:.2f}%")
        print(f" Top-3 Accuracy                      : {top3_acc:.2f}%")
        print(f" Mean Reciprocal Rank (MRR)          : {mrr:.4f}")
        print(f"=======================================================\n")

        self.assertGreaterEqual(top1_acc, 90.0, "Top-1 Benchmark Accuracy fell below 90% threshold!")
        self.assertGreaterEqual(mrr, 0.90, "Mean Reciprocal Rank (MRR) fell below 0.90 threshold!")


if __name__ == "__main__":
    unittest.main()
