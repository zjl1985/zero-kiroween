"""Voxel puppets of the two playable cats (FEAT-005).

Each cat is a chibi anthropomorphic cat built from small voxel volumes (head with ears,
muzzle and hair, torso, two-bone legs and arms, a tail) hung on a fixed-length skeleton
that is posed per frame (the pixelfx rig idea: 3D bones of fixed length, posed, then
rendered to pixels). The posed model is baked by voxel.py in four real directions by
turning the whole model a quarter turn at a time (never mirrored), so asymmetric identity
points such as Zero's chain pendant and hair sweep stay on the same side of the cat.

Shading is deliberately flat: every puppet ramp has one shared dark outline step, a
deep and a plain shade, two equal base steps and one lit step, so the bake's Lambert
steps collapse to three tones plus the single outline. Face features (eyes, glasses,
nose, mouth, cheeks) are pixel stamps placed at the projected 3D points of the eyes and
nose after the bake, only on head pixels and only in the two front views, so they read
at 1x instead of depending on how single voxels happen to project.

A costume (costumes.py) hangs extra voxel parts on the same bones while the puppet is
built (behind the body, between the hair and the ears, or in front) and adds face
stamps; its frame is baked in exactly the pose of the base frame.
Directions: turn 0..3 faces world +x, +y, -x, -y, i.e. se, sw, nw, ne on screen. The
cat's right side is authoring +y.
Animations: idle 2 frames (breath), walk 6 frames (contact, down, pass on each side),
hurt 1 frame (recoil). Everything is deterministic.
"""
from __future__ import annotations

import math

import numpy as np

from voxel import Model, bake, mat
from roster import bake_roster
from reference_cats import reference_pose

DIRS = ("se", "sw", "nw", "ne")
ANIMS = (("idle", 2), ("walk", 6), ("hurt", 1))
SELECT_TURN, SELECT_DENSITY = 0.5, 1.75
# The four views lean slightly toward the camera axis to keep both ears
# and both lenses visible while the actor still turns in the world.
VIEW_TURNS = (0.14, 0.86, 2.14, 2.86)


# ---------------------------------------------------------------- colours
def _rgb(h: str) -> tuple[int, int, int]:
    return int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)


def _hex(c) -> str:
    return "#" + "".join(f"{max(0, min(255, round(v))):02x}" for v in c)


def mix(a: str, b: str, t: float) -> str:
    pa, pb = _rgb(a), _rgb(b)
    return _hex([x + (y - x) * t for x, y in zip(pa, pb)])


class Look:
    """Per-cat colours and feature choices, derived from the dumped identity data."""

    def __init__(self, cid: str, data: dict, ramps: dict):
        self.id = cid
        self.p = {k: v.lower() for k, v in data["palette"].items()}
        self.head_rects = data["headRects"]
        self.acc = list(data["accessories"])
        self.body = {k: (v.lower() if isinstance(v, str) and v.startswith("#") else v) for k, v in data["body"].items()}
        self.outline = ramps["ink"][0]
        self.night = ramps["ink"][1]
        self.moon = ramps["cloth"][4]
        self.ramps: dict[str, list[str]] = {}
        self.mats: dict[str, int] = {}
        #: role -> recipe of the cat's own materials, so a costume can dye them the same way.
        self.tones: dict[str, dict] = {}

    def tone(self, key: str, base: str, light=0.3, shade=0.3, deep=0.55, light_to=None, pre=None) -> int:
        """A flat puppet ramp under material `key`: outline, deep, shade, base, base, lit."""
        if pre:
            base = mix(base, pre[0], pre[1])
        lit = mix(base, light_to or self.moon, light)
        self.ramps[key] = [self.outline, mix(base, self.night, deep), mix(base, self.night, shade), base, base, lit]
        return mat(key, key, rim=False, jitter=0.0)

    def ramp(self, role: str, base: str, **kw) -> int:
        """Registers the cat's own material `role` (`puppet-<id>-<role>`)."""
        self.tones[role] = kw
        self.mats[role] = self.tone(f"puppet-{self.id}-{role}", base, **kw)
        return self.mats[role]

    def worn(self, cid: str, role: str, base: str) -> int:
        """The recipe of `role` dyed with a costume garment colour (`puppet-<id>@<costume>-<role>`)."""
        return self.tone(f"puppet-{self.id}@{cid}-{role}", base, **self.tones[role])


