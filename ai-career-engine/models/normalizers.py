from __future__ import annotations
import re
import json
import os
from typing import Dict, List, Any, Optional, Set
from pydantic import BaseModel, Field

DEFAULT_DECLARED_SKILL_PROFICIENCY = 0.50
_default_skill_engine = None

# Strict pycountry import required by dependency contract
import pycountry


def get_skill_engine():
    """Module-level singleton to avoid repeated instantiation overhead in batch runs."""
    global _default_skill_engine
    if _default_skill_engine is None:
        from engines.skill_engine import SkillEngine
        _default_skill_engine = SkillEngine()
    return _default_skill_engine


class CanonicalSkill(BaseModel):
    name: str
    normalized_name: str
    proficiency: float = Field(default=DEFAULT_DECLARED_SKILL_PROFICIENCY, ge=0.0, le=1.0)
    evidence_types: List[str] = Field(default_factory=lambda: ["declared"])


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
    primary_field: str = ""
    fields: List[str] = Field(default_factory=list)  # Finding #5 Fix: Structurally supports multi-domain degrees


DEGREE_PATTERNS = {
    "phd": [r"\bph\.?d\b", r"\bdoctorate\b", r"\bdoctoral\b"],
    "master": [r"\bmaster'?s\b", r"\bm\.?tech\b", r"\bm\.?s\b", r"\bmba\b"],
    "bachelor": [r"\bbachelor'?s\b", r"\bb\.?tech\b", r"\bb\.?e\.?\b", r"\bb\.?sc\b", r"\bbs\b"],
    "high_school": [r"\bhigh school\b", r"\bdiploma\b", r"\bsecondary\b"],
}

DEGREE_LEVEL_SCORES = {"phd": 4, "master": 3, "bachelor": 2, "high_school": 1, "unknown": 0}

FIELD_ALIASES = {
    "computer_science": ["computer science", "cse", "cs"],
    "software_engineering": ["software engineering", "computer engineering"],
    "data_science": ["data science", "ds"],
    "machine_learning": ["machine learning", "ml"],
    "artificial_intelligence": ["artificial intelligence", "ai", "ai/ml"],
    "information_technology": ["information technology", "it", "information systems"],
    "engineering": ["engineering"],
}

FIELD_SIMILARITY: Dict[tuple[str, str], float] = {
    ("artificial_intelligence", "machine_learning"): 0.90,
    ("artificial_intelligence", "data_science"): 0.75,
    ("machine_learning", "data_science"): 0.80,
    ("computer_science", "software_engineering"): 0.85,
    ("computer_science", "information_technology"): 0.70,
}


def get_field_similarity(field_a: str, field_b: str) -> float:
    """Calculates directional or exact domain alignment score between two academic fields."""
    if not field_a or not field_b:
        return 0.0
    if field_a == field_b:
        return 1.0
    return FIELD_SIMILARITY.get((field_a, field_b), FIELD_SIMILARITY.get((field_b, field_a), 0.0))


# Finding #7 Fix: Explicit canonical country dataset with unambiguous nation entries
KNOWN_COUNTRIES: Set[str] = {
    "india", "usa", "united states", "us", "uk", "united kingdom", "canada",
    "germany", "france", "australia", "japan", "singapore", "brazil",
    "netherlands", "sweden", "spain", "italy", "uae", "united arab emirates",
    "switzerland", "south korea", "republic of korea", "north korea", "china",
    "russia", "mexico", "south africa", "new zealand", "ireland", "belgium", "austria"
}


FIELD_PARENT: Dict[str, str] = {
    "computer_science": "engineering",
    "software_engineering": "engineering",
    "information_technology": "engineering",
    "artificial_intelligence": "engineering",
    "machine_learning": "engineering",
    "data_science": "engineering",
}

ROLE_MODIFIERS: Set[str] = {
    "senior",
    "sr",
    "junior",
    "jr",
    "lead",
    "principal",
    "staff",
    "intern",
    "internship",
    "associate",
    "head",
    "director",
    "vp",
    "chief",
}

GENERIC_ROLE_TOKENS: Set[str] = {
    "engineer",
    "developer",
    "manager",
    "analyst",
    "specialist",
    "consultant",
    "architect",
    "lead",
    "officer",
    "administrator",
    "designer",
}

_role_taxonomy_cache: Optional[Dict[str, Any]] = None
_role_alias_index: Optional[Dict[str, tuple[str, str]]] = None


