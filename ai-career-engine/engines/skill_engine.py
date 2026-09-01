from __future__ import annotations
import math
from typing import Dict, List, Any
from models.schemas import Skill


class SkillEngine:
    """Deterministic engine to normalize skill names and compute effective skill proficiencies."""

    @staticmethod
    def normalize_skill_name(name: str) -> str:
        """Converts skill names to standard normalized form (lowercased, whitespace trimmed)."""
        if not name:
            return ""
        name = name.strip().lower()
        aliases = {
            "py": "python",
            "python3": "python",
            "postgres": "postgresql",
            "ml": "machine learning",
            "machine_learning": "machine learning",
            "power_bi": "power bi",
            "spring_boot": "spring boot",
            "k8s": "kubernetes",
            "aws cloud": "aws",
        }
        return aliases.get(name, name)

    def process_candidate_skills(self, skills: List[Dict[str, Any]]) -> List[Skill]:
        """Normalizes and computes overall proficiency for candidate skills without mutating caller objects."""
        processed: List[Skill] = []
        for s in skills:
            # Finding #17: Prevent caller object mutation by creating fresh instances
            if isinstance(s, dict):
                skill_obj = Skill.model_validate(s)
            elif isinstance(s, Skill):
                skill_obj = s.model_copy(deep=True)
            else:
                continue

            skill_obj.normalized_name = self.normalize_skill_name(skill_obj.name)

            # Finding #18: Logarithmic scaling for evidence to enforce diminishing returns
            base_prof = skill_obj.proficiency
            if skill_obj.project_evidence > 0:
                evidence_boost = min(0.20, 0.05 * math.log1p(skill_obj.project_evidence))
                base_prof = min(1.0, base_prof + evidence_boost)
            if skill_obj.course_completion > 0:
                course_boost = min(0.15, 0.05 * skill_obj.course_completion)
                base_prof = min(1.0, base_prof + course_boost)

            effective_prof = round(base_prof * skill_obj.recency_score, 2)
            skill_obj.proficiency = min(1.0, max(0.0, effective_prof))
            processed.append(skill_obj)
        return processed
