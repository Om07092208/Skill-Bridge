from __future__ import annotations
from typing import Dict, List, Any, Optional
from engines.skill_engine import SkillEngine
from models.normalizers import (
    normalize_candidate_skill_map,
    normalize_location,
    normalize_education,
    get_field_similarity,
)


def calculate_effective_experience(experience_years: float, career_gaps: List[Dict[str, Any]] = None) -> float:
    """Returns actual professional experience years without artificially adding gap duration."""
    try:
        return max(0.0, float(experience_years))
    except (TypeError, ValueError):
        return 0.0


def evaluate_location_match(cand_loc_raw: Any, opp_loc_raw: Any, work_mode_raw: Any) -> Optional[float]:
    """Returns None if job location is unknown to signal missing location data rather than assuming 1.0."""
    cand_loc = normalize_location(cand_loc_raw)
    opp_loc = normalize_location(opp_loc_raw, work_mode_raw)

    if opp_loc.is_remote:
        return 1.0
    if not opp_loc.is_known:
        return None  # Missing data signal

    if cand_loc.city and opp_loc.city and cand_loc.city.lower() == opp_loc.city.lower():
        return 1.0
    if cand_loc.state and opp_loc.state and cand_loc.state.lower() == opp_loc.state.lower():
        return 0.85 if opp_loc.is_hybrid else 0.75
    if cand_loc.country and opp_loc.country and cand_loc.country.lower() == opp_loc.country.lower():
        return 0.70 if opp_loc.is_hybrid else 0.60
    if opp_loc.is_hybrid:
        return 0.75

    return 0.20


def evaluate_education_match(cand_edu_raw: Any, req_edu_raw: Any) -> float:
    """Evaluates degree level & domain similarity matrix between academic fields."""
    if not req_edu_raw:
        return 1.0

    cand_edu = normalize_education(cand_edu_raw)
    req_edu = normalize_education(req_edu_raw)

    if req_edu.degree_level == "unknown":
        return 1.0

    level_scores = {"phd": 4, "master": 3, "bachelor": 2, "high_school": 1, "unknown": 0}
    c_lvl = level_scores.get(cand_edu.degree_level, 0)
    r_lvl = level_scores.get(req_edu.degree_level, 2)

    if c_lvl >= r_lvl:
        base = 1.0
    elif c_lvl == r_lvl - 1:
        base = 0.75
    else:
        base = 0.40

    if req_edu.field and cand_edu.field:
        sim = get_field_similarity(cand_edu.field, req_edu.field)
        if sim == 1.0:
            base = min(1.0, base + 0.10)
        elif sim >= 0.70:
            base = min(1.0, base + 0.05)
        else:
            base = max(0.30, base - 0.05)

    return round(base, 2)


