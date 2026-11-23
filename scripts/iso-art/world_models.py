"""Voxel models of the sim props, landmark dioramas and townsfolk puppets (FEAT-004).

Same conventions as models.py: 1 voxel = 2 world units on the ground and 1 px high, +x runs
screen down-right (lit face), +y screen down-left (dark face, where buildings keep their
doors). Footprints follow the sim colliders in src/defs/props/*/def.ts and the landmark
layouts in src/defs/landmarks/*/def.ts (read, never changed); the build asserts them.

Prop phases: every prop has an authored intact model; `damaged` bites chunks out and leans
it, `scraps` keeps a low stub plus scattered flakes in its own materials, and `ash` is the
burnt scraps (charcoal and a few dull embers). Burning, ink coat, fold and wash are cheap
runtime palette swaps / squashes of these sprites (src/render/iso/gen-sprites.ts).
"""
from __future__ import annotations

import math

import numpy as np

import models as md
from models import M, band, courses, door, rng, window
from voxel import MATERIALS, Model, gable, hip, vhash

# ---------------------------------------------------------------- ramps and materials
EXTRA_RAMPS = {
    "teal": ["#0d1c26", "#14303a", "#1c4a4f", "#2a6a66", "#46907e", "#86c0a0"],
    "plum": ["#1a0f24", "#2e1638", "#4a2050", "#6a3068", "#8e4a80", "#c07aa0"],
    "glass": ["#14203a", "#1e3452", "#2c4e6c", "#43708a", "#6c9aa8", "#b0d2d0"],
}

_m = md._m
_m("paper", "white", bias=0, jitter=0.04)
_m("paper_dk", "white", bias=-1)
_m("card", "wax", bias=-1, jitter=0.06)
_m("card_dk", "wax", bias=-2)
_m("tape", "white", bias=1)
_m("ink_fill", "ink", bias=1, rim=False)
_m("ink_sheen", "plum", bias=1, rim=False)
_m("teal", "teal", jitter=0.04)
_m("teal_dk", "teal", bias=-1)
_m("plum", "plum", jitter=0.05)
_m("plum_dk", "plum", bias=-1)
_m("glass", "glass", rim=False, jitter=0.05)
_m("glass_lt", "glass", bias=1, rim=False)
_m("brass", "hay", bias=1)
_m("brass_dk", "hay", bias=-1)
_m("brick", "redTile", bias=-1, jitter=0.12)
_m("terracotta", "pumpkin", bias=-1, jitter=0.06)
_m("shallow_w", "shallow", bias=1, rim=False)
_m("ash", "ink", bias=2, jitter=0.35, rim=False)
_m("char", "stone", bias=-2, jitter=0.2, rim=False)
_m("ember", "flame", bias=-1, rim=False)
_m("lantern_red", "pumpkin", emit="lantern", glow=4)
_m("lantern_red_dim", "pumpkin", bias=1, rim=False)
_m("lantern_gold_dim", "hay", bias=1, rim=False)
_m("lantern_pink_dim", "pink", bias=1, rim=False)
_m("wax_c", "wax", bias=0, jitter=0.08)
_m("lantern_pink", "pink", emit="lantern", glow=4)
_m("lantern_gold", "glow", emit="lantern", glow=4)
_m("clock_face", "glow", emit="window", glow=5)
_m("star_dot", "glow", emit="lantern", glow=5)
_m("bulb", "glow", emit="lamp", glow=5)
_m("coin", "glow", emit="candle", glow=4)
_m("fur", "stone", bias=1, jitter=0.05)
_m("fur_dk", "stone", bias=0)
_m("coat", "blue", bias=-1, jitter=0.04)
_m("feather", "wood", bias=0, jitter=0.12)
_m("feather_dk", "wood", bias=-1, jitter=0.1)
_m("disc", "wax", bias=1)
_m("frog", "cabbage", bias=0, jitter=0.05)
_m("belly", "wax", bias=1)
_m("eye", "ink", bias=-1, rim=False)
_m("eye_lit", "white", bias=2, rim=False)
_m("nose", "pink", bias=1, rim=False)
_m("straw", "hay", bias=0, jitter=0.15)
_m("cap", "bark", bias=0)


def is_emissive(mid: int) -> bool:
    return MATERIALS[mid].emit is not None


# ---------------------------------------------------------------- phase helpers
def lean(m: Model, k: float, axis: str = "x") -> Model:
    """Shears the model by k voxels per layer along +axis (a leaning, broken look)."""
    X, Y, Z = m.m.shape
    mm, nn = np.zeros_like(m.m), np.zeros_like(m.n)
    for z in range(Z):
        s = int(round(k * z))
        src, dst = [slice(None)] * 2, [slice(None)] * 2
        ax = 0 if axis == "x" else 1
        size = X if ax == 0 else Y
        if s > 0:
            src[ax], dst[ax] = slice(0, size - s), slice(s, size)
        elif s < 0:
            src[ax], dst[ax] = slice(-s, size), slice(0, size + s)
        mm[dst[0], dst[1], z] = m.m[src[0], src[1], z]
        nn[dst[0], dst[1], z] = m.n[src[0], src[1], z]
    m.m, m.n = mm, nn
    return m


def bites(m: Model, salt: int, n: int = 4, r: float = 3.0, low: float = 0.35) -> Model:
    """Carves n hashed bites out of the upper part of a model (torn, nibbled edges)."""
    filled = np.argwhere(m.m > 0)
    if not len(filled):
        return m
    zmax = filled[:, 2].max()
    cand = filled[filled[:, 2] >= zmax * low]
    rr = rng(salt)
    for _ in range(n):
        i, j, k = cand[rr.randint(0, len(cand))]
        cx, cy, cz = i + m.x0 + 0.5, j + m.y0 + 0.5, k + 0.5
        rad = r * rr.uniform(0.7, 1.3)
        q = ((m.X - cx) / rad) ** 2 + ((m.Y - cy) / rad) ** 2 + ((m.Z - cz) / (rad * 0.9)) ** 2
        q = q + 0.5 * (vhash(np.floor(m.X), np.floor(m.Y), np.floor(m.Z), salt) - 0.5)
        m.carve(q < 1)
    return m


def damaged(build, salt: int, k: float = 0.08, n: int = 4, r: float = 3.0, axis="x"):
    def f():
        m = build()
        bites(m, salt, n, r)
        return lean(m, k, axis)
    return f


def _mat_weights(src: Model):
    ids, counts = np.unique(src.m[src.m > 0], return_counts=True)
    keep = [(int(i), int(c)) for i, c in zip(ids, counts) if not is_emissive(int(i))]
    keep.sort(key=lambda t: -t[1])
    return keep[:5] or [(M["wood"], 1)]


