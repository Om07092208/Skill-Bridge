from __future__ import annotations
import re
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field

DEFAULT_DECLARED_SKILL_PROFICIENCY = 0.50
_default_skill_engine = None


def get_skill_engine():
    """Finding #10 Fix: Module-level singleton to avoid repeated instantiation overhead in batch runs."""
    global _default_skill_engine
    if _default_skill_engine is None:
        from engines.skill_engine import SkillEngine
        _default_skill_engine = SkillEngine()
    return _default_skill_engine


class CanonicalSkill(BaseModel):
    name: str
    normalized_name: str
    proficiency: float = Field(default=DEFAULT_DECLARED_SKILL_PROFICIENCY, ge=0.0, le=1.0)
    evidence_type: str = "declared"  # 'declared', 'assessed', 'project', 'certified'


class CanonicalLocation(BaseModel):
    raw: str = ""
    city: str = ""
    state: str = ""
    country: str = ""
    is_known: bool = False
    is_remote: bool = False
    is_hybrid: bool = False


class CanonicalEducation(BaseModel):
    raw: str = ""
    degree_level: str = "unknown"  # 'bachelor', 'master', 'phd', 'high_school', 'unknown'
    field: str = ""


DEGREE_PATTERNS = {
    "phd": [r"\bph\.?d\b", r"\bdoctorate\b", r"\bdoctor\b"],
    "master": [r"\bmaster'?s\b", r"\bm\.?tech\b", r"\bm\.?s\b", r"\bmba\b"],
    "bachelor": [r"\bbachelor'?s\b", r"\bb\.?tech\b", r"\bb\.?e\.?\b", r"\bb\.?sc\b", r"\bbs\b"],
    "high_school": [r"\bhigh school\b", r"\bdiploma\b", r"\bsecondary\b"],
}

FIELD_ALIASES = {
    "computer_science": ["computer science", "cse", "cs", "computer engineering", "software engineering"],
    "artificial_intelligence": ["artificial intelligence", "ai", "machine learning", "ml", "ai/ml", "data science", "ds"],
    "information_technology": ["information technology", "it", "information systems"],
    "engineering": ["engineering"],
}


def normalize_candidate_skills(raw_skills: List[Any], skill_engine: Any = None) -> List[CanonicalSkill]:
    """Finding #8 & #9 Fix: Returns structured List[CanonicalSkill] preserving original names and dynamic evidence types."""
    engine = skill_engine or get_skill_engine()
    canonical_list: List[CanonicalSkill] = []
    seen_map: Dict[str, CanonicalSkill] = {}

    for s in raw_skills or []:
        if isinstance(s, dict):
            raw_name = str(s.get("name", "")).strip()
            norm = s.get("normalized_name") or engine.normalize_skill_name(raw_name)
            
            raw_prof = s.get("proficiency")
            if raw_prof is not None:
                prof = min(1.0, max(0.0, float(raw_prof)))
                ev_type = "assessed"
            else:
                prof = DEFAULT_DECLARED_SKILL_PROFICIENCY
                ev_type = "declared"

            if s.get("project_evidence", 0) > 0 or s.get("projects"):
                ev_type = "project"
            elif s.get("certified") or s.get("certification"):
                ev_type = "certified"

        elif isinstance(s, str):
            raw_name = s.strip()
            norm = engine.normalize_skill_name(raw_name)
            prof = DEFAULT_DECLARED_SKILL_PROFICIENCY
            ev_type = "declared"
        else:
            continue

        norm = engine.normalize_skill_name(norm)
        if not norm:
            continue

        item = CanonicalSkill(
            name=raw_name or norm.title(),
            normalized_name=norm,
            proficiency=prof,
            evidence_type=ev_type,
        )

        if norm not in seen_map or prof > seen_map[norm].proficiency:
            seen_map[norm] = item

    return list(seen_map.values())


def normalize_candidate_skill_map(raw_skills: List[Any], skill_engine: Any = None) -> Dict[str, float]:
    """Convenience helper returning normalized skill map {normalized_name: proficiency}."""
    canonical = normalize_candidate_skills(raw_skills, skill_engine)
    return {s.normalized_name: s.proficiency for s in canonical}


def normalize_location(loc_input: Any, work_mode_input: Any = "") -> CanonicalLocation:
    """Finding #1, #2 & #3 Fix: Accurately parses city/state/country without manufacturing fake geography or false remote states."""
    loc_str = str(loc_input or "").strip()
    loc_lower = loc_str.lower()
    work_mode_str = str(work_mode_input or "").strip().lower()

    is_known = bool(loc_str)
    is_remote = "remote" in loc_lower or "remote" in work_mode_str
    is_hybrid = "hybrid" in loc_lower or "hybrid" in work_mode_str

    parts = [p.strip() for p in loc_str.split(",") if p.strip()]
    if len(parts) == 0:
        city, state, country = "", "", ""
    elif len(parts) == 1:
        city, state, country = parts[0], "", ""
    elif len(parts) == 2:
        city, state, country = parts[0], parts[1], ""
    else:
        city = parts[0]
        state = parts[1]
        country = parts[-1]

    return CanonicalLocation(
        raw=loc_str,
        city=city,
        state=state,
        country=country,
        is_known=is_known,
        is_remote=is_remote,
        is_hybrid=is_hybrid,
    )


def normalize_education(edu_input: Any) -> CanonicalEducation:
    """Finding #4, #5, #6 & #7 Fix: Safe regex degree parsing, alias mapping, and unknown level default."""
    if isinstance(edu_input, list):
        raw_str = ", ".join([str(e) for e in edu_input if e])
    else:
        raw_str = str(edu_input or "").strip()

    edu_lower = raw_str.lower()
    if not edu_lower:
        return CanonicalEducation(raw="", degree_level="unknown", field="")

    # Degree level extraction using word boundaries to prevent substring false positives
    detected_level = "unknown"
    for level, patterns in DEGREE_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, edu_lower):
                detected_level = level
                break
        if detected_level != "unknown":
            break

    # Field extraction using alias dictionary
    detected_field = ""
    for field_key, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            pattern = r"\b" + re.escape(alias) + r"\b"
            if re.search(pattern, edu_lower):
                detected_field = field_key
                break
        if detected_field:
            break

    return CanonicalEducation(raw=raw_str, degree_level=detected_level, field=detected_field)
