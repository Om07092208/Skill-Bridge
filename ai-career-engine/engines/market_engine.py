from __future__ import annotations
from typing import Dict, List, Any


class MarketEngine:
    """Deterministic engine for job market statistics, skill demand, and trend calculation."""

    TREND_THRESHOLDS = {
        "high_growth": 10,
        "growth": 3,
        "decline": -5,
    }

    def get_demo_market_data(self) -> Dict[str, Dict[str, Any]]:
        """Explicit helper returning baseline demonstration stats when no live dataset is provided."""
        return {
            "python": {"demand_pct": 72, "trend": "STABLE", "is_demo": True},
            "sql": {"demand_pct": 64, "trend": "STABLE", "is_demo": True},
            "docker": {"demand_pct": 41, "trend": "GROWING", "is_demo": True},
            "kubernetes": {"demand_pct": 29, "trend": "GROWING", "is_demo": True},
            "mlops": {"demand_pct": 24, "trend": "HIGH GROWTH", "is_demo": True},
        }

    def analyze_skill_demand(self, jobs: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """Calculates percentage demand for skills across a collection of job postings, deduplicating per job.
        Problem 1 Fix: Returns empty dict / metadata when jobs array is empty instead of fabricating data.
        """
        if not jobs:
            return {}

        total_jobs = len(jobs)
        skill_counts: Dict[str, int] = {}

        for j in jobs:
            job_skills = set()
            raw_list = j.get("required_skills", []) + j.get("preferred_skills", [])
            for s in raw_list:
                if isinstance(s, dict):
                    name = s.get("name", "")
                else:
                    name = str(s)
                if name:
                    job_skills.add(name.strip().lower())

            for s_clean in job_skills:
                skill_counts[s_clean] = skill_counts.get(s_clean, 0) + 1

        results = {}
        for s_name, count in skill_counts.items():
            pct = min(100, int((count / total_jobs) * 100))
            results[s_name] = {
                "demand_pct": pct,
                "trend": "GROWING" if pct > 30 else "STABLE",
                "is_demo": False,
            }
        return results

    def calculate_trends(
        self,
        current_jobs: List[Dict[str, Any]],
        previous_jobs: List[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Calculates demand changes between past and current job postings.
        Problem 7 & 8 Fix: Uses union set of skills (to catch disappearing skills) and configurable thresholds.
        """
        curr_demand = self.analyze_skill_demand(current_jobs)
        prev_demand = self.analyze_skill_demand(previous_jobs) if previous_jobs else {}

        # Fallback to demo dataset if both datasets are empty
        if not curr_demand and not prev_demand:
            curr_demand = self.get_demo_market_data()

        # Problem 7: Union set catches disappearing skills
        all_skills = set(curr_demand.keys()) | set(prev_demand.keys())
        trends = []

        for s_name in sorted(all_skills):
            curr_data = curr_demand.get(s_name, {})
            curr_pct = curr_data.get("demand_pct", 0)

            if previous_jobs and s_name in prev_demand:
                prev_pct = prev_demand[s_name].get("demand_pct", 0)
                delta = curr_pct - prev_pct
                
                # Problem 8: Configurable thresholds
                if delta >= self.TREND_THRESHOLDS["high_growth"]:
                    trend_label = "HIGH GROWTH"
                elif delta >= self.TREND_THRESHOLDS["growth"]:
                    trend_label = "GROWING"
                elif delta <= self.TREND_THRESHOLDS["decline"]:
                    trend_label = "DECLINING"
                else:
                    trend_label = "STABLE"
            else:
                trend_label = curr_data.get("trend", "STABLE")

            display_name = s_name.upper() if s_name in ["sql", "mlops", "aws", "gcp"] else s_name.title()

            trends.append({
                "skill": display_name,
                "current_demand": f"{curr_pct}%",
                "trend": trend_label,
            })
        return trends

    def emerging_skills(self, trends: List[Dict[str, Any]]) -> List[str]:
        """Identifies skills with strong upward growth trends."""
        emerging = []
        for t in trends:
            if t.get("trend") in ["GROWING", "HIGH GROWTH", "↑", "↑↑"]:
                emerging.append(t["skill"])
        return emerging
