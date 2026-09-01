from __future__ import annotations
from typing import Dict, List, Any
from models.schemas import SkillGap, Priority
from engines.skill_engine import SkillEngine


class SkillGapEngine:
    """Deterministic calculation of skill gaps between candidate and target role requirements."""

    def __init__(self, skill_engine: SkillEngine = None):
        self.skill_engine = skill_engine or SkillEngine()

    def analyze(
        self,
        candidate_skills: List[Dict[str, Any]],
        required_skills: List[Dict[str, Any]],
        preferred_skills: List[Dict[str, Any]] = None,
        candidate_experience_years: float = 0.0,
    ) -> List[Dict[str, Any]]:
        """Calculates exact numerical gap for each required/preferred skill and prioritizes them."""
        preferred_skills = preferred_skills or []

        # Build map of candidate skills using maximum proficiency for duplicates (Finding #24)
        cand_map: Dict[str, float] = {}
        for s in candidate_skills:
            if isinstance(s, dict):
                raw_name = s.get("name", "")
                norm_name = s.get("normalized_name") or self.skill_engine.normalize_skill_name(raw_name)
                prof = min(1.0, max(0.0, float(s.get("proficiency", 0.0))))
            elif isinstance(s, str):
                raw_name = s
                norm_name = self.skill_engine.normalize_skill_name(raw_name)
                prof = 1.0
            else:
                continue

            norm_name = self.skill_engine.normalize_skill_name(norm_name)
            cand_map[norm_name] = max(cand_map.get(norm_name, 0.0), prof)

        gaps: List[SkillGap] = []

        # Analyze required skills
        for r_skill in required_skills:
            if isinstance(r_skill, dict):
                raw_name = r_skill.get("name", "")
                r_norm = r_skill.get("normalized_name") or self.skill_engine.normalize_skill_name(raw_name)
                req_level = min(1.0, max(0.0, float(r_skill.get("proficiency", 0.7))))
                category = r_skill.get("category", "core").lower()
            else:
                raw_name = str(r_skill)
                r_norm = self.skill_engine.normalize_skill_name(raw_name)
                req_level = 0.7
                category = "core"

            r_norm = self.skill_engine.normalize_skill_name(r_norm)
            curr_level = cand_map.get(r_norm, 0.0)

            if curr_level < req_level:
                gap_val = round(req_level - curr_level, 2)

                # Finding #23: Configurable category importance instead of hardcoded tool bias
                if (curr_level == 0.0 or gap_val >= 0.35) and category != "utility":
                    priority: Priority = "high"
                elif gap_val >= 0.10 or category == "utility":
                    priority: Priority = "medium"
                else:
                    priority: Priority = "low"

                display_name = raw_name if raw_name else r_norm.title()

                gaps.append(
                    SkillGap(
                        skill=display_name,
                        required_level=req_level,
                        current_level=curr_level,
                        gap=gap_val,
                        priority=priority,
                        evidence=[f"Required by target role (target level: {req_level})"],
                    )
                )

        # Analyze preferred skills
        for p_skill in preferred_skills:
            if isinstance(p_skill, dict):
                raw_name = p_skill.get("name", "")
                p_norm = p_skill.get("normalized_name") or self.skill_engine.normalize_skill_name(raw_name)
                req_level = min(1.0, max(0.0, float(p_skill.get("proficiency", 0.5))))
            else:
                raw_name = str(p_skill)
                p_norm = self.skill_engine.normalize_skill_name(raw_name)
                req_level = 0.5

            p_norm = self.skill_engine.normalize_skill_name(p_norm)
            curr_level = cand_map.get(p_norm, 0.0)

            if curr_level < req_level and not any(self.skill_engine.normalize_skill_name(g.skill) == p_norm for g in gaps):
                gap_val = round(req_level - curr_level, 2)
                display_name = raw_name if raw_name else p_norm.title()
                gaps.append(
                    SkillGap(
                        skill=display_name,
                        required_level=req_level,
                        current_level=curr_level,
                        gap=gap_val,
                        priority="low",
                        evidence=[f"Preferred skill for role (target level: {req_level})"],
                    )
                )

        priority_order = {"high": 0, "medium": 1, "low": 2}
        gaps.sort(key=lambda x: (priority_order[x.priority], -x.gap))

        return [g.model_dump() for g in gaps]
