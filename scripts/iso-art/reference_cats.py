"""Transparent character atlas and native costume bases from the model sheet.

The middle column supplies the front three-quarter turn and the right column
supplies the rear three-quarter turn. The sheet contains a single side of
each, so their opposite turns are mirrored. The concept's ground shadow is
excluded because the game draws the actor's contact shadow at its real foot.
"""
from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from voxel import Baked

ROOT = Path(__file__).resolve().parents[2]
RAW_SHEET = ROOT / "assets/characters/generated/raw/zero-nicole-model-sheet.png"
ATLAS_PNG = ROOT / "assets/characters/render/cat-reference-atlas.png"
ATLAS_TS = ROOT / "src/render/iso/gen/cat-reference-atlas.ts"
REFERENCE_CAT_HEIGHT = 34
FOOTPRINT = {"x": -4, "y": -6, "w": 14, "d": 12}
# Four turns in SE, SW, NW, NE order. The front and rear both face right in the sheet.
TURNS = (("front", False), ("front", True), ("rear", True), ("rear", False))
ROWS = {"zero": (0, 510), "nicole": (510, 1024)}
COLUMNS = {"front": (550, 1025), "rear": (1025, 1536)}
COLORS_PER_VIEW = 42
# Each pair moves one paw across the ground and lifts the other by one pixel.
WALK = (
    ((1, 0), (-1, -1)),
    ((0, 0), (0, -1)),
    ((-1, 0), (1, -1)),
    ((-1, -1), (1, 0)),
    ((0, -1), (0, 0)),
    ((1, -1), (-1, 0)),
)

PixelGrid = dict[tuple[int, int], str]


@dataclass(frozen=True)
class SourceCrop:
    rgb: np.ndarray
    opaque: np.ndarray
    foot: float


@lru_cache(maxsize=1)
def _sheet() -> Image.Image:
    return Image.open(RAW_SHEET).convert("RGB")


def _paper_pixels(rgb: np.ndarray) -> np.ndarray:
    """Reachable neutral paper, including the photographed floor shadow."""
    candidate = ((rgb.max(2) - rgb.min(2) < 29) & (rgb.min(2) > 132)).astype(np.uint8)
    mask = Image.fromarray(candidate).copy()
    # The dark outlines contain the shirt and pale muzzle. Flood only from
    # the cell boundary so their almost-neutral colours stay in the figure.
    for x, y in ((0, 0), (mask.width - 1, 0), (0, mask.height - 1), (mask.width - 1, mask.height - 1)):
        ImageDraw.floodfill(mask, (x, y), 2)
    return np.asarray(mask) == 2


def _quantize(rgb: np.ndarray, opaque: np.ndarray) -> list[str]:
    """Reduce sampled source colours without introducing dither or a matte."""
    samples = rgb[opaque]
    image = Image.fromarray(samples.reshape(1, -1, 3))
    limited = image.quantize(COLORS_PER_VIEW, dither=Image.Dither.NONE).convert("RGB")
    return ["#%02x%02x%02x" % tuple(p) for p in np.asarray(limited).reshape(-1, 3)]


def _keep_muzzle_ink(native: np.ndarray, source: np.ndarray) -> None:
    """Keep the nose and mouth ink too thin to meet a pixel centre."""
    h, w = native.shape[:2]
    sh, sw = source.shape[:2]
    for y in range(round(h * .42), round(h * .47)):
        for x in range(round(w * .55), round(w * .655)):
            tile = source[round(y * sh / h):round((y + 1) * sh / h),
                          round(x * sw / w):round((x + 1) * sw / w)]
            ink = tile.max(2) < 80
            if ink.mean() >= .12:
                native[y, x] = np.median(tile[ink], axis=0)


@lru_cache(maxsize=4)
def _source_crop(cat_id: str, view: str) -> SourceCrop:
    """Extract the exact sheet cell and classify its alpha."""
    y0, y1 = ROWS[cat_id]
    x0, x1 = COLUMNS[view]
    rgb = np.asarray(_sheet().crop((x0, y0, x1, y1)))
    paper = _paper_pixels(rgb)
    # Use the ink-outer bounds so the low-contrast photographed shadow does
    # not change scale, aspect ratio or the plantar anchor.
    ys, xs = np.nonzero(rgb.max(2) < 108)
    top, bottom = int(ys.min()), int(ys.max()) + 1
    left, right = int(xs.min()), int(xs.max()) + 1
    feet = xs[ys >= bottom - 27]
    foot = (int(feet.min()) + int(feet.max()) + 1) / 2 - left
    return SourceCrop(rgb[top:bottom, left:right], ~paper[top:bottom, left:right], foot)


@lru_cache(maxsize=4)
def source_view(cat_id: str, view: str) -> PixelGrid:
    """Native base used when matching costume overlays to the reference."""
    crop = _source_crop(cat_id, view)
    frame_rgb, frame_alpha = crop.rgb, crop.opaque
    source_height, source_width = frame_alpha.shape
    w = round(source_width * REFERENCE_CAT_HEIGHT / source_height)
    size = (w, REFERENCE_CAT_HEIGHT)
    pixels = np.array(Image.fromarray(frame_rgb).resize(size, Image.Resampling.NEAREST))
    opaque = np.asarray(Image.fromarray(frame_alpha).resize(size, Image.Resampling.NEAREST))
    if view == "front":
        _keep_muzzle_ink(pixels, frame_rgb)
    ax = round(crop.foot * w / source_width)
    return {
        (int(x) - ax, int(y) - REFERENCE_CAT_HEIGHT): c
        for (y, x), c in zip(np.argwhere(opaque), _quantize(pixels, opaque))
    }