# ---------------------------------------------------------------- cat recipes
def zero_look(look: Look) -> dict:
    P, B = look.p, look.body
    look.ramp("fur", P["head"])
    look.ramp("edge", P["headDark"], light=0.23, light_to="#655152", shade=0.17)
    look.ramp("muzzle", P["headLight"], light=0.16, shade=0.14)
    look.ramp("ear", P["earInner"], shade=0.15)
    look.ramp("hair", P["mark"], light=0.45, light_to="#fff6cc", shade=0.22)
    look.ramp("root", mix(P["headDark"], P["mark"], 0.12), light=0.23)
    look.ramp("coat", B["body"], pre=("#3a3348", 0.5), light=0.32, shade=0.35)
    look.ramp("trouser", B["fold"], pre=("#2e2a3c", 0.4), light=0.3, shade=0.3)
    look.ramp("bib", B["bib"], light=0.3)
    look.ramp("cape", B["cape"], light=0.28)
    look.ramp("trim", B["trim"], light=0.3)
    look.ramp("belt", B["belt"], light=0.25)
    look.ramp("sleeve", B["arm"], light=0.3)
    look.ramp("paw", B["paw"], light=0.35)
    look.ramp("tail", B["tail"], light=0.3)
    look.ramp("chain", B["metal"], light=0.55, light_to="#fff6cc", shade=0.2)
    return {"build": "broad", "hair": "tuft", "outfit": "coat", "chain": True, "eyes": "sunglasses"}


def nicole_look(look: Look) -> dict:
    P, B = look.p, look.body
    look.ramp("fur", P["head"])
    look.ramp("edge", P["headDark"], light=0.23, light_to="#655152", shade=0.17)
    look.ramp("muzzle", P["headLight"], light=0.1)
    look.ramp("ear", P["earInner"], shade=0.15)
    # Long dark hair: a cool moonlit lit step keeps it from merging with the night.
    look.ramp("hair", mix(P["headDark"], "#322639", 0.37), light=0.36, light_to="#786579", shade=0.18, deep=0.4)
    look.ramp("hair_glint", "#514052", light=0.18, light_to="#a893a0", shade=0.3)
    look.ramp("tee", B["body"], light=0.25, light_to="#ffffff", shade=0.2, deep=0.36)
    look.ramp("jeans", B["denim"], light=0.32, light_to=B["denimEdge"], shade=0.3)
    look.ramp("cuff", mix(B["denim"], "#c0cce4", 0.48), light=0.18, shade=0.2)
    look.ramp("sleeve", B["body"], light=0.25, light_to="#ffffff", shade=0.2, deep=0.36)
    look.ramp("arm", B["arm"], light=0.25)
    look.ramp("paw", B["paw"], light=0.3)
    look.ramp("tail", B["tail"], light=0.3)
    return {"build": "slim", "hair": "long", "outfit": "tee", "chain": False, "eyes": "glasses"}


RECIPES = {"zero": zero_look, "nicole": nicole_look}


# ---------------------------------------------------------------- rig
def pose_of(anim: str, f: int) -> dict:
    """Bone angles and offsets of one frame (degrees; + is forward)."""
    p = {"bob": 0.0, "head_dz": 0.0, "lean": 0.0, "legs": [(0.0, 0.0), (0.0, 0.0)], "arms": [4.0, 4.0],
         "spread": 0.0, "tail": 0.0, "tail_up": 0.0, "hurt": False}
    if anim == "idle":
        if f == 1:
            p.update(head_dz=-1.0, arms=[6.0, 6.0], tail=0.9, bob=-0.0)
            p["breath"] = True
    elif anim == "walk":
        ph = 2 * math.pi * f / 6 + math.pi / 2
        s, c = math.sin(ph), math.cos(ph)
        # Left leg (-y) swings forward with sin; the leg on its way forward lifts its paw.
        p["legs"] = [(30 * s, 1.7 * max(0.0, c)), (-30 * s, 1.7 * max(0.0, -c))]
        p["arms"] = [-30 * s, 30 * s]
        p["bob"] = 1.0 if abs(s) < 0.7 else 0.0
        p["tail"] = 1.3 * math.sin(ph - 0.9)
    else:
        p.update(lean=-1.2, head_dz=-0.6, arms=[52.0, 52.0], spread=1.0, tail=0.0, tail_up=2.5, hurt=True,
                 legs=[(16.0, 0.0), (-10.0, 0.0)])
    return p