class MatchingEngine:
    """Deterministic engine to match candidate profile against job opportunities.
    Includes sub-scores (Skill, Experience, Education, Location), overall compatibility score,
    and transparent explainability (WHY MATCHED vs GAPS).
    """

    BASE_WEIGHTS = {
        "skill": 0.50,
        "experience": 0.25,
        "education": 0.15,
        "location": 0.10,
    }

    def __init__(self, skill_engine: SkillEngine = None):
        self.skill_engine = skill_engine or SkillEngine()

    def rank(
        self,
        candidate: Dict[str, Any],
        opportunities: List[Dict[str, Any]],
        skill_proficiency_threshold: float = 0.30,
        target_role_name: str = "",
    ) -> List[Dict[str, Any]]:
        """Ranks list of opportunity dicts against candidate profile using continuous proficiency-weighted matching."""
        cand_skill_map = normalize_candidate_skill_map(candidate.get("skills", []), self.skill_engine)

        cand_exp = calculate_effective_experience(
            candidate.get("experience_years", 0.0),
            candidate.get("career_gaps", []),
        )
        cand_edu_raw = candidate.get("education", [])
        cand_loc_raw = candidate.get("location", "")

        ranked = []
        for opp in opportunities:
            opp_title = opp.get("title", "Unknown Role")
            opp_company = opp.get("company", "Company")
            req_skills = opp.get("required_skills", [])
            pref_skills = opp.get("preferred_skills", [])

            raw_req_exp = opp.get("experience_min", opp.get("experience_required", 0.0))
            try:
                req_exp = max(0.0, float(raw_req_exp))
            except (TypeError, ValueError):
                req_exp = 0.0

            req_edu_raw = opp.get("education_required", opp.get("education", []))
            opp_loc_raw = opp.get("location", "")
            work_mode_raw = opp.get("work_mode", "")

            # 1. Skill Match Calculation
            if not req_skills:
                skill_score = None
                matched_skills = []
                missing_skills = []
            else:
                req_scores = []
                matched_skills = []
                missing_skills = []

                for r_skill in req_skills:
                    if isinstance(r_skill, dict):
                        r_name = r_skill.get("name", "")
                        r_norm = r_skill.get("normalized_name") or self.skill_engine.normalize_skill_name(r_name)
                        r_req_level = min(1.0, max(0.0, float(r_skill.get("required_level", r_skill.get("proficiency", 0.60)))))
                    else:
                        r_name = str(r_skill)
                        r_norm = self.skill_engine.normalize_skill_name(r_name)
                        r_req_level = 0.60

                    r_norm = self.skill_engine.normalize_skill_name(r_norm)
                    c_prof = cand_skill_map.get(r_norm, 0.0)

                    ratio = min(1.0, c_prof / r_req_level) if r_req_level > 0 else 1.0
                    req_scores.append(ratio)

                    display_name = r_name if r_name else r_norm.title()

                    if c_prof >= r_req_level:
                        matched_skills.append(display_name)
                    else:
                        missing_skills.append(display_name)

                req_avg_score = sum(req_scores) / len(req_scores) if req_scores else 0.50

                if pref_skills:
                    pref_scores = []
                    for p_skill in pref_skills:
                        if isinstance(p_skill, dict):
                            p_name = p_skill.get("name", "")
                            p_norm = p_skill.get("normalized_name") or self.skill_engine.normalize_skill_name(p_name)
                            p_req_level = min(1.0, max(0.0, float(p_skill.get("required_level", p_skill.get("proficiency", 0.50)))))
                        else:
                            p_name = str(p_skill)
                            p_norm = self.skill_engine.normalize_skill_name(p_name)
                            p_req_level = 0.50

                        p_norm = self.skill_engine.normalize_skill_name(p_norm)
                        c_prof = cand_skill_map.get(p_norm, 0.0)
                        ratio = min(1.0, c_prof / p_req_level) if p_req_level > 0 else 1.0
                        pref_scores.append(ratio)

                        display_name = p_name if p_name else p_norm.title()
                        if c_prof >= p_req_level and display_name not in matched_skills:
                            matched_skills.append(display_name)

                    pref_avg_score = sum(pref_scores) / len(pref_scores) if pref_scores else 0.50
                    skill_score = (req_avg_score * 0.85) + (pref_avg_score * 0.15)
                else:
                    skill_score = req_avg_score

            # 2. Experience Match Calculation
            if req_exp <= 0 or cand_exp >= req_exp:
                exp_score = 1.0
            else:
                exp_score = round(cand_exp / req_exp, 2)

            # 3. Education Match Calculation using canonical normalizer
            edu_score = evaluate_education_match(cand_edu_raw, req_edu_raw)

            # 4. Location Match Calculation using canonical normalizer
            loc_score = evaluate_location_match(cand_loc_raw, opp_loc_raw, work_mode_raw)

            # Finding #6 Fix: Scalable Dynamic Weight Normalization
            components = {
                "skill": skill_score,
                "experience": exp_score,
                "education": edu_score,
                "location": loc_score,
            }

            available = {k: v for k, v in components.items() if v is not None}
            total_weight = sum(self.BASE_WEIGHTS[k] for k in available)

            if total_weight > 0:
                overall_score = round(sum((v * self.BASE_WEIGHTS[k]) / total_weight for k, v in available.items()), 2)
            else:
                overall_score = 0.50

            if target_role_name and (target_role_name.lower() in opp_title.lower() or opp_title.lower() in target_role_name.lower()):
                overall_score = min(1.0, overall_score + 0.10)

            # Finding #1 & #2 Fix: Honest API Contract for Missing Data
            ranked.append({
                "title": opp_title,
                "company": opp_company,
                "compatibility_score": int(overall_score * 100),
                "breakdown": {
                    "skill_match": int(skill_score * 100) if skill_score is not None else None,
                    "skill_match_status": "evaluated" if skill_score is not None else "insufficient_data",
                    "experience_match": int(exp_score * 100),
                    "education_match": int(edu_score * 100),
                    "location_match": int(loc_score * 100) if loc_score is not None else None,
                    "location_match_status": "evaluated" if loc_score is not None else "insufficient_data",
                },
                "why_matched": matched_skills,
                "gaps": missing_skills,
            })

        ranked.sort(key=lambda x: (x["compatibility_score"], len(x["why_matched"])), reverse=True)
        return ranked