def scraps(build, salt: int, stub: int = 2, ash: bool = False, spread: int = 4):
    """A low stub of the model plus flakes of its own materials scattered around the foot."""
    def f():
        src = build()
        X, Y, Z = src.m.shape
        p = spread
        m = Model(src.x0 - p, src.y0 - p, src.x0 + X + p, src.y0 + Y + p, 6)
        st = src.m[:, :, :stub].copy()
        st[np.vectorize(is_emissive)(st) & (st > 0)] = M["wood_dk"] if not ash else M["char"]
        m.m[p:p + X, p:p + Y, :stub] = st
        bites(m, salt + 3, 2, 2.0, low=0.0)
        fp = np.argwhere(src.m.any(2))
        fx0, fy0 = fp.min(0) + np.array([src.x0, src.y0])
        fx1, fy1 = fp.max(0) + np.array([src.x0, src.y0]) + 1
        weights = _mat_weights(src)
        tot = sum(c for _, c in weights)
        rr = rng(salt)
        area = (fx1 - fx0 + 2) * (fy1 - fy0 + 2)
        for i in range(max(6, min(22, area // 10))):
            x = rr.uniform(fx0 - p + 1, fx1 + p - 2)
            y = rr.uniform(fy0 - p + 1, fy1 + p - 2)
            pick = rr.uniform(0, tot)
            mid = weights[-1][0]
            for w_id, c in weights:
                pick -= c
                if pick <= 0:
                    mid = w_id
                    break
            w, d = 1 + rr.randint(0, 3), 1 + rr.randint(0, 2)
            z = 1 if rr.rand() < 0.25 else 0
            m.box(math.floor(x), math.floor(y), z, math.floor(x) + w, math.floor(y) + d, z + 1, mid)
        if ash:
            fl = m.m > 0
            h = vhash(np.floor(m.X), np.floor(m.Y), np.floor(m.Z), salt + 11)
            m.m[fl] = M["ash"]
            m.m[fl & (h < 0.4)] = M["char"]
            m.m[fl & (h > 0.95) & (m.Z < 1)] = M["ember"]
        return m
    return f


# ---------------------------------------------------------------- props (intact models)
def paper_fence():
    m = Model(-21, -3, 21, 2, 18)
    for x in range(-20, 20, 3):
        h = 12 + (1 if (x // 3) % 2 == 0 else 0)
        m.box(x, -1, 0, x + 2, 0, h, M["paper"])
        m.box(x, -1, h, x + 1, 0, h + 1, M["paper"])
        m.box(x + 1, -1, h, x + 2, 0, h + 2, M["paper_dk"] if False else M["paper"])
    for z in (3, 9):
        m.box(-20, -2, z, 20, -1, z + 1, M["paper_dk"])
    m.box(-21, -2, 0, -19, 0, 14, M["wood_dk"])
    m.box(19, -2, 0, 21, 0, 14, M["wood_dk"])
    return m


def paper_bush():
    r = rng(611)
    m = Model(-16, -8, 16, 6, 22)
    blobs = [(0, -1, 6.5, 7.2), (-8, 0, 4.6, 5.4), (8, -1.5, 4.8, 5.6), (-3.5, -2, 11, 4.6), (4, 0, 10.5, 4.4), (-11, -1, 3.2, 3.6), (11.5, 0, 3.0, 3.4)]
    for i, (cx, cy, cz, rr) in enumerate(blobs):
        m.ellipsoid(cx, cy, cz, rr, rr * 0.78, rr * 0.82, M[("leaf", "leaf_b")[i % 2]], lumpy=0.5, salt=i + 61)
    m.carve(m.Z < 0.5)
    dots = (vhash(np.floor(m.X), np.floor(m.Y), np.floor(m.Z), 63) < 0.05) & (m.m > 0) & (m.Z > 5)
    m.paint(dots, M["white"])
    dots2 = (vhash(np.floor(m.X), np.floor(m.Y), np.floor(m.Z), 64) < 0.035) & (m.m > 0) & (m.Z > 4)
    m.paint(dots2, M["pink"])
    del r
    return m


def paper_grass():
    r = rng(621)
    m = Model(-27, -14, 27, 14, 14)
    for i in range(70):
        x, y = r.uniform(-25, 25), r.uniform(-12, 12)
        if (x / 26) ** 2 + (y / 13) ** 2 > 1:
            continue
        h = r.uniform(5, 11)
        t = r.uniform(0, math.tau)
        lx, ly = 1.6 * math.cos(t), 1.6 * math.sin(t)
        m.segment((x, y, 0), (x + lx, y + ly, h), 0.45, M[("blade", "blade_lt", "grass")[i % 3]])
    return m


def paper_lanterns():
    m = Model(-20, -3, 20, 3, 32)
    for px in (-17, 16):
        m.box(px, -1, 0, px + 1, 0, 28, M["wood_dk"])
        m.box(px - 1, -2, 0, px + 2, 1, 2, M["stone_dk"])
    cols = ("lantern_red", "lantern_gold_dim", "lantern_pink", "lantern_red_dim", "lantern_gold")
    for i, x in enumerate(np.linspace(-13, 12, 5)):
        sag = 26 - 4 * (1 - ((x + 0.5) / 16.5) ** 2)
        m.segment((x - 3, -0.5, sag + 0.4), (x + 3, -0.5, sag - 0.2), 0.35, M["dark"])
        cz = sag - 4
        m.ellipsoid(x, -0.5, cz, 2.1, 2.1, 2.6, M[cols[i]])
        m.box(math.floor(x) - 1, -2, int(cz) + 2, math.floor(x) + 2, 1, int(cz) + 3, M["dark"])
        m.box(math.floor(x) - 1, -2, int(cz) - 3, math.floor(x) + 2, 1, int(cz) - 2, M["dark"])
    xs = np.linspace(-16.5, 16.5, 34)
    for a, b in zip(xs[:-1], xs[1:]):
        za = 26 - 4 * (1 - (a / 16.5) ** 2)
        zb = 26 - 4 * (1 - (b / 16.5) ** 2)
        m.segment((a, -0.5, za), (b, -0.5, zb), 0.4, M["dark"])
    return m


def scarecrow():
    m = Model(-9, -3, 9, 3, 36)
    m.box(0, 0, 0, 1, 1, 26, M["wood_dk"])
    m.box(-7, 0, 18, 8, 1, 19, M["wood"])
    m.box(-3, -1, 9, 4, 2, 20, M["cloth_red"])
    m.paint(band(m.Z, 9, 20) & ((np.floor(m.X) + np.floor(m.Z)) % 4 == 0), M["red_seam"])
    m.box(-2, 2, 12, 2, 2.6, 15, M["patch"] if "patch" in M else M["cloth_blue"])
    m.box(-6, -1, 16, 7, 2, 20, M["cloth_red"])
    for sx in (-8, 8):
        m.box(sx - 1, 0, 14, sx + 1, 1, 17, M["hay"])
    m.box(-1, 0, 6, 2, 1, 9, M["hay"])
    m.ellipsoid(0.5, 0.5, 23, 3.0, 3.0, 2.6, M["pumpkin"])
    ang = np.arctan2(m.Y - 0.5, m.X - 0.5)
    m.paint(band(m.Z, 20, 26) & (np.abs(np.sin(ang * 3)) < 0.2) & (m.m == M["pumpkin"]), M["pumpkin_rib"])
    u = (m.X - m.Y) / math.sqrt(2)
    facing = ((m.X + m.Y) / math.sqrt(2) > 1.6) & (m.m == M["pumpkin"])
    m.m[facing & band(m.Z, 23, 24.5) & (np.abs(np.abs(u) - 1.1) < 0.6)] = M["dark"]
    m.m[facing & band(m.Z, 21, 22) & (np.abs(u) < 1.4)] = M["dark"]
    m.cylinder(0.5, 0.5, 4.2, 25, 26, M["cap"])
    m.cone(0.5, 0.5, 2.4, 26, 32, M["cap"])
    return m


def haybale():
    m = Model(-13, -9, 13, 2, 14)
    m.cylinder(-3.5, 6, 6, -11, 11, M["hay"], axis="x")
    m.paint(band(m.X, 10, 11) & ((m.Y + 3.5) ** 2 + (m.Z - 6) ** 2 < 25), M["hay_dk"])
    m.paint(band(m.X, 10, 11) & (np.abs(np.sqrt((m.Y + 3.5) ** 2 + (m.Z - 6) ** 2) - 2.5) < 0.5), M["hay"])
    for x in (-6, 5):
        m.paint(band(m.X, x, x + 1), M["cloth_red"])
    return m


def paper_crate():
    m = Model(-10, -9, 10, 2, 14)
    m.box(-8, -8, 0, 8, 1, 10, M["card"])
    m.paint(band(m.Z, 9, 10) & band(m.X, -1, 1), M["tape"])
    m.paint(band(m.X, 7, 8) & band(m.Z, 4, 6), M["tape"])
    m.paint(band(m.Y, 0, 1) & band(m.Z, 4, 6), M["tape"])
    m.paint(band(m.Z, 9, 10) & ~band(m.X, -1, 1) & (np.abs(m.Y + 3.5) < 0.6), M["card_dk"])
    # Fragile arrows on the front face.
    m.paint(band(m.Y, 0, 1) & band(m.X, -5, -3) & band(m.Z, 2, 3), M["redTile"] if "redTile" in M else M["red"])
    m.paint(band(m.Y, 0, 1) & band(m.X, -4.5, -3.5) & band(m.Z, 1, 4), M["red"])
    # Lid flap a little open.
    m.box(-8, -8, 10, -2, 1, 11, M["card"])
    return m


def mailbox():
    m = Model(-6, -4, 6, 3, 24)
    m.box(0, -1, 0, 1, 0, 14, M["wood_dk"])
    m.box(-4, -3, 14, 5, 2, 18, M["blue"])
    m.cylinder(-0.5, 18, 2.5, -4, 5, M["blue"], axis="x")
    m.paint(band(m.X, 4, 5) & band(m.Z, 14, 20), M["cloth_blue"])
    m.paint(band(m.X, 4, 5) & band(m.Z, 15, 16) & band(m.Y, -2, 1), M["dark"])
    m.box(-2, 2, 15, -1, 3, 21, M["red"])
    m.box(-2, 2, 19, 1, 3, 21, M["red"])
    m.box(3, -2, 18, 4, -1, 22, M["paper"])
    return m


def signpost():
    m = Model(-10, -10, 10, 3, 30)
    m.box(0, -1, 0, 1, 0, 26, M["wood_dk"])
    m.box(0, -1, 26, 1, 0, 27, M["wood_lt"])
    m.box(-7, -1, 19, 8, 0, 23, M["wood_lt"])
    m.box(8, -1, 20, 9, 0, 22, M["wood_lt"])
    m.paint(band(m.Z, 21, 22) & band(m.X, -5, 6) & (np.floor(m.X) % 2 == 0), M["dark"])
    m.box(-1, -8, 13, 0, 2, 17, M["wood"])
    m.box(-1, -9, 14, 0, -8, 16, M["wood"])
    m.paint(band(m.Z, 15, 16) & band(m.Y, -6, 1) & (np.floor(m.Y) % 2 == 0), M["dark"])
    return m


def paper_flowers():
    r = rng(631)
    m = Model(-19, -9, 19, 9, 16)
    cols = ("pink", "yellow", "blue", "white", "pink")
    for i in range(26):
        x, y = r.uniform(-17, 17), r.uniform(-7.5, 7.5)
        if (x / 18) ** 2 + (y / 8.5) ** 2 > 1:
            continue
        h = int(r.randint(5, 12))
        m.segment((x, y, 0), (x + r.uniform(-0.8, 0.8), y, h), 0.45, M["grass"])
        c = M[cols[i % len(cols)]]
        fx, fy = math.floor(x), math.floor(y)
        m.box(fx - 1, fy, h, fx + 2, fy + 1, h + 1, c)
        m.box(fx, fy - 1, h, fx + 1, fy + 2, h + 1, c)
        m.box(fx, fy, h, fx + 1, fy + 1, h + 1, M["yellow"] if cols[i % len(cols)] != "yellow" else M["wood_lt"])
        if r.rand() < 0.5:
            m.ellipsoid(x + 1, y, h * 0.4, 1.2, 0.6, 0.6, M["leaf_b"])
    return m


def paper_reeds():
    r = rng(641)
    m = Model(-14, -6, 14, 6, 26)
    for i in range(16):
        x, y = r.uniform(-12, 12), r.uniform(-4, 4)
        h = r.uniform(13, 21)
        lx = r.uniform(-1.5, 1.5)
        m.segment((x, y, 0), (x + lx, y, h), 0.42, M["blade" if i % 2 else "grass"])
        if i % 3 == 0:
            m.ellipsoid(x + lx, y, h - 1.5, 0.9, 0.9, 2.4, M["bark"])
        if i % 2 == 0:
            t = r.uniform(0, math.tau)
            m.segment((x, y, 0), (x + 4 * math.cos(t), y + 2 * math.sin(t), h * 0.6), 0.4, M["blade_lt"])
    return m


def paper_mushroom():
    m = Model(-9, -5, 9, 5, 16)
    for (x, y, h, rr, col) in ((-3, -1, 9, 3.6, "red"), (3, 1, 6, 2.8, "cloth_red"), (6.5, -2, 4, 1.8, "red"), (-6.5, 2, 3, 1.5, "cloth_red")):
        m.cylinder(x, y, max(0.8, rr * 0.32), 0, h, M["paper"])
        m.ellipsoid(x, y, h, rr, rr, rr * 0.62, M[col])
        m.carve((m.Z < h - 0.3) & (((m.X - x) / rr) ** 2 + ((m.Y - y) / rr) ** 2 < 1) & (m.m == M[col]))
        spots = (vhash(np.floor(m.X), np.floor(m.Y), np.floor(m.Z), 71) < 0.22) & (m.m == M[col]) & (m.Z > h - 0.3)
        m.paint(spots, M["paper"])
    return m


def laundry_line():
    m = Model(-23, -3, 23, 3, 30)
    for px in (-22, 21):
        m.box(px, -1, 0, px + 1, 0, 26, M["wood_dk"])
        m.box(px, -2, 24, px + 1, 1, 25, M["wood"])
    xs = np.linspace(-21.5, 21.5, 40)
    for a, b in zip(xs[:-1], xs[1:]):
        za = 24 - 3 * (1 - (a / 21.5) ** 2)
        zb = 24 - 3 * (1 - (b / 21.5) ** 2)
        m.segment((a, -0.5, za), (b, -0.5, zb), 0.35, M["white"])
    for (x0, x1, h, col) in ((-17, -10, 9, "cloth_blue"), (-8, 1, 12, "paper"), (3, 8, 7, "cloth_red"), (10, 17, 10, "yellow")):
        top = 24 - 3 * (1 - (((x0 + x1) / 2) / 21.5) ** 2) - 0.5
        m.box(x0, -1, top - h, x1, 0, top, M[col])
        m.paint(band(m.X, x0, x1) & band(m.Z, top - h, top) & (np.floor(m.Z) % 3 == 0), M[col])
        for px in (x0, x1 - 1):
            m.box(px, -1, top, px + 1, 0, top + 1.5, M["wood_lt"])
    # Shirt sleeves.
    m.box(-18, -1, 17, -9, 0, 19, M["cloth_blue"])
    return m


def tombstone():
    m = Model(-7, -5, 7, 3, 20)
    m.box(-6, -3, 0, 6, 2, 2, M["stone_dk"])
    m.box(-4, -2, 2, 5, 1, 14, M["stone"])
    m.cylinder(-0.5, 14, 4.5, -4, 5, M["stone"], axis="x")
    m.carve(band(m.Z, 14, 30) & (((m.X - 0.5) ** 2) / 20 + 0 > 1))
    m.paint(band(m.Y, 0, 1) & band(m.X, 0, 1) & band(m.Z, 6, 14), M["stone_dk"])
    m.paint(band(m.Y, 0, 1) & band(m.X, -2, 3) & band(m.Z, 11, 12), M["stone_dk"])
    moss = (vhash(np.floor(m.X), np.floor(m.Y), np.floor(m.Z), 81) < 0.18) & (m.m == M["stone"]) & (m.Z < 7)
    m.paint(moss, M["moss"])
    return m


def dead_tree_prop(stage=0):
    r = rng(811)
    m = Model(-14, -10, 14, 6, 46)
    m.cone(0, -1, 3.4, 0, 5, M["bark"])
    if stage == 2:
        m.cylinder(0, -1, 2.4, 0, 4, M["bark"])
        m.paint(band(m.Z, 3, 4) & (m.X ** 2 + (m.Y + 1) ** 2 < 4), M["end_grain"])
        return m

    def grow(p, ang, tilt, length, rad, depth):
        q = (p[0] + length * math.cos(ang) * math.sin(tilt), p[1] + length * math.sin(ang) * math.sin(tilt) * 0.6, p[2] + length * math.cos(tilt))
        m.segment(p, q, rad, M["bark"])
        if depth == 0:
            return
        for k in range(2):
            grow(q, ang + (k - 0.5) * 2.4 + r.uniform(-0.4, 0.4), min(1.25, tilt + r.uniform(0.4, 0.75)), length * r.uniform(0.6, 0.75), max(0.5, rad * 0.62), depth - 1)

    grow((0, -1, 0), 0.6, 0.15, 18, 1.8, 3 if stage == 0 else 1)
    m.paint(vhash(np.floor(m.X), np.floor(m.Y), np.floor(m.Z), 83) < 0.25, M["bark_dk"])
    if stage == 1:
        lean(m, 0.12)
        m.carve(m.Z > 24)
    return m


def ink_vat():
    m = Model(-11, -12, 11, 3, 18)
    m.cylinder(0, -4.5, 7.2, 0, 10, M["wood"])
    m.paint((np.floor(np.arctan2(m.Y + 4.5, m.X) * 4) % 2 == 0), M["wood_dk"])
    m.paint(band(m.Z, 1, 2) | band(m.Z, 7, 8), M["iron"])
    m.carve(((m.X) ** 2 + (m.Y + 4.5) ** 2 < 36) & (m.Z >= 8))
    m.cylinder(0, -4.5, 6.1, 7, 8, M["ink_fill"])
    m.paint(band(m.Z, 7, 8) & ((m.X - 1.5) ** 2 + (m.Y + 6) ** 2 < 3), M["ink_sheen"])
    m.paint(band(m.Z, 9, 10), M["wood_lt"])
    # Drips down the lit side and a puddle at the foot.
    for (dx, h) in ((4, 4), (6, 6), (1, 3)):
        m.paint(band(m.Z, 10 - h, 10) & (np.abs(m.Y - (-4.5 + 6.5)) < 0.6) & (np.abs(m.X - dx + 3) < 0.5), M["ink_fill"])
    m.ellipsoid(5, 1, 0.2, 3.5, 1.8, 0.8, M["ink_fill"])
    m.segment((2, -5, 7), (-4, -7, 15), 0.45, M["wood_lt"])
    return m


def wax_candle():
    m = Model(-9, -9, 8, 3, 22)
    m.ellipsoid(-0.5, -2, 0.4, 6.5, 5, 0.9, M["iron_lt"])
    for (x, y, h, rr) in ((-2, -4, 15, 2.4), (2.5, -1.5, 10, 2.0), (-4, 0.5, 7, 1.7)):
        m.cylinder(x, y, rr, 0, h, M["wax_c"])
        m.paint(band(m.Z, h - 1, h), M["wax"])
        fx, fy = math.floor(x), math.floor(y)
        m.box(fx, fy, h, fx + 1, fy + 1, h + 1, M["dark"])
        m.box(fx, fy, h + 1, fx + 1, fy + 1, h + 3, M["candle_flame"])
        m.box(fx, fy, h + 3, fx + 1, fy + 1, h + 4, M["candle_core"])
        for k in range(3):
            a = k * 2.1 + x
            m.ellipsoid(x + rr * math.cos(a), y + rr * math.sin(a), h - 2 - k * 2, 0.6, 0.6, 1.8, M["wax_c"])
    return m


def water_bucket():
    m = Model(-8, -11, 8, 2, 18)
    m.cone(0, -4.5, 6.2, 0, 24, M["wood"])
    m.carve(m.Z >= 11)
    m.paint((np.floor(np.arctan2(m.Y + 4.5, m.X) * 5) % 2 == 0), M["wood_dk"])
    m.paint(band(m.Z, 2, 3) | band(m.Z, 8, 9), M["iron"])
    m.carve(((m.X) ** 2 + (m.Y + 4.5) ** 2 < 16) & (m.Z >= 9))
    m.cylinder(0, -4.5, 4.4, 8, 9, M["shallow_w"])
    m.paint(band(m.Z, 8, 9) & ((m.X - 1) ** 2 + (m.Y + 5.5) ** 2 < 1.5), M["glass_lt"])
    for a, b in ((-5.5, 0), (0, 5.5)):
        za = 11 + 5 * math.sin(math.pi * (a + 5.5) / 11)
        zb = 11 + 5 * math.sin(math.pi * (b + 5.5) / 11)
        m.segment((a, -4.5, za), (b, -4.5, zb), 0.45, M["iron"])
    return m


def prop_sprites():
    """(id, builder, ash?) for every prop phase."""
    P = {
        "paper-fence": (paper_fence, 0.06, "x"),
        "paper-bush": (paper_bush, 0.0, "x"),
        "paper-grass": (paper_grass, 0.1, "x"),
        "paper-lanterns": (paper_lanterns, 0.05, "x"),
        "scarecrow": (scarecrow, 0.12, "x"),
        "haybale": (haybale, 0.0, "x"),
        "paper-crate": (paper_crate, 0.05, "y"),
        "mailbox": (mailbox, 0.15, "x"),
        "signpost": (signpost, 0.15, "y"),
        "paper-flowers": (paper_flowers, 0.1, "x"),
        "paper-reeds": (paper_reeds, 0.12, "x"),
        "paper-mushroom": (paper_mushroom, 0.0, "x"),
        "laundry-line": (laundry_line, 0.0, "x"),
        "paper-tombstone": (tombstone, 0.08, "y"),
        "dead-tree": (lambda: dead_tree_prop(0), 0.0, "x"),
        "ink-vat": (ink_vat, 0.05, "x"),
        "wax-candle": (wax_candle, 0.06, "x"),
        "water-bucket": (water_bucket, 0.1, "y"),
    }
    out = []
    for i, (pid, (fn, k, axis)) in enumerate(P.items()):
        salt = 900 + i * 17
        out.append((f"prop-{pid}-intact", fn))
        if pid == "dead-tree":
            out.append((f"prop-{pid}-damaged", lambda: dead_tree_prop(1)))
            out.append((f"prop-{pid}-scraps", scraps(lambda: dead_tree_prop(2), salt, stub=4)))
            out.append((f"prop-{pid}-ash", scraps(lambda: dead_tree_prop(2), salt, stub=2, ash=True)))
            continue
        out.append((f"prop-{pid}-damaged", damaged(fn, salt, k, n=3 if pid in ("paper-grass", "paper-flowers") else 4, axis=axis)))
        out.append((f"prop-{pid}-scraps", scraps(fn, salt)))
        out.append((f"prop-{pid}-ash", scraps(fn, salt, ash=True)))
    return out


# ---------------------------------------------------------------- landmark pieces
def clock_tower():
    m = Model(-13, -14, 13, 6, 132)
    x0, x1, y0, y1 = -11, 11, -12, 4
    m.box(x0 - 1, y0 - 1, 0, x1 + 1, y1 + 1, 6, M["stone_dk"])
    m.box(x0, y0, 6, x1, y1, 92, M["stone"])
    m.paint((np.floor(m.Z) % 4 == 0) & (m.Z > 6), M["stone_dk"])
    m.paint(((np.floor(m.Z / 4) + np.floor(m.X / 3)) % 2 == 0) & (np.floor(m.Z) % 4 == 2) & band(m.Y, y1 - 1, y1), M["stone_dk"])
    for z in (30, 60):
        m.box(x0 - 1, y0 - 1, z, x1 + 1, y1 + 1, z + 2, M["stone_dk"])
    # Corner pilasters.
    for cx in (x0, x1 - 2):
        for cy in (y0, y1 - 2):
            m.box(cx - (1 if cx == x0 else 0), cy - (1 if cy == y0 else 0), 6, cx + 2 + (1 if cx != x0 else 0), cy + 2 + (1 if cy != y0 else 0), 92, M["stone_lt"] if "stone_lt" in M else M["stone"])
    door(m, "y", -3, 3, 6, 20, (y1 - 1, y1))
    m.paint(band(m.Y, y1 - 1, y1) & band(m.X, -4, 4) & band(m.Z, 20, 22), M["stone_dk"])
    window(m, "y", -2, 2, 38, 46, (y1 - 1, y1), frame="stone_dk")
    window(m, "x", -6, -2, 38, 46, (x1 - 1, x1), frame="stone_dk")
    # Clock faces on both visible sides.
    for face in ("y", "x"):
        if face == "y":
            u, v = m.X, m.Z - 74
            on = band(m.Y, y1 - 1, y1)
            c0 = (u / 8) ** 2 + (v / 8) ** 2
        else:
            u, v = m.Y + 4, m.Z - 74
            on = band(m.X, x1 - 1, x1)
            c0 = (u / 8) ** 2 + (v / 8) ** 2
        m.paint(on & (c0 < 1.25), M["iron"])
        m.paint(on & (c0 < 1.0), M["clock_face"])
        m.paint(on & (c0 < 1.0) & (np.abs(u) < 0.6) & band(v, 0, 6), M["iron"])
        m.paint(on & (c0 < 1.0) & (np.abs(v) < 0.6) & band(u, 0, 4.5), M["iron"])
        for k in range(12):
            a = k * math.pi / 6
            m.paint(on & (np.abs(u - 6.5 * math.cos(a)) < 0.6) & (np.abs(v - 6.5 * math.sin(a)) < 0.6), M["iron"])
    # Belfry with arched openings and a bell, then a slate spire.
    m.box(x0, y0, 92, x1, y1, 108, M["stone"])
    for (lo, hi) in ((-7, -2), (2, 7)):
        m.carve(band(m.X, lo, hi) & band(m.Z, 95, 105) & band(m.Y, y0 + 2, y1))
        m.carve(band(m.Y, lo - 4, hi - 4) & band(m.Z, 95, 105) & band(m.X, x0 + 2, x1))
    m.cylinder(0, -4, 6, 94, 95, M["stone_dk"])
    m.cone(0, -4, 3.5, 96, 104, M["brass"])
    m.box(x0 - 1, y0 - 1, 108, x1 + 1, y1 + 1, 110, M["stone_dk"])
    hip(m, x0 - 1, y0 - 1, x1 + 1, y1 + 1, 110, 18, M["slate"], thick=2)
    m.cone(0, -4, 4.5, 118, 128, M["slate_dk"])
    m.segment((0, -4, 126), (0, -4, 131), 0.5, M["brass"])
    m.box(-2, -4, 129, 2, -3, 130, M["brass"])
    return m


def chapel():
    m = Model(-36, -15, 36, 6, 96)
    x0, x1, y0, y1 = -34, 22, -12, 3
    wt = 26
    prof = gable(16)
    m.box(x0 - 1, y0 - 1, 0, x1 + 1, y1 + 1, 2, M["stone_dk"])
    m.box(x0, y0, 2, x1, y1, wt, M["stone"])
    m.fill(m.under_roof(x0, y0, x1, y1, wt, prof, "x", inset=1.5) & band(m.X, x0, x1), M["stone"])
    m.paint((np.floor(m.Z) % 3 == 0), M["stone_dk"])
    roof, top = m.roof(x0 - 1, y0 - 2, x1 + 1, y1 + 2, wt, prof, "x", M["slate"], thick=2)
    courses(m, roof, M["slate"], M["slate_dk"], 3)
    front = (y1 - 1, y1)
    for u in (-30, -22, -14, -6):
        window(m, "y", u, u + 3, 9, 21, front, frame="stone_dk")
        m.paint(band(m.Y, *front) & band(m.X, u, u + 3) & band(m.Z, 20, 22), M["stone_dk"])
    # Rose window on the lit +x gable end... the tower stands there, so on the west end skip.
    # Steeple tower at the east end, door at its foot.
    tx0, tx1, ty0, ty1 = 22, 34, -11, 2
    m.box(tx0, ty0, 0, tx1, ty1, 58, M["stone"])
    m.paint((np.floor(m.Z) % 3 == 0) & band(m.X, tx0, tx1), M["stone_dk"])
    door(m, "y", 25, 31, 2, 18, (ty1 - 1, ty1))
    m.paint(band(m.Y, ty1 - 1, ty1) & band(m.X, 24, 32) & band(m.Z, 18, 20), M["stone_dk"])
    window(m, "y", 26, 30, 28, 38, (ty1 - 1, ty1), frame="stone_dk")
    cyy = (ty0 + ty1) / 2
    m.paint(band(m.X, tx1 - 1, tx1) & (((m.Y - cyy) / 4) ** 2 + ((m.Z - 44) / 4) ** 2 < 1.4), M["stone_dk"])
    m.paint(band(m.X, tx1 - 1, tx1) & (((m.Y - cyy) / 4) ** 2 + ((m.Z - 44) / 4) ** 2 < 1.0), M["window"])
    m.paint(band(m.X, tx1 - 1, tx1) & (np.abs(m.Y - cyy) < 0.5) & band(m.Z, 40, 48), M["stone_dk"])
    m.paint(band(m.X, tx1 - 1, tx1) & (np.abs(m.Z - 44) < 0.5) & band(m.Y, cyy - 4, cyy + 4), M["stone_dk"])
    m.carve(band(m.X, 25, 31) & band(m.Z, 49, 56) & band(m.Y, ty0 + 2, ty1))
    m.carve(band(m.Y, ty0 + 3, ty1 - 3) & band(m.Z, 49, 56) & band(m.X, tx0 + 2, tx1))
    m.box(tx0 - 1, ty0 - 1, 58, tx1 + 1, ty1 + 1, 60, M["stone_dk"])
    hip(m, tx0 - 1, ty0 - 1, tx1 + 1, ty1 + 1, 60, 30, M["slate"], thick=2)
    m.segment((28, cyy, 86), (28, cyy, 94), 0.5, M["iron"])
    m.box(26, math.floor(cyy), 91, 31, math.floor(cyy) + 1, 92, M["iron"])
    return m


def tomb(v):
    m = Model(-7, -5, 7, 3, 24)
    m.box(-6, -4, 0, 6, 2, 2, M["stone_dk"])
    m.box(-5, -3, 2, 5, 1, 3, M["soil"])
    if v == 0:
        m.box(-1, -3, 2, 1, -1, 18, M["stone"])
        m.box(-4, -3, 12, 4, -1, 14, M["stone"])
    elif v == 1:
        m.box(-4, -3, 2, 4, -1, 12, M["stone"])
        m.cylinder(-2, 12, 4, -4, 4, M["stone"], axis="x")
        m.carve(band(m.Z, 12, 30) & (np.abs(m.X) > 4))
        m.paint(band(m.Y, -2, -1) & band(m.X, -1, 1) & band(m.Z, 5, 13), M["stone_dk"])
        m.paint(band(m.Y, -2, -1) & band(m.X, -3, 3) & band(m.Z, 10, 11), M["stone_dk"])
    else:
        m.box(-2, -3, 2, 2, 0, 16, M["stone"])
        m.cone(0, -1.5, 2.4, 16, 22, M["stone"])
        m.box(-3, -4, 2, 3, 1, 5, M["stone_dk"])
    moss = (vhash(np.floor(m.X), np.floor(m.Y), np.floor(m.Z), 91 + v) < 0.15) & (m.m == M["stone"])
    m.paint(moss, M["moss"])
    m.ellipsoid(4, 1, 2.5, 1.2, 1.2, 1.4, M["candle_flame"]) if v == 1 else None
    return m


def stall(v):
    stripe = ("cloth_red", "cloth_blue")[v % 2]
    m = Model(-26, -9, 26, 6, 40)
    x0, x1, y0, y1 = -24, 24, -7, 2
    m.box(x0, y0, 0, x1, y1, 10, M["wood"])
    m.paint(band(m.Y, y1 - 1, y1) & (np.floor(m.X) % 4 == 0), M["plank_seam"])
    m.box(x0 - 1, y0, 10, x1 + 1, y1 + 1, 11, M["wood_lt"])
    for px in (x0, x1 - 1):
        for py in (y0, y1 - 1):
            m.box(px, py, 10, px + 1, py + 1, 30 if py == y0 else 26, M["wood_dk"])
    # Sloped striped awning toward the front.
    X, Y, Z = m.X, m.Y, m.Z
    slope = 30 - (Y - y0) * 0.75
    aw = band(X, x0 - 2, x1 + 2) & band(Y, y0 - 1, y1 + 4) & (Z < slope + 1) & (Z >= slope - 0.5)
    m.fill(aw, M[stripe])
    m.paint(aw & (np.floor((X + 30) / 4) % 2 == 0), M["paper"])
    m.paint(aw & band(Y, y1 + 3, y1 + 4), M["paper_dk"])
    # Scalloped valance.
    val = band(X, x0 - 2, x1 + 2) & band(Y, y1 + 3, y1 + 4) & band(Z, slope - 3, slope) & ((np.floor(X) % 4) < 3)
    m.fill(val, M[stripe])
    # Goods on the counter.
    for i, gx in enumerate(range(x0 + 3, x1 - 3, 6)):
        kind = (i + v) % 3
        if kind == 0:
            m.ellipsoid(gx, -2.5, 13, 2.4, 2.4, 2.0, M["pumpkin"])
        elif kind == 1:
            m.box(gx - 2, -4, 11, gx + 2, 0, 15, M["card"])
            m.box(gx - 2, -4, 15, gx + 2, 0, 16, M["card_dk"])
        else:
            for k in range(3):
                m.cylinder(gx - 2 + k * 2, -2, 0.9, 11, 14 + k % 2, M["glass"])
    # Hanging lanterns under the awning front.
    for lx in (x0 + 6, 0, x1 - 6):
        m.segment((lx, y1 + 1.5, 24), (lx, y1 + 1.5, 21), 0.3, M["dark"])
        m.ellipsoid(lx, y1 + 1.5, 19, 1.6, 1.6, 2.2, M["lantern_red" if v % 2 == 0 else "lantern_gold"])
    return m


def string_lights():
    m = Model(-84, -3, 84, 3, 36)
    posts = (-82, 0, 81)
    for px in posts:
        m.box(px, -1, 0, px + 1, 0, 30, M["wood_dk"])
        m.box(px - 1, -2, 0, px + 2, 1, 2, M["stone_dk"])
    cols = ("lantern_red", "lantern_gold", "lantern_pink")
    k = 0
    for a, b in ((-81.5, 0.5), (0.5, 81.5)):
        xs = np.linspace(a, b, 60)
        half = (b - a) / 2
        mid = (a + b) / 2
        zf = lambda x: 28 - 6 * (1 - ((x - mid) / half) ** 2)
        for p, q in zip(xs[:-1], xs[1:]):
            m.segment((p, -0.5, zf(p)), (q, -0.5, zf(q)), 0.35, M["dark"])
        for x in np.linspace(a + 7, b - 7, 7):
            cz = zf(x) - 2.6
            m.ellipsoid(x, -0.5, cz, 1.4, 1.4, 1.9, M[cols[k % 3] + ("" if k % 4 == 1 else "_dim")])
            k += 1
    return m


def teahouse(v):
    m = Model(-44, -21, 52, 9, 74)
    hx0, hx1, hy0, hy1 = -36, 26, -10, 5
    m.box(hx0 - 3, hy0 - 2, 0, hx1 + 3, hy1 + 3, 3, M["stone"])
    m.paint((np.floor(m.X / 3) + np.floor(m.Y / 3)) % 2 == 0, M["stone_dk"])
    m.box(hx0, hy0, 3, hx1, hy1, 22, M["paper"])
    front, side = (hy1 - 1, hy1), (hx1 - 1, hx1)
    fl, sl = band(m.Y, *front), band(m.X, *side)
    # Wood frame and glowing paper screens.
    m.paint((fl | sl) & ((np.floor(m.X) % 6 == 0) | (np.floor(m.Z) % 7 == 3)) & (m.Z >= 3), M["beam"])
    m.paint(sl & (np.floor(m.Y) % 5 == 0), M["beam"])
    for u in range(hx0 + 2, hx1 - 3, 6):
        if abs(u + 3) < 4:
            continue
        m.paint(fl & band(m.X, u, u + 4) & band(m.Z, 7, 16), M["window_lo"])
        m.paint(fl & band(m.X, u, u + 4) & band(m.Z, 7, 16) & ((np.floor(m.X) - u) % 2 == 1) & (np.floor(m.Z) % 3 == 0), M["beam"])
    for u in range(hy0 + 2, hy1 - 3, 5):
        m.paint(sl & band(m.Y, u, u + 3) & band(m.Z, 7, 16), M["window_lo"])
    door(m, "y", -5, 1, 3, 17, front, wood="beam")
    m.paint(fl & band(m.X, -4, 0) & band(m.Z, 4, 15), M["window"])
    m.box(-7, hy1, 0, 3, hy1 + 3, 2, M["wood"])
    # Lower roof tier, overhanging, with upturned corners.
    hip(m, hx0 - 5, hy0 - 4, hx1 + 5, hy1 + 5, 22, 9, M["teal" if v == 0 else "tile"], thick=2)
    roofc = M["teal" if v == 0 else "tile"]
    roofd = M["teal_dk" if v == 0 else "tile_dk"]
    m.paint((m.m == roofc) & (np.floor(m.Z) % 3 == 0), roofd)
    for cx in (hx0 - 5, hx1 + 4):
        for cy in (hy0 - 4, hy1 + 4):
            m.box(cx, cy, 22, cx + 1, cy + 1, 25, roofc)
    # Upper storey and top roof.
    ux0, ux1, uy0, uy1 = -24, 14, -7, 2
    m.box(ux0, uy0, 26, ux1, uy1, 40, M["paper"])
    m.paint(band(m.Y, uy1 - 1, uy1) & (np.floor(m.X) % 5 == 0), M["beam"])
    m.paint(band(m.X, ux1 - 1, ux1) & (np.floor(m.Y) % 5 == 0), M["beam"])
    for u in range(ux0 + 2, ux1 - 3, 5):
        m.paint(band(m.Y, uy1 - 1, uy1) & band(m.X, u, u + 3) & band(m.Z, 29, 37), M["window"])
    m.paint(band(m.X, ux1 - 1, ux1) & band(m.Y, -5, 0) & band(m.Z, 29, 37), M["window"])
    hip(m, ux0 - 5, uy0 - 4, ux1 + 5, uy1 + 4, 40, 14, roofc, thick=2)
    m.paint((m.m == roofc) & (np.floor(m.Z) % 3 == 0) & (m.Z > 40), roofd)
    for cx in (ux0 - 5, ux1 + 4):
        for cy in (uy0 - 4, uy1 + 3):
            m.box(cx, cy, 40, cx + 1, cy + 1, 43, roofc)
    m.segment((-5, -2.5, 52), (-5, -2.5, 60), 0.6, M["brass"])
    m.ellipsoid(-5, -2.5, 61, 1.3, 1.3, 1.3, M["brass"])
    # Kitchen wing at the east.
    wx0, wx1, wy0, wy1 = 27, 49, -18, 0
    m.box(wx0, wy0, 0, wx1, wy1, 16, M["wood"])
    m.paint(band(m.X, wx0, wx1) & (np.floor(m.Z) % 3 == 1) & (m.Z < 16), M["wood_dk"])
    window(m, "x", -14, -9, 6, 12, (wx1 - 1, wx1), frame="beam")
    window(m, "y", 33, 38, 6, 12, (wy1 - 1, wy1), frame="beam")
    hip(m, wx0 - 2, wy0 - 2, wx1 + 2, wy1 + 2, 16, 9, M["tile_dk"], thick=2)
    m.box(42, -14, 16, 45, -11, 30, M["stone"])
    # Red lanterns under the lower eaves.
    for lx in (hx0 + 2, -14, 8, hx1 - 2):
        m.segment((lx, hy1 + 3.5, 21), (lx, hy1 + 3.5, 18), 0.3, M["dark"])
        m.ellipsoid(lx, hy1 + 3.5, 16, 1.8, 1.8, 2.4, M["lantern_red"])
    return m


def tea_table(v):
    m = Model(-14, -6, 14, 6, 14)
    m.box(-9, -4, 4, 9, 3, 5, M["wood"])
    m.box(-10, -5, 5, 10, 4, 6, M["wood_dk"])
    for px in (-9, 8):
        for py in (-4, 2):
            m.box(px, py, 0, px + 1, py + 1, 4, M["wood_dk"])
    m.ellipsoid(-2, -1, 8, 2.2, 2.2, 1.8, M["teal"])
    m.segment((0, -1, 8.5), (2.5, -1, 10), 0.4, M["teal"])
    m.box(-3, -2, 10, -1, 0, 11, M["teal_dk"])
    for (cx, cy) in ((4, -2), (5, 1), (-6, 1)):
        m.cylinder(cx, cy, 0.9, 6, 7.5, M["paper"])
    for (cx, cy, col) in ((-12.5, 0, "cloth_red"), (12.5, -1, "plum")):
        m.ellipsoid(cx, cy, 1.2, 2.4, 3.0, 1.2, M[col])
    return m


def tea_planter(v):
    m = Model(-12, -7, 12, 6, 44)
    m.box(-9, -5, 0, 9, 3, 6, M["wood"])
    m.paint(band(m.Z, 5, 6), M["wood_lt"])
    m.box(-8, -4, 5, 8, 2, 6, M["soil"])
    r = rng(700 + v)
    if v == 0:
        for i in range(7):
            x = -7 + i * 2.3 + r.uniform(-0.4, 0.4)
            y = r.uniform(-3, 1)
            h = r.uniform(26, 38)
            m.segment((x, y, 5), (x + r.uniform(-1, 1), y, h), 0.5, M["cabbage"])
            m.paint((m.m == M["cabbage"]) & (np.floor(m.Z) % 6 == 0), M["stem"])
            for k in range(3):
                z = h - k * 6
                t = r.uniform(0, math.tau)
                m.segment((x, y, z), (x + 4 * math.cos(t), y + 2 * math.sin(t), z - 2), 0.45, M["leaf"])
    else:
        mats = ("pine", "pine_b") if v == 1 else ("maple", "maple_b")
        m.segment((0, -1, 5), (-2, -1, 14), 1.0, M["bark"])
        m.segment((-2, -1, 14), (2, -1, 20), 0.8, M["bark"])
        for i, (cx, cy, cz, rr) in enumerate(((-4, -1, 16, 4.4), (3, -1, 21, 4.6), (-1, -1, 25, 3.8))):
            m.ellipsoid(cx, cy, cz, rr, rr * 0.8, rr * 0.55, M[mats[i % 2]], lumpy=0.3, salt=i + v * 5)
    return m


def windmill_tower():
    m = Model(-16, -14, 16, 14, 92)
    cy = -2
    R0, R1, H = 13.0, 8.5, 66
    rad = R0 + (R1 - R0) * np.clip(m.Z / H, 0, 1)
    d = np.sqrt(m.X ** 2 + (m.Y - cy) ** 2)
    body = (d < rad) & (m.Z < H)
    m.fill(body, M["plaster"], (m.X, m.Y - cy, (R0 - R1) / H * d))
    m.paint((np.floor(m.Z) % 9 == 0), M["trim_dk"])
    m.fill((d < R0 + 1.2) & (m.Z < 5), M["stone"], (m.X, m.Y - cy, np.zeros_like(d)))
    # Door and windows on the front (+y) and a window on the lit side.
    ang = np.arctan2(m.Y - cy, m.X)
    front = (np.abs(ang - math.pi / 2) < 0.28) & (d > rad - 1.5) & body
    m.paint(front & band(m.Z, 5, 19), M["wood_dk"])
    m.paint(front & band(m.Z, 5, 19) & (np.floor(m.X) % 2 == 0), M["plank_seam"])
    m.paint((np.abs(ang - math.pi / 2) < 0.16) & (d > rad - 1.5) & body & band(m.Z, 30, 37), M["window"])
    m.paint((np.abs(ang - math.pi / 4) < 0.16) & (d > rad - 1.5) & body & band(m.Z, 46, 52), M["window"])
    m.paint((np.abs(ang) < 0.16) & (d > rad - 1.5) & body & band(m.Z, 24, 30), M["window"])
    # Balcony ring and the cap.
    m.fill((d < R1 + 3) & (d >= R1 - 0.5) & band(m.Z, 62, 64), M["wood"], (m.X, m.Y - cy, np.zeros_like(d)))
    m.cone(0, cy, R1 + 2, 64, 84, M["slate"])
    m.paint((m.m == M["slate"]) & (np.floor(m.Z) % 3 == 0), M["slate_dk"])
    m.segment((0, cy, 83), (0, cy, 88), 0.5, M["iron"])
    # Hub on the front.
    m.cylinder(0, 66, 1.8, cy + 7, cy + 13, M["wood_dk"], axis="y")
    return m


SAIL_HUB = (0.0, 11.5, 66.0)


def windmill_rotor(angle: float):
    """Four lattice sails in the x-z plane in front of the tower, turned by `angle` (radians)."""
    hx, hy, hz = SAIL_HUB
    m = Model(-40, 8, 40, 16, 108)
    m.cylinder(0, hz, 2.4, hy - 1, hy + 1.5, M["wood_dk"], axis="y")
    for k in range(4):
        a = angle + k * math.pi / 2
        ux, uz = math.cos(a), math.sin(a)
        vx, vz = -uz, ux
        L = 36
        m.segment((hx + ux * 2, hy + 0.5, hz + uz * 2), (hx + ux * L, hy + 0.5, hz + uz * L), 0.7, M["wood_dk"])
        # Lattice sail on one side of the stock.
        s = (m.X - hx) * ux + (m.Z - hz) * uz
        t = (m.X - hx) * vx + (m.Z - hz) * vz
        inside = band(m.Y, hy, hy + 1) & (s > 8) & (s < L - 1) & (t > 0.6) & (t < 7.5)
        frame = inside & ((np.abs(t - 7) < 0.7) | (np.abs(((s - 8) % 5.5) - 0) < 0.6))
        m.fill(inside, M["paper"])
        m.paint(inside & (np.floor(s / 5.5 + 0.5) % 2 == 1), M["paper_dk"])
        m.paint(frame, M["wood"])
    return m


ROTOR_FRAMES = 8


def theatre():
    m = Model(-42, -13, 42, 6, 84)
    x0, x1, y0, y1 = -38, 38, -12, 2
    m.box(x0, y0, 0, x1, y1, 10, M["wood"])
    m.paint(band(m.Y, y1 - 1, y1) & (np.floor(m.X) % 4 == 0) & (m.Z < 10), M["plank_seam"])
    m.box(x0 - 1, y0, 10, x1 + 1, y1 + 2, 11, M["wood_lt"])
    # Proscenium walls.
    m.box(x0, y0, 11, x1, y0 + 3, 48, M["plum_dk"])
    for px in (x0, x1 - 6):
        m.box(px, y0, 11, px + 6, y1, 48, M["red"])
        m.paint(band(m.X, px, px + 6) & (np.floor(m.Z) % 4 == 0), M["red_seam"])
    m.box(x0, y0, 40, x1, y1, 48, M["red"])
    m.paint(band(m.Y, y1 - 1, y1) & band(m.Z, 40, 48) & (np.floor(m.Z) % 4 == 0), M["red_seam"])
    # Gold trim and marquee bulbs.
    m.paint(band(m.Y, y1 - 1, y1) & (band(m.Z, 40, 41) | band(m.Z, 47, 48)), M["brass"])
    m.paint(band(m.Y, y1 - 1, y1) & band(m.Z, 43, 45) & band(m.X, -22, 22), M["paper"])
    m.paint(band(m.Y, y1 - 1, y1) & band(m.Z, 43, 45) & band(m.X, -20, 20) & (np.floor(m.X) % 3 == 0), M["dark"])
    for bx in range(x0 + 2, x1 - 1, 5):
        m.box(bx, y1, 41.5, bx + 1, y1 + 1, 42.5, M["bulb"])
    # Curtains, drawn open, and the dark stage with two puppets.
    stage = band(m.X, x0 + 6, x1 - 6) & band(m.Z, 11, 40)
    m.paint(stage & band(m.Y, y0, y0 + 3), M["hole"])
    for (c0, c1) in ((x0 + 6, x0 + 16), (x1 - 16, x1 - 6)):
        m.box(c0, y1 - 3, 11, c1, y1 - 1, 40, M["plum"])
        m.paint(band(m.X, c0, c1) & band(m.Y, y1 - 3, y1 - 1) & (np.floor(m.X) % 2 == 0), M["plum_dk"])
    m.box(x0 + 6, y1 - 3, 36, x1 - 6, y1 - 1, 40, M["plum"])
    m.paint(band(m.Z, 36, 37) & band(m.Y, y1 - 3, y1 - 1), M["brass"])
    for (px, col) in ((-8, "pumpkin"), (8, "white")):
        m.box(px - 1, y0 + 3, 11, px + 2, y0 + 5, 20, M[col])
        m.ellipsoid(px + 0.5, y0 + 4, 22, 2.2, 1.4, 2.2, M[col])
        m.segment((px + 0.5, y0 + 4, 24), (px + 0.5, y0 + 4, 36), 0.25, M["white"])
    # Gable roof with pennants.
    roof, top = m.roof(x0 - 2, y0 - 1, x1 + 2, y1 + 1, 48, gable(14), "x", M["slate"], thick=2)
    courses(m, roof, M["slate"], M["slate_dk"], 3)
    m.fill(m.under_roof(x0, y0, x1, y1, 48, gable(14), "x", inset=1.5) & band(m.X, x0, x1), M["red"])
    for (px, col) in ((x0 + 2, "cloth_red"), (0, "yellow"), (x1 - 3, "cloth_blue")):
        m.segment((px, -5, 60 if px == 0 else 52), (px, -5, 72 if px == 0 else 62), 0.4, M["iron"])
        tz = 72 if px == 0 else 62
        for k in range(4):
            m.box(px + 1, -5, tz - 1 - k, px + 1 + (4 - k), -4, tz - k, M[col])
    # Steps to the stage.
    m.box(-6, y1, 0, 6, y1 + 3, 5, M["wood_dk"])
    m.box(-6, y1 + 2, 0, 6, y1 + 4, 3, M["wood_dk"])
    return m


def bench(v):
    m = Model(-14, -4, 14, 2, 12)
    m.box(-12, -2, 4, 12, 1, 5, M["wood" if v % 2 == 0 else "cloth_red"])
    m.box(-12, -3, 5, 12, -2, 9, M["wood_dk"])
    for px in (-11, 10):
        m.box(px, -3, 0, px + 1, 1, 4, M["wood_dk"])
    m.paint(band(m.Z, 4, 5) & (np.floor(m.X) % 4 == 0), M["plank_seam"])
    return m


def observatory():
    m = Model(-32, -12, 38, 13, 92)
    cx, cy, R = 12.0, 1.0, 12.5
    d = np.sqrt((m.X - cx) ** 2 + (m.Y - cy) ** 2)
    m.fill((d < R + 1.5) & (m.Z < 4), M["stone_dk"], (m.X - cx, m.Y - cy, np.zeros_like(d)))
    m.fill((d < R) & (m.Z < 40), M["stone"], (m.X - cx, m.Y - cy, np.zeros_like(d)))
    m.paint((np.floor(m.Z) % 4 == 0) & (d < R), M["stone_dk"])
    m.fill((d < R + 1) & band(m.Z, 38, 41), M["stone_dk"], (m.X - cx, m.Y - cy, np.zeros_like(d)))
    ang = np.arctan2(m.Y - cy, m.X - cx)
    for a, z0 in ((math.pi / 2, 18), (0.6, 26), (0.0, 12)):
        m.paint((np.abs(ang - a) < 0.13) & (d > R - 1.5) & band(m.Z, z0, z0 + 7), M["window"])
    door_a = (np.abs(ang - 1.1) < 0.2) & (d > R - 1.5) & band(m.Z, 4, 17)
    m.paint(door_a, M["wood_dk"])
    # Copper dome with an open slit and the telescope.
    dz = 40
    q = ((m.X - cx) / R) ** 2 + ((m.Y - cy) / R) ** 2 + ((m.Z - dz) / (R * 0.95)) ** 2
    m.fill((q < 1) & (m.Z >= dz), M["teal"], (m.X - cx, m.Y - cy, m.Z - dz))
    m.paint((m.m == M["teal"]) & (np.abs(np.sin(ang * 6)) < 0.12), M["teal_dk"])
    slit = (np.abs((m.X - cx) - (m.Y - cy)) < 2.2) & ((m.X - cx) + (m.Y - cy) > -2) & (m.Z > dz + 2) & (m.m == M["teal"])
    m.carve(slit)
    m.segment((cx, cy, dz + 3), (cx + 13, cy + 3, dz + 16), 2.0, M["brass"])
    m.segment((cx + 13, cy + 3, dz + 16), (cx + 15, cy + 3.5, dz + 18), 2.4, M["brass_dk"])
    m.segment((cx, cy, dz + 3), (cx + 9, cy + 2, dz + 12), 2.3, M["iron"])
    m.cone(cx, cy, 1.2, dz + 11, dz + 15, M["brass"])
    # Annex with a hip roof, star windows.
    ax0, ax1, ay0, ay1 = -30, -2, -8, 10
    m.box(ax0, ay0, 0, ax1, ay1, 24, M["plaster"])
    m.paint(band(m.Y, ay1 - 1, ay1) & (np.floor(m.X) % 7 == 0), M["beam"])
    m.paint(band(m.X, ax1 - 1, ax1) & (np.floor(m.Y) % 6 == 0), M["beam"])
    for u in (-26, -19, -12):
        window(m, "y", u, u + 4, 8, 16, (ay1 - 1, ay1), frame="beam")
    hip(m, ax0 - 2, ay0 - 2, ax1 + 2, ay1 + 2, 24, 12, M["slate"], thick=2)
    m.paint((m.m == M["slate"]) & (np.floor(m.Z) % 3 == 0), M["slate_dk"])
    m.box(-25, -4, 24, -22, -1, 38, M["stone"])
    # Star weather vane.
    m.segment((-16, 1, 36), (-16, 1, 42), 0.4, M["iron"])
    m.box(-18, 1, 42, -13, 2, 43, M["star_dot"])
    m.box(-16, 1, 40, -15, 2, 45, M["star_dot"])
    return m


def armillary(v):
    m = Model(-12, -12, 12, 12, 48)
    m.box(-4, -4, 0, 4, 4, 3, M["stone_dk"])
    m.box(-2, -2, 3, 2, 2, 14, M["stone"])
    m.box(-3, -3, 14, 3, 3, 16, M["stone_dk"])
    c = np.array([0.0, 0.0, 28.0])
    R = 10.0
    P = np.stack([m.X - c[0], m.Y - c[1], m.Z - c[2]], -1)
    for k, nrm in enumerate(((0, 0, 1), (1, 0, 0.35), (0.3, 1, 0.2))):
        n = np.array(nrm, float)
        n /= np.linalg.norm(n)
        dist = P @ n
        rr = np.sqrt(np.maximum(0, (P ** 2).sum(-1) - dist ** 2))
        ring = (np.abs(dist) < 0.7) & (np.abs(rr - R + k * 1.2) < 0.75)
        m.fill(ring, M["brass" if k != 1 else "brass_dk"], (P[..., 0], P[..., 1], P[..., 2]))
    m.segment((-6, -6, 21), (6, 6, 35), 0.45, M["iron"])
    m.ellipsoid(0, 0, 28, 2.4, 2.4, 2.4, M["star_dot" if v == 0 else "clock_face"])
    m.segment((0, 0, 16), (0, 0, 18), 0.8, M["brass"])
    return m


def star_chart(v):
    m = Model(-13, -7, 13, 5, 28)
    for px in (-10, 9):
        m.segment((px, -4, 0), (px, -1, 20), 0.6, M["wood_dk"])
        m.segment((px, 3, 0), (px, -1, 20), 0.5, M["wood_dk"])
    # Slanted board facing +y.
    sl = band(m.X, -11, 11) & (np.abs((m.Y + 1) - (m.Z - 6) * 0.25 + 1.0) < 0.75) & band(m.Z, 6, 22)
    m.fill(sl, M["deep"] if "deep" in M else M["water"])
    m.paint(sl & (band(m.X, -11, -10) | band(m.X, 10, 11) | band(m.Z, 6, 7) | band(m.Z, 21, 22)), M["wood"])
    r = rng(720 + v)
    for _ in range(14):
        x, z = r.randint(-9, 9), r.randint(8, 20)
        m.paint(sl & band(m.X, x, x + 1) & band(m.Z, z, z + 1), M["star_dot"] if r.rand() < 0.4 else M["paper"])
    m.paint(sl & (np.abs(np.sqrt((m.X - 2) ** 2 + (m.Z - 14) ** 2) - 5) < 0.4), M["brass_dk"])
    m.box(-12, -6, 0, -8, -3, 3, M["card"])
    return m


def wishing_well():
    m = Model(-20, -11, 20, 7, 64)
    cy = -2
    d = np.sqrt(m.X ** 2 + (m.Y - cy) ** 2)
    m.fill((d < 10) & (m.Z < 10), M["cobble"], (m.X, m.Y - cy, np.zeros_like(d)))
    m.carve((d < 7.5) & (m.Z >= 6))
    m.paint((d < 10) & band(m.Z, 9, 10), M["stone_dk"])
    m.cylinder(0, cy, 7.5, 5, 6, M["shallow_w"])
    for (x, y) in ((-2, cy - 1), (2, cy + 2), (3, cy - 3), (-4, cy + 2)):
        m.box(x, y, 5, x + 1, y + 1, 6, M["coin"])
    for px in (-9, 8):
        m.box(px, cy, 10, px + 1, cy + 1, 36, M["wood_dk"])
    m.segment((-9, cy + 0.5, 30), (9, cy + 0.5, 30), 0.8, M["wood"])
    m.segment((0, cy + 0.5, 30), (0, cy + 0.5, 18), 0.25, M["hay_dk"])
    m.cone(0, cy, 2.2, 14, 19, M["wood"])
    m.carve(band(m.Z, 18.2, 19) & ((m.X) ** 2 + (m.Y - cy) ** 2 < 2))
    m.paint(band(m.Z, 15, 16), M["iron"])
    m.segment((8, cy + 0.5, 28), (11, cy + 0.5, 25), 0.5, M["wood"])
    roof, _ = m.roof(-13, cy - 7, 13, cy + 8, 34, gable(10), "x", M["tile"], thick=1.8)
    courses(m, roof, M["tile"], M["tile_dk"], 2)
    m.fill(m.under_roof(-10, cy - 7, 10, cy + 8, 34, gable(10), "x", inset=1.0) & (band(m.X, -10, -9) | band(m.X, 9, 10)), M["wood"])
    for (x, y, c) in ((-10, 4, "pink"), (-7, 5, "yellow"), (9, 4, "blue"), (6, 5, "white")):
        m.ellipsoid(x, y, 1.5, 1.6, 1.2, 1.6, M["leaf_b"])
        m.box(x, y, 3, x + 1, y + 1, 4, M[c])
    return m


def greenhouse(v):
    m = Model(-48, -19, 52, 10, 64)
    gx0, gx1, gy0, gy1 = -44, 22, -11, 7
    wt = 22
    prof = gable(14)
    m.box(gx0, gy0, 0, gx1, gy1, 4, M["brick"])
    m.paint(band(m.Z, 3, 4), M["stone_dk"])
    m.box(gx0, gy0, 4, gx1, gy1, wt, M["glass"])
    m.fill(m.under_roof(gx0, gy0, gx1, gy1, wt, prof, "x", inset=0.5) & band(m.X, gx0, gx1), M["glass"])
    roof, top = m.roof(gx0 - 1, gy0 - 1, gx1 + 1, gy1 + 1, wt, prof, "x", M["glass_lt"], thick=1.5)
    glass = (m.m == M["glass"]) | (m.m == M["glass_lt"])
    # Plants pressing against the panes, warm work light inside.
    leaves = glass & (vhash(np.floor(m.X / 2), np.floor(m.Y / 2), np.floor(m.Z / 2), 133) < 0.3) & (m.Z < wt - 2)
    m.paint(leaves, M["leaf_b"])
    m.paint(glass & band(m.X, -20, -12) & band(m.Z, 8, 16) & band(m.Y, gy1 - 1, gy1), M["window_lo"])
    m.paint(glass & band(m.Y, -6, 0) & band(m.Z, 8, 16) & band(m.X, gx1 - 1, gx1), M["window_lo"])
    frame = glass & ((np.floor(m.X) % 6 == 0) | (np.floor(m.Y) % 6 == 0) | (np.floor(m.Z) % 6 == 4))
    m.paint(frame, M["teal"])
    m.paint(roof & (m.Z >= top.max() - 1.5), M["teal_dk"])
    door(m, "y", -3, 3, 4, 18, (gy1 - 1, gy1), wood="teal_dk")
    # Potting shed at the east.
    sx0, sx1, sy0, sy1 = 24, 50, -17, 0
    m.box(sx0, sy0, 0, sx1, sy1, 16, M["wood"])
    m.paint(band(m.X, sx0, sx1) & (np.floor(m.X) % 3 == 0) & (m.Z < 16), M["plank_seam"])
    window(m, "y", 30, 35, 6, 12, (sy1 - 1, sy1), frame="beam")
    window(m, "x", -13, -8, 6, 12, (sx1 - 1, sx1), frame="beam")
    hip(m, sx0 - 2, sy0 - 2, sx1 + 2, sy1 + 2, 16, 10, M["tile" if v == 0 else "slate"], thick=2)
    m.box(43, sy1, 0, 49, sy1 + 2, 3, M["terracotta"])
    m.ellipsoid(46, sy1 + 1, 4.5, 2.4, 1.4, 2.0, M["leaf"])
    return m


def trellis(v):
    m = Model(-14, -4, 14, 4, 52)
    for px in (-11, 10):
        m.box(px, -1, 0, px + 1, 1, 34, M["wood"])
    X, Z = m.X, m.Z
    arch = band(m.Y, -1, 1) & (np.abs(np.sqrt(X ** 2 + ((Z - 32) * 1.3) ** 2) - 11) < 0.9) & (Z >= 32)
    m.fill(arch, M["wood"])
    lat = band(m.Y, -1, 0) & band(X, -11, 11) & band(Z, 2, 34) & ((np.abs(((X + Z) % 6)) < 0.7) | (np.abs(((X - Z) % 6)) < 0.7)) & ((np.abs(X) > 9))
    m.fill(lat, M["wood_lt"])
    r = rng(740 + v)
    for i in range(16):
        side = -10.5 if i % 2 else 10.5
        z = r.uniform(4, 40)
        x = side if z < 32 else 11 * math.cos(r.uniform(0.2, math.pi - 0.2))
        m.ellipsoid(x, r.uniform(-1, 1), z, 2.4, 2.0, 2.2, M["leaf" if i % 3 else "leaf_b"], lumpy=0.4, salt=i)
        if r.rand() < 0.5:
            m.box(math.floor(x) + 1, 1, math.floor(z), math.floor(x) + 2, 2, math.floor(z) + 1, M[("pink", "white", "yellow")[v % 3]])
    return m


def workbench(v):
    m = Model(-15, -7, 15, 6, 30)
    m.box(-13, -5, 9, 13, 4, 11, M["wood"])
    for px in (-12, 11):
        for py in (-5, 3):
            m.box(px, py, 0, px + 1, py + 1, 9, M["wood_dk"])
    m.box(-12, -5, 3, 12, 4, 4, M["wood_dk"])
    for (x, h, plant) in ((-8, 4, "leaf"), (-2, 5, "leaf_b"), (5, 3, "cabbage"), (9, 4, "maple")):
        m.cone(x, -0.5, 2.0, 11, 11 + h + 2, M["terracotta"])
        m.carve(m.Z >= 11 + h)
        m.ellipsoid(x, -0.5, 11 + h + 1.5, 2.2, 2.0, 2.0, M[plant], lumpy=0.3, salt=x + 50)
    m.box(-13, -6, 11, 13, -5, 22, M["wood_dk"])
    for (x, h) in ((-9, 20), (-4, 18), (2, 21)):
        m.segment((x, -5.5, 12), (x, -5.5, h), 0.4, M["wood_lt"])
    m.box(-10, -6, 18, -7, -5, 20, M["iron_lt"])
    m.box(6, -6, 14, 10, -5, 18, M["card"])
    return m


def pots(v):
    m = Model(-14, -8, 14, 8, 26)
    r = rng(760 + v)
    for i, (x, y, rr, h) in enumerate(((-7, -2, 3.6, 7), (2, -4, 2.8, 6), (7, 2, 3.2, 5), (-2, 4, 2.4, 4), (-10, 4, 2.0, 4))):
        m.cone(x, y, rr, 0, h * 2, M["terracotta"])
        m.carve((m.Z >= h) & (((m.X - x) ** 2 + (m.Y - y) ** 2) < (rr * 1.2) ** 2) & (m.m == M["terracotta"]))
        m.paint(band(m.Z, h - 1, h) & (m.m == M["terracotta"]), M["red"])
        kind = (i + v) % 3
        if kind == 0:
            for k in range(4):
                t = k * 1.6 + r.rand()
                m.segment((x, y, h), (x + 3 * math.cos(t), y + 2 * math.sin(t), h + 6 + k), 0.45, M["leaf_b"])
        elif kind == 1:
            m.ellipsoid(x, y, h + 2.5, rr, rr, 2.6, M["leaf"], lumpy=0.4, salt=i)
            m.box(math.floor(x), math.floor(y) + 1, h + 4, math.floor(x) + 1, math.floor(y) + 2, h + 5, M["pink"])
        else:
            m.cylinder(x, y, 1.0, h, h + 7, M["cabbage"])
            m.ellipsoid(x + 1, y, h + 5, 0.8, 0.6, 1.4, M["cabbage"])
    return m


def piece_sprites():
    """(id, builder) of every landmark decor piece and its variants, plus the rotor frames."""
    out = [
        ("piece-clock-tower-0", clock_tower),
        ("piece-chapel-0", chapel),
    ]
    out += [(f"piece-tomb-{v}", (lambda v=v: tomb(v))) for v in range(3)]
    out += [(f"piece-stall-{v}", (lambda v=v: stall(v))) for v in range(2)]
    out.append(("piece-lights-0", string_lights))
    out += [(f"piece-paper-teahouse-building-{v}", (lambda v=v: teahouse(v))) for v in range(2)]
    out += [(f"piece-paper-teahouse-table-{v}", (lambda v=v: tea_table(v))) for v in range(1)]
    out += [(f"piece-paper-teahouse-planter-{v}", (lambda v=v: tea_planter(v))) for v in range(3)]
    out.append(("piece-windmill-0", windmill_tower))
    out += [(f"rotor-windmill-{f}", (lambda f=f: windmill_rotor(f * (math.pi / 2) / ROTOR_FRAMES))) for f in range(ROTOR_FRAMES)]
    out.append(("piece-theatre-0", theatre))
    out += [(f"piece-bench-{v}", (lambda v=v: bench(v))) for v in range(2)]
    out.append(("piece-star-observatory-building-0", observatory))
    out += [(f"piece-star-observatory-armillary-{v}", (lambda v=v: armillary(v))) for v in range(2)]
    out += [(f"piece-star-observatory-chart-{v}", (lambda v=v: star_chart(v))) for v in range(1)]
    out.append(("piece-well-0", wishing_well))
    out += [(f"piece-fold-greenhouse-building-{v}", (lambda v=v: greenhouse(v))) for v in range(2)]
    out += [(f"piece-fold-greenhouse-trellis-{v}", (lambda v=v: trellis(v))) for v in range(3)]
    out += [(f"piece-fold-greenhouse-workbench-{v}", (lambda v=v: workbench(v))) for v in range(1)]
    out += [(f"piece-fold-greenhouse-pots-{v}", (lambda v=v: pots(v))) for v in range(2)]
    return out


# ---------------------------------------------------------------- landmark ground bases and extras
def ring_mask(m, rx, ry, lump=0.25, salt=0):
    q = (m.X / rx) ** 2 + (m.Y / ry) ** 2
    q = q + lump * (vhash(np.floor(m.X / 3), np.floor(m.Y / 3), 0, salt) - 0.5)
    return q < 1


def base_cobble(rx, ry, salt, ring=None):
    def f():
        m = Model(-rx - 2, -ry - 2, rx + 2, ry + 2, 2)
        area = ring_mask(m, rx, ry, salt=salt) & (m.Z < 1)
        m.fill(area, M["cobble"])
        stones = (np.floor(m.X / 2) + np.floor(m.Y / 2) * 3) % 4 == 0
        m.paint(area & stones, M["stone_dk"])
        grout = (np.floor(m.X) % 3 == 0) & (np.floor(m.Y) % 3 == 0)
        m.paint(area & grout, M["stone_dk"])
        if ring:
            q = np.sqrt((m.X / rx) ** 2 + (m.Y / ry) ** 2)
            m.paint(area & (np.abs(q - ring) < 0.05), M["stone"])
        return m
    return f


def base_boards(rx, ry, salt):
    def f():
        m = Model(-rx - 1, -ry - 1, rx + 1, ry + 1, 2)
        area = band(m.X, -rx, rx) & band(m.Y, -ry, ry) & (m.Z < 1)
        m.fill(area, M["wood"])
        m.paint(area & (np.floor(m.Y) % 3 == 0), M["plank_seam"])
        m.paint(area & ((np.floor(m.X) + np.floor(m.Y / 3) * 7) % 13 == 0), M["plank_seam"])
        return m
    return f


def base_tiles(rx, ry, salt, inlay=None):
    def f():
        m = Model(-rx - 1, -ry - 1, rx + 1, ry + 1, 2)
        area = band(m.X, -rx, rx) & band(m.Y, -ry, ry) & (m.Z < 1)
        m.fill(area, M["stone_dk"])
        m.paint(area & ((np.floor(m.X) % 4 == 0) | (np.floor(m.Y) % 4 == 0)), M["slate_dk"])
        m.paint(area & (vhash(np.floor(m.X / 4), np.floor(m.Y / 4), 0, salt) < 0.18) & ~((np.floor(m.X) % 4 == 0) | (np.floor(m.Y) % 4 == 0)), M["moss"])
        edge = area & ~(band(m.X, -rx + 1, rx - 1) & band(m.Y, -ry + 1, ry - 1))
        m.paint(edge, M["stone_dk"])
        if inlay == "star":
            ang = np.arctan2(m.Y, m.X)
            rr = np.sqrt(m.X ** 2 + m.Y ** 2)
            star = rr < (6 + 5 * np.abs(np.cos(ang * 4)) ** 6)
            m.paint(area & star, M["brass"])
            m.paint(area & (np.abs(rr - 13) < 0.6), M["brass_dk"])
        if inlay == "stepping":
            for k in range(5):
                cx, cy = -rx + 4 + k * 5, ry - 4 - k * 2
                m.paint(area & (((m.X - cx) / 2.2) ** 2 + ((m.Y - cy) / 1.6) ** 2 < 1), M["stone_lt"] if "stone_lt" in M else M["stone"])
        return m
    return f


def base_soil_rows(rx, ry, salt):
    def f():
        m = Model(-rx - 2, -ry - 2, rx + 2, ry + 2, 4)
        area = ring_mask(m, rx, ry, 0.3, salt)
        rows = np.floor(m.Y) % 6
        m.fill(area & (m.Z < 1), M["soil"])
        m.fill(area & (rows < 3) & (m.Z < 2), M["soil"])
        m.paint(area & (rows >= 3) & (m.Z < 1), M["soil"])
        vines = area & (rows == 1) & (m.Z >= 1) & (m.Z < 3) & (vhash(np.floor(m.X / 2), np.floor(m.Y), 0, salt) < 0.35)
        m.fill(vines, M["leaf_b"])
        return m
    return f


def base_graveyard(rx, ry, salt):
    def f():
        m = Model(-rx - 2, -ry - 2, rx + 2, ry + 2, 2)
        area = ring_mask(m, rx, ry, 0.4, salt) & (m.Z < 1)
        m.fill(area & (vhash(np.floor(m.X / 2), np.floor(m.Y / 2), 0, salt) < 0.55), M["soil"])
        path = area & (np.abs(m.X + m.Y * 0.1) < 4)
        m.fill(path, M["cobble"])
        m.paint(path & ((np.floor(m.Y / 3) + np.floor(m.X / 3)) % 2 == 0), M["stone_dk"])
        return m
    return f


def base_moon_ring(rx, ry, salt):
    def f():
        m = Model(-rx - 2, -ry - 2, rx + 2, ry + 2, 3)
        q = np.sqrt((m.X / rx) ** 2 + (m.Y / ry) ** 2)
        ring = (np.abs(q - 0.86) < 0.11) & (m.Z < 1)
        m.fill(ring, M["stone"])
        m.paint(ring & ((np.floor(np.arctan2(m.Y, m.X) * 9)) % 2 == 0), M["stone_dk"])
        # A crescent inlay of pale stones around the lantern.
        c1 = ((m.X / (rx * 0.42)) ** 2 + (m.Y / (ry * 0.42)) ** 2 < 1)
        c2 = (((m.X - rx * 0.14) / (rx * 0.36)) ** 2 + ((m.Y + ry * 0.08) / (ry * 0.36)) ** 2 < 1)
        m.fill(c1 & ~c2 & (m.Z < 1), M["white"])
        for k in range(8):
            a = k * math.tau / 8 + 0.2
            sx, sy = math.cos(a) * rx * 0.86, math.sin(a) * ry * 0.86
            m.fill((((m.X - sx) / 2.5) ** 2 + ((m.Y - sy) / 2.5) ** 2 < 1) & (m.Z < 2), M["stone"])
        return m
    return f


def base_yard(rx, ry, salt, path=True):
    def f():
        m = Model(-rx - 2, -ry - 2, rx + 2, ry + 2, 2)
        area = ring_mask(m, rx, ry, 0.35, salt) & (m.Z < 1)
        m.fill(area, M["soil"])
        m.paint(area & (vhash(np.floor(m.X / 2), np.floor(m.Y / 2), 0, salt) < 0.07), M["hay_dk"])
        m.paint(area & (vhash(np.floor(m.X / 3), np.floor(m.Y / 3), 1, salt) < 0.12), M["grass"])
        if path:
            p = (np.abs(m.X - 2 * np.sin(m.Y / 9)) < 3.5) & (m.Y > 0) & (m.Z < 1)
            m.fill(p & (np.abs(m.Y) < ry + 2), M["cobble"])
        return m
    return f


def base_garden(rx, ry, salt):
    def f():
        m = Model(-rx - 2, -ry - 2, rx + 2, ry + 2, 4)
        area = band(m.X, -rx, rx) & band(m.Y, -ry, ry)
        m.fill(area & (m.Z < 1), M["cobble"])
        m.paint(area & ((np.floor(m.X / 2) + np.floor(m.Y / 2)) % 3 == 0), M["stone_dk"])
        for (bx0, by0, bx1, by1) in ((-rx + 3, 10, -12, ry - 3), (12, 10, rx - 3, ry - 3), (-rx + 3, -ry + 3, -48, -6)):
            bed = band(m.X, bx0, bx1) & band(m.Y, by0, by1)
            m.fill(bed & (m.Z < 2), M["brick"])
            m.fill(bed & band(m.X, bx0 + 1, bx1 - 1) & band(m.Y, by0 + 1, by1 - 1) & (m.Z < 2), M["soil"])
            sprout = bed & band(m.X, bx0 + 1, bx1 - 1) & band(m.Y, by0 + 1, by1 - 1) & (m.Z >= 1) & (m.Z < 3) & (np.floor(m.X) % 3 == 0) & (np.floor(m.Y) % 3 == 1)
            m.fill(sprout, M["leaf_b"])
        return m
    return f


def parapet(length=34):
    m = Model(-2, -length - 1, 2, length + 1, 12)
    m.box(-1, -length, 0, 1, length, 6, M["stone"])
    m.paint((np.floor(m.Y / 3) + np.floor(m.Z / 2)) % 2 == 0, M["stone_dk"])
    m.box(-2, -length, 6, 2, length, 7, M["stone_dk"])
    for py in (-length, -1, length - 2):
        m.box(-2, py, 0, 2, py + 3, 10, M["stone"])
        m.box(-2, py, 10, 2, py + 3, 11, M["stone_dk"])
    return m


def landmark_sprites():
    """(id, builder) of the flat ground bases and extra standing pieces, plus their placement."""
    sprites = [
        ("lmbase-clock-tower", base_cobble(56, 48, 1, ring=0.7)),
        ("lmbase-pumpkin-field", base_soil_rows(74, 46, 2)),
        ("lmbase-graveyard", base_graveyard(84, 56, 3)),
        ("lmbase-lantern-market", base_boards(84, 30, 4)),
        ("lmbase-moon-hill", base_moon_ring(62, 50, 5)),
        ("lmbase-paper-windmill", base_yard(54, 40, 6)),
        ("lmbase-puppet-theatre", base_boards(52, 26, 7)),
        ("lmbase-wishing-well", base_cobble(46, 40, 8, ring=0.6)),
        ("lmbase-paper-teahouse", base_tiles(62, 34, 9, inlay="stepping")),
        ("lmbase-fold-greenhouse", base_garden(70, 44, 10)),
        ("lmbase-star-observatory", base_tiles(48, 40, 11, inlay="star")),
        ("lmextra-stone-bridge-parapet", parapet),
    ]
    # Placement relative to the landmark centre, in world units (art data only).
    sets = {
        "clock-tower": {"base": ["lmbase-clock-tower", 0, 20]},
        "pumpkin-field": {"base": ["lmbase-pumpkin-field", 0, 0]},
        "graveyard": {"base": ["lmbase-graveyard", 0, 20]},
        "lantern-market": {"base": ["lmbase-lantern-market", 0, 0]},
        "moon-hill": {"base": ["lmbase-moon-hill", 0, 0]},
        "paper-windmill": {"base": ["lmbase-paper-windmill", 0, 30]},
        "puppet-theatre": {"base": ["lmbase-puppet-theatre", 0, 30]},
        "wishing-well": {"base": ["lmbase-wishing-well", 0, 0]},
        "paper-teahouse": {"base": ["lmbase-paper-teahouse", 0, 30]},
        "fold-greenhouse": {"base": ["lmbase-fold-greenhouse", 0, 20]},
        "star-observatory": {"base": ["lmbase-star-observatory", 0, 30]},
        "stone-bridge": {"extras": [["lmextra-stone-bridge-parapet", -74, 0], ["lmextra-stone-bridge-parapet", 74, 0]]},
    }
    return sprites, sets


# ---------------------------------------------------------------- townsfolk puppets (author facing +x)
def _legs(m, frame, mat, h=3, spread=1.5):
    off = (1, -1) if frame else (-1, 1)
    for y0, o in zip((-2, 1), off):
        x0 = o - 1
        m.box(x0, y0, 0, x0 + 2, y0 + 1, h, mat)
    del spread


def mouse(turn, frame):
    m = Model(-9, -9, 9, 9, 34, turn=turn)
    _legs(m, frame, M["coat"], 3)
    lift = frame
    m.ellipsoid(0, 0, 9 + lift * 0.5, 3.6, 3.4, 6.0, M["coat"])
    m.paint(band(m.Z, 5, 6.5), M["coat"])
    m.ellipsoid(0.5, 0, 14 + lift * 0.5, 3.4, 3.6, 1.4, M["wax"])
    m.ellipsoid(0.8, 0, 18 + lift * 0.5, 3.4, 3.2, 3.2, M["fur"])
    m.ellipsoid(3.6, 0, 17.6 + lift * 0.5, 1.8, 1.4, 1.4, M["fur"])
    m.box(5, 0, 17 + lift, 6, 1, 18 + lift, M["nose"])
    for s in (-1, 1):
        m.ellipsoid(-0.2, s * 3.2, 21.5 + lift * 0.5, 0.9, 2.2, 2.4, M["fur_dk"])
        m.ellipsoid(0.3, s * 3.2, 21.5 + lift * 0.5, 0.5, 1.4, 1.6, M["nose"])
        m.box(2, s * 1.6 - 0.5, 18.5 + lift, 3, s * 1.6 + 0.5, 20 + lift, M["eye"])
    m.cylinder(0.5, 0, 2.6, 21 + lift, 22 + lift, M["cap"])
    m.box(-1, -1, 22 + lift, 2, 1, 23.5 + lift, M["cap"])
    m.segment((-3, 0, 4), (-7, 0, 6), 0.5, M["fur_dk"])
    m.segment((-7, 0, 6), (-7.5, 0, 10), 0.5, M["fur_dk"])
    # Lantern pole held in front.
    m.segment((3.5, 3.2, 1), (4.5, 3.2, 28), 0.45, M["wood_dk"])
    m.segment((4.5, 3.2, 28), (7, 3.2, 28), 0.4, M["wood_dk"])
    m.box(6, 2.5, 23, 8, 4.5, 26, M["lantern_glass"])
    m.box(6, 2.5, 26, 8, 4.5, 27, M["iron"])
    m.ellipsoid(2.5, 3.0, 10 + lift * 0.5, 1.2, 1.2, 1.6, M["fur"])
    return m


def owl(turn, frame):
    m = Model(-9, -9, 9, 9, 30, turn=turn)
    _legs(m, frame, M["brass"], 2, 1.2)
    lift = frame
    m.ellipsoid(0, 0, 9 + lift * 0.5, 5.2, 5.0, 7.2, M["feather"])
    m.paint((np.floor(m.Z) % 3 == 0) & (m.X > 1) & (m.Z < 12), M["feather_dk"])
    for s in (-1, 1):
        m.ellipsoid(-0.5, s * 4.6, 9 + lift * 0.5, 2.0, 1.4, 4.6, M["feather_dk"])
        m.ellipsoid(0, s * 3.0, 17.4 + lift * 0.5, 1.2, 1.1, 2.4, M["feather"])
    face = (m.X > 2.2) & (m.m == M["feather"]) & band(m.Z, 11 + lift * 0.5, 16 + lift * 0.5)
    m.paint(face, M["disc"])
    for s in (-1, 1):
        m.paint(face & (np.abs(m.Y - s * 1.7) < 1.0) & band(m.Z, 13 + lift, 15 + lift), M["eye"])
        m.paint(face & (np.abs(m.Y - s * 1.7) < 0.45) & band(m.Z, 14 + lift, 15 + lift), M["brass"])
    m.box(5, -0.5, 12 + lift, 6, 0.5, 13.5 + lift, M["brass"])
    m.paint(face & band(m.Z, 9, 11) & (m.X > 3), M["disc"])
    # Telescope tucked under one wing.
    m.segment((2, 4.5, 6), (7, 6, 12), 0.9, M["coat"])
    m.segment((6.5, 5.8, 11.5), (8, 6.2, 13), 1.1, M["brass"])
    return m


def frog(turn, frame):
    m = Model(-11, -11, 11, 11, 42, turn=turn)
    lift = frame * 0.5
    for s, o in ((-1, -1 if frame else 1), (1, 1 if frame else -1)):
        m.ellipsoid(o * 0.6, s * 3.2, 1.2, 2.8, 1.6, 1.4, M["frog"])
    m.ellipsoid(0, 0, 7 + lift, 5.2, 4.8, 5.4, M["frog"])
    m.paint((m.X > 2.5) & (m.m == M["frog"]) & band(m.Z, 3, 10), M["belly"])
    m.ellipsoid(1.2, 0, 12 + lift, 4.4, 4.4, 2.8, M["frog"])
    m.paint((m.X > 4) & band(m.Z, 10.5 + lift, 11.5 + lift) & (np.abs(m.Y) < 2.5), M["eye"])
    for s in (-1, 1):
        m.ellipsoid(2.2, s * 2.2, 14.6 + lift, 1.5, 1.5, 1.5, M["frog"])
        m.box(3, s * 2.2 - 0.5, 14 + lift, 4, s * 2.2 + 0.5, 15.5 + lift, M["eye"])
        m.box(3, s * 2.2 - (0.5 if s < 0 else -0.0), 15 + lift, 4, s * 2.2 + (0.0 if s < 0 else 0.5), 15.5 + lift, M["eye_lit"])
    # Wide straw hat with a blue band.
    m.cylinder(0.6, 0, 6.6, 16.5 + lift, 17.5 + lift, M["straw"])
    m.cylinder(0.6, 0, 3.0, 17.5 + lift, 20 + lift, M["straw"])
    m.paint(band(m.Z, 17.5 + lift, 18.5 + lift) & ((m.X - 0.6) ** 2 + m.Y ** 2 < 9.5), M["cloth_blue"])
    # Ferry pole.
    m.segment((2.5, -4.6, 0), (3.2, -4.6, 36), 0.5, M["wood_dk"])
    m.ellipsoid(3.5, -3.6, 8 + lift, 1.2, 1.2, 1.4, M["frog"])
    return m


TOWNSFOLK = {"lamplighter-mouse": mouse, "stargazer-owl": owl, "ferry-frog": frog}
DIRS = ("se", "sw", "nw", "ne")  # turn 0..3: authoring +x faces world +x, +y, -x, -y


def townsfolk_sprites():
    out = []
    for kind, fn in TOWNSFOLK.items():
        for turn, d in enumerate(DIRS):
            for frame in (0, 1):
                out.append((f"folk-{kind}-{d}-{frame}", (lambda fn=fn, turn=turn, frame=frame: fn(turn, frame))))
    return out
