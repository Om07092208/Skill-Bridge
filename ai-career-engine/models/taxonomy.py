from __future__ import annotations
import os
import json
import math
import re
from typing import Dict, List, Any, Optional, Set

# Exception Hierarchy
class RoleTaxonomyError(Exception):
    """Base exception for all role taxonomy validation errors."""
    pass


class AliasCollisionError(RoleTaxonomyError, ValueError):
    """Raised when a role alias maps to multiple specializations."""
    pass


class InvalidSimilarityError(RoleTaxonomyError, ValueError):
    """Raised when a similarity score is non-finite, out of bounds [0.0, 1.0], or refers to a missing specialization."""
    pass


class AsymmetricSimilarityError(RoleTaxonomyError, ValueError):
    """Raised when forward and reverse relationship links or scores conflict."""
    pass


class AmbiguousSpecializationError(RoleTaxonomyError, ValueError):
    """Raised when an unqualified specialization key exists in multiple families."""
    pass


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

GENERIC_ROLE_TOKEN_WEIGHT: float = 0.25
DOMAIN_ROLE_TOKEN_WEIGHT: float = 1.0


def get_role_token_weight(token: str) -> float:
    """Returns weight for token: 0.25 for generic role nouns, 1.0 for domain words."""
    return GENERIC_ROLE_TOKEN_WEIGHT if token.lower() in GENERIC_ROLE_TOKENS else DOMAIN_ROLE_TOKEN_WEIGHT


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


_role_taxonomy_cache: Optional[Dict[str, Any]] = None
_role_alias_index: Optional[Dict[str, tuple[str, str]]] = None


def load_role_taxonomy(reload: bool = False) -> Dict[str, Any]:
    """Loads role taxonomy JSON file from data directory. Fails fast if file is missing, malformed, or has alias collisions/asymmetry."""
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
        spec_map: Dict[str, tuple[str, Dict[str, Any]]] = {}

        # Pass 1: Index all specializations (including qualified family.specialization keys) and validate alias collisions & duplicate keys
        for fam_key, fam_data in new_cache.items():
            specs = fam_data.get("specializations", {})
            for spec_key, spec_data in specs.items():
                qual_key = f"{fam_key}.{spec_key}"

                if spec_key in spec_map:
                    existing_fam = spec_map[spec_key][0]
                    if existing_fam != fam_key:
                        raise AmbiguousSpecializationError(
                            f"Ambiguous specialization '{spec_key}' exists in both '{existing_fam}' and '{fam_key}'. Use qualified IDs."
                        )

                spec_map[spec_key] = (fam_key, spec_data)
                spec_map[qual_key] = (fam_key, spec_data)

                aliases = spec_data.get("aliases", [])
                for alias in aliases:
                    raw_alias = alias.strip().lower()
                    norm_alias = normalize_role_title(alias)

                    for target_alias in (raw_alias, norm_alias):
                        if not target_alias:
                            continue
                        existing = new_index.get(target_alias)
                        if existing and existing != (fam_key, spec_key):
                            raise AliasCollisionError(
                                f"Role taxonomy alias collision: '{target_alias}' maps to both {existing} and {(fam_key, spec_key)}"
                            )
                        new_index[target_alias] = (fam_key, spec_key)

        # Pass 2: Validate related targets exist, math.isfinite, range [0.0, 1.0], and bidirectional symmetry
        for spec_key, (fam_key, spec_data) in spec_map.items():
            if "." in spec_key:
                continue

            related = spec_data.get("related", {})
            for rel_spec, sim in related.items():
                if rel_spec not in spec_map:
                    raise InvalidSimilarityError(f"Role taxonomy related specialization '{rel_spec}' in '{spec_key}' does not exist")

                try:
                    sim_val = float(sim)
                    if not math.isfinite(sim_val) or not (0.0 <= sim_val <= 1.0):
                        raise InvalidSimilarityError(f"Role taxonomy invalid similarity score '{sim}' for related key '{rel_spec}' in '{spec_key}'")
                except (ValueError, TypeError):
                    raise InvalidSimilarityError(f"Role taxonomy invalid similarity score '{sim}' for related key '{rel_spec}' in '{spec_key}'")

                # Enforce true bidirectional relationship existence AND score equality
                target_spec_data = spec_map[rel_spec][1]
                target_related = target_spec_data.get("related", {})
                if spec_key not in target_related:
                    raise AsymmetricSimilarityError(
                        f"Missing reverse relationship link: '{spec_key}' references '{rel_spec}', but '{rel_spec}' does not define a reverse link to '{spec_key}'"
                    )

                try:
                    target_sim_val = float(target_related[spec_key])
                except (ValueError, TypeError):
                    target_sim_val = None

                if target_sim_val is None or abs(sim_val - target_sim_val) > 1e-6:
                    raise AsymmetricSimilarityError(
                        f"Asymmetric role similarity between '{spec_key}' and '{rel_spec}': forward {sim_val} vs reverse {target_sim_val}"
                    )

        # Atomic assignment only after full validation passes
        _role_taxonomy_cache = new_cache
        _role_alias_index = new_index

    return _role_taxonomy_cache


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
    """Calculates granular similarity score between two taxonomy specializations with symmetric lookup."""
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