def load_role_taxonomy(reload: bool = False) -> Dict[str, Any]:
    """Loads role taxonomy JSON file from data directory. Fails fast if file is missing, malformed, or has alias collisions."""
    global _role_taxonomy_cache, _role_alias_index
    if _role_taxonomy_cache is None or reload:
        base_dir = os.path.dirname(os.path.dirname(__file__))
        path = os.path.join(base_dir, "data", "role_taxonomy.json")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Required role taxonomy file not found: {path}")

        with open(path, "r", encoding="utf-8") as f:
            new_cache = json.load(f)

        # Build and validate alias index and related mappings in local variables first (Atomic update)
        new_index: Dict[str, tuple[str, str]] = {}
        all_specs: Set[str] = set()

        for fam_key, fam_data in new_cache.items():
            specs = fam_data.get("specializations", {})
            for spec_key in specs.keys():
                all_specs.add(spec_key)

        for fam_key, fam_data in new_cache.items():
            specs = fam_data.get("specializations", {})
            for spec_key, spec_data in specs.items():
                aliases = spec_data.get("aliases", [])
                for alias in aliases:
                    raw_alias = alias.strip().lower()
                    norm_alias = normalize_role_title(alias)

                    for target_alias in (raw_alias, norm_alias):
                        if not target_alias:
                            continue
                        existing = new_index.get(target_alias)
                        if existing and existing != (fam_key, spec_key):
                            raise ValueError(
                                f"Role taxonomy alias collision: '{target_alias}' maps to both {existing} and {(fam_key, spec_key)}"
                            )
                        new_index[target_alias] = (fam_key, spec_key)

                related = spec_data.get("related", {})
                for rel_spec, sim in related.items():
                    if rel_spec not in all_specs:
                        raise ValueError(f"Role taxonomy related specialization '{rel_spec}' in '{spec_key}' does not exist")
                    try:
                        sim_val = float(sim)
                        if not (0.0 <= sim_val <= 1.0):
                            raise ValueError
                    except (ValueError, TypeError):
                        raise ValueError(f"Role taxonomy invalid similarity score '{sim}' for related key '{rel_spec}' in '{spec_key}'")

        # Atomic assignment only after full validation
        _role_taxonomy_cache = new_cache
        _role_alias_index = new_index

    return _role_taxonomy_cache


def normalize_role_title(title: str) -> str:
    """Normalizes role title by lowercasing, stripping punctuation, level indicators (I, II, III), and seniority modifiers."""
    if not title:
        return ""
    val = title.strip().lower()
    # Strip punctuation (replace non-alphanumeric with spaces)
    val = re.sub(r"[^a-z0-9\s]", " ", val)
    # Strip Roman numeral level indicators (I, II, III, IV, V) as standalone tokens
    val = re.sub(r"\b(i|ii|iii|iv|v)\b", "", val)
    # Strip seniority modifiers
    words = [w for w in val.split() if w not in ROLE_MODIFIERS]
    return " ".join(words)


def resolve_role_taxonomy(title: str) -> tuple[Optional[str], Optional[str]]:
    """Resolves a given role title to (family_key, specialization_key) using fast O(1) index lookup."""
    load_role_taxonomy()
    raw_norm = title.strip().lower()
    norm = normalize_role_title(title)

    if norm and norm in _role_alias_index:
        return _role_alias_index[norm]
    if raw_norm and raw_norm in _role_alias_index:
        return _role_alias_index[raw_norm]

    return None, None


def get_specialization_similarity(fam_a: str, spec_a: str, fam_b: str, spec_b: str) -> float:
    """Calculates granular similarity score between two taxonomy specializations."""
    if spec_a == spec_b:
        return 0.90  # Same specialization alias (e.g. Backend Developer ↔ Backend Engineer)

    taxonomy = load_role_taxonomy()
    spec_a_data = taxonomy.get(fam_a, {}).get("specializations", {}).get(spec_a, {})
    spec_b_data = taxonomy.get(fam_b, {}).get("specializations", {}).get(spec_b, {})

    # Check explicit related score in spec_a
    related_a = spec_a_data.get("related", {})
    if spec_b in related_a:
        return float(related_a[spec_b])

    # Check symmetric explicit related score in spec_b
    related_b = spec_b_data.get("related", {})
    if spec_a in related_b:
        return float(related_b[spec_a])

    # Default intra-family vs cross-family
    if fam_a == fam_b:
        return 0.50

    return 0.00


def is_known_country(term: str) -> bool:
    """Efficient pycountry lookup with narrow LookupError exception handling."""
    val = term.strip().lower()
    if not val:
        return False
    try:
        pycountry.countries.lookup(val)
        return True
    except LookupError:
        return val in KNOWN_COUNTRIES