class Rig:
    """The puppet while it is being built, for costume parts (authoring coordinates)."""

    def __init__(self, m: Model, M: dict, pz: dict, rec: dict):
        self.m, self.M, self.pose, self.rec = m, M, pz, rec
        self.hurt = bool(pz["hurt"])
        #: Right paw first, then the left one.
        self.hands: list[tuple[float, float, float]] = []
        self.ears: list[dict] = []
        #: Head centre (x, z) and torso centre (x, z); both sit on y = 0.
        self.head = (0.0, 0.0)
        self.torso = (0.0, 0.0)


def _bone(m: Model, a, b, r, mid):
    m.segment(a, b, r, mid)


def cheek_block(m: Model, cx: float, cz: float, mid: int):
    """Low squared head with a bevel only at the corners."""
    a = np.maximum(np.abs(m.X - cx) - 2.9, 0)
    b = np.maximum(np.abs(m.Y) - 5.8, 0)
    c = np.maximum(np.abs(m.Z - cz) - 4.4, 0)
    mask = a * a + b * b + c * c <= 1.55 ** 2
    m.fill(mask, mid, (a * np.sign(m.X - cx), b * np.sign(m.Y), c * np.sign(m.Z - cz)))


def build_cat(look: Look, rec: dict, anim: str, f: int, turn: float, wear=None, density: float = 1) -> tuple[Model, dict]:
    """The posed puppet as a voxel model plus the 3D anchors of its face (authoring coordinates).

    `wear` (costumes.py Wear) may dye the garments and add parts behind the body, between the hair
    and the ears, in front of everything, and face stamps.
    """
    M = dict(look.mats)
    if wear:
        M.update(wear.garments(rec))
    pz = pose_of(anim, f)
    m = Model(-11, -11, 11, 11, 36, turn=turn, scale=density)
    if density > 1:
        pz.update(arms=[10.0, 6.0], spread=0.75, tail=2.2, legs=[(8, 0.0), (-3, 0.0)])
    bob, lean = pz["bob"], pz["lean"]
    slim = rec["build"] == "slim"
    coat = rec["outfit"] == "coat"
    leg_mat = M["trouser"] if coat else M["jeans"]
    foot_mat = M["fur"] if coat else M["paw"]
    hip_z = 5.7 + bob
    rig = Rig(m, M, pz, rec)
    # Bone centres a part can hang on before the body exists (the torso and head fills below use the same values).
    rig.torso = (lean * 0.4, 9.75 + bob)
    rig.head = (0.35 + lean, 17.65 + bob + pz["head_dz"])
    if wear:
        wear.behind(rig)
    # -------------------------------------------------- legs (two bones, paws planted unless lifted)
    for side, (ang, lift) in zip((-1, 1), pz["legs"]):
        y = side * (1.75 if slim else 1.95)
        hip = np.array([0.0 + lean * 0.3, y, hip_z])
        a = math.radians(ang)
        ankle = np.array([hip[0] + 4.0 * math.sin(a), y + side * pz["spread"] * 0.4, 1.25 + lift])
        knee = (hip + ankle) / 2 + np.array([0.5 + lift * 0.5, 0, 0.2])
        _bone(m, hip, knee, 1.65 if coat else 1.6, leg_mat)
        _bone(m, knee, ankle, 1.45 if coat else 1.42, leg_mat)
        if not coat:
            m.paint((m.m == leg_mat) & (np.abs(m.Y - y) < 2.0)
                    & (m.Z > 1.5 + lift) & (m.Z < 2.8 + lift), M["cuff"])
        m.ellipsoid(ankle[0] + 0.8, ankle[1], 0.9 + lift, 1.7, 1.42, 1.0, foot_mat)
    # -------------------------------------------------- tail (behind, curling up)
    tail_mat = M["tail"]
    pts = []
    for k in range(7):
        t = k / 6
        pts.append((-2.4 - 3.3 * t, (pz["tail"] + 3.4) * t * t,
                    4.5 + bob + (3.25 + pz["tail_up"]) * t ** 2.6))
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        _bone(m, a, b, 1.11, tail_mat if coat or i >= 4 else M["edge"])
    # -------------------------------------------------- torso
    tx, tz = rig.torso
    if coat:
        m.ellipsoid(tx, 0, tz - 0.5, 3.25, 4.45, 4.95, M["coat"])
        # Bib down the front, and a short cape over the back with the gold-trimmed hem.
        body = m.m == M["coat"]
        m.paint(body & (m.X > tx + 1.6) & (np.abs(m.Y) < 1.3) & (m.Z > tz - 1.0), M["bib"])
        m.ellipsoid(tx - 1.15, 0, tz - 0.2, 2.35, 4.45, 4.65, M["cape"])
        m.carve((m.X > tx - 0.4) & (m.m == M["cape"]))
        m.carve((m.m == M["cape"]) & (m.Z < tz - 4.6))
    else:
        m.ellipsoid(tx, 0, tz - .2, 2.95, 4.0, 4.15, M["tee"])
        m.paint((m.m == M["tee"]) & (m.Z < tz - 2.3), M["jeans"])
    # -------------------------------------------------- arms
    sh_z = 11.8 + bob
    for side, ang in zip((-1, 1), pz["arms"]):
        y = side * (3.9 if not slim else 3.7)
        sh = np.array([tx + 0.1, y, sh_z])
        a = math.radians(ang)
        out = side * (0.5 + pz["spread"] * 1.2)
        hand = sh + np.array([3.4 * math.sin(a), out, -3.6 * math.cos(a)])
        elbow = (sh + hand) / 2 + np.array([0.3, side * 0.15, 0])
        if coat:
            _bone(m, sh, elbow, 1.2, M["sleeve"])
            _bone(m, elbow, hand, 1.1, M["sleeve"])
            m.ellipsoid(hand[0] + 0.2, hand[1], hand[2] - 0.3, 1.3, 1.25, 1.25, M["fur"])
        else:
            _bone(m, sh, elbow, 1.2, M["sleeve"])
            _bone(m, elbow, hand, 1.0, M["arm"])
            m.ellipsoid(hand[0] + 0.2, hand[1], hand[2] - 0.3, 1.2, 1.15, 1.15, M["paw"])
        rig.hands.append((float(hand[0]), float(hand[1]), float(hand[2])))
    # -------------------------------------------------- head
    hx, hz = rig.head
    cheek_block(m, hx, hz, M["fur"])
    front = m.X > hx + 2.7
    # The cream mask is flush with the flat face, with a smaller chin step.
    muzzle = (np.abs(m.Y) < 3.85) & (m.Z >= hz - 3.95) & (m.Z <= hz - .3)
    muzzle |= (np.abs(m.Y) < 2.8) & (m.Z >= hz - 4.55) & (m.Z < hz - 3.95)
    m.paint((m.m == M["fur"]) & front & muzzle, M["muzzle"])
    # Dark temples and chin edge are part of the original squared silhouette.
    temple = (np.abs(m.Y) > 5.9) & (m.Z < hz + 2.5)
    chin = (m.Z < hz - 4.7) & (m.X > hx - 1.0)
    m.paint((m.m == M["fur"]) & (temple | chin), M["edge"])
    if rec["hair"] == "tuft":
        # Two separate gold forelocks leave most of the tan forehead visible.
        m.paint((m.m == M["fur"]) & (m.Z > hz + 4.4) & (m.X < hx + 1.05), M["edge"])
        left = (m.Y > -4.75) & (m.Y < -2.25) & (m.Z > hz + 3.55)
        right = (m.Y > 3.14) & (m.Y < 5.1) & (m.Z > hz + 4.18)
        sweep = (m.Z > hz + 2.75) & (m.Y > -4.1) & (m.Y < -2.8)
        m.paint((m.m == M["fur"]) & (m.X > hx - .4) & (left | right | sweep), M["hair"])
        m.paint((m.m == M["fur"]) & (m.X < hx - 1.6) & (m.Z > hz + 3.6)
                & (np.abs(m.Y) > 2.7) & (np.abs(m.Y) < 4.8), M["hair"])
        stripe = (np.abs(m.Y + .45) < .55) | (np.abs(m.Y - 2.45) < .55)
        m.paint(np.isin(m.m, (M["fur"], M["hair"])) & stripe & (m.Z > hz + 2.25) & front, M["root"])
    else:
        # Dark hair stays continuous around the nape and frames both cheeks.
        part = 4.25 - .49 * np.abs(m.Y - .3)
        curtains = ((m.Y < -4.8) | (m.Y > 5.3)) & (m.Z > hz - 4.5)
        nape = (m.X < hx + .1) & (m.Z > hz - 4.65)
        stripe = (np.abs(m.Y + .45) < .55) | (np.abs(m.Y - 2.45) < .5)
        m.paint((m.m == M["fur"]) & ((m.Z > hz + part) | curtains | nape
                | (stripe & front & (m.Z > hz + 2.45))), M["hair"])
        m.paint((m.m == M["hair"]) & (m.Z > hz + 3.9)
                & (m.Y > .8) & (m.Y < 2.0) & (m.X < hx + 2.2), M["hair_glint"])
    if wear:
        wear.mid(rig)
    # Tall stepped ears. The dark edge and pink centre match the avatar.
    ear = {"spread": 4.65, "top": 6.5, "r": 2.4, "base": 3.0} if not pz["hurt"] else {"spread": 5.0, "top": 4.5, "r": 2.25, "base": 3.0}
    for side in (-1, 1):
        ey = side * ear["spread"]
        base, tip = hz + ear["base"], hz + ear["base"] + ear["top"]
        t = np.clip((m.Z - base) / ear["top"], 0, 1)
        wing = np.abs(m.Y - ey - side * t * .75)
        width = ear["r"] * (1 - .72 * t)
        ear_shape = (np.abs(m.X - hx + .45) < 1.35) & (wing < width) & (m.Z >= base) & (m.Z < tip)
        m.fill(ear_shape, M["edge"], (np.ones_like(m.X), np.zeros_like(m.Y), np.zeros_like(m.Z)))
        m.paint(ear_shape & (m.X > hx - .48) & (wing < width - .28) & (t > .02) & (t < .86), M["ear"])
        # A warm inner rim below the dark tips reads even from the side.
        rim = ear_shape & (wing < width - .22) & (t > .66) & (t < .88)
        m.fill(rim, M["fur"], (np.zeros_like(m.X), np.zeros_like(m.Y), np.ones_like(m.Z)))
        rig.ears.append({"x": hx - .45, "y": ey, "base": base, "tip": tip, "r": ear["r"]})
    if wear:
        wear.front(rig)
    # -------------------------------------------------- chain (Zero): dips lower on the cat's left with a pendant
    if rec["chain"]:
        cz = tz + 2.7
        pts = [(tx + 1.2, -2.4, cz + .5), (tx + 2.8, -1.5, cz - .25), (tx + 3.2, -.55, cz - .95), (tx + 3.1, .65, cz - .35), (tx + 2.25, 1.8, cz + .28), (tx + .95, 2.5, cz + .65)]
        for a, b in zip(pts, pts[1:]):
            m.segment(a, b, 0.42, M["chain"])
        m.ellipsoid(tx + 3.2, -.55, cz - 1.45, .72, .72, .82, M["chain"])
    anchors = {
        "head": (hx, 0.0, hz),
        "eyes": [(hx + 3.7, s * 3.25, hz + .75) for s in (-1, 1)],
        "nose": (hx + 3.82, 0.0, hz - 1.45),
        "mouth": (hx + 3.82, 0.0, hz - 2.65),
        "cheeks": [(hx + 3.5, s * 4.23, hz - 2.2) for s in (-1, 1)],
    }
    return m, {"pose": pz, "anchors": anchors}


