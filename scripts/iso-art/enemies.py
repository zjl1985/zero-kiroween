"""Voxel puppets of every enemy (FEAT-006).

Each enemy is a readable threat silhouette sized by its simulation radius, built from
voxels in authoring units (1 unit = 2 world units wide, 1 native pixel high; +x is
forward, +y is its left, z up, the foot at the origin). One builder poses the model for
every frame; the bake turns it in four real directions (never mirrored).

    idle 2 frames, walk 4, hurt 1; attack 2 (windup, strike) where the definition has a
    throw or a telegraph (the Eraser has one pair per attack: sweep, summon, charge)

Elites are the same model baked on a finer grid at the elite radius factor, so they are
bigger with unit pixels. Faces are voxel eyes; the Eraser's face is stamped on the two
front views like the cats'. Also baked here: the elite crown and the two thrown drops.
"""
from __future__ import annotations

import math

import numpy as np

import puppet

from puppet import DIRS, _rgb, mix, project
from voxel import Model, bake, mat

OUTLINE, NIGHT, MOON = "#0b0a18", "#151429", "#d2c7c4"
_RAMPS: dict = {}


def use_ramps(base: dict) -> None:
    """The shared night, moon and outline steps every puppet mixes toward."""
    global OUTLINE, NIGHT, MOON
    OUTLINE, NIGHT, MOON = base["ink"][0], base["ink"][1], base["cloth"][4]


def name_of(key: str) -> str:
    """Enemy ramps and materials live in their own namespace, clear of the scenery ramps."""
    return f"enemy-{key}"


def tone(key: str, base: str, light=0.3, shade=0.3, deep=0.55, light_to=None) -> int:
    """A flat puppet ramp [outline, deep, shade, base, base, lit]."""
    name = name_of(key)
    _RAMPS[name] = [OUTLINE, mix(base, NIGHT, deep), mix(base, NIGHT, shade), base, base, mix(base, light_to or MOON, light)]
    return mat(name, name, rim=False, jitter=0.0)


def bright(key: str, *steps: str) -> int:
    """A ramp without a dark step, for glowing eyes (every face of the voxel stays lit)."""
    name = name_of(key)
    _RAMPS[name] = [OUTLINE, *steps]
    return mat(name, name, rim=False, jitter=0.0)


def between(a, b):
    return min(a, b), max(a, b)


M: dict[str, int] = {}