def normalize_candidate_skills(raw_skills: List[Any], skill_engine: Any = None) -> List[CanonicalSkill]:
    """Preserves structured skills with multi-value evidence type tracking."""
    engine = skill_engine or get_skill_engine()
    seen_map: Dict[str, CanonicalSkill] = {}

    for s in raw_skills or []:
        ev_types = set()
        if isinstance(s, dict):
            raw_name = str(s.get("name", "")).strip()
            norm = s.get("normalized_name") or engine.normalize_skill_name(raw_name)
            
            raw_prof = s.get("proficiency")
            if raw_prof is not None:
                prof = min(1.0, max(0.0, float(raw_prof)))
                ev_types.add("assessed")
            else:
                prof = DEFAULT_DECLARED_SKILL_PROFICIENCY
                ev_types.add("declared")

            if s.get("project_evidence", 0) > 0 or s.get("projects"):
                ev_types.add("project")
            if s.get("certified") or s.get("certification"):
                ev_types.add("certified")

        elif isinstance(s, str):
            raw_name = s.strip()
            norm = engine.normalize_skill_name(raw_name)
            prof = DEFAULT_DECLARED_SKILL_PROFICIENCY
            ev_types.add("declared")
        else:
            continue

        norm = engine.normalize_skill_name(norm)
        if not norm:
            continue

        if not ev_types:
            ev_types.add("declared")

        item = CanonicalSkill(
            name=raw_name or norm.title(),
            normalized_name=norm,
            proficiency=prof,
            evidence_types=sorted(list(ev_types)),
        )

        if norm not in seen_map:
            seen_map[norm] = item
        else:
            existing = seen_map[norm]
            merged_ev = sorted(list(set(existing.evidence_types) | ev_types))
            new_prof = max(existing.proficiency, prof)
            seen_map[norm] = CanonicalSkill(
                name=existing.name,
                normalized_name=norm,
                proficiency=new_prof,
                evidence_types=merged_ev,
            )

    return list(seen_map.values())


def normalize_candidate_skill_map(raw_skills: List[Any], skill_engine: Any = None) -> Dict[str, float]:
    """Convenience helper returning normalized skill map {normalized_name: proficiency}."""
    canonical = normalize_candidate_skills(raw_skills, skill_engine)
    return {s.normalized_name: s.proficiency for s in canonical}


def normalize_location(loc_input: Any, work_mode_input: Any = "") -> CanonicalLocation:
    """Accurately parses City/State vs City/Country using dynamic country resolver."""
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
        if is_known_country(parts[0]):
            city, state, country = "", "", parts[0]
        else:
            city, state, country = parts[0], "", ""
    elif len(parts) == 2:
        city = parts[0]
        if is_known_country(parts[1]):
            state = ""
            country = parts[1]
        else:
            state = parts[1]
            country = ""
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


def normalize_single_education(edu_str: str) -> CanonicalEducation:
    """Finding #5 Fix: Supports multi-domain education fields for joint degrees (e.g. AI & ML)."""
    edu_lower = edu_str.strip().lower()
    if not edu_lower:
        return CanonicalEducation(raw="", degree_level="unknown", primary_field="", fields=[])

    detected_level = "unknown"
    for level, patterns in DEGREE_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, edu_lower):
                detected_level = level
                break
        if detected_level != "unknown":
            break

    matches = []
    for field_key, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            pattern = r"\b" + re.escape(alias) + r"\b"
            if re.search(pattern, edu_lower):
                matches.append((len(alias), field_key))

    all_fields = list(dict.fromkeys([m[1] for m in matches]))
    
    # Remove generic parent fields if a more specific child field is present
    parents_to_remove = set()
    for f in all_fields:
        if f in FIELD_PARENT:
            parents_to_remove.add(FIELD_PARENT[f])

    filtered_fields = [f for f in all_fields if f not in parents_to_remove]
    filtered_matches = [m for m in matches if m[1] in filtered_fields]

    final_fields = filtered_fields if filtered_fields else all_fields
    primary_field = max(filtered_matches, key=lambda x: x[0])[1] if filtered_matches else (max(matches, key=lambda x: x[0])[1] if matches else "")

    return CanonicalEducation(
        raw=edu_str,
        degree_level=detected_level,
        primary_field=primary_field,
        fields=final_fields,
    )


def normalize_education_list(edu_input: Any) -> List[CanonicalEducation]:
    """Structurally preserves multiple degree entries in candidate education history."""
    if isinstance(edu_input, list):
        items = [str(e) for e in edu_input if e]
    elif isinstance(edu_input, str) and edu_input.strip():
        items = [edu_input.strip()]
    else:
        items = []

    if not items:
        return [CanonicalEducation(raw="", degree_level="unknown", primary_field="", fields=[])]

    return [normalize_single_education(item) for item in items]


def normalize_education(edu_input: Any) -> CanonicalEducation:
    """Returns highest degree entry from candidate education history."""
    degrees = normalize_education_list(edu_input)
    return max(degrees, key=lambda d: DEGREE_LEVEL_SCORES.get(d.degree_level, 0))