# ---------------------------------------------------------------- projection of anchors
def turn_point(p, turn: float):
    """Authoring -> world coordinates (the inverse of Model._unturn)."""
    x, y, z = p
    if turn != int(turn):
        a = turn * math.pi / 2
        c, s = math.cos(a), math.sin(a)
        return c * x - s * y, s * x + c * y, z
    for _ in range(int(turn) % 4):
        x, y = -y, x
    return x, y, z


def project(p, turn: float) -> tuple[float, float]:
    """Foot-relative screen pixel of a voxel-space authoring point."""
    x, y, z = turn_point(p, turn)
    return x - y, (x + y) / 2 - z


# ---------------------------------------------------------------- face stamps
def head_colours(look: Look) -> set[str]:
    return {colour for role in ("fur", "muzzle", "hair", "hair_glint", "root", "ear", "edge")
            for colour in look.ramps.get(f"puppet-{look.id}-{role}", [])[1:]}


def stamp_whiskers(b, look: Look, info: dict, turn: float, density: float) -> None:
    """Step the outside whiskers from the cheek silhouette in screen pixels."""
    A = info["anchors"]
    _, center_y = project(A["head"], turn)
    _, nose_y = project(A["nose"], turn)
    row = round((center_y + nose_y) * density / 2)
    w, h = b.w, b.h
    head = head_colours(look)
    marks = {}
    for dy, reach in ((-2, 2), (0, 3), (2, 2)):
        py = row + round(dy * density)
        i = (py + b.ay) * w
        if i < 0 or i >= w * h:
            continue
        skin = [u for u in range(w) if b.pixels[i + u] in head]
        if not skin:
            continue
        for direction, u in ((-1, skin[0]), (1, skin[-1])):
            for step in range(1, round(reach * density) + 1):
                col = u + direction * step
                px = col - b.ax
                # Preserve any costume part already covering the whisker.
                if abs(px) >= round(16 * density) or (0 <= col < w and b.pixels[i + col] not in ("", look.outline)):
                    break
                marks[(px, py)] = look.p["ink"]
    if not marks:
        return
    x0 = min(-b.ax, min(x for x, _ in marks))
    x1 = max(w - b.ax, max(x for x, _ in marks) + 1)
    width = x1 - x0
    pixels = [""] * (width * h)
    for y in range(h):
        offset = y * width - b.ax - x0
        pixels[offset:offset + w] = b.pixels[y * w:(y + 1) * w]
    for (x, y), colour in marks.items():
        pixels[(y + b.ay) * width + x - x0] = colour
    b.ax, b.w, b.pixels = -x0, width, pixels