def _pose(pixels: PixelGrid, anim: str, frame: int) -> PixelGrid:
    if anim == "idle" and frame == 0:
        return pixels
    result: PixelGrid = {}
    # Changes are whole pixels around the fixed foot. Head, glasses and
    # whiskers always move together and are never redrawn by the poses.
    for (x, y), c in sorted(pixels.items(), key=lambda row: row[0][1]):
        if anim == "walk":
            if y >= -4:
                dx, dy = WALK[frame][x >= 0]
            else:
                dx, dy = 0, int(frame in (1, 2, 4, 5))
        elif anim == "hurt":
            dx, dy = (-1, 1) if y < -13 else (0, 0)
        else:
            dx, dy = 0, int(y < -8)
        result[x + dx, y + dy] = c
    return result


def reference_pose(cat_id: str, anim: str, frame: int, turn_index: int) -> Baked:
    """Return a clean-alpha palette-ready frame, with foot at its own anchor."""
    view, mirror = TURNS[turn_index]
    posed = _pose(source_view(cat_id, view), anim, frame)
    if mirror:
        posed = {(-1 - x, y): c for (x, y), c in posed.items()}
    x0, x1 = min(x for x, _ in posed), max(x for x, _ in posed) + 1
    y0, y1 = min(y for _, y in posed), max(y for _, y in posed) + 1
    w, h = x1 - x0, y1 - y0
    data = [posed.get((x, y), "") for y in range(y0, y1) for x in range(x0, x1)]
    return Baked(w=w, h=h, ax=-x0, ay=-y0, pixels=data, extent=FOOTPRINT.copy())


def _atlas() -> tuple[Image.Image, dict]:
    rows = [list(_source_crop(cat, view) for view in COLUMNS) for cat in ROWS]
    gap = 2
    widths = [max(row[i].rgb.shape[1] for row in rows) for i in range(len(COLUMNS))]
    heights = [max(crop.rgb.shape[0] for crop in row) for row in rows]
    image = Image.new("RGBA", (sum(widths) + gap * (len(widths) + 1),
                               sum(heights) + gap * (len(heights) + 1)))
    metadata = {}
    y = gap
    for i, (cat, row) in enumerate(zip(ROWS, rows)):
        views = {}
        x = gap
        for j, (view, crop) in enumerate(zip(COLUMNS, row)):
            h, w = crop.opaque.shape
            rgba = np.dstack((crop.rgb, crop.opaque.astype(np.uint8) * 255))
            image.paste(Image.fromarray(rgba), (x, y))
            views[view] = {"x": x, "y": y, "w": w, "h": h, "ax": round(crop.foot)}
            x += widths[j] + gap
        metadata[f"cat-{cat}"] = views
        y += heights[i] + gap
    return image, metadata


def _metadata_ts(metadata: dict) -> str:
    return ('// Generated by scripts/iso-art/reference_cats.py; do not edit.\n'
            'export interface ReferenceView {\n'
            '  readonly x: number;\n  readonly y: number;\n'
            '  readonly w: number;\n  readonly h: number;\n'
            '  readonly ax: number;\n}\n\n'
            'export const CAT_REFERENCE_VIEWS: Readonly<Record<string, {\n'
            '  readonly front: ReferenceView;\n  readonly rear: ReferenceView;\n'
            '}>> = ' + json.dumps(metadata, indent=2) + ';\n')


def _verify_pixels(image: Image.Image, metadata: dict) -> None:
    """Every opaque texel has the exact RGB of the input sheet."""
    assert image.mode == "RGBA"
    pixels = np.asarray(image)
    area = np.zeros(pixels.shape[:2], dtype=bool)
    for cat in ROWS:
        for view in COLUMNS:
            part = metadata[f"cat-{cat}"][view]
            x, y, w, h, ax = (part[key] for key in ("x", "y", "w", "h", "ax"))
            assert 0 <= x < x + w <= image.width and 0 <= y < y + h <= image.height
            assert 0 < ax < w and not area[y:y + h, x:x + w].any()
            area[y:y + h, x:x + w] = True
            crop = _source_crop(cat, view)
            tile = pixels[y:y + h, x:x + w]
            assert np.array_equal(tile[:, :, 3], crop.opaque.astype(np.uint8) * 255), f"{cat} {view} alpha"
            assert np.array_equal(tile[crop.opaque, :3], crop.rgb[crop.opaque]), f"{cat} {view} RGB"
    assert not pixels[:, :, 3][~area].any()


def write_reference_atlas() -> None:
    image, metadata = _atlas()
    _verify_pixels(image, metadata)
    ATLAS_PNG.parent.mkdir(parents=True, exist_ok=True)
    image.save(ATLAS_PNG, optimize=True)
    ATLAS_TS.write_text(_metadata_ts(metadata), encoding="utf-8")


def verify_reference_atlas() -> None:
    _, metadata = _atlas()
    with Image.open(ATLAS_PNG) as image:
        _verify_pixels(image, metadata)
    assert ATLAS_TS.read_text(encoding="utf-8") == _metadata_ts(metadata)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="check the existing output instead of writing it")
    if not parser.parse_args().check:
        write_reference_atlas()
    verify_reference_atlas()
