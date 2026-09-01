from __future__ import annotations
from typing import Dict, List, Any, Optional
from engines.skill_engine import SkillEngine


def calculate_effective_experience(experience_years: float, career_gaps: List[Dict[str, Any]] = None) -> float:
    """Returns actual professional experience years without artificially adding gap duration."""
    try:
        return max(0.0, float(experience_years))
    except (TypeError, ValueError):
        return 0.0


def parse_location_components(loc_str: str) -> Dict[str, str]:
    """Parses location string into structured city/state/country components."""
    parts = [p.strip().lower() for p in loc_str.split(",") if p.strip()]
    if not parts:
        return {"city": "", "state": "", "country": ""}
    if len(parts) == 1:
        return {"city": parts[0], "state": parts[0], "country": parts[0]}
    return {
        "city": parts[0],
        "state": parts[1] if len(parts) > 2 else parts[0],
        "country": parts[-1],
    }


def evaluate_location_match(cand_loc: str, opp_loc: str, work_mode: str) -> float:
    """Problem 2 Fix: Evaluates structured location compatibility instead of naive substring matching."""
    cand_loc_clean = cand_loc.strip().lower()
    opp_loc_clean = opp_loc.strip().lower()
    work_mode_clean = work_mode.strip().lower()

    if not opp_loc_clean or "remote" in opp_loc_clean or "remote" in work_mode_clean:
        return 1.0

    c_struct = parse_location_components(cand_loc_clean)
    o_struct = parse_location_components(opp_loc_clean)

    if c_struct["city"] and c_struct["city"] == o_struct["city"]:
        return 1.0
    if c_struct["country"] and c_struct["country"] == o_struct["country"]:
        if "hybrid" in opp_loc_clean or "hybrid" in work_mode_clean:
            return 0.85
        return 0.60
    if "hybrid" in opp_loc_clean or "hybrid" in work_mode_clean:
        return 0.75

    return 0.20


def evaluate_education_match(cand_edu: List[str], req_edu: Any) -> float:
    """Problem 3 Fix: Evaluates semantic education match based on degree level and field alignment."""
    if not req_edu:
        return 1.0

    req_list = [str(r).lower() for r in (req_edu if isinstance(req_edu, list) else [req_edu])]
    cand_list = [str(e).lower() for e in cand_edu]

    if not cand_list:
        return 0.40

    # Exact term match
    for r in req_list:
        for c in cand_list:
            if r in c or c in r:
                return 1.0

    # Degree level hierarchy check
    req_has_master = any("master" in r or "m.tech" in r or "ms" in r for r in req_list)
    cand_has_master = any("master" in c or "m.tech" in c or "ms" in c for c in cand_list)
    cand_has_bachelor = any("bachelor" in c or "b.tech" in c or "bs" in c or "degree" in c for c in cand_list)

    if req_has_master:
        return 1.0 if cand_has_master else (0.75 if cand_has_bachelor else 0.40)
    
    if cand_has_bachelor or cand_has_master:
        return 0.85

    return 0.45


class MatchingEngine:
    """Deterministic engine to match candidate profile against job opportunities.
    Includes sub-scores (Skill, Experience, Education, Location), overall compatibility score,
    and transparent explainability (WHY MATCHED vs GAPS).
    """

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
        cand_skill_map: Dict[str, float] = {}
        raw_skills = candidate.get("skills", [])

        for s in raw_skills:
            if isinstance(s, dict):
                norm = s.get("normalized_name") or self.skill_engine.normalize_skill_name(s.get("name", ""))
                norm = self.skill_engine.normalize_skill_name(norm)
                prof = min(1.0, max(0.0, float(s.get("proficiency", 0.0))))
                cand_skill_map[norm] = max(cand_skill_map.get(norm, 0.0), prof)
            elif isinstance(s, str):
                # Problem 5 Fix: String skills receive neutral declared baseline (0.50) instead of expert 1.0
                norm = self.skill_engine.normalize_skill_name(s)
                cand_skill_map[norm] = max(cand_skill_map.get(norm, 0.0), 0.50)

        cand_exp = calculate_effective_experience(
            candidate.get("experience_years", 0.0),
            candidate.get("career_gaps", []),
        )
        cand_edu = [str(e) for e in candidate.get("education", [])]
        cand_loc = str(candidate.get("location", ""))

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

            req_edu = opp.get("education_required", opp.get("education", []))
            opp_loc = str(opp.get("location", ""))
            work_mode = str(opp.get("work_mode", ""))

            # 1. Skill Match Calculation
            if not req_skills:
                # Problem 4 Fix: Mark skill_score as None for dynamic weight redistribution
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
                        # Problem 6 Fix: Data-driven required level parsing
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

            # 3. Education Match Calculation
            edu_score = evaluate_education_match(cand_edu, req_edu)

            # 4. Location Match Calculation
            loc_score = evaluate_location_match(cand_loc, opp_loc, work_mode)

            # Problem 4 Fix: Dynamic Component Weighting
            if skill_score is None:
                # Skill data missing: Redistribute weights (Experience 50%, Education 30%, Location 20%)
                overall_score = round(
                    (exp_score * 0.50) +
                    (edu_score * 0.30) +
                    (loc_score * 0.20),
                    2,
                )
                skill_score_display = 50
            else:
                overall_score = round(
                    (skill_score * 0.50) +
                    (exp_score * 0.25) +
                    (edu_score * 0.15) +
                    (loc_score * 0.10),
                    2,
                )
                skill_score_display = int(skill_score * 100)

            if target_role_name and (target_role_name.lower() in opp_title.lower() or opp_title.lower() in target_role_name.lower()):
                overall_score = min(1.0, overall_score + 0.10)

            ranked.append({
                "title": opp_title,
                "company": opp_company,
                "compatibility_score": int(overall_score * 100),
                "breakdown": {
                    "skill_match": skill_score_display,
                    "experience_match": int(exp_score * 100),
                    "education_match": int(edu_score * 100),
                    "location_match": int(loc_score * 100),
                },
                "why_matched": matched_skills,
                "gaps": missing_skills,
            })

        ranked.sort(key=lambda x: (x["compatibility_score"], len(x["why_matched"])), reverse=True)
        return ranked