def materials() -> dict:
    """Registers every enemy material once (the bake looks each material's ramp up)."""
    if M:
        return M
    M.update(
        ink=tone("ink", "#3d3156", light=0.5, light_to="#9b84b4", shade=0.26, deep=0.42),
        ink_dark=tone("inkdark", "#2c2340", light=0.4, light_to="#5a4a74"),
        eye=bright("eye", "#d9952a", "#f0b03a", "#fbd45a", "#fbd45a", "#fff0a8"),
        bat=tone("bat", "#3a3049", light=0.42, light_to="#77688f", shade=0.25),
        bat_dark=tone("batdark", "#221c2c", light=0.35, light_to="#5e5174"),
        bat_tan=tone("battan", "#c9a76f", light=0.3, shade=0.3),
        eye_red=bright("eyer", "#c8433a", "#e8604e", "#ff8a6a", "#ff8a6a", "#ffd0a8"),
        fang=bright("fang", "#d8d2c4", "#efe9dc", "#fffaf3", "#fffaf3", "#ffffff"),
        paper=tone("paper", "#d9c9ab", light=0.55, light_to="#fbf1db", shade=0.3),
        paper_dark=tone("paperdark", "#b9a582", light=0.3, shade=0.3),
        graphite=tone("graphite", "#413947", light=0.25, light_to="#817481", shade=0.2),
        sm_paper=tone("smpaper", "#e3d3b5", light=0.25, shade=0.28),
        sm_ink=tone("smink", "#3a2c4b", light=0.4, light_to="#6d5684", shade=0.25),
        sm_violet=tone("smviolet", "#6d5684", light=0.4, light_to="#ac8fbd", shade=0.25),
        dye=tone("dye", "#4f86a8", light=0.5, light_to="#cfe6ef", shade=0.3, deep=0.45),
        dye_dark=tone("dyedark", "#386a8c", light=0.35, light_to="#8fb6c8"),
        water=tone("water", "#a9cfdc", light=0.3, light_to="#e8f2f4", shade=0.25),
        rim=tone("rim", "#cfe6ef", light=0.2, light_to="#ffffff", shade=0.2),
        sk_paper=tone("skpaper", "#e2d5bc", light=0.35, light_to="#fffaf0", shade=0.22),
        ghost=tone("ghost", "#e7dff0", light=0.3, light_to="#ffffff", shade=0.3, deep=0.45),
        ghost_ink=tone("ghostink", "#17131d", light=0.3, light_to="#5a4a74"),
        ghost_violet=bright("ghostviolet", "#7a3ae0", "#9046ff", "#b07cff", "#c9a7ff", "#e6d6ff"),
        rubber=tone("rubber", "#ec9aaa", light=0.4, light_to="#ffd0d7", shade=0.3),
        rubber_side=tone("rubberside", "#f7b6c2", light=0.3, light_to="#f9dfe0", shade=0.25),
        sleeve=tone("sleeve", "#41639a", light=0.45, light_to="#7f9fd0", shade=0.28),
        label=tone("label", "#efe5cf", light=0.12, shade=0.22),
        boss_ink=tone("bossink", "#17131d", light=0.3, light_to="#5a4a74"),
        gold=tone("gold", "#e3b85d", light=0.45, light_to="#fff6cc", shade=0.25),
        gem=bright("gem", "#a8353f", "#c9454f", "#e35d66", "#e35d66", "#ff9aa0"),
        shot_ink=tone("shotink", "#624a7b", light=0.5, light_to="#ac8fbd", shade=0.25),
        shot_water=tone("shotwater", "#7fb3c8", light=0.4, light_to="#c8e9e8", shade=0.25),
    )
    return M


def enemy_ramps(base: dict) -> dict:
    use_ramps(base)
    materials()
    return dict(_RAMPS)


# ---------------------------------------------------------------- the enemies
def ink_blob(m, Mt, anim, f):
    """A wobbling drop of ink with two lobes and amber eyes."""
    ph = 2 * math.pi * f / 4
    if anim == "idle":
        s, w, dz = 1.0, (0.7 if f else -0.7), 0.0
    elif anim == "walk":
        s, w, dz = 1 + 0.14 * math.sin(ph), 1.1 * math.sin(ph + 1.2), 0.9 * max(0.0, math.sin(ph))
    else:
        s, w, dz = 0.72, 0.0, 0.0
    ink = Mt["ink"]
    r = 4.7 / math.sqrt(s)
    m.ellipsoid(w * 0.3, 0, 3.1 * s + dz, r, r, 3.3 * s, ink, lumpy=0.12, salt=3)
    m.ellipsoid(w, -1.9, 5.7 * s + dz, 2.2, 2.0, 1.9 * s, ink)
    m.ellipsoid(-w * 0.8, 2.1, 5.4 * s + dz, 1.9, 1.8, 1.6 * s, ink)
    m.ellipsoid(r * 0.8, 0.9, 0.9, 1.2, 1.0, 0.9, Mt["ink_dark"])   # a drip running down the front
    for side in (-1, 1):
        m.ellipsoid(r - 0.15 + w * 0.3, side * 1.9, 3.9 * s + dz, 0.75, 0.8, 0.5 if anim == "hurt" else 0.85, Mt["eye"])


