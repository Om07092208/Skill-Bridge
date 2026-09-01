from __future__ import annotations
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field

DEFAULT_DECLARED_SKILL_PROFICIENCY = 0.50


class CanonicalSkill(BaseModel):
    name: str
    normalized_name: str
    proficiency: float = Field(default=DEFAULT_DECLARED_SKILL_PROFICIENCY, ge=0.0, le=1.0)
    evidence_type: str = "declared"


class CanonicalLocation(BaseModel):
    raw: str = ""
    city: str = ""
    state: str = ""
    country: str = ""
    is_remote: bool = False
    is_hybrid: bool = False


class CanonicalEducation(BaseModel):
    raw: str = ""
    degree_level: str = "bachelor"  # 'bachelor', 'master', 'phd', 'high_school'
    field: str = ""


def normalize_candidate_skills(raw_skills: List[Any], skill_engine: Any = None) -> Dict[str, float]:
    """Centralized skill normalizer eliminating engine-level contract drift and input-order dependence."""
    if skill_engine is None:
        from engines.skill_engine import SkillEngine
        engine = SkillEngine()
    else:
        engine = skill_engine
    result: Dict[str, float] = {}

    for s in raw_skills or []:
        if isinstance(s, dict):
            raw_name = s.get("name", "")
            norm = s.get("normalized_name") or engine.normalize_skill_name(raw_name)
            prof = min(1.0, max(0.0, float(s.get("proficiency", DEFAULT_DECLARED_SKILL_PROFICIENCY))))
        elif isinstance(s, str):
            raw_name = s
            norm = engine.normalize_skill_name(raw_name)
            prof = DEFAULT_DECLARED_SKILL_PROFICIENCY
        else:
            continue

        norm = engine.normalize_skill_name(norm)
        if norm:
            result[norm] = max(result.get(norm, 0.0), prof)

    return result


def normalize_location(loc_input: Any, work_mode_input: Any = "") -> CanonicalLocation:
    """Centralized location normalizer parsing city, state, country, and remote/hybrid work modes."""
    loc_str = str(loc_input or "").strip().lower()
    work_mode_str = str(work_mode_input or "").strip().lower()

    is_remote = "remote" in loc_str or "remote" in work_mode_str or not loc_str
    is_hybrid = "hybrid" in loc_str or "hybrid" in work_mode_str

    parts = [p.strip() for p in loc_str.split(",") if p.strip()]
    if not parts:
        city, state, country = "", "", ""
    elif len(parts) == 1:
        city, state, country = parts[0], parts[0], parts[0]
    else:
        city = parts[0]
        state = parts[1] if len(parts) > 2 else parts[0]
        country = parts[-1]

    return CanonicalLocation(
        raw=loc_str,
        city=city,
        state=state,
        country=country,
        is_remote=is_remote,
        is_hybrid=is_hybrid,
    )


def normalize_education(edu_input: Any) -> CanonicalEducation:
    """Centralized education normalizer extracting degree level and field specialization."""
    edu_str = str(edu_input or "").strip().lower()

    if "phd" in edu_str or "doctor" in edu_str:
        level = "phd"
    elif "master" in edu_str or "m.tech" in edu_str or "ms" in edu_str or "mba" in edu_str:
        level = "master"
    elif "bachelor" in edu_str or "b.tech" in edu_str or "bs" in edu_str or "degree" in edu_str or "b.e" in edu_str:
        level = "bachelor"
    else:
        level = "bachelor"

    field = ""
    for f in ["computer science", "data science", "machine learning", "artificial intelligence", "information technology", "engineering"]:
        if f in edu_str:
            field = f
            break

    return CanonicalEducation(raw=edu_str, degree_level=level, field=field)
