#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import argparse
import json
import sys
import yaml

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data/presentation/v0.1/visual_identities.yaml"
TARGET = ROOT / "apps/client/src/world/generated/visual-identity-data.ts"

HEADER = """// GENERATED FILE — DO NOT EDIT BY HAND.
// Source: data/presentation/v0.1/visual_identities.yaml
// Regenerate with: python tools/validation/generate_visual_identity_data.py

"""

def render() -> str:
    with SOURCE.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)

    dialects = list((data.get("world_dialects") or {}).keys())
    families = {
        family_id: list((family.get("variants") or {}).keys())
        for family_id, family in (data.get("building_families") or {}).items()
    }
    roles = list((data.get("citizen_roles") or {}).keys())

    lines = [HEADER]
    lines.append("export const VISUAL_DIALECT_IDS = ")
    lines.append(json.dumps(dialects, indent=2, ensure_ascii=False))
    lines.append(" as const;\n\n")
    lines.append("export const BUILDING_VARIANT_IDS = ")
    lines.append(json.dumps(families, indent=2, ensure_ascii=False))
    lines.append(" as const;\n\n")
    lines.append("export const CITIZEN_PRESENTATION_ROLE_IDS = ")
    lines.append(json.dumps(roles, indent=2, ensure_ascii=False))
    lines.append(" as const;\n")
    return "".join(lines)

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    expected = render()
    if args.check:
        actual = TARGET.read_text(encoding="utf-8") if TARGET.exists() else ""
        if actual != expected:
            print("GENERATED VISUAL IDENTITY DATA IS STALE")
            print(" run: python tools/validation/generate_visual_identity_data.py")
            return 1
        print("GENERATED VISUAL IDENTITY DATA PASS")
        return 0

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(expected, encoding="utf-8")
    print(f"WROTE {TARGET.relative_to(ROOT)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
