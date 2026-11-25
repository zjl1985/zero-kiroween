"""Transparent HD scenery atlas from the two generated 4x2 scenery model sheets.

Extracts 8 core scenery upgrades (trees, cottage, bush, lamp, headstone) and
8 biome-signature props (bench, noticeboard, harvest cart, giant pumpkin,
graveyard arch, lantern rack, canal dock crates, moon meadow mushrooms),
packs them into assets/scenery/render/scenery-reference-atlas.png, and emits
src/render/iso/gen/scenery-reference-atlas.ts.
"""
from __future__ import annotations

import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CORE_SHEET = ROOT / "assets/scenery/generated/raw/scenery-core-sheet.png"
BIOME_SHEET = ROOT / "assets/scenery/generated/raw/scenery-biomes-sheet.png"
ATLAS_PNG = ROOT / "assets/scenery/render/scenery-reference-atlas.png"
ATLAS_TS = ROOT / "src/render/iso/gen/scenery-reference-atlas.ts"

# (sheet, id, row, col, sceneHeightPx, removeInteriorBg)
ITEMS: list[tuple[Path, str, int, int, int, bool]] = [
    (CORE_SHEET, "tree-oak", 0, 0, 64, False),
    (CORE_SHEET, "tree-maple", 0, 1, 62, False),
    (CORE_SHEET, "tree-pine", 0, 2, 68, False),
    (CORE_SHEET, "tree-dead", 0, 3, 58, True),
    (CORE_SHEET, "cottage", 1, 0, 68, False),
    (CORE_SHEET, "bush", 1, 1, 22, False),
    (CORE_SHEET, "lamp", 1, 2, 44, True),
    (CORE_SHEET, "headstone", 1, 3, 28, False),
    (BIOME_SHEET, "town-bench", 0, 0, 24, True),
    (BIOME_SHEET, "town-board", 0, 1, 38, True),
    (BIOME_SHEET, "farm-cart", 0, 2, 30, True),
    (BIOME_SHEET, "farm-giant-pumpkin", 0, 3, 28, False),
    (BIOME_SHEET, "grave-arch", 1, 0, 48, True),
    (BIOME_SHEET, "canal-lantern-rack", 1, 1, 42, True),
    (BIOME_SHEET, "canal-dock-crates", 1, 2, 30, False),
    (BIOME_SHEET, "meadow-mushrooms", 1, 3, 30, False),
]


def _bg_distance(rgb: np.ndarray, bg: np.ndarray) -> np.ndarray:
    diff = rgb.astype(np.int16) - bg.astype(np.int16)
    return np.abs(diff).max(axis=2)