class Face:
    """Pixel stamps on the head of a baked front frame (the two back views get no face)."""

    def __init__(self, b, look: Look, info: dict, turn: float, density: float):
        W, H = b.w, b.h
        px = b.pixels
        head_cols = head_colours(look)

        # Record where the bare head is visible before drawing face details:
        # reflections, makeup and eyes can then layer over marks already placed.
        head = tuple(p if p in head_cols else "" for p in px)

        def at(p):
            sx, sy = project(p, turn)
            return math.floor(sx * density) + b.ax, math.floor(sy * density) + b.ay

        def put(x, y, c):
            if 0 <= x < W and 0 <= y < H:
                i = y * W + x
                if head[i]:
                    px[i] = c

        def clear(x, y):
            if 0 <= x < W and 0 <= y < H:
                i = y * W + x
                if head[i]:
                    px[i] = head[i]

        A = info["anchors"]
        eyes = sorted((at(e) for e in A["eyes"]), key=lambda e: e[0])
        self.lx, self.rx_ = eyes[0][0], eyes[1][0]
        self.ny = round((eyes[0][1] + eyes[1][1]) / 2)
        self.nose, self.mouth, self.cheeks = at(A["nose"]), at(A["mouth"]), [at(c) for c in A["cheeks"]]
        self.portrait = density > 1
        self.put = put
        self.clear = clear
        self.hurt = info["pose"]["hurt"]


