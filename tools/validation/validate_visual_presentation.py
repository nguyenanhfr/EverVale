#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys
import yaml

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "data/presentation/v0.1/visual_identities.yaml"

class UniqueKeyLoader(yaml.SafeLoader):
    pass

def construct_mapping(loader, node, deep=False):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise ValueError(f"duplicate key: {key}")
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping

UniqueKeyLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG,
    construct_mapping,
)

def load(rel: str):
    path = ROOT / rel
    with path.open("r", encoding="utf-8") as handle:
        return yaml.load(handle, Loader=UniqueKeyLoader)

def flatten_strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from flatten_strings(item)
    elif isinstance(value, dict):
        for item in value.values():
            yield from flatten_strings(item)

def main() -> int:
    errors: list[str] = []
    manifest = load("data/presentation/v0.1/visual_identities.yaml")
    buildings = load("data/content/v0.2/buildings.yaml")["buildings"]
    citizen_roles = load("data/actors/v0.1/citizens.yaml")
    archetypes = load("data/life/v0.1/citizen_archetypes.yaml")

    if not isinstance(manifest, dict):
        errors.append("visual identity manifest must be a mapping")
        manifest = {}

    if str(manifest.get("version")) != "0.1":
        errors.append("visual identity manifest version must be 0.1")

    if manifest.get("status") != "CANONICAL_VISUAL_PRESENTATION":
        errors.append("visual identity manifest status must be CANONICAL_VISUAL_PRESENTATION")

    authority = manifest.get("authority", {})
    if not isinstance(authority, dict) or not authority:
        errors.append("authority mapping is required")
    else:
        for label, rel in authority.items():
            if not isinstance(rel, str) or not (ROOT / rel).exists():
                errors.append(f"authority path missing: {label}={rel}")

    families = manifest.get("building_families", {})
    if not isinstance(families, dict) or not families:
        errors.append("building_families mapping is required")
        families = {}

    structural_keys = {
        "massing",
        "roof",
        "facade",
        "yard",
        "focal",
        "path",
        "signature_props",
    }

    for building_id, family in families.items():
        if building_id not in buildings:
            errors.append(f"unknown visual building family: {building_id}")
            continue
        if not isinstance(family, dict):
            errors.append(f"building family {building_id} must be a mapping")
            continue
        minimum = family.get("minimum_variants")
        variants = family.get("variants", {})
        if not isinstance(minimum, int) or minimum < 1:
            errors.append(f"{building_id}: minimum_variants must be a positive integer")
            minimum = 1
        if not isinstance(variants, dict):
            errors.append(f"{building_id}: variants must be a mapping")
            continue
        if len(variants) < minimum:
            errors.append(
                f"{building_id}: variant count {len(variants)} below declared minimum {minimum}"
            )
        for variant_id, variant in variants.items():
            if not isinstance(variant, dict):
                errors.append(f"{building_id}.{variant_id}: variant must be a mapping")
                continue
            dimensions = structural_keys.intersection(variant.keys())
            if len(dimensions) < 2:
                errors.append(
                    f"{building_id}.{variant_id}: needs >=2 structural/dressing dimensions"
                )
            props = variant.get("signature_props")
            if "signature_props" in variant and (
                not isinstance(props, list) or not props
            ):
                errors.append(f"{building_id}.{variant_id}: signature_props must be non-empty")

    actor_role_ids = set((citizen_roles.get("roles") or {}).keys())
    age_band_ids = set((citizen_roles.get("age_bands") or {}).keys())
    archetype_ids = set(flatten_strings((archetypes.get("age_bands") or {})))

    presentation_roles = manifest.get("citizen_roles", {})
    if not isinstance(presentation_roles, dict) or not presentation_roles:
        errors.append("citizen_roles mapping is required")
        presentation_roles = {}

    for role_id, role in presentation_roles.items():
        if not isinstance(role, dict):
            errors.append(f"citizen role {role_id} must be a mapping")
            continue
        refs = role.get("source_refs")
        if not isinstance(refs, list) or not refs:
            errors.append(f"citizen role {role_id} requires source_refs")
            continue
        for ref in refs:
            if not isinstance(ref, str) or "." not in ref:
                errors.append(f"citizen role {role_id}: invalid source ref {ref!r}")
                continue
            kind, value = ref.split(".", 1)
            if kind == "role":
                ok = value in actor_role_ids
            elif kind == "age_band":
                ok = value in age_band_ids
            elif kind == "archetype":
                ok = value in archetype_ids
            else:
                ok = False
            if not ok:
                errors.append(f"citizen role {role_id}: unresolved source ref {ref}")

    forbidden = {
        "money",
        "money_cost",
        "power",
        "power_use",
        "water",
        "water_use",
        "varum",
        "varum_cost",
        "tech",
        "tech_tier",
        "hp",
        "dps",
        "armor",
        "damage",
        "housing",
        "workers",
        "workforce",
    }

    def walk(value, path="root"):
        if isinstance(value, dict):
            for key, item in value.items():
                if str(key) in forbidden:
                    errors.append(f"gameplay field forbidden in visual presentation data: {path}.{key}")
                walk(item, f"{path}.{key}")
        elif isinstance(value, list):
            for index, item in enumerate(value):
                walk(item, f"{path}[{index}]")

    walk(manifest)

    seed_policy = manifest.get("seed_policy", {})
    if not isinstance(seed_policy, dict) or seed_policy.get("random_unseeded_forbidden") is not True:
        errors.append("seed_policy.random_unseeded_forbidden must be true")

    rules = manifest.get("rules", {})
    if not isinstance(rules, dict) or rules.get("presentation_only") is not True:
        errors.append("rules.presentation_only must be true")
    if isinstance(rules, dict) and rules.get("economy_effect_from_visual_identity_forbidden") is not True:
        errors.append("economy_effect_from_visual_identity_forbidden must be true")

    if errors:
        print("VISUAL PRESENTATION VALIDATION FAILED")
        for error in errors:
            print(" -", error)
        return 1

    variant_count = sum(
        len(family.get("variants", {}))
        for family in families.values()
        if isinstance(family, dict)
    )
    print("VISUAL PRESENTATION VALIDATION PASS")
    print(
        f" dialects={len(manifest.get('world_dialects', {}))}"
        f" families={len(families)} variants={variant_count}"
        f" citizen_roles={len(presentation_roles)}"
    )
    return 0

if __name__ == "__main__":
    sys.exit(main())