def paper_bat(m, Mt, anim, f):
    """A folded paper bat: a small body between two full hinged wings, ears, red eyes and fangs."""
    flap = {"idle": (1.0, -0.8), "walk": (1.3, 0.35, -1.1, 0.35), "hurt": (1.6,)}[anim][f]
    z0 = 9.4 + (0.7 * math.sin(2 * math.pi * f / 4) if anim == "walk" else 0.0) - (1.5 if anim == "hurt" else 0.0)
    body, dark = Mt["bat"], Mt["bat_dark"]
    m.ellipsoid(0, 0, z0, 2.2, 1.8, 2.0, body)
    m.ellipsoid(1.6, 0, z0 + 0.9, 1.4, 1.4, 1.3, dark)
    for side in (-1, 1):
        m.cone(1.3, side * 0.9, 0.75, z0 + 1.5, z0 + 3.5, dark)
        for i in range(6):
            t = i / 5
            z = z0 + 0.2 + flap * i * 0.82
            y0, y1 = between(side * (1.5 + i * 1.15), side * (1.5 + (i + 1) * 1.15))
            m.box(-1.9 + 0.9 * t, y0, z, 1.3 - 1.4 * t, y1, z + 0.7, Mt["bat_tan"] if i >= 4 else body)
        m.ellipsoid(2.5, side * 0.65, z0 + 1.0, 0.5, 0.5, 0.5, Mt["eye_red"])
    for y0, y1 in ((-0.7, -0.2), (0.2, 0.7)):
        m.box(2.7, y0, z0 - 0.7, 3.1, y1, z0 - 0.1, Mt["fang"])


def crumple(m, Mt, anim, f):
    """A crumpled paper ball with faceted creases that tumbles as it walks."""
    if anim == "walk":
        dz, s, salt = (0.0, 1.7, 0.7, 0.2)[f], (1.08, 0.9, 1.04, 0.94)[f], f + 1
    elif anim == "idle":
        dz, s, salt = 0.0, (1.0, 0.95)[f], 1
    else:
        dz, s, salt = 0.0, 0.74, 1
    r = 6.6 / math.sqrt(s)
    m.ellipsoid(0, 0, 5.7 * s + dz, r, r, 5.9 * s, Mt["paper"], lumpy=0.34, salt=salt)
    for side in (-1, 1):
        m.ellipsoid(r * 0.8, side * 2.0, 5.0 * s + dz, 0.7, 0.75, 0.5 if anim == "hurt" else 0.8, Mt["graphite"])
        y0, y1 = between(side * 2.2, side * 4.2)
        m.box(2.0, y0, -0.2, 4.4, y1, 1.4, Mt["paper_dark"])


def smudge(m, Mt, anim, f):
    """A folded paper carrier holding a pool of ink; its charging drop swells before the throw."""
    if anim == "attack":
        tilt, drop = (-1.3, 2.0) if f == 0 else (1.9, 0.0)
    elif anim == "walk":
        tilt, drop = 0.7 * math.sin(2 * math.pi * f / 4), 1.1
    else:
        tilt, drop = 0.0, 0.0 if anim == "hurt" else 1.1
    paper, ink = Mt["sm_paper"], Mt["sm_ink"]
    m.box(-4.8, -4.3, 0.3, 4.6 + tilt, 4.3, 3.2, paper)
    m.box(-5.6, -3.3, 1.0, -3.6, 3.3, 4.8, paper)
    m.box(3.6 + tilt, -3.3, 1.0, 5.4 + tilt, 3.3, 4.1, paper)
    m.ellipsoid(0.2, 0, 3.3, 4.1, 3.5, 1.3, ink, lumpy=0.1, salt=5)
    if drop:
        m.ellipsoid(0.4, -5.4, 3.2 + drop * 0.5, drop, drop, drop * 1.3, Mt["sm_violet"])
        m.segment((0.4, -4.0, 3.4), (0.4, -5.4, 3.2 + drop * 0.5), 0.5, Mt["sm_violet"])
    for side in (-1, 1):
        m.ellipsoid(5.2 + tilt, side * 1.6, 2.5, 0.55, 0.55, 0.55, ink)


