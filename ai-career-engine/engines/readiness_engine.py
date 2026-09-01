from __future__ import annotations
from typing import Dict, List, Any
from engines.matching_engine import calculate_effective_experience
from engines.skill_engine import SkillEngine


class ReadinessEngine:
    """Deterministic engine to evaluate candidate career readiness score (0-100%)."""

    def __init__(self, skill_engine: SkillEngine = None):
        self.skill_engine = skill_engine or SkillEngine()

    def calculate(
        self,
        candidate: Dict[str, Any],
        target_role: Dict[str, Any],
    ) -> Dict[str, Any]:
        from models.normalizers import normalize_candidate_skill_map
        cand_skills = normalize_candidate_skill_map(candidate.get("skills", []), self.skill_engine)

        req_skills = target_role.get("required_skills", [])
        if not req_skills:
            skill_score = 1.0
        else:
            total_req = len(req_skills)
            met_sum = 0.0
            for r in req_skills:
                if isinstance(r, dict):
                    raw_name = r.get("name", "")
                    r_norm = r.get("normalized_name") or self.skill_engine.normalize_skill_name(raw_name)
                    req_level = min(1.0, max(0.0, float(r.get("proficiency", 0.7))))
                else:
                    raw_name = str(r)
                    r_norm = self.skill_engine.normalize_skill_name(raw_name)
                    req_level = 0.7

                r_norm = self.skill_engine.normalize_skill_name(r_norm)
                curr_level = cand_skills.get(r_norm, 0.0)
                if curr_level >= req_level:
                    met_sum += 1.0
                else:
                    met_sum += (curr_level / req_level) if req_level > 0 else 0.0
            skill_score = min(1.0, max(0.0, met_sum / total_req))

        # Project score (0-1)
        num_projects = len(candidate.get("projects", []))
        project_score = min(1.0, num_projects * 0.40)

        # Experience score
        cand_exp = calculate_effective_experience(
            candidate.get("experience_years", 0.0),
            candidate.get("career_gaps", []),
        )
        try:
            target_exp = max(0.0, float(target_role.get("experience_min", 1.0)))
        except (TypeError, ValueError):
            target_exp = 1.0

        exp_score = 1.0 if cand_exp >= target_exp else (cand_exp / target_exp if target_exp > 0 else 1.0)

        # Weighted calculation (Skill 60%, Project 25%, Experience 15%)
        overall_readiness = int(
            round((skill_score * 0.60 + project_score * 0.25 + exp_score * 0.15) * 100)
        )

        if overall_readiness >= 70:
            status = "Job Ready"
        elif overall_readiness >= 35:
            status = "Developing"
        else:
            status = "Early Preparation"

        return {
            "readiness_score": overall_readiness,
            "status": status,
            "skill_readiness": int(skill_score * 100),
            "project_readiness": int(project_score * 100),
            "experience_readiness": int(exp_score * 100),
        }