def face_of(b, look: Look, info: dict, turn: float, density: float):
    return Face(b, look, info, turn, density) if 0 <= turn <= 1 else None


def stamp_face(face: Face, look: Look, rec: dict, portrait: bool) -> None:
    P = look.p
    ink = look.outline
    lx, rx_, ny = face.lx, face.rx_, face.ny
    put = face.put
    # Cheeks and nose / mouth first, so the eyewear lands on top.
    if "blush" in P:
        for cx, cy in face.cheeks:
            if portrait:
                cy = max(cy, ny + 4)
            put(cx, cy, P["blush"])
            direction = 1 if cx > (lx + rx_) / 2 else -1
            put(cx + direction, cy, P["blush"])
            if portrait:
                put(cx - direction, cy, P["blush"])
                put(cx + direction * 2, cy, P["blush"])
                put(cx + direction, cy + 1, mix(P["blush"], P["headLight"], .24))
                for dx, dy in ((3, 0), (4, 0), (3, 2), (4, 2)):
                    put(cx + direction * dx, cy + dy, mix(P["nose"], P["head"], .36))
    nx, nyy = face.nose
    put(nx, nyy, P["ink"])
    mx, my = face.mouth
    if portrait:
        put(nx - 1, nyy, P["nose"])
        put(nx + 1, nyy, P["nose"])
        put(nx, nyy + 1, P["nose"])
        put(mx, my - 1, ink)
        put(mx, my, ink)
        put(mx - 1, my + 1, ink)
        put(mx + 1, my + 1, ink)
    elif face.hurt:
        put(mx, my, ink)
        put(mx, my + 1, ink)
    else:
        put(mx, my, P["ink"])
        put(mx - 1, my + 1, P["ink"])
        put(mx + 1, my + 1, P["ink"])
    glint = "#ffffff"
    if rec["eyes"] == "sunglasses":
        lens = P["ink"]
        sheen = mix(lens, "#8c9cc8", 0.58)
        half = 3 if portrait else 2
        for ex in (lx, rx_):
            for dy in range(-2 if portrait else -1, 4 if portrait else 2):
                inset = 1 if portrait and dy == 3 else 0
                for dx in range(-half + inset, half + int(portrait) - inset):
                    put(ex + dx, ny + dy, lens)
            put(ex - half + 1, ny, sheen if portrait else P["white"])
            if portrait:
                put(ex - half + 2, ny, "#bcb9d0")
                put(ex - half + 1, ny + 1, sheen)
        for x in range(lx + half + int(portrait), rx_ - half):
            put(x, ny, ink)
            if portrait:
                put(x, ny - 1, ink)
        # Temple arms towards the ears.
        put(lx - half - 1, ny - 1, lens)
        put(rx_ + half + 1, ny - 1, lens)
        if face.hurt:
            put(lx, ny + 2, ink)
            put(rx_, ny + 2, ink)
    else:
        frame = P["ink"]
        eye = P["ink"]
        half = 3 if portrait else 1
        top, bottom = (-2, 3) if portrait else (-1, 2)
        for ex in (lx, rx_):
            for dx in range(-half, half + 1):
                put(ex + dx, ny + top, frame)
                put(ex + dx, ny + bottom, frame)
            for dy in range(top + 1, bottom):
                put(ex - half, ny + dy, frame)
                put(ex + half, ny + dy, frame)
            if face.hurt:
                put(ex, ny + 1, eye)
            else:
                put(ex, ny + 1, eye)
                put(ex, ny, glint if not portrait else eye)
                if portrait:
                    put(ex - 1, ny - 1, glint)
                    put(ex - 1, ny, eye)
                    put(ex + 1, ny, eye)
                    put(ex + 1, ny + 1, eye)
        for x in range(lx + half + 1, rx_ - half):
            put(x, ny - 1, frame)