def wash(m, Mt, anim, f):
    """A big drop of dyed water on its own puddle: a soaked pale belly, a leaning tip."""
    if anim == "attack":
        lean, hop = (-2.4, 0.8) if f == 0 else (2.8, 0.3)
    elif anim == "walk":
        lean, hop = 0.0, (0.0, 2.5, 1.1, 0.0)[f]
    else:
        lean, hop = 0.0, 0.0
    s = 0.8 if anim == "hurt" else 1.0
    m.cylinder(0, 0, 5.5, -0.4, 0.8, Mt["water"])
    m.ellipsoid(0, 0, 4.5 * s + hop, 4.3 / math.sqrt(s), 4.3 / math.sqrt(s), 4.5 * s, Mt["dye"])
    m.ellipsoid(1.3, 0, 3.6 * s + hop, 2.5, 3.0, 3.0 * s, Mt["rim"])
    for k, r in ((0.0, 2.9), (0.6, 2.0), (1.0, 1.1)):
        m.ellipsoid(lean * k, 0, (6.6 + 1.9 * k) * s + hop, r, r, r * 1.15, Mt["dye"] if k < 0.9 else Mt["rim"])
    for side in (-1, 1):
        m.ellipsoid(3.6, side * 1.3, 5.0 * s + hop, 0.6, 0.6, 0.5 if anim == "hurt" else 0.8, Mt["dye_dark"])


def sketch(m, Mt, anim, f):
    """A crouching paper creature drawn in loose graphite: hatched body, X eyes, pointed ears."""
    if anim == "walk":
        stretch, dz = (1.0, -0.3, 0.6, -0.5)[f], (0.0, 0.6, 0.0, 0.6)[f]
    elif anim == "hurt":
        stretch, dz = -0.7, 0.0
    else:
        stretch, dz = 0.0, (0.0, 0.3)[f]
    body, g = Mt["sk_paper"], Mt["graphite"]
    m.ellipsoid(-0.6 + stretch * 0.5, 0, 3.0 + dz, 5.2 + stretch, 3.8, 2.9, body)
    m.ellipsoid(3.9 + stretch, 0, 4.4 + dz, 2.7, 2.5, 2.4, body)
    for side in (-1, 1):
        m.cone(3.5 + stretch, side * 1.3, 1.0, 5.9 + dz, 8.3 + dz, body)
        for lx in (-3.4, 1.4):
            y0, y1 = between(side * 2.4, side * 3.7)
            m.box(lx + stretch * 0.5, y0, -0.2, lx + 1.7, y1, 2.4 + dz, body)
    # Hatching along the flank and a scribbled spine.
    m.paint((m.m == body) & (np.abs(m.Y) < 0.45) & (m.X < 2.4 + stretch) & (m.Z > 4.0 + dz) & (m.Z < 5.9 + dz), g)
    for x in (-3.8, -2.0, 0.0, 2.0):
        m.paint((m.m == body) & (np.abs(m.X - x - stretch * 0.4) < 0.45) & (m.Z > 1.6 + dz) & (np.abs(m.Y) > 1.2), g)
    for side in (-1, 1):
        for a in (-0.6, 0.6):
            for b in (-0.6, 0.6):
                m.paint((m.m == body) & (np.abs(m.X - (5.9 + stretch) - a * 0.3) < 0.45) & (np.abs(m.Y - side * 1.3 - a) < 0.45) & (np.abs(m.Z - (4.9 + dz) - b) < 0.45), g)


