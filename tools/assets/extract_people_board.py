#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
import sys
import yaml

try:
    from PIL import Image, ImageChops
except ImportError as exc:
    raise SystemExit(
        "Pillow is required for people-board extraction. "
        "Install with: python -m pip install Pillow"
    ) from exc

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = ROOT / "tools/assets/people_board_v1.yaml"


def load_manifest(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise ValueError("people board manifest must be a mapping")
    return data


def cell_box(width: int, height: int, columns: int, rows: int, row: int, column: int):
    if row < 0 or row >= rows or column < 0 or column >= columns:
        raise ValueError(f"cell out of range: row={row} column={column}")
    x0 = round(column * width / columns)
    x1 = round((column + 1) * width / columns)
    y0 = round(row * height / rows)
    y1 = round((row + 1) * height / rows)
    return x0, y0, x1, y1


def trim_near_white(image: Image.Image, threshold: int, margin_ratio: float) -> Image.Image:
    rgb = image.convert("RGB")
    background = Image.new("RGB", rgb.size, (255, 255, 255))
    diff = ImageChops.difference(rgb, background).convert("L")
    mask = diff.point(lambda p: 255 if p > (255 - threshold) else 0)
    bbox = mask.getbbox()
    if bbox is None:
        return image

    x0, y0, x1, y1 = bbox
    pad_x = max(2, round((x1 - x0) * margin_ratio))
    pad_y = max(2, round((y1 - y0) * margin_ratio))
    x0 = max(0, x0 - pad_x)
    y0 = max(0, y0 - pad_y)
    x1 = min(image.width, x1 + pad_x)
    y1 = min(image.height, y1 + pad_y)
    return image.crop((x0, y0, x1, y1))


def export_cell(
    board: Image.Image,
    destination: Path,
    cell: dict,
    columns: int,
    rows: int,
    trim: bool,
    threshold: int,
    margin_ratio: float,
) -> None:
    row = int(cell["row"])
    column = int(cell["column"])
    crop = board.crop(cell_box(board.width, board.height, columns, rows, row, column))
    if trim:
        crop = trim_near_white(crop, threshold, margin_ratio)
    destination.parent.mkdir(parents=True, exist_ok=True)
    crop.save(destination, format="PNG", optimize=True)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Split the EverVale people master board into img2threejs-ready references."
    )
    parser.add_argument("--source", required=True, help="Path to the 6x4 people board PNG")
    parser.add_argument("--out", required=True, help="Output directory for role reference PNGs")
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    parser.add_argument(
        "--all-alternates",
        action="store_true",
        help="Export alternate reference cells in addition to each primary role cell.",
    )
    args = parser.parse_args()

    manifest = load_manifest(Path(args.manifest))
    grid = manifest.get("grid") or {}
    columns = int(grid.get("columns", 6))
    rows = int(grid.get("rows", 4))
    trim = bool(grid.get("trim_near_white", True))
    threshold = int(grid.get("trim_threshold", 246))
    margin_ratio = float(grid.get("margin_ratio", 0.055))

    source = Path(args.source)
    out = Path(args.out)
    board = Image.open(source).convert("RGBA")

    roles = manifest.get("roles") or {}
    if not isinstance(roles, dict) or not roles:
        raise ValueError("manifest.roles must be a non-empty mapping")

    exported = 0
    for role, entry in roles.items():
        if not isinstance(entry, dict) or "primary" not in entry:
            raise ValueError(f"role {role} requires a primary cell")
        export_cell(
            board,
            out / f"{role}.png",
            entry["primary"],
            columns,
            rows,
            trim,
            threshold,
            margin_ratio,
        )
        exported += 1

        if args.all_alternates:
            for index, alternate in enumerate(entry.get("alternates") or [], start=1):
                export_cell(
                    board,
                    out / f"{role}__alt_{index}.png",
                    alternate,
                    columns,
                    rows,
                    trim,
                    threshold,
                    margin_ratio,
                )
                exported += 1

    print(
        f"PEOPLE BOARD EXTRACTION PASS source={source} "
        f"grid={columns}x{rows} exported={exported} out={out}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
