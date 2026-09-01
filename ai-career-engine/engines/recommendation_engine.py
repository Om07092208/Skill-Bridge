from __future__ import annotations
from typing import Dict, List, Any


class RecommendationEngine:
    """Deterministic engine to match courses & certifications to skill gaps and generate ordered learning sequences."""

    def recommend_courses(
        self,
        skill_gaps: List[Dict[str, Any]],
        courses: List[Dict[str, Any]],
        candidate_level: str = "beginner",
        top_k: int = 10,
    ) -> List[Dict[str, Any]]:
        """Matches available courses to prioritized skill gaps considering multi-skill coverage and candidate level."""
        if not skill_gaps or not courses:
            return []

        # Map gaps by skill name lowercased
        gap_skills = {
            g.get("skill", "").lower(): g for g in skill_gaps
        }

        priority_weight = {"high": 3, "medium": 2, "low": 1}
        level_rank = {"beginner": 1, "intermediate": 2, "advanced": 3}
        cand_level_num = level_rank.get(candidate_level.lower(), 1)

        matched_courses = []
        for course in courses:
            c_level_str = str(course.get("level", "beginner")).lower()
            c_level_num = level_rank.get(c_level_str, 1)

            # Skip courses far above candidate level
            if c_level_num > cand_level_num + 1:
                continue

            c_skills = [str(s).lower() for s in course.get("skills", [])]
            overlapping_gaps = [gap_skills[s] for s in c_skills if s in gap_skills]

            if overlapping_gaps:
                # Finding #13: Evaluate cumulative gap priority weight across ALL overlapping skills
                top_gap = max(overlapping_gaps, key=lambda g: (priority_weight.get(g.get("priority", "medium"), 1), g.get("gap", 0.0)))
                top_priority = top_gap.get("priority", "medium")

                cumulative_priority_score = sum(
                    priority_weight.get(g.get("priority", "medium"), 1) for g in overlapping_gaps
                )
                coverage_count = len(overlapping_gaps)

                # Rating boost
                base_rating = float(course.get("rating", 4.5))
                score = round(base_rating * cumulative_priority_score * (1 + 0.10 * (coverage_count - 1)), 2)

                matched_courses.append({
                    "title": course.get("title", ""),
                    "platform": course.get("platform", "Online"),
                    "primary_skill": top_gap.get("skill", c_skills[0].title()),
                    "priority": top_priority,
                    "duration_hours": course.get("duration_hours", 10),
                    "coverage_count": coverage_count,
                    "url": course.get("url", ""),
                    "score": score,
                })

        prio_map = {"high": 0, "medium": 1, "low": 2}
        matched_courses.sort(key=lambda x: (prio_map[x["priority"]], -x["score"]), reverse=False)

        return matched_courses[:top_k]