def kiro_ghost(m, Mt, anim, f):
    """A floating sheet ghost: a round dome, a wisp swept to one side, two unequal curled tails, a dithered hem."""
    t = 2 * math.pi * f / 4
    live = anim != "hurt"
    z = 9.6 + (0.7 * math.sin(t) if anim == "walk" else 0.3 * math.sin(t) if live else -1.4)
    sway = 0.9 * math.sin(t + 1.0) if live else 0.0
    g = Mt["ghost"]
    m.ellipsoid(0, 0, z, 5.2, 5.2, 4.8, g)
    m.ellipsoid(-0.6 + sway * 0.3, 1.4, z + 4.2, 2.3, 1.6, 1.3, g)
    m.segment((-0.4, 1.2, z + 3.8), (-3.2 + sway, 3.2, z + 5.6), 0.75, g)
    m.ellipsoid(sway * 0.5, -2.6, z - 4.6, 1.8, 1.5, 1.7, g)
    m.ellipsoid(-sway * 0.6, 3.0, z - 4.1, 1.5, 1.3, 1.2, g)
    for side in (-1, 1):
        m.ellipsoid(4.6, side * 1.9, z + 0.9, 0.7, 0.8, 1.1 if live else 0.5, Mt["ghost_ink"])
    m.ellipsoid(5.1, 0, z - 1.3, 0.5, 0.65, 0.7, Mt["ghost_ink"])
    m.paint((m.m == g) & (m.X > 3.0) & (m.Y > 2.2) & (m.Z > z + 0.6), Mt["ghost_violet"])   # a violet gleam on the crown
    # Dithered hem: alternate voxels of the lowest layers are cut away.
    m.carve((m.m == g) & (m.Z < z - 3.4) & (((np.floor(m.X) + np.floor(m.Y)) % 2) == 0))


def eraser_boss(m, Mt, anim, f):
    """The Eraser: a pink rubber golem in a blue paper sleeve, with stamped angry eyes."""
    # Pose: lean of the upper body (x), crouch (z), bob, the right and left hands, the leg stride.
    hand_r, hand_l, stride = [9.0, -8.2, 12.0], [9.0, 8.2, 12.0], 0.0
    lean, dz = 0.0, 0.0
    if anim == "idle":
        dz = -0.3 * f
    elif anim == "walk":
        lean, dz = 0.5, (0.0, -0.8, 0.0, -0.8)[f]
        stride = 1.8 * math.sin(2 * math.pi * f / 4)
        hand_r, hand_l = [8.6 - stride * 1.5, -8.4, 12.0], [8.6 + stride * 1.5, 8.4, 12.0]
    elif anim == "hurt":
        lean, dz, hand_r, hand_l = -2.2, -2.4, [6.0, -9.4, 14.5], [6.0, 9.4, 14.5]
    elif anim == "sweep":
        if f == 0:
            lean, hand_r = -1.8, [-4.0, -9.5, 31.0]
        else:
            lean, hand_r = 2.6, [12.5, 2.0, 9.5]
    elif anim == "summon":
        hand_r, hand_l = ([0.5, -11.5, 22.0], [0.5, 11.5, 22.0]) if f == 0 else ([9.5, -5.5, 21.0], [9.5, 5.5, 21.0])
    elif anim == "charge":
        if f == 0:
            lean, dz, hand_r, hand_l = -2.6, -3.2, [-6.5, -8.5, 14.0], [-6.5, 8.5, 14.0]
        else:
            lean, dz, stride, hand_r, hand_l = 4.2, -1.2, 3.0, [-9.5, -6.5, 17.0], [-9.5, 6.5, 17.0]
    rubber, side, sleeve = Mt["rubber"], Mt["rubber_side"], Mt["sleeve"]
    # Legs with sleeve cuffs and boots.
    for s, sx in ((-1, stride), (1, -stride)):
        y0, y1 = between(s * 1.6, s * 5.0)
        m.box(-1.6 + sx * 0.6, y0, 0.0, 2.2 + sx * 0.6, y1, 12.0, side)
        m.box(-2.4 + sx, y0, -0.2, 3.6 + sx, y1, 3.0, sleeve)
        m.box(-1.8 + sx * 0.8, y0, 3.0, 2.8 + sx * 0.8, y1, 5.0, sleeve)
    # Torso: a worn eraser block with rounded corners, banded by its paper sleeve and label.
    X, Y, Z = m.X, m.Y, m.Z
    block = (X > -6.6 + lean * 0.3) & (X < 7.2 + lean * 0.3) & (np.abs(Y) < 6.2) & (Z > 11.0 + dz) & (Z < 25.5 + dz)
    round_ = ((X - 0.3 - lean * 0.3) / 8.6) ** 2 + (Y / 7.6) ** 2 + ((Z - 18.2 - dz) / 9.4) ** 2 < 1
    m.fill(block & round_, rubber)
    band = block & round_ & (Z > 12.6 + dz) & (Z < 17.2 + dz) & ((X > 5.4 + lean * 0.3) | (np.abs(Y) > 5.0) | (X < -5.4 + lean * 0.3))
    m.paint(band, sleeve)
    m.paint(block & round_ & (Z > 14.4 + dz) & (Z < 15.6 + dz) & (X > 6.2 + lean * 0.3) & (np.abs(Y) < 4.2), Mt["label"])
    m.paint(block & round_ & (Z > 24.4 + dz), Mt["rubber_side"])
    # Head: a smaller block with a worn top.
    hx0, hx1, hz = -4.6 + lean, 5.8 + lean, 25.5 + dz
    head = (X > hx0) & (X < hx1) & (np.abs(Y) < 4.7) & (Z > hz) & (Z < hz + 8.6)
    m.fill(head & (((X - hx0 - 5.2) / 6.0) ** 2 + (Y / 5.6) ** 2 + ((Z - hz - 4.3) / 5.2) ** 2 < 1), rubber)
    m.paint(head & (Z > hz + 7.2), Mt["rubber_side"])
    # Arms: rubber limbs, a sleeve cuff near the fist, a big fist.
    for s, hand in ((-1, hand_r), (1, hand_l)):
        sh = np.array([0.6 + lean * 0.4, s * 6.4, 23.2 + dz])
        h = np.array([hand[0] + lean * 0.5, hand[1], hand[2]])
        m.segment(sh, h, 1.9, side)
        c = sh + (h - sh) * 0.74
        m.ellipsoid(c[0], c[1], c[2], 2.3, 2.3, 2.3, sleeve)
        m.ellipsoid(h[0], h[1], h[2], 2.6, 2.6, 2.6, rubber)
    return {"head": (hx0 + 5.2, 0.0, hz + 4.3), "hz": hz, "hx": hx0}