# ---------------------------------------------------------------- sprite table
_LOOKS: dict = {}
_RAMPS: dict = {}
_BASE: dict = {}
_SELECT_BASE: dict = {}


def looks() -> dict:
    return _LOOKS


def cat_ramps(inputs: dict, base_ramps: dict) -> dict:
    """Registers the puppet materials once and returns their ramps (merged into the bake ramps)."""
    if not _LOOKS:
        for cid, data in inputs["cats"].items():
            if cid in RECIPES:
                look = Look(cid, data, base_ramps)
                _LOOKS[cid] = (look, RECIPES[cid](look))
    out = {}
    for look, _ in _LOOKS.values():
        out.update(look.ramps)
    return out


def use_ramps(r: dict) -> None:
    _RAMPS.clear()
    _RAMPS.update(r)


def cat_sprites():
    """[(sprite id, builder -> Baked)] for every cat, direction, animation and frame."""
    out = []
    for cid, (look, rec) in _LOOKS.items():
        for turn, d in enumerate(DIRS):
            for anim, n in ANIMS:
                for f in range(n):
                    out.append((f"cat-{cid}-{d}-{anim}-{f}",
                                lambda cid=cid, anim=anim, f=f, turn=turn: reference_pose(cid, anim, f, turn)))
        out.append((f"cat-{cid}-select", (lambda look=look, rec=rec: bake_selection(look, rec))))
    return out


def bake_cat(look: Look, rec: dict, anim: str, f: int, turn: float, wear=None, density: float = 1):
    """The baked frame of a posed puppet (with an optional costume), face stamps included."""
    turn = VIEW_TURNS[int(turn)] if density == 1 else turn
    m, info = build_cat(look, rec, anim, f, turn, wear, density)
    # Costume parts register their materials while they are built; the bake looks every material's ramp up.
    for own, _ in _LOOKS.values():
        _RAMPS.update(own.ramps)
    b = bake(m, _RAMPS, shadow=False, outline=True)
    # A puppet stands on its paws, a few world units round its foot (1 voxel = 2 world units).
    b.extent = {"x": -4, "y": -6, "w": 14, "d": 12}
    stamp_whiskers(b, look, info, turn, density)
    face = face_of(b, look, info, turn, density)
    if face:
        stamp_face(face, look, rec, density > 1)
        if wear:
            wear.stamp(face, look, rec)
    return b


