"""Voxel models of the scenery (FEAT-003). Every function returns a voxel.Model around
its world foot point (voxel units: 1 voxel = 2 world units on the ground, 1 px high).

Axes: +x runs screen down-right (its face is the lit screen-right face), +y runs screen
down-left (the darker screen-left face, where houses keep their doors). The cat is about
30 px tall, so a storey is ~18-20 px and a tree 55-75 px.
"""
from __future__ import annotations

import math

import numpy as np

from voxel import Model, carve_views, gable, gambrel, hip, mat, vhash

# ---------------------------------------------------------------- extra ramps (6 steps, dark -> highlight)
EXTRA_RAMPS = {
    "leaf": ["#0d1722", "#132a33", "#1b403c", "#285a43", "#3f7a49", "#7aa95a"],
    "leaf2": ["#0e1a24", "#152f35", "#1f4a3e", "#2f6847", "#4d8a4e", "#8cb862"],
    "pine": ["#0a131f", "#0f2229", "#153533", "#1e4b3a", "#326645", "#5f8f52"],
    "maple": ["#241226", "#45192d", "#73282f", "#a8452f", "#d6763a", "#f2b25a"],
    "redleaf": ["#1f0f25", "#3a142b", "#5f1c33", "#8a2a36", "#b8453a", "#e07b52"],
    "birchleaf": ["#151c24", "#263630", "#3f5536", "#677a3a", "#9a9a45", "#d2c56a"],
    "bark": ["#120d19", "#211722", "#33232a", "#4b3330", "#684a3a", "#8c6a48"],
    "birch": ["#232434", "#3e3f50", "#6a6b78", "#9897a0", "#c8c3b8", "#ebe5d2"],
    "hay": ["#2a1f2b", "#4f3b33", "#7d6039", "#a98743", "#d2ae57", "#f0d688"],
    "pumpkin": ["#26121f", "#4f1e25", "#8a3426", "#c25524", "#e5832f", "#ffbe5c"],
    "iron": ["#07070d", "#10101c", "#1b1b2b", "#29293d", "#3b3b55", "#5d5d7a"],
    "cabbage": ["#101c26", "#183434", "#245140", "#3a7348", "#5f9a55", "#9fcb73"],
    "pink": ["#2c1530", "#552244", "#8a3a5c", "#c0607a", "#e8939c", "#ffd0c8"],
    "blue": ["#141634", "#212d5c", "#334f8c", "#4f7bb8", "#7eaad8", "#bcdcf0"],
    "white": ["#2a2a40", "#4a4a62", "#7a7a8e", "#adabb4", "#dcd8d2", "#fbf7ea"],
    "glow": ["#4a2a20", "#8a4f28", "#d08a3a", "#f2bc58", "#ffe08c", "#fff4cc"],
    "flame": ["#4a1e1c", "#9a3a1e", "#e0702a", "#ffa63c", "#ffd46a", "#fff2b0"],
    "moss": ["#101a20", "#18302e", "#24463a", "#346040", "#4f7c48", "#86a85a"],
}

# ---------------------------------------------------------------- materials
M = {}


def _m(name, ramp, **kw):
    M[name] = mat(name, ramp, **kw)


_m("stone", "stone", jitter=0.12)
_m("stone_dk", "stone", bias=-1, jitter=0.1)
_m("cobble", "stone", jitter=0.3)
_m("red", "redTile", jitter=0.06)
_m("red_seam", "redTile", bias=-1)
_m("trim", "cloth", bias=1)
_m("trim_dk", "cloth")
_m("plaster", "cloth", bias=1, jitter=0.05)
_m("beam", "wood", bias=-1)
_m("wood", "wood", jitter=0.1)
_m("wood_dk", "wood", bias=-1, jitter=0.08)
_m("wood_lt", "wood", bias=1)
_m("plank_seam", "wood", bias=-2)
_m("slate", "greyTile", bias=-1, jitter=0.05, rim=False)
_m("slate_dk", "greyTile", bias=-2, rim=False)
_m("slate_lt", "greyTile", bias=0, rim=False)
_m("tile", "redTile", jitter=0.05, rim=False)
_m("tile_dk", "redTile", bias=-1, rim=False)
_m("thatch", "hay", jitter=0.3, rim=False)
_m("thatch_dk", "hay", bias=-1, jitter=0.2, rim=False)
_m("dark", "ink", rim=False)
_m("hole", "ink", bias=-2, rim=False)
_m("window", "glow", emit="window", glow=4)
_m("window_lo", "glow", emit="window", glow=3)
_m("lamp_glass", "glow", emit="lamp", glow=5)
_m("lantern_glass", "glow", emit="lantern", glow=4)
_m("candle_flame", "flame", emit="candle", glow=5)
_m("candle_core", "flame", emit="candle", glow=4)
_m("jack", "flame", emit="pumpkin", glow=4)
_m("wax", "wax", bias=1)
_m("hay", "hay", jitter=0.35)
_m("hay_dk", "hay", bias=-1, jitter=0.2)
_m("leaf", "leaf", jitter=0.28, shine=True)
_m("leaf_b", "leaf2", jitter=0.28)
_m("pine", "pine", jitter=0.25)
_m("pine_b", "pine", bias=1, jitter=0.2)
_m("maple", "maple", jitter=0.28)
_m("maple_b", "redleaf", jitter=0.28)
_m("birchleaf", "birchleaf", jitter=0.3)
_m("birchleaf_b", "leaf2", jitter=0.3)
_m("bark", "bark", jitter=0.15)
_m("bark_dk", "bark", bias=-1)
_m("birch", "birch", jitter=0.05)
_m("birch_mark", "bark", bias=-1)
_m("pumpkin", "pumpkin", jitter=0.04)
_m("pumpkin_rib", "pumpkin", bias=-1)
_m("stem", "cabbage", bias=-1)
_m("cabbage", "cabbage", jitter=0.25)
_m("grass", "cabbage", bias=-1, jitter=0.3)
_m("blade", "leaf2", bias=1, jitter=0.2)
_m("blade_lt", "birchleaf", bias=0, jitter=0.2)
_m("moss", "moss", jitter=0.35)
_m("iron", "iron", jitter=0.0)
_m("iron_lt", "iron", bias=1)
_m("soil", "soil", jitter=0.3)
_m("water", "deep", bias=1, rim=False)
_m("pink", "pink", jitter=0.2)
_m("blue", "blue", jitter=0.2)
_m("white", "white", jitter=0.2)
_m("yellow", "wax", bias=1, jitter=0.2)
_m("berry", "redTile", bias=1)
_m("cloth_red", "redTile", bias=1, jitter=0.1)
_m("cloth_blue", "blue", bias=-1, jitter=0.1)
_m("end_grain", "wax", bias=0)
_m("ring", "wood", bias=0)