def _none(m, Mt, anim, f):
    return None


#: kind -> builder. Frames per animation and whether the kind can be an elite come from the table below.
BUILDERS = {
    "ink-blob": ink_blob, "paper-bat": paper_bat, "crumple": crumple, "smudge": smudge, "wash": wash,
    "sketch": sketch, "kiro-ghost": kiro_ghost, "eraser-boss": eraser_boss,
}
BASE = (("idle", 2), ("walk", 4), ("hurt", 1))
ANIMS = {
    "ink-blob": BASE, "paper-bat": BASE, "crumple": BASE, "sketch": BASE, "kiro-ghost": BASE,
    "smudge": BASE + (("attack", 2),), "wash": BASE + (("attack", 2),),
    "eraser-boss": BASE + (("sweep", 2), ("summon", 2), ("charge", 2)),
}
ELITEABLE = ("ink-blob", "paper-bat", "crumple", "smudge")
BOUNDS = {"eraser-boss": (-18, -15, 18, 15, 42)}


def stamp_boss(b, info, turn):
    """Angry eyes under a V brow and a wide grin on the front views of the Eraser's head."""
    if DIRS[turn] not in ("se", "sw") or not info:
        return
    W, H = b.w, b.h
    px = b.pixels
    rubber = set(_RAMPS[name_of("rubber")][1:] + _RAMPS[name_of("rubberside")][1:])

    def at(p):
        sx, sy = project(p, turn)
        return math.floor(sx) + b.ax, math.floor(sy) + b.ay

    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H and px[y * W + x] in rubber:
            px[y * W + x] = c

    hx, _, _ = info["head"]
    ink = _RAMPS[name_of("bossink")][1]
    for s in (-1, 1):
        ex, ey = at((hx + 4.6, s * 2.1, info["hz"] + 5.2))
        for dx in (-1, 0, 1):
            put(ex + dx, ey + (1 if dx * s > 0 else 0), ink)     # a slanted eye
            put(ex + dx, ey - 2 + (1 if dx * s > 0 else 0), ink)  # the brow: low toward the nose
        tx, ty = at((hx + 4.6, s * 2.2, info["hz"] + 6.9))
        put(tx, ty, "#ffd0d7")
    mx, my = at((hx + 4.7, 0.0, info["hz"] + 2.3))
    for dx in range(-3, 4):
        put(mx + dx, my, ink)
    for dx in (-3, -1, 1, 3):
        put(mx + dx, my + 1, ink)
    put(mx, my - 1, "#ffd0d7")


