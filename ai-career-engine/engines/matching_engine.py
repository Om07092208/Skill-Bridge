from __future__ import annotations
import re
from typing import Dict, List, Any, Optional
from engines.skill_engine import SkillEngine
from models.taxonomy import (
    normalize_role_title,
    resolve_role_taxonomy,
    get_specialization_similarity,
    get_role_token_weight,
    GENERIC_ROLE_TOKENS,
)
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
    """Evaluates degree level & multi-domain similarity matrix across all academic fields."""
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

    cand_fields = getattr(cand_edu, "fields", []) or ([cand_edu.primary_field] if cand_edu.primary_field else [])
    req_fields = getattr(req_edu, "fields", []) or ([req_edu.primary_field] if req_edu.primary_field else [])

    if cand_fields and req_fields:
        similarities = [
            get_field_similarity(c_field, r_field)
            for c_field in cand_fields
            for r_field in req_fields
            if c_field and r_field
        ]
        sim = max(similarities, default=0.0)
        if sim == 1.0:
            base = min(1.0, base + 0.10)
        elif sim >= 0.70:
            base = min(1.0, base + 0.05)
        else:
            base = max(0.30, base - 0.05)

    return round(base, 2)


def evaluate_role_match(target_role_name: str, opp_title: str) -> Optional[float]:
    """Evaluates role match using hierarchical role taxonomy (exact=1.0, core=0.95, same spec=0.90, related/family matrix, unrelated=0.0)."""
    if not target_role_name or not opp_title:
        return None
    t_raw = target_role_name.strip().lower()
    o_raw = opp_title.strip().lower()
    if t_raw == o_raw:
        return 1.0

    t_norm = normalize_role_title(target_role_name)
    o_norm = normalize_role_title(opp_title)

    # 1. Exact normalized core title match (e.g. "Senior Data Scientist" vs "Data Scientist", "Software-Engineer" vs "Software Engineer")
    if t_norm and t_norm == o_norm:
        return 0.95

    # 2. Taxonomy Resolution
    t_fam, t_spec = resolve_role_taxonomy(target_role_name)
    o_fam, o_spec = resolve_role_taxonomy(opp_title)

    if t_spec and o_spec:
        return get_specialization_similarity(t_fam, t_spec, o_fam, o_spec)

    # 3. Fallback for unknown roles not present in taxonomy: weighted token overlap ratio (requires domain token overlap)
    t_words = set(t_norm.split()) if t_norm else set(t_raw.split())
    o_words = set(o_norm.split()) if o_norm else set(o_raw.split())

    domain_overlap = (t_words - GENERIC_ROLE_TOKENS) & (o_words - GENERIC_ROLE_TOKENS)
    if not domain_overlap:
        return 0.0

    overlap = t_words & o_words
    overlap_weight_sum = sum(get_role_token_weight(w) for w in overlap)
    t_weight_sum = sum(get_role_token_weight(w) for w in t_words)
    o_weight_sum = sum(get_role_token_weight(w) for w in o_words)

    max_weight_sum = max(t_weight_sum, o_weight_sum)
    if max_weight_sum <= 0:
        return 0.0

    weighted_ratio = overlap_weight_sum / max_weight_sum
    return min(0.40, round(weighted_ratio, 2))