def _extract_cell(cell_rgb: np.ndarray, remove_interior_bg: bool) -> tuple[np.ndarray, int]:
    h, w = cell_rgb.shape[:2]
    # Sample border ring for robust background median.
    border = np.concatenate([cell_rgb[2, :], cell_rgb[h - 3, :], cell_rgb[:, 2], cell_rgb[:, w - 3]], axis=0)
    bg = np.median(border, axis=0).astype(np.uint8)
    dist = _bg_distance(cell_rgb, bg)
    sat = cell_rgb.max(axis=2) - cell_rgb.min(axis=2)
    lum = cell_rgb.mean(axis=2)
    # Thick dark outlines seal sprite interiors, so border flood-fill can safely absorb warm-gray grain/halos.
    candidate = ((dist < 46) & (sat < 42) & (lum > 145)) | ((dist < 28) & (sat < 30))

    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if candidate[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if candidate[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and candidate[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    if remove_interior_bg:
        # Archways, lamp brackets, benches and dead branches enclose exact background pockets.
        visited |= (dist < 32) & (sat < 26) & (lum > 155)

    opaque = ~visited
    # Drop tiny stray border dust specks (<= 12 px) disconnected from the main sprite.
    comp = np.zeros((h, w), dtype=np.int32)
    cid = 0
    sizes: dict[int, int] = {}
    for sy in range(h):
        for sx in range(w):
            if opaque[sy, sx] and comp[sy, sx] == 0:
                cid += 1
                cq: deque[tuple[int, int]] = deque([(sy, sx)])
                comp[sy, sx] = cid
                cnt = 0
                while cq:
                    py, px = cq.popleft()
                    cnt += 1
                    for ny, nx in ((py - 1, px), (py + 1, px), (py, px - 1), (py, px + 1)):
                        if 0 <= ny < h and 0 <= nx < w and opaque[ny, nx] and comp[ny, nx] == 0:
                            comp[ny, nx] = cid
                            cq.append((ny, nx))
                sizes[cid] = cnt
    keep = {k for k, v in sizes.items() if v > 20}
    opaque = np.isin(comp, list(keep))

    ys, xs = np.nonzero(opaque)
    top, bottom = int(ys.min()), int(ys.max()) + 1
    left, right = int(xs.min()), int(xs.max()) + 1

    rgba = np.zeros((bottom - top, right - left, 4), dtype=np.uint8)
    rgba[:, :, :3] = cell_rgb[top:bottom, left:right]
    rgba[:, :, 3] = np.where(opaque[top:bottom, left:right], 255, 0)

    sub_h = bottom - top
    foot_ys, foot_xs = np.nonzero(rgba[max(0, sub_h - max(12, sub_h // 7)):, :, 3] > 0)
    ax = round((int(foot_xs.min()) + int(foot_xs.max()) + 1) / 2) if len(foot_xs) else (right - left) // 2
    return rgba, ax


def build() -> None:
    sheets: dict[Path, np.ndarray] = {}
    crops: list[tuple[str, np.ndarray, int, int]] = []
    for path, sprite_id, row, col, height, interior in ITEMS:
        if path not in sheets:
            sheets[path] = np.asarray(Image.open(path).convert("RGB"))
        sheet = sheets[path]
        sh, sw = sheet.shape[:2]
        cw, ch = sw // 4, sh // 2
        cell = sheet[row * ch:(row + 1) * ch, col * cw:(col + 1) * cw]
        rgba, ax = _extract_cell(cell, interior)
        crops.append((sprite_id, rgba, ax, height))

    pad = 8
    cols = 4
    rows = 4
    col_w = [max(crops[r * cols + c][1].shape[1] for r in range(rows)) for c in range(cols)]
    row_h = [max(crops[r * cols + c][1].shape[0] for c in range(cols)) for r in range(rows)]
    atlas_w = sum(col_w) + pad * (cols + 1)
    atlas_h = sum(row_h) + pad * (rows + 1)

    atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    meta: dict[str, dict[str, int]] = {}
    y = pad
    for r in range(rows):
        x = pad
        for c in range(cols):
            sprite_id, rgba, ax, height = crops[r * cols + c]
            ih, iw = rgba.shape[:2]
            atlas.paste(Image.fromarray(rgba, "RGBA"), (x, y))
            meta[sprite_id] = {"x": x, "y": y, "w": iw, "h": ih, "ax": ax, "height": height}
            x += col_w[c] + pad
        y += row_h[r] + pad

    ATLAS_PNG.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(ATLAS_PNG, optimize=True)

    ATLAS_TS.parent.mkdir(parents=True, exist_ok=True)
    ts = (
        "/** Generated by scripts/iso-art/reference_scenery.py from assets/scenery/generated/raw/*.png. */\n"
        "export interface ReferenceSceneryView {\n"
        "  readonly x: number;\n"
        "  readonly y: number;\n"
        "  readonly w: number;\n"
        "  readonly h: number;\n"
        "  readonly ax: number;\n"
        "  readonly height: number;\n"
        "}\n"
        f"export const SCENERY_REFERENCE_VIEWS: Readonly<Record<string, ReferenceSceneryView>> = {json.dumps(meta, indent=2)} as const;\n"
    )
    ATLAS_TS.write_text(ts, encoding="utf-8")
    print(f"Wrote {ATLAS_PNG} ({atlas_w}x{atlas_h}) and {ATLAS_TS} ({len(meta)} scenery sprites)")


if __name__ == "__main__":
    build()