# ---------------------------------------------------------------- small sprites
def crown(m, Mt):
    """The elite crown: three gold prongs round a red gem."""
    gold, gem = Mt["gold"], Mt["gem"]
    m.box(-4.2, -2.2, -1.0, 4.2, 2.2, 1.4, gold)
    for x in (-3.4, -0.7, 2.0):
        m.box(x, -1.6, 1.4, x + 1.4, 1.6, 5.2 if x < -1 else 4.0, gold)
    m.box(-0.8, -2.3, -0.6, 0.8, -1.6, 0.9, gem)


def shot(m, Mt, water):
    """A thrown drop: pointed at the top, round at the bottom."""
    mat_ = Mt["shot_water"] if water else Mt["shot_ink"]
    m.ellipsoid(0, 0, 2.2, 2.1, 1.9, 2.2, mat_)
    m.cone(0, 0, 1.7, 3.4, 7.0, mat_)
    m.ellipsoid(-0.8, -1.2, 2.6, 0.6, 0.5, 1.0, Mt["rim"] if water else Mt["sm_violet"])


# ---------------------------------------------------------------- bake
_R: dict = {}


def use_bake_ramps(r: dict) -> None:
    _R.clear()
    _R.update(r)


def _bake(builder, anim, f, turn, scale, stamp=None, bounds=(-17, -17, 17, 17, 36)):
    m = Model(*bounds, turn=turn, scale=scale)
    info = builder(m, M, anim, f)
    # Costume materials register while the cats bake; the bake looks every material's ramp up.
    for look, _ in puppet.looks().values():
        _R.update(look.ramps)
    b = bake(m, _R, shadow=False, outline=True)
    b.extent = {"x": -4, "y": -4, "w": 8, "d": 8}
    if stamp:
        stamp(b, info, turn)
    return b


def enemy_sprites(elite: float):
    """[(sprite id, builder -> Baked)] of every enemy frame, the elites, the crown and the thrown drops."""
    out = []
    for kind, builder in BUILDERS.items():
        for tag, scale in (("", 1.0), ("@elite", elite)):
            if tag and kind not in ELITEABLE:
                continue
            for turn, d in enumerate(DIRS):
                for anim, n in ANIMS[kind]:
                    for f in range(n):
                        stamp = stamp_boss if kind == "eraser-boss" else None
                        out.append((f"enemy-{kind}{tag}-{d}-{anim}-{f}",
                                    (lambda builder=builder, anim=anim, f=f, turn=turn, scale=scale, stamp=stamp, bounds=BOUNDS.get(kind, (-17, -17, 17, 17, 36)):
                                     _bake(builder, anim, f, turn, scale, stamp, bounds))))
    for sid, fn in (("crown-elite", lambda m, Mt, anim, f: crown(m, Mt)), ("shot-ink", lambda m, Mt, anim, f: shot(m, Mt, False)),
                    ("shot-water", lambda m, Mt, anim, f: shot(m, Mt, True))):
        out.append((sid, (lambda fn=fn: _bake(fn, "idle", 0, 0, 1.0))))
    return out