class MatchingEngine:
    """Deterministic engine to match candidate profile against job opportunities.
    Includes sub-scores (Role, Skill, Experience, Education, Location), overall compatibility score,
    and transparent explainability (WHY MATCHED vs GAPS).
    """

    BASE_WEIGHTS = {
        "role": 0.20,
        "skill": 0.40,
        "experience": 0.20,
        "education": 0.10,
        "location": 0.10,
    }
    CRITICAL_SKILL_PENALTY_BASE = 0.20
    STATUS_EVALUATED = "evaluated"
    STATUS_CRITICAL_GAP = "evaluated_with_critical_gap"
    STATUS_INSUFFICIENT_DATA = "insufficient_data"

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

            # 3. Education Match Calculation
            edu_score = evaluate_education_match(cand_edu_raw, req_edu_raw)

            # 4. Location Match Calculation
            loc_score = evaluate_location_match(cand_loc_raw, opp_loc_raw, work_mode_raw)

            # 5. Role Match Calculation
            role_score = evaluate_role_match(target_role_name, opp_title)

            # Dynamic Weight Normalization
            components = {
                "role": role_score,
                "skill": skill_score,
                "experience": exp_score,
                "education": edu_score,
                "location": loc_score,
            }

            available = {k: v for k, v in components.items() if v is not None}
            total_weight = sum(self.BASE_WEIGHTS[k] for k in available)

            # Finding #3 Fix: Honest score availability contract (None + insufficient_data when 0 weights available)
            missing_critical = []
            missing_ratio = 0.0
            veto_multiplier = 1.0

            if total_weight > 0:
                overall_score = round(sum((v * self.BASE_WEIGHTS[k]) / total_weight for k, v in available.items()), 2)
                compatibility_status = self.STATUS_EVALUATED

                # 6. Proportional Critical Skill Veto Check
                raw_critical = [s for s in opp.get("critical_skills", []) if isinstance(s, str) and s.strip()]
                if raw_critical:
                    # Deduplicate normalized critical skills
                    unique_critical_map = {}
                    for c_skill in raw_critical:
                        c_norm = self.skill_engine.normalize_skill_name(c_skill)
                        if c_norm not in unique_critical_map:
                            unique_critical_map[c_norm] = c_skill

                    for c_norm, display_skill in unique_critical_map.items():
                        if cand_skill_map.get(c_norm, 0.0) < skill_proficiency_threshold:
                            missing_critical.append(display_skill)

                    if missing_critical:
                        missing_ratio = round(len(missing_critical) / len(unique_critical_map), 2)
                        penalty_range = 1.0 - self.CRITICAL_SKILL_PENALTY_BASE
                        veto_multiplier = max(
                            self.CRITICAL_SKILL_PENALTY_BASE,
                            round(1.0 - penalty_range * missing_ratio, 2)
                        )
                        overall_score = round(overall_score * veto_multiplier, 2)
                        compatibility_status = self.STATUS_CRITICAL_GAP
            else:
                overall_score = None
                compatibility_status = self.STATUS_INSUFFICIENT_DATA

            ranked.append({
                "id": opp.get("id", opp_title),
                "title": opp_title,
                "company": opp_company,
                "compatibility_score": int(overall_score * 100) if overall_score is not None else None,
                "compatibility_status": compatibility_status,
                "missing_critical_skills": missing_critical,
                "critical_skill_gap_ratio": missing_ratio,
                "critical_skill_penalty_multiplier": veto_multiplier,
                "breakdown": {
                    "role_match": int(role_score * 100) if role_score is not None else None,
                    "role_match_status": self.STATUS_EVALUATED if role_score is not None else self.STATUS_INSUFFICIENT_DATA,
                    "skill_match": int(skill_score * 100) if skill_score is not None else None,
                    "skill_match_status": self.STATUS_EVALUATED if skill_score is not None else self.STATUS_INSUFFICIENT_DATA,
                    "experience_match": int(exp_score * 100),
                    "education_match": int(edu_score * 100),
                    "location_match": int(loc_score * 100) if loc_score is not None else None,
                    "location_match_status": self.STATUS_EVALUATED if loc_score is not None else self.STATUS_INSUFFICIENT_DATA,
                },
                "why_matched": matched_skills,
                "gaps": missing_skills,
            })

        ranked.sort(
            key=lambda x: (
                x["compatibility_score"] if x["compatibility_score"] is not None else -1,
                len(x["why_matched"]),
            ),
            reverse=True,
        )
        return ranked