def vbox(base):
    """Voxel box strictly inside a world footprint {x, y, w, d}."""
    return (math.ceil(base["x"] / 2), math.ceil(base["y"] / 2),
            math.floor((base["x"] + base["w"]) / 2), math.floor((base["y"] + base["d"]) / 2))


def rng(seed):
    return np.random.RandomState(seed % (2 ** 32))


def band(v, lo, hi):
    return (v >= lo) & (v < hi)


# ---------------------------------------------------------------- shared house parts
def window(m, face, u0, u1, z0, z1, layer, frame="trim", lit="window"):
    """A warm window on a wall face ('y' = the +y front layer at y in layer, 'x' = +x side)."""
    U = m.X if face == "y" else m.Y
    L = m.Y if face == "y" else m.X
    onl = band(L, *layer)
    m.paint(onl & band(U, u0 - 1, u1 + 1) & band(m.Z, z0 - 1, z1 + 1), M[frame])
    m.paint(onl & band(U, u0, u1) & band(m.Z, z0, z1), M[lit])
    # Lower panes a step dimmer, a mullion and a transom.
    m.paint(onl & band(U, u0, u1) & band(m.Z, z0, z0 + (z1 - z0) // 2), M["window_lo"])
    mid = (u0 + u1) // 2
    if u1 - u0 >= 3:
        m.paint(onl & band(U, mid, mid + 1) & band(m.Z, z0, z1), M["beam"])
    # Sill.
    m.paint(onl & band(U, u0 - 1, u1 + 1) & band(m.Z, z0 - 1, z0), M["wood_lt"])


def door(m, face, u0, u1, z0, z1, layer, wood="wood_dk"):
    U = m.X if face == "y" else m.Y
    L = m.Y if face == "y" else m.X
    onl = band(L, *layer)
    m.paint(onl & band(U, u0 - 1, u1 + 1) & band(m.Z, z0, z1 + 1), M["beam"])
    m.paint(onl & band(U, u0, u1) & band(m.Z, z0, z1), M[wood])
    m.paint(onl & band(U, u0, u1) & band(m.Z, z0, z1) & (np.floor(U) % 2 == 0), M["plank_seam"])
    m.paint(onl & band(U, u1 - 1, u1) & band(m.Z, (z0 + z1) // 2, (z0 + z1) // 2 + 1), M["wax"])


def courses(m, mask, a, b, pitch=3):
    """Shingle courses on a roof: horizontal bands, staggered seams."""
    m.paint(mask, a)
    m.paint(mask & (np.floor(m.Z) % pitch == 0), b)


# ---------------------------------------------------------------- buildings
def barn(base):
    x0, y0, x1, y1 = vbox(base)
    m = Model(x0, y0, x1, y1, 72)
    wall_top = 34
    prof = gambrel(13, 10, 0.5)
    # Plinth, walls, gables.
    m.box(x0, y0, 0, x1, y1, 2, M["stone"])
    m.box(x0 + 2, y0 + 1, 2, x1 - 2, y1 - 1, wall_top, M["red"])
    m.fill(m.under_roof(x0, y0 + 1, x1, y1 - 1, wall_top, prof, "y", inset=1.5) & band(m.X, x0 + 2, x1 - 2), M["red"])
    # Plank seams on both visible faces.
    front = (y1 - 2, y1 - 1)
    side = (x1 - 3, x1 - 2)
    m.paint(band(m.Y, *front) & (np.floor(m.X) % 3 == 0), M["red_seam"])
    m.paint(band(m.X, *side) & (np.floor(m.Y) % 3 == 0), M["red_seam"])
    # White corner boards and eave trim.
    for cx in (x0 + 2, x1 - 3):
        m.paint(band(m.X, cx, cx + 1) & band(m.Y, *front) & band(m.Z, 2, wall_top), M["trim"])
    for cy in (y0 + 1, y1 - 2):
        m.paint(band(m.Y, cy, cy + 1) & band(m.X, *side) & band(m.Z, 2, wall_top), M["trim"])
    m.paint(band(m.Y, y1 - 2, y1 - 1) & band(m.Z, 2, 3), M["trim_dk"])
    m.paint(band(m.X, x1 - 3, x1 - 2) & band(m.Z, wall_top - 1, wall_top), M["trim"])
    # Gambrel slate roof with shingle courses and a lighter ridge cap.
    roof, top = m.roof(x0, y0, x1, y1, wall_top, prof, "y", M["slate"], thick=2)
    courses(m, roof, M["slate"], M["slate_dk"], 3)
    m.paint(roof & (m.Z >= top.max() - 2), M["slate_lt"])
    # Front: big double door with white X braces, hayloft, two windows.
    dz0, dz1, du0, du1 = 2, 23, -7, 7
    fl = band(m.Y, *front)
    m.paint(fl & band(m.X, du0 - 1, du1 + 1) & band(m.Z, dz0, dz1 + 1), M["trim"])
    m.paint(fl & band(m.X, du0, du1) & band(m.Z, dz0, dz1), M["red_seam"])
    for a in (du0, 0):
        u = m.X - a
        v = m.Z - dz0
        w, hgt = 7, dz1 - dz0
        brace = (np.abs(v - u * hgt / w) < 1.3) | (np.abs(v - (w - u) * hgt / w) < 1.3)
        m.paint(fl & band(m.X, a, a + w) & band(m.Z, dz0, dz1) & brace, M["trim"])
    m.paint(fl & band(m.X, -1, 1) & band(m.Z, dz0, dz1), M["trim_dk"])
    lz = wall_top + 4
    m.paint(fl & band(m.X, -5, 5) & band(m.Z, lz - 1, lz + 10), M["trim"])
    m.paint(fl & band(m.X, -4, 4) & band(m.Z, lz, lz + 9), M["hole"])
    m.paint(fl & band(m.X, -4, 4) & band(m.Z, lz, lz + 3), M["hay"])
    m.paint(fl & band(m.X, -3, 3) & band(m.Z, lz + 3, lz + 4) & (np.floor(m.X) % 2 == 0), M["hay"])
    for u in (-17, 13):
        window(m, "y", u, u + 4, 12, 17, front, frame="trim")
    for u in (y0 + 6, y0 + 20):
        window(m, "x", u, u + 4, 12, 17, side, frame="trim")
    # Little cupola on the ridge.
    cy = (y0 + y1) // 2
    pk = int(top.max())
    m.box(-2, cy - 2, pk - 3, 2, cy + 2, pk + 4, M["red"])
    m.paint(band(m.X, 1, 2) & band(m.Y, cy - 2, cy + 2) & band(m.Z, pk, pk + 3) & (np.floor(m.Y) % 2 == 0), M["hole"])
    m.paint(band(m.Y, cy + 1, cy + 2) & band(m.X, -2, 2) & band(m.Z, pk, pk + 3) & (np.floor(m.X) % 2 == 0), M["hole"])
    r2, t2 = m.roof(-3, cy - 3, 3, cy + 3, pk + 4, gable(4), "y", M["slate"], thick=1.5)
    m.segment((0, cy, pk + 7), (0, cy, pk + 11), 0.6, M["iron"])
    m.box(-2, cy, pk + 10, 2, cy + 1, pk + 11, M["iron_lt"])
    return m


def cottage(base):
    x0, y0, x1, y1 = vbox(base)
    m = Model(x0, y0, x1, y1, 56)
    wall_top = 21
    wx0, wx1, wy0, wy1 = x0 + 2, x1 - 2, y0 + 2, y1 - 4
    prof = gable(17)
    m.box(wx0 - 1, wy0 - 1, 0, wx1 + 1, wy1 + 1, 2, M["stone"])
    m.box(wx0, wy0, 2, wx1, wy1, wall_top, M["plaster"])
    m.fill(m.under_roof(wx0, y0 + 1, wx1, y1 - 2, wall_top, prof, "x", inset=1.5) & band(m.Y, wy0, wy1), M["wood"])
    front = (wy1 - 1, wy1)
    side = (wx1 - 1, wx1)
    # Timber framing on the plaster.
    fl, sl = band(m.Y, *front), band(m.X, *side)
    for z in (2, 11, wall_top - 1):
        m.paint((fl | sl) & band(m.Z, z, z + 1) & (m.Z < wall_top), M["beam"])
    for u in (wx0, -6, 5, wx1 - 1):
        m.paint(fl & band(m.X, u, u + 1) & band(m.Z, 2, wall_top), M["beam"])
    for u in (wy0, (wy0 + wy1) // 2, wy1 - 1):
        m.paint(sl & band(m.Y, u, u + 1) & band(m.Z, 2, wall_top), M["beam"])
    # Braces in the lower panels.
    for a, sgn in ((wx0 + 1, 1), (wx1 - 2, -1)):
        u = (m.X - a) * sgn
        m.paint(fl & (np.abs(u - (m.Z - 3)) < 0.8) & band(u, 0, 8) & band(m.Z, 3, 11), M["beam"])
    # Gable boards on the +x end (vertical planks) and an attic window.
    gl = sl & (m.Z >= wall_top)
    m.paint(gl & (np.floor(m.Y) % 2 == 0), M["wood_dk"])
    cyy = (y0 + 1 + y1 - 2) // 2
    window(m, "x", cyy - 1, cyy + 2, wall_top + 3, wall_top + 7, side, frame="beam")
    # Red tile roof with courses, overhanging the porch.
    roof, top = m.roof(x0 + 1, y0, x1 - 1, y1 - 1, wall_top, prof, "x", M["tile"], thick=2)
    courses(m, roof, M["tile"], M["tile_dk"], 3)
    # Door, porch posts, step; windows with flower boxes.
    door(m, "y", -2, 2, 2, 15, front)
    m.box(-4, wy1, 0, 4, wy1 + 2, 2, M["stone_dk"])
    for px in (-5, 4):
        m.box(px, y1 - 2, 2, px + 1, y1 - 1, wall_top - 2, M["wood_lt"])
    for u in (wx0 + 3, 8):
        window(m, "y", u, u + 4, 8, 14, front, frame="beam")
        m.box(u - 1, wy1, 6, u + 5, wy1 + 1, 8, M["wood_dk"])
        for i in range(u - 1, u + 5):
            m.box(i, wy1, 8, i + 1, wy1 + 1, 9, M["pink"] if i % 2 else M["yellow"])
    for u in (wy0 + 3, wy1 - 7):
        window(m, "x", u, u + 4, 8, 14, side, frame="beam")
    # Stone chimney through the back slope.
    m.box(wx1 - 7, wy0 + 2, wall_top, wx1 - 4, wy0 + 5, int(top.max()) + 6, M["stone"])
    m.paint(band(m.X, wx1 - 7, wx1 - 4) & band(m.Y, wy0 + 2, wy0 + 5) & band(m.Z, int(top.max()) + 5, int(top.max()) + 6), M["stone_dk"])
    m.carve(band(m.X, wx1 - 6, wx1 - 5) & band(m.Y, wy0 + 3, wy0 + 4) & band(m.Z, int(top.max()) + 5, int(top.max()) + 6))
    return m


def west_cottage(base):
    x0, y0, x1, y1 = vbox(base)
    m = Model(x0, y0, x1, y1, 48)
    wall_top = 18
    wx0, wx1, wy0, wy1 = x0 + 2, x1 - 2, y0 + 2, y1 - 2
    m.box(wx0, wy0, 0, wx1, wy1, 2, M["stone"])
    m.box(wx0, wy0, 2, wx1, wy1, wall_top, M["wood"])
    # Log courses and crossed log ends at the corners.
    m.paint((m.Z >= 2) & (np.floor(m.Z) % 3 == 1), M["wood_dk"])
    for cx in (wx0, wx1 - 1):
        for cy in (wy0, wy1 - 1):
            for z in range(3, wall_top, 3):
                m.box(cx - (1 if cx == wx0 else 0), cy, z, cx + (1 if cx != wx0 else 0) + 1, cy + 1, z + 2, M["end_grain"])
    front, side = (wy1 - 1, wy1), (wx1 - 1, wx1)
    door(m, "y", -2, 2, 2, 14, front)
    window(m, "y", wx0 + 3, wx0 + 7, 8, 13, front, frame="beam")
    window(m, "y", wx1 - 8, wx1 - 4, 8, 13, front, frame="beam")
    window(m, "x", (wy0 + wy1) // 2 - 2, (wy0 + wy1) // 2 + 2, 8, 13, side, frame="beam")
    # Thatched hip roof.
    top = hip(m, x0, y0, x1, y1, wall_top, 15, M["thatch"], thick=2.5)
    roofm = (m.m == M["thatch"])
    m.paint(roofm & (np.floor(m.Z) % 4 == 0), M["thatch_dk"])
    m.paint(roofm & (m.Z < wall_top + 1.5), M["thatch_dk"])
    m.box(wx0 + 3, wy0 + 4, wall_top, wx0 + 6, wy0 + 7, wall_top + 19, M["stone"])
    m.carve(band(m.X, wx0 + 4, wx0 + 5) & band(m.Y, wy0 + 5, wy0 + 6) & band(m.Z, wall_top + 18, wall_top + 19))
    return m


def terrace(seed, s):
    """A row of joined town houses for generic `cottage` decor (collider x -112s..102s, y -30s..2s)."""
    r = rng(seed)
    x0, x1 = math.floor(-112 * s / 2), math.ceil(102 * s / 2)
    y0, y1 = math.floor(-30 * s / 2), math.ceil(2 * s / 2)
    m = Model(x0, y0, x1, y1, 58)
    n = 3
    edges = np.linspace(x0 + 1, x1 - 1, n + 1).round().astype(int)
    roofs = [("tile", "tile_dk"), ("slate", "slate_dk"), ("thatch", "thatch_dk")]
    walls = ["plaster", "red", "wood"]
    order = r.permutation(3)
    wy0, wy1 = y0 + 1, y1 - 1
    for i in range(n):
        a, b = int(edges[i]), int(edges[i + 1])
        wt = 18 + int(r.randint(0, 6))
        wm = walls[order[i]]
        m.box(a, wy0, 0, b, wy1, 2, M["stone"])
        m.box(a, wy0, 2, b, wy1, wt, M[wm])
        prof = gable(10 + int(r.randint(0, 4)))
        m.fill(m.under_roof(a, y0, b, y1, wt, prof, "x", inset=1.5) & band(m.Y, wy0, wy1) & band(m.X, a, b), M[wm])
        ra, rb = roofs[(order[i] + i) % 3]
        roof, top = m.roof(a, y0, b, y1, wt, prof, "x", M[ra], thick=2)
        courses(m, roof, M[ra], M[rb], 3)
        front = (wy1 - 1, wy1)
        fl = band(m.Y, *front)
        m.paint(fl & band(m.X, a, a + 1) & (m.Z >= 2), M["beam"])
        m.paint(fl & band(m.Z, 2, 3), M["beam"])
        w = b - a
        dx = a + 2 + int(r.randint(0, max(1, w - 8)))
        door(m, "y", dx, dx + 3, 2, 13, front)
        for u in range(a + 2, b - 3, 6):
            if abs(u - dx) < 5:
                continue
            window(m, "y", u, u + 3, 7, 12, front, frame="beam")
            if wt > 20:
                window(m, "y", u, u + 3, 15, 19, front, frame="beam")
        if r.rand() < 0.7:
            cx = a + 2 + int(r.randint(0, max(1, w - 5)))
            m.box(cx, wy0 + 1, wt, cx + 3, wy0 + 4, int(top.max()) + 5, M["stone"])
            m.carve(band(m.X, cx + 1, cx + 2) & band(m.Y, wy0 + 2, wy0 + 3) & band(m.Z, int(top.max()) + 4, int(top.max()) + 5))
    side = (x1 - 2, x1 - 1)
    window(m, "x", wy0 + 3, wy0 + 6, 8, 13, side, frame="beam")
    return m


# ---------------------------------------------------------------- fences and furniture
def rail_fence(xa, xb, seed=0, height=13):
    """A split-rail fence along +x from world xa to xb (posts every ~8 voxels)."""
    x0, x1 = math.floor(xa / 2), math.ceil(xb / 2)
    m = Model(x0, -2, x1, 2, height + 2)
    n = max(2, round((x1 - x0 - 2) / 8))
    posts = np.linspace(x0 + 0.5, x1 - 1.5, n + 1).round().astype(int)
    for p in posts:
        m.box(p, -1, 0, p + 1, 0, height, M["wood_dk"])
        m.box(p, -1, height - 1, p + 1, 0, height, M["wood_lt"])
    for z in (4, 8):
        m.box(x0, 0, z, x1, 1, z + 2, M["wood"])
        m.paint(band(m.Z, z + 1, z + 2) & band(m.Y, 0, 1), M["wood_lt"])
    return m


def iron_fence(length=80, turn=0):
    h = length // 4
    m = Model(-h - 1, -h - 1 if turn else -2, h + 1, h + 1 if turn else 2, 18, turn=turn)
    for x in (-h, h - 2):
        m.box(x, -1, 0, x + 2, 1, 14, M["stone"])
        m.box(x, -1, 14, x + 2, 1, 15, M["stone_dk"])
    for x in range(-h + 3, h - 2, 2):
        m.box(x, 0, 1, x + 1, 1, 12, M["iron"])
        m.box(x, 0, 12, x + 1, 1, 13, M["iron_lt"])
    for z in (3, 9):
        m.box(-h + 2, 0, z, h - 2, 1, z + 1, M["iron"])
    return m


def decor_fence(turn):
    m = Model(-21, -21 if turn else -2, 21, 21 if turn else 2, 15, turn=turn)
    posts = [-20, -10, 0, 10, 19]
    for p in posts:
        m.box(p, -1, 0, p + 1, 0, 13, M["wood_dk"])
        m.box(p, -1, 12, p + 1, 0, 13, M["wood_lt"])
    for z in (4, 8):
        m.box(-20, 0, z, 20, 1, z + 2, M["wood"])
        m.paint(band(m.Z, z + 1, z + 2) & band(m.Y, 0, 1), M["wood_lt"])
    # One sagging broken rail for character.
    m.carve(band(m.X, 3, 9) & band(m.Z, 8, 10))
    m.segment((3, 0.5, 9), (9, 0.5, 5.5), 0.8, M["wood"])
    return m


def woodpile(base):
    x0, y0, x1, y1 = vbox(base)
    m = Model(x0, y0, x1, y1, 16)
    logs = [(-7.0, 1.8), (-3.2, 1.8), (0.6, 1.8), (-5.1, 5.1), (-1.3, 5.1), (-3.2, 8.4)]
    for i, (cy, cz) in enumerate(logs):
        a, b = -16 + (i % 3), 12 - (i % 2) * 2
        m.cylinder(cy, cz, 1.75, a, b, M["bark"], axis="x")
        m.paint(band(m.X, b - 1, b) & ((m.Y - cy) ** 2 + (m.Z - cz) ** 2 < 2.4), M["end_grain"])
        m.paint(band(m.X, b - 1, b) & ((m.Y - cy) ** 2 + (m.Z - cz) ** 2 < 0.5), M["ring"])
    m.cylinder(16, -4, 2.6, 0, 5, M["bark"])
    m.paint(band(m.Z, 4, 5) & ((m.X - 16) ** 2 + (m.Y + 4) ** 2 < 4), M["end_grain"])
    m.segment((16, -4, 5), (17.5, -2.5, 11), 0.6, M["wood_lt"])
    m.box(16.5, -3.5, 9, 18.5, -2.5, 11, M["iron_lt"])
    return m


def tool_rack(base):
    x0, y0, x1, y1 = vbox(base)
    m = Model(x0, y0, x1, y1, 18)
    m.box(-6, -3, 0, 8, -2, 13, M["wood"])
    m.paint(band(m.Y, -3, -2) & (np.floor(m.X) % 3 == 0), M["plank_seam"])
    m.box(-7, -4, 13, 9, -1, 14, M["wood_dk"])
    m.segment((-4, -1.5, 1), (-4, -1.5, 12), 0.5, M["wood_lt"])
    m.box(-6, -2, 11, -2, -1, 12, M["iron_lt"])
    m.segment((0, -1.5, 3), (0, -1.5, 12), 0.5, M["wood_lt"])
    m.box(-1, -2, 2, 1, -1, 5, M["iron_lt"])
    m.segment((4, -1.5, 2), (5, -1.5, 12), 0.5, M["wood_lt"])
    m.box(4, -2, 10, 7, -1, 11, M["iron"])
    m.cylinder(9, -1, 1.8, 0, 4, M["iron"])
    m.paint(band(m.Z, 3, 4) & ((m.X - 9) ** 2 + (m.Y + 1) ** 2 < 1.4), M["water"])
    return m


def planter(base, flowers):
    x0, y0, x1, y1 = vbox(base)
    m = Model(x0, y0, x1, y1, 14)
    mid = (x0 + x1) // 2
    r = rng(x0 * 7 + 3)
    for a, b in ((x0 + 1, mid), (mid + 1, x1)):
        m.box(a, y0 + 1, 0, b, y1, 5, M["wood"])
        m.paint(band(m.Z, 4, 5), M["wood_lt"])
        m.box(a + 1, y0 + 2, 4, b - 1, y1 - 1, 5, M["soil"])
        for i in range(a + 1, b - 1, 3):
            cy = (y0 + 2 + y1 - 1) / 2
            m.ellipsoid(i + 1, cy, 6.5, 1.6, 1.4, 2.2 + r.rand(), M["leaf_b"])
            if r.rand() < 0.75:
                m.box(i + 1, cy - 0.5, 8, i + 2, cy + 0.5, 9.5, M[flowers[int(r.randint(0, len(flowers)))]])
    return m


def hay_bales(base):
    x0, y0, x1, y1 = vbox(base)
    m = Model(x0, y0, x1, y1, 14)
    m.cylinder(-3, 3.5, 3.5, -6, 1, M["hay"], axis="x")
    m.paint(band(m.X, 0, 1) & ((m.Y + 3) ** 2 + (m.Z - 3.5) ** 2 < 6), M["hay_dk"])
    m.box(2, -5, 0, 7, 1, 4, M["hay"])
    m.paint(band(m.X, 2, 7) & band(m.Y, -5, 1) & (band(m.X, 3, 4) | band(m.X, 5, 6)), M["hay_dk"])
    m.box(3, -4, 4, 7, 0, 7, M["hay"])
    return m


def cart(base):
    x0, y0, x1, y1 = vbox(base)
    m = Model(x0, y0, x1, y1, 18)
    m.box(-6, -6, 4, 6, 0, 5, M["wood_dk"])
    m.box(-6, -6, 5, 6, -5, 9, M["wood"])
    m.box(-6, -1, 5, 6, 0, 9, M["wood"])
    m.box(5, -6, 5, 6, 0, 9, M["wood"])
    m.box(-6, -6, 5, -5, 0, 9, M["wood"])
    m.paint(band(m.Z, 8, 9), M["wood_lt"])
    for cx in (-3, 1):
        m.ellipsoid(cx, -3, 9.5, 2.0, 2.0, 2.0, M["pumpkin"])
    m.ellipsoid(3.5, -3.5, 9, 1.5, 1.5, 1.5, M["pumpkin"])
    for y in (-7, 0):
        m.cylinder(1, 4, 3.8, y, y + 1, M["wood_dk"], axis="y")
        m.carve(band(m.Y, y, y + 1) & ((m.X - 1) ** 2 + (m.Z - 4) ** 2 < 6.5) & ~(np.abs(m.X - 1) < 0.6) & ~(np.abs(m.Z - 4) < 0.6))
    m.segment((-6, -3, 5), (-8, -3, 2), 0.5, M["wood"])
    return m


def well(base):
    x0, y0, x1, y1 = vbox(base)
    m = Model(x0, y0, x1, y1, 30)
    cy = -3
    m.cylinder(0, cy, 4.2, 0, 7, M["cobble"])
    m.carve(((m.X) ** 2 + (m.Y - cy) ** 2 < 6) & (m.Z >= 4))
    m.cylinder(0, cy, 2.6, 4, 5, M["water"])
    m.paint(band(m.Z, 6, 7), M["stone"])
    for px in (-4, 3):
        m.box(px, cy, 7, px + 1, cy + 1, 20, M["wood_dk"])
    m.segment((-4, cy + 0.5, 17), (4, cy + 0.5, 17), 0.5, M["wood"])
    m.segment((0, cy + 0.5, 17), (0, cy + 0.5, 11), 0.25, M["hay_dk"])
    m.box(-1, cy, 9, 1, cy + 1, 11, M["wood"])
    roof, _ = m.roof(-6, cy - 3, 6, cy + 4, 19, gable(6), "x", M["tile"], thick=1.5)
    courses(m, roof, M["tile"], M["tile_dk"], 2)
    return m


def scarecrow(base):
    m = Model(-7, -2, 7, 2, 34)
    m.box(0, 0, 0, 1, 1, 26, M["wood_dk"])
    m.box(-6, 0, 18, 7, 1, 19, M["wood"])
    m.box(-2, -1, 11, 3, 2, 20, M["cloth_blue"])
    m.box(-5, -1, 17, 6, 2, 20, M["cloth_red"])
    m.paint(band(m.Z, 18, 19) & (np.floor(m.X) % 2 == 0), M["red_seam"])
    m.box(-7, 0, 15, -5, 1, 18, M["hay"])
    m.box(6, 0, 15, 8, 1, 18, M["hay"])
    m.ellipsoid(0.5, 0.5, 23, 2.4, 2.4, 2.6, M["hay"])
    m.cylinder(0.5, 0.5, 3.6, 25, 26, M["wood_dk"])
    m.cylinder(0.5, 0.5, 2.0, 26, 29, M["wood"])
    m.box(0, 2, 23, 1, 3, 24, M["dark"])
    return m


# ---------------------------------------------------------------- crops
def crop(kind, v):
    r = rng(1000 + v * 17 + {"wheat": 0, "cabbage": 1, "pumpkin": 2}[kind] * 101)
    m = Model(-3, -3, 3, 3, 16)
    if kind == "wheat":
        for i in range(4 + v):
            x, y = r.uniform(-2.2, 2.2), r.uniform(-2.2, 2.2)
            h = 6 + v + r.randint(0, 3)
            m.segment((x, y, 0), (x + r.uniform(-0.6, 0.6), y + r.uniform(-0.6, 0.6), h), 0.5, M["hay_dk"])
            m.ellipsoid(x, y, h, 0.6, 0.6, 1.8, M["hay"])
    elif kind == "cabbage":
        m.ellipsoid(0, 0, 2.2, 2.2 + v * 0.2, 2.2 + v * 0.2, 2.3, M["cabbage"])
        for a in range(5):
            t = a * 2 * math.pi / 5 + v
            m.ellipsoid(1.8 * math.cos(t), 1.8 * math.sin(t), 1.2, 1.4, 1.4, 1.2, M["leaf_b"])
    else:
        m.ellipsoid(0.3, 0.3, 2.0, 2.3, 2.3, 2.0, M["pumpkin"])
        m.paint((np.abs(np.sin(np.arctan2(m.Y - 0.3, m.X - 0.3) * 3)) < 0.25), M["pumpkin_rib"])
        m.segment((0.3, 0.3, 3.5), (0.6, 0.2, 5.5), 0.45, M["stem"])
        m.ellipsoid(-1.8, 1.6, 1, 1.5, 1.4, 0.9, M["leaf_b"])
        m.ellipsoid(1.9, -1.4, 1, 1.3, 1.5, 0.9, M["leaf_b"])
    return m


# ---------------------------------------------------------------- lamps
def lamp(tall):
    m = Model(-4, -4, 4, 4, 44)
    h = 30 if tall else 26
    m.box(-1, -1, 0, 2, 2, 3, M["stone"])
    m.box(0, 0, 3, 1, 1, h, M["iron"])
    m.box(-1, -1, h - 1, 2, 2, h, M["iron_lt"])
    # Lantern head: glass with iron corner frames, a pyramid cap and a finial.
    m.box(-1, -1, h, 2, 2, h + 6, M["lamp_glass"])
    m.paint(band(m.X, 1, 2) & band(m.Y, 1, 2) & band(m.Z, h, h + 6), M["iron"])
    m.box(-2, -2, h + 6, 3, 3, h + 7, M["iron"])
    m.cone(0.5, 0.5, 2.5, h + 7, h + 10, M["iron"])
    m.box(0, 0, h + 10, 1, 1, h + 12, M["iron_lt"])
    return m


def lantern_post():
    m = Model(-6, -4, 6, 4, 40)
    m.box(-1, -1, 0, 1, 1, 28, M["wood_dk"])
    m.box(-1, -1, 27, 6, 1, 29, M["wood"])
    m.segment((4.5, 0, 27), (4.5, 0, 24), 0.3, M["iron"])
    m.box(3, -1, 18, 6, 2, 24, M["lantern_glass"])
    for cx in (3, 5):
        m.paint(band(m.X, cx, cx + 1) & band(m.Y, -1, 0) & band(m.Z, 18, 24), M["iron"])
        m.paint(band(m.X, cx, cx + 1) & band(m.Y, 1, 2) & band(m.Z, 18, 24), M["iron"])
    m.box(2, -2, 24, 7, 3, 25, M["iron"])
    m.box(3, -1, 17, 6, 2, 18, M["iron"])
    return m


# ---------------------------------------------------------------- trees
def _crown(m, r, centers, mats, lump=0.35):
    for i, (cx, cy, cz, rr) in enumerate(centers):
        m.ellipsoid(cx, cy, cz, rr, rr, rr * 0.86, M[mats[i % len(mats)]], lumpy=lump, salt=i * 13 + 5)


def oak(v, palette=("leaf", "leaf_b"), seed=11, turn=0):
    r = rng(seed + v * 31)
    s = (0.82, 0.95, 1.08)[v]
    R = int(18 * s) + 3
    m = Model(-R, -R, R, R, int(66 * s) + 4, turn=turn)
    th = 19 * s
    m.cone(0, 0, 3.2 * s, 0, 5, M["bark"])
    m.cylinder(0, 0, 1.8 * s, 0, th, M["bark"])
    m.paint(np.floor(m.Z) % 5 == 0, M["bark_dk"])
    for a in range(3):
        t = a * 2.1 + r.rand()
        m.segment((0, 0, th - 6), (5 * s * math.cos(t), 5 * s * math.sin(t), th + 5), 0.9, M["bark"])
    cz = th + 15 * s
    centers = [(0, 0, cz, 11 * s)]
    for a in range(7):
        t = a * math.tau / 7 + r.uniform(-0.35, 0.35)
        d = r.uniform(8.0, 10.0) * s
        centers.append((d * math.cos(t), d * math.sin(t), cz + r.uniform(-6, 3) * s, r.uniform(5.8, 7.4) * s))
    for a in range(3):
        t = a * math.tau / 3 + r.uniform(-0.5, 0.5)
        centers.append((4 * s * math.cos(t), 4 * s * math.sin(t), cz + 9 * s, r.uniform(6.0, 7.0) * s))
    _crown(m, r, centers, palette)
    return m


def maple(v, turn=0):
    return oak(v, palette=("maple", "maple_b", "maple"), seed=47, turn=turn)


def pine(v, turn=0):
    r = rng(71 + v * 13)
    s = (0.85, 1.0, 1.12)[v]
    R = int(10 * s) + 2
    H = int(74 * s) + 3
    m = Model(-R, -R, R, R, H, turn=turn)
    m.cylinder(0, 0, 1.4, 0, 14 * s, M["bark"])
    tiers = 5
    for i in range(tiers):
        z0 = (8 + i * 11) * s
        z1 = z0 + (20 - i * 1.5) * s
        rad = (9.5 - i * 1.6) * s
        m.cone(r.uniform(-0.4, 0.4), r.uniform(-0.4, 0.4), rad, z0, z1, M["pine" if i % 2 == 0 else "pine_b"])
    # Ragged tier edges.
    edge = (vhash(np.floor(m.X), np.floor(m.Y), np.floor(m.Z / 2), 9) < 0.18) & (m.m > 0) & (m.Z > 10)
    m.carve(edge & ((m.X ** 2 + m.Y ** 2) > 4))
    return m


def dead_tree(v, turn=0):
    r = rng(91 + v * 7)
    s = (0.85, 1.0, 1.15)[v]
    R = int(20 * s) + 3
    m = Model(-R, -R, R, R, int(60 * s) + 3, turn=turn)
    m.cone(0, 0, 3 * s, 0, 6, M["bark"])

    def grow(p, ang, tilt, length, rad, depth):
        q = (p[0] + length * math.cos(ang) * math.sin(tilt), p[1] + length * math.sin(ang) * math.sin(tilt), p[2] + length * math.cos(tilt))
        m.segment(p, q, rad, M["bark"])
        if depth == 0:
            return
        for k in range(2):
            grow(q, ang + (k - 0.5) * 2.2 + r.uniform(-0.5, 0.5), min(1.2, tilt + r.uniform(0.35, 0.7)), length * r.uniform(0.6, 0.78), max(0.55, rad * 0.65), depth - 1)

    grow((0, 0, 0), r.uniform(0, math.tau), 0.12, 20 * s, 2.0 * s, 3)
    m.paint(vhash(np.floor(m.X), np.floor(m.Y), np.floor(m.Z), 3) < 0.25, M["bark_dk"])
    return m


def birch(v, turn=0):
    r = rng(131 + v * 19)
    s = (0.85, 1.0, 1.12)[v]
    R = int(13 * s) + 3
    m = Model(-R, -R, R, R, int(72 * s) + 3, turn=turn)
    th = 36 * s
    m.segment((0, 0, 0), (0.8, -0.5, th), 1.2, M["birch"])
    m.segment((0.3, 0, th * 0.55), (4 * s, -2 * s, th * 0.85), 0.6, M["birch"])
    marks = (vhash(np.floor(m.X), np.floor(m.Y), np.floor(m.Z), 17) < 0.16) & (m.m == M["birch"])
    m.paint(marks, M["birch_mark"])
    centers = []
    for a in range(8):
        t = a * math.tau / 8 + r.uniform(-0.4, 0.4)
        d = r.uniform(3.0, 6.0) * s
        centers.append((0.8 + d * math.cos(t), -0.5 + d * math.sin(t), th + r.uniform(-4, 14) * s, r.uniform(4.2, 5.6) * s))
    centers.append((0.8, -0.5, th + 18 * s, 4.6 * s))
    _crown(m, r, centers, ("birchleaf", "birchleaf"), lump=0.45)
    return m


def bush(v, palette, seed=5):
    r = rng(seed + v * 23)
    R = 9
    m = Model(-R, -R, R, R, 18)
    n = 4 + v
    for i in range(n):
        t = i * math.tau / n + r.uniform(-0.3, 0.3)
        d = r.uniform(1.5, 4.0)
        rr = r.uniform(3.2, 4.6)
        m.ellipsoid(d * math.cos(t), d * math.sin(t), rr * 0.7 + r.uniform(0, 2), rr, rr, rr * 0.8, M[palette[i % len(palette)]], lumpy=0.4, salt=i + seed)
    if palette[0] == "leaf":
        dots = (vhash(np.floor(m.X), np.floor(m.Y), np.floor(m.Z), 21 + v) < 0.014) & (m.m > 0)
        m.paint(dots, M["berry"])
    return m


def flowers(kind, v):
    r = rng(300 + v * 7 + len(kind))
    m = Model(-4, -4, 4, 4, 10)
    for i in range(5 + v):
        x, y = r.uniform(-3, 3), r.uniform(-3, 3)
        h = r.randint(3, 7)
        m.segment((x, y, 0), (x, y, h), 0.45, M["grass"])
        m.box(math.floor(x), math.floor(y), h, math.floor(x) + 1, math.floor(y) + 1, h + 1, M[kind])
    return m


def tuft(v):
    r = rng(400 + v * 11)
    m = Model(-4, -4, 4, 4, 12)
    for i in range(5 + v):
        t = i * math.tau / (5 + v) + r.uniform(-0.3, 0.3)
        x, y = 0.9 * math.cos(t), 0.9 * math.sin(t)
        h = r.uniform(5, 8 + v)
        lean = r.uniform(1.2, 2.4)
        m.segment((x, y, 0), (x + lean * math.cos(t), y + lean * math.sin(t), h), 0.42, M["blade" if i % 2 else "blade_lt"])
    return m


def rock(v):
    r = rng(500 + v * 5)
    s = (0.8, 1.0, 1.35)[v]
    m = Model(-8, -8, 8, 8, 12)
    m.ellipsoid(0, 0, 1.0, 5.0 * s, 4.0 * s, 4.4 * s, M["stone"], lumpy=0.5, salt=v)
    m.ellipsoid(3.2 * s, 2.5 * s, 0.5, 2.6 * s, 2.4 * s, 2.4 * s, M["stone_dk"], lumpy=0.4, salt=v + 3)
    top = (m.n[..., 2] > 0.75) & (m.m == M["stone"]) & (vhash(np.floor(m.X / 2), np.floor(m.Y / 2), 0, 77 + v) < 0.6)
    m.m[top] = M["moss"]
    return m


def boulder(base):
    """The east yard boulder, shaped to its SOLID_SCENERY capsule."""
    x0, y0, x1, y1 = vbox(base)
    m = Model(x0, y0, x1, y1, 16)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    hx, hy = (x1 - x0) / 2 - 0.6, (y1 - y0) / 2 - 0.6
    m.ellipsoid(cx - 1.5, cy, 1.5, hx - 2, hy, 7.5, M["stone"], lumpy=0.45, salt=41)
    m.ellipsoid(cx + hx - 3.2, cy + 0.5, 0.8, 3.2, hy - 1, 4.5, M["stone_dk"], lumpy=0.4, salt=43)
    top = (m.n[..., 2] > 0.75) & (m.m == M["stone"]) & (vhash(np.floor(m.X / 2), np.floor(m.Y / 2), 0, 79) < 0.55)
    m.m[top] = M["moss"]
    return m


def stump():
    m = Model(-5, -5, 5, 5, 10)
    m.cone(0, 0, 4.2, 0, 3, M["bark"])
    m.cylinder(0, 0, 3.2, 0, 6, M["bark"])
    m.paint(band(m.Z, 5, 6) & (m.X ** 2 + m.Y ** 2 < 7), M["end_grain"])
    m.paint(band(m.Z, 5, 6) & (np.abs(np.sqrt(m.X ** 2 + m.Y ** 2) - 1.5) < 0.4), M["ring"])
    m.segment((2, 2, 1), (4.5, 3, 0.5), 0.8, M["bark"])
    return m


def pumpkin(v):
    m = Model(-6, -6, 6, 6, 14)
    rr = (3.4, 2.8, 4.2)[v]
    m.ellipsoid(0, 0, rr * 0.8, rr * 1.15, rr * 1.15, rr * 0.82, M["pumpkin"])
    ang = np.arctan2(m.Y, m.X)
    m.paint(np.abs(np.sin(ang * 4)) < 0.22, M["pumpkin_rib"])
    m.segment((0, 0, rr * 1.4), (0.6, -0.4, rr * 1.4 + 2.5), 0.55, M["stem"])
    if v == 1:
        m.ellipsoid(4, -2.5, 1.6, 2.0, 2.0, 1.6, M["pumpkin"])
    if v == 2:
        # Carved face toward the viewer (the +x +y diagonal).
        u = (m.X - m.Y) / math.sqrt(2)
        w = m.Z - rr * 0.8
        facing = ((m.X + m.Y) / math.sqrt(2) > rr * 0.75) & (m.m > 0)
        eyes = ((np.abs(np.abs(u) - 1.6) < 0.8) & band(w, 0.4, 1.8))
        mouth = (np.abs(u) < 2.4) & band(w, -1.7, -0.7)
        m.m[facing & (eyes | mouth)] = M["jack"]
    return m


def candles():
    m = Model(-5, -5, 5, 5, 12)
    m.ellipsoid(0, 0, 0.5, 4, 3.4, 1.4, M["stone_dk"])
    for (x, y, h) in ((-1.5, -1, 6), (1.5, 0, 4), (-0.5, 2, 3)):
        m.cylinder(x, y, 0.8, 1, h, M["wax"])
        m.box(math.floor(x), math.floor(y), h, math.floor(x) + 1, math.floor(y) + 1, h + 2, M["candle_flame"])
    return m


# ---------------------------------------------------------------- district decor
HEAD = {
    "slab": (["..xxxx..", ".xxxxxx.", "xxxxxxxx"] + ["xxxxxxxx"] * 8, ["xx"] * 11),
    "cross": (["...xx...", "...xx...", "xxxxxxxx", "xxxxxxxx", "...xx...", "...xx...", "...xx...", "...xx...", "...xx...", "..xxxx.."], ["xx"] * 10),
    "obelisk": (["...xx...", "..xxxx..", "..xxxx..", "..xxxx..", "..xxxx..", "..xxxx..", "..xxxx..", "..xxxx..", "..xxxx..", ".xxxxxx.", ".xxxxxx.", "xxxxxxxx"], ["..xx..", ".xxxx.", ".xxxx.", ".xxxx.", ".xxxx.", ".xxxx.", ".xxxx.", ".xxxx.", ".xxxx.", "xxxxxx", "xxxxxx", "xxxxxx"]),
}


def headstone(kind):
    """Carved from ASCII front and side views (visual hull, the views_to_slices.py idea)."""
    front, side = HEAD[kind]
    m = Model(-5, -4, 5, 4, 16)
    top = ["xxxxxxxx"] * len(side[0])
    carve_views(m, top, side, front, {"x": M["stone"]}, origin=(-4, -len(side[0]) // 2), round_=kind == "obelisk")
    m.box(-5, -3, 0, 5, 3, 1, M["stone_dk"])
    mossy = (vhash(np.floor(m.X), np.floor(m.Y), np.floor(m.Z), 5) < 0.12) & (m.m == M["stone"])
    m.m[mossy] = M["moss"]
    return m


def barrel():
    m = Model(-4, -4, 4, 4, 12)
    m.cylinder(0, 0, 3.0, 0, 9, M["wood"])
    m.paint((np.floor(np.arctan2(m.Y, m.X) * 3) % 2 == 0), M["wood_dk"])
    m.paint(band(m.Z, 1, 2) | band(m.Z, 7, 8), M["iron"])
    m.paint(band(m.Z, 8, 9), M["wood_lt"])
    return m


def crates():
    m = Model(-6, -6, 6, 6, 14)
    for (x, y, z, w) in ((-5, -4, 0, 6), (1, -3, 0, 5), (-3, -3, 6, 5)):
        m.box(x, y, z, x + w, y + w, z + w, M["wood_dk"])
        edge = (band(m.X, x, x + 1) | band(m.X, x + w - 1, x + w) | band(m.Y, y, y + 1) | band(m.Y, y + w - 1, y + w) | band(m.Z, z, z + 1) | band(m.Z, z + w - 1, z + w))
        inside = band(m.X, x, x + w) & band(m.Y, y, y + w) & band(m.Z, z, z + w)
        m.paint(inside & edge, M["bark"])
    return m


def hay_bale():
    m = Model(-5, -5, 5, 5, 10)
    m.cylinder(-0.5, 3.2, 3.2, -4, 4, M["hay"], axis="x")
    m.paint(band(m.X, 3, 4) & ((m.Y + 0.5) ** 2 + (m.Z - 3.2) ** 2 < 5), M["hay_dk"])
    return m