def bake_selection(look: Look, rec: dict, wear=None):
    """Exact Meow Wall heads and authored costume details for selection."""
    if wear is None:
        return bake_roster(look)
    if look.id not in _SELECT_BASE:
        _SELECT_BASE[look.id] = bake_cat(look, rec, "idle", 0, SELECT_TURN, density=SELECT_DENSITY)
    posed = bake_cat(look, rec, "idle", 0, SELECT_TURN, wear, SELECT_DENSITY)
    return bake_roster(look, posed, _SELECT_BASE[look.id])


def base_cat(look: Look, rec: dict, anim: str, f: int, turn: int):
    """The memoised mannequin used to recover the costume's added pixels."""
    key = (look.id, anim, f, turn)
    if key not in _BASE:
        _BASE[key] = bake_cat(look, rec, anim, f, turn)
    return _BASE[key]


# ---------------------------------------------------------------- contact sheets
def cat_sheets(baked: dict, out_dir) -> None:
    """Per cat: rows = directions, columns = idle 0-1, walk 0-5, hurt; 1x and 6x."""
    from PIL import Image

    out_dir.mkdir(parents=True, exist_ok=True)
    selection = [b for k, b in baked.items() if k.endswith("-select") and "@" not in k]
    if selection:
        cw, fy = 54, max(b.ay for b in selection) + 6
        im = Image.new("RGBA", (cw * len(selection), fy + 10), (22, 36, 44, 255))
        for i, b in enumerate(selection):
            sprite = Image.new("RGBA", (b.w, b.h))
            sprite.putdata([_rgb(col) + (255,) if col else (0, 0, 0, 0) for col in b.pixels])
            im.alpha_composite(sprite, (i * cw + cw // 2 - b.ax, fy - b.ay))
        im.save(out_dir / "cats-selection.png")
        im.resize((im.width * 5, im.height * 5), Image.NEAREST).save(out_dir / "cats-selection@5x.png")
    cats = sorted({k.split("-")[1] for k in baked if k.startswith("cat-") and "@" not in k})
    for cid in cats:
        ids = [[f"cat-{cid}-{d}-{a}-{f}" for a, n in ANIMS for f in range(n)] for d in DIRS]
        cells = [baked[i] for row in ids for i in row if i in baked]
        if not cells:
            continue
        cw = max(b.w for b in cells) + 8
        ch = max(b.h for b in cells) + 8
        fy = max(b.ay for b in cells) + 4
        cols = len(ids[0])
        for bg, tag in (((22, 36, 44), ""), ((44, 66, 48), "-grass")):
            im = Image.new("RGBA", (cw * cols, ch * len(ids)), bg + (255,))
            pxs = im.load()
            for r, row in enumerate(ids):
                for c, sid in enumerate(row):
                    b = baked.get(sid)
                    if not b:
                        continue
                    ox, oy = c * cw + cw // 2 - b.ax, r * ch + fy - b.ay
                    # Foot marker row.
                    for x in range(-5, 6):
                        X, Y = c * cw + cw // 2 + x, r * ch + fy
                        rr, gg, bb, _ = pxs[X, Y]
                        pxs[X, Y] = (int(rr * 0.6), int(gg * 0.6), int(bb * 0.7), 255)
                    for y in range(b.h):
                        for x in range(b.w):
                            col = b.pixels[y * b.w + x]
                            if col:
                                pxs[ox + x, oy + y] = _rgb(col) + (255,)
            im.save(out_dir / f"cats-{cid}{tag}.png")
            im.resize((im.width * 6, im.height * 6), Image.NEAREST).save(out_dir / f"cats-{cid}{tag}@6x.png")
        hs = [b.h for b in cells]
        print(f"cat {cid}: heights {min(hs)}..{max(hs)}, widths {min(b.w for b in cells)}..{max(b.w for b in cells)}, colours {len(set(c for b in cells for c in b.pixels if c))}")