def puppet_meta(baked: dict, elite: float, radii: dict) -> dict:
    """Per enemy variant: frames per animation and the native-pixel box, crown row and contact shadow of its frames.

    The shadow is the enemy's hit circle on the ground (a world circle of its radius is a 2:1 screen ellipse).
    """
    out = {}
    for kind in BUILDERS:
        for tag in ("", "@elite"):
            if tag and kind not in ELITEABLE:
                continue
            pre = f"enemy-{kind}{tag}-"
            frames = [b for sid, b in baked.items() if sid.startswith(pre)]
            if not frames:
                continue
            top = max(b.ay for b in frames)
            rx = round(radii[kind] * 0.707 * (elite if tag else 1))
            out[kind + tag] = {
                "frames": {anim: n for anim, n in ANIMS[kind]},
                "halfWidth": max(max(b.w - b.ax, b.ax) for b in frames),
                "top": top, "bottom": max(b.h - b.ay for b in frames),
                "crown": top + 2,
                "shadow": [max(3, rx), max(2, round(rx / 2))],
            }
    return out


# ---------------------------------------------------------------- contact sheets
def enemy_sheets(baked: dict, out_dir) -> None:
    """Per enemy (and elite): rows = directions, columns = every frame; plus a line-up of all kinds, front view."""
    from PIL import Image

    out_dir.mkdir(parents=True, exist_ok=True)
    for kind in BUILDERS:
        for tag in ("", "@elite"):
            pre = f"enemy-{kind}{tag}-"
            if not any(sid.startswith(pre) for sid in baked):
                continue
            anims = ANIMS[kind]
            cols = [(a, f) for a, n in anims for f in range(n)]
            big = kind == "eraser-boss" or tag
            cw, ch, k, fy = (74, 76, 3, 64) if big else (44, 48, 5, 40)
            im = Image.new("RGBA", (cw * len(cols), ch * len(DIRS)), (44, 66, 48, 255))
            px = im.load()
            for r, d in enumerate(DIRS):
                for c, (a, f) in enumerate(cols):
                    b = baked.get(f"{pre}{d}-{a}-{f}")
                    if not b:
                        continue
                    ox, oy = c * cw + cw // 2, r * ch + fy
                    for x in range(-8, 9):
                        px[ox + x, oy] = (26, 40, 29, 255)
                    for y in range(b.h):
                        for x in range(b.w):
                            col = b.pixels[y * b.w + x]
                            if col and 0 <= ox + x - b.ax < im.width and 0 <= oy + y - b.ay < im.height:
                                px[ox + x - b.ax, oy + y - b.ay] = _rgb(col) + (255,)
            im.resize((im.width * k, im.height * k), Image.NEAREST).save(out_dir / f"enemies-{kind}{tag.replace('@', '-')}.png")
    # The line-up: every kind (and the elites, the crown and the drops) in the front view, idle then walking.
    cells = [(f"enemy-{k}-{d}-idle-0", f"enemy-{k}-{d}-walk-1", f"enemy-{k}-{d}-hurt-0") for k in BUILDERS for d in ("se",)]
    cells += [(f"enemy-{k}@elite-se-idle-0", f"enemy-{k}@elite-se-walk-1", "crown-elite") for k in ELITEABLE]
    cells += [("shot-ink", "shot-water", "")]
    cw, ch, k, fy = 84, 96, 3, 84
    im = Image.new("RGBA", (cw * len(cells), ch), (44, 66, 48, 255))
    px = im.load()
    for c, group in enumerate(cells):
        ox, oy = c * cw + cw // 2, fy
        for x in range(-10, 11):
            px[ox + x, oy] = (26, 40, 29, 255)
        for i, sid in enumerate(group):
            b = baked.get(sid)
            if not b:
                continue
            dx = (i - 1) * 22 if len(group) == 3 and sid.startswith("shot") else 0
            dy = -36 if sid == "crown-elite" else 0
            for y in range(b.h):
                for x in range(b.w):
                    col = b.pixels[y * b.w + x]
                    if col and 0 <= ox + dx + x - b.ax < im.width and 0 <= oy + dy + y - b.ay < im.height:
                        px[ox + dx + x - b.ax, oy + dy + y - b.ay] = _rgb(col) + (255,)
    im.resize((im.width * k, im.height * k), Image.NEAREST).save(out_dir / "enemies-lineup.png")
