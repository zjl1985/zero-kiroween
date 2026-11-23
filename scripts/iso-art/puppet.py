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

Directions: turn 0..3 faces world +x, +y, -x, -y, i.e. se, sw, nw, ne on screen. The
cat's right side is authoring +y.
Animations: idle 2 frames (breath), walk 6 frames (contact, down, pass on each side),
hurt 1 frame (recoil). Everything is deterministic.
"""
from __future__ import annotations

import math

import numpy as np

from voxel import Model, bake, mat

DIRS = ("se", "sw", "nw", "ne")
ANIMS = (("idle", 2), ("walk", 6), ("hurt", 1))


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
        self.acc = list(data["accessories"])
        self.body = {k: (v.lower() if isinstance(v, str) and v.startswith("#") else v) for k, v in data["body"].items()}
        self.outline = ramps["ink"][0]
        self.night = ramps["ink"][1]
        self.moon = ramps["cloth"][4]
        self.ramps: dict[str, list[str]] = {}
        self.mats: dict[str, int] = {}

    def ramp(self, role: str, base: str, light=0.3, shade=0.3, deep=0.55, light_to=None) -> int:
        """A flat puppet ramp: outline, deep, shade, base, base, lit."""
        name = f"puppet-{self.id}-{role}"
        lit = mix(base, light_to or self.moon, light)
        self.ramps[name] = [self.outline, mix(base, self.night, deep), mix(base, self.night, shade), base, base, lit]
        self.mats[role] = mat(name, name, rim=False, jitter=0.0)
        return self.mats[role]


# ---------------------------------------------------------------- cat recipes
def zero_look(look: Look) -> dict:
    P, B = look.p, look.body
    look.ramp("fur", P["head"])
    look.ramp("muzzle", mix(P["headLight"], "#fff4e0", 0.3), light=0.15, shade=0.2)
    look.ramp("ear", P["earInner"], shade=0.15)
    look.ramp("hair", P["mark"], light=0.45, light_to="#fff6cc", shade=0.22)
    look.ramp("root", mix(P["headDark"], P["mark"], 0.25), light=0.25)
    look.ramp("coat", mix(B["body"], "#3a3348", 0.5), light=0.32, shade=0.35)
    look.ramp("trouser", mix(B["fold"], "#2e2a3c", 0.4), light=0.3, shade=0.3)
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
    look.ramp("muzzle", P["headLight"], light=0.1)
    look.ramp("ear", P["earInner"], shade=0.15)
    # Long dark hair: a cool moonlit lit step keeps it from merging with the night.
    look.ramp("hair", mix(P["headDark"], "#2a2236", 0.55), light=0.42, light_to="#8c86b4", shade=0.25, deep=0.4)
    look.ramp("tee", B["body"], light=0.25, light_to="#ffffff", shade=0.2, deep=0.36)
    look.ramp("jeans", B["denim"], light=0.32, light_to=B["denimEdge"], shade=0.3)
    look.ramp("sleeve", B["body"], light=0.25, light_to="#ffffff", shade=0.2, deep=0.36)
    look.ramp("arm", B["arm"], light=0.25)
    look.ramp("paw", B["paw"], light=0.3)
    look.ramp("shoe", mix(B["fold"], "#3b4458", 0.4), light=0.3)
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


def _bone(m: Model, a, b, r, mid):
    m.segment(a, b, r, mid)


def build_cat(look: Look, rec: dict, anim: str, f: int, turn: int) -> tuple[Model, dict]:
    """The posed puppet as a voxel model plus the 3D anchors of its face (authoring coordinates)."""
    M = look.mats
    pz = pose_of(anim, f)
    m = Model(-11, -11, 11, 11, 36, turn=turn)
    bob, lean = pz["bob"], pz["lean"]
    slim = rec["build"] == "slim"
    coat = rec["outfit"] == "coat"
    leg_mat = M["trouser"] if coat else M["jeans"]
    foot_mat = M["paw"] if coat else M["shoe"]
    hip_z = 7.0 + bob
    # -------------------------------------------------- legs (two bones, paws planted unless lifted)
    for side, (ang, lift) in zip((-1, 1), pz["legs"]):
        y = side * (1.45 if slim else 1.65)
        hip = np.array([0.0 + lean * 0.3, y, hip_z])
        a = math.radians(ang)
        ankle = np.array([hip[0] + 5.2 * math.sin(a), y + side * pz["spread"] * 0.4, 1.4 + lift])
        knee = (hip + ankle) / 2 + np.array([0.5 + lift * 0.5, 0, 0.2])
        _bone(m, hip, knee, 1.35 if not slim else 1.2, leg_mat)
        _bone(m, knee, ankle, 1.2 if not slim else 1.1, leg_mat)
        m.ellipsoid(ankle[0] + 0.8, ankle[1], 0.95 + lift, 1.85, 1.2, 1.05, foot_mat)
    # -------------------------------------------------- tail (behind, curling up)
    tail_mat = M["tail"]
    pts = []
    for k in range(7):
        t = k / 6
        pts.append((-2.4 - 2.8 * t + 0.4 * t * t, pz["tail"] * t * t + 2.2 * t * t, 6.5 + bob + 6.5 * t ** 1.3 + pz["tail_up"] * t))
    for a, b in zip(pts, pts[1:]):
        _bone(m, a, b, 0.95, tail_mat)
    # -------------------------------------------------- torso
    tx, tz = lean * 0.4, 10.8 + bob
    if coat:
        m.ellipsoid(tx, 0, tz, 3.0, 3.75, 4.3, M["coat"])
        # Bib down the front, a belt, and the gold-trimmed hem.
        body = m.m == M["coat"]
        m.paint(body & (m.X > tx + 1.6) & (np.abs(m.Y) < 1.3) & (m.Z > tz - 1.0), M["bib"])
        # A short cape over the back.
        m.ellipsoid(tx - 1.1, 0, tz + 0.6, 2.4, 4.0, 4.4, M["cape"])
        m.carve((m.X > tx - 0.4) & (m.m == M["cape"]))
        m.carve((m.m == M["cape"]) & (m.Z < tz - 3.6))
    else:
        m.ellipsoid(tx, 0, tz, 2.75, 3.35, 4.2, M["tee"])
        m.paint((m.m == M["tee"]) & (m.Z < tz - 1.2), M["jeans"])
    # -------------------------------------------------- arms
    sh_z = 13.4 + bob
    for side, ang in zip((-1, 1), pz["arms"]):
        y = side * (3.55 if not slim else 3.2)
        sh = np.array([tx + 0.1, y, sh_z])
        a = math.radians(ang)
        out = side * (0.5 + pz["spread"] * 1.2)
        hand = sh + np.array([4.4 * math.sin(a), out, -4.4 * math.cos(a)])
        elbow = (sh + hand) / 2 + np.array([0.3, side * 0.15, 0])
        if coat:
            _bone(m, sh, elbow, 1.2, M["sleeve"])
            _bone(m, elbow, hand, 1.1, M["sleeve"])
            m.ellipsoid(hand[0] + 0.2, hand[1], hand[2] - 0.3, 1.3, 1.25, 1.25, M["fur"])
        else:
            _bone(m, sh, elbow, 1.2, M["sleeve"])
            _bone(m, elbow, hand, 1.0, M["arm"])
            m.ellipsoid(hand[0] + 0.2, hand[1], hand[2] - 0.3, 1.2, 1.15, 1.15, M["paw"])
    # -------------------------------------------------- head
    hx, hz = 0.5 + lean, 20.2 + bob + pz["head_dz"]
    rx, ry, rz = 4.9, 5.6, 5.0
    if rec["hair"] == "long":
        # Hair volume behind the head first, so the head itself wins where they overlap.
        m.ellipsoid(hx - 2.3, 0, hz - 3.2, 3.7, 5.6, 6.6, M["hair"])
        m.carve((m.m == M["hair"]) & (m.Z < 10.5 + bob))
    m.ellipsoid(hx, 0, hz, rx, ry, rz, M["fur"])
    # Muzzle: a light bump low on the face.
    m.ellipsoid(hx + rx - 1.3, 0, hz - 1.9, 1.7, 2.6, 1.6, M["muzzle"])
    if rec["hair"] == "tuft":
        # Blond swept tuft: a cap over the crown, dark roots under it, and a forward flick
        # swept towards the cat's left.
        cap = ((m.X - hx + 0.3) / 4.8) ** 2 + (m.Y / 5.2) ** 2 + ((m.Z - hz - 1.4) / 4.2) ** 2 < 1
        m.paint(cap & (m.m == M["fur"]) & (m.Z > hz + 3.4), M["hair"])
        m.paint(cap & (m.m == M["fur"]) & (m.Z > hz + 2.8) & (m.Z <= hz + 3.4) & (m.X > hx - 1.0), M["root"])
        m.segment((hx + 1.0, 0.8, hz + 4.6), (hx + 3.6, -1.6, hz + 5.6), 1.15, M["hair"])
        m.segment((hx + 3.6, -1.6, hz + 5.6), (hx + 4.4, -3.0, hz + 4.6), 0.85, M["hair"])
        m.segment((hx - 0.5, 1.6, hz + 4.6), (hx + 2.0, 2.6, hz + 5.2), 0.9, M["hair"])
    else:
        # Long dark hair: crown, side curtains framing the face, heavier on the cat's left.
        crown = ((m.X - hx + 0.4) / 5.3) ** 2 + (m.Y / 6.0) ** 2 + ((m.Z - hz - 0.2) / 5.4) ** 2 < 1
        m.fill(crown & (m.m == 0) & (m.Z > hz - 0.5) & (m.X < hx + 0.6), M["hair"])
        m.fill(crown & (m.m == 0) & (m.Z > hz + 2.6), M["hair"])
        m.paint(crown & (m.Z > hz + 3.0) & (m.m == M["fur"]), M["hair"])
        for side, low in ((-1, 7.0), (1, 5.2)):
            curtain = (np.abs(m.Y - side * 5.3) < 1.1) & (m.X > hx - 3.0) & (m.X < hx + 1.8) & (m.Z > hz - low) & (m.Z < hz + 1.5)
            m.fill(curtain & (m.m == 0), M["hair"])
    # Ears, built after the hair so they keep the fur colour over any hair cap and stand clear of it:
    # a cone rising from the crown, pink inside on its forward face; spread and flattened when hurt.
    ear = {"spread": 3.0, "top": 6.4, "r": 2.0, "base": 2.8} if not pz["hurt"] else {"spread": 4.0, "top": 4.2, "r": 2.0, "base": 3.0}
    for side in (-1, 1):
        ey = side * ear["spread"]
        base, tip = hz + ear["base"], hz + ear["base"] + ear["top"]
        m.cone(hx - 0.3, ey, ear["r"], base, tip, M["fur"])
        m.paint((m.m == M["fur"]) & (m.X > hx + 0.3) & (np.abs(m.Y - ey) < 1.1) & (m.Z > base + 1.2) & (m.Z < base + ear["top"] * 0.7), M["ear"])
    # -------------------------------------------------- chain (Zero): dips lower on the cat's left with a pendant
    if rec["chain"]:
        cz = tz + 3.2
        pts = [(tx + 0.6, -3.0, cz + 0.6), (tx + 2.3, -1.8, cz - 1.1), (tx + 2.9, -0.6, cz - 1.9), (tx + 2.8, 0.8, cz - 1.0), (tx + 1.6, 2.4, cz + 0.3), (tx + 0.4, 3.1, cz + 0.7)]
        for a, b in zip(pts, pts[1:]):
            m.segment(a, b, 0.42, M["chain"])
        m.ellipsoid(tx + 3.0, -0.7, cz - 2.5, 0.75, 0.8, 0.9, M["chain"])
    anchors = {
        "head": (hx, 0.0, hz),
        "eyes": [(hx + rx * math.cos(math.radians(34)) - 0.2, s * ry * math.sin(math.radians(34)) * 0.92, hz + 1.2) for s in (-1, 1)],
        "nose": (hx + rx + 0.3, 0.0, hz - 1.1),
        "mouth": (hx + rx + 0.2, 0.0, hz - 2.4),
        "cheeks": [(hx + rx * math.cos(math.radians(55)), s * ry * math.sin(math.radians(55)), hz - 1.6) for s in (-1, 1)],
    }
    return m, {"pose": pz, "anchors": anchors}


# ---------------------------------------------------------------- projection of anchors
def turn_point(p, turn: int):
    """Authoring -> world coordinates (the inverse of Model._unturn)."""
    x, y, z = p
    for _ in range(turn % 4):
        x, y = -y, x
    return x, y, z


def project(p, turn: int) -> tuple[float, float]:
    """Foot-relative screen pixel of a voxel-space authoring point."""
    x, y, z = turn_point(p, turn)
    return x - y, (x + y) / 2 - z


# ---------------------------------------------------------------- face stamps
def stamp_face(b, look: Look, rec: dict, info: dict, turn: int) -> None:
    if DIRS[turn] not in ("se", "sw"):
        return
    W, H = b.w, b.h
    px = b.pixels
    head_cols = set()
    for role in ("fur", "muzzle", "hair", "root", "ear"):
        name = f"puppet-{look.id}-{role}"
        if name in look.ramps:
            head_cols.update(look.ramps[name][1:])

    def at(p):
        sx, sy = project(p, turn)
        return math.floor(sx) + b.ax, math.floor(sy) + b.ay

    def put(x, y, c, over=None):
        if 0 <= x < W and 0 <= y < H:
            cur = px[y * W + x]
            if cur and (cur in (over or head_cols)):
                px[y * W + x] = c

    P = look.p
    ink = look.outline
    hurt = info["pose"]["hurt"]
    A = info["anchors"]
    eyes = sorted((at(e) for e in A["eyes"]), key=lambda e: e[0])
    (lx, ly), (rx_, ry_) = eyes
    ny = round((ly + ry_) / 2)
    # Cheeks and nose / mouth first, so the eyewear lands on top.
    if "blush" in P and rec["eyes"] == "glasses":
        for c in A["cheeks"]:
            cx, cy = at(c)
            put(cx, cy, P["blush"])
            put(cx + (1 if cx > (lx + rx_) / 2 else -1), cy, P["blush"])
    nx, nyy = at(A["nose"])
    put(nx, nyy, P["nose"])
    mx, my = at(A["mouth"])
    if hurt:
        put(mx, my, ink)
        put(mx, my + 1, ink)
    else:
        put(mx - 1, my, mix(P["nose"], P["headLight"], 0.3))
        put(mx + 1, my, mix(P["nose"], P["headLight"], 0.3))
    glint = "#ffffff"
    if rec["eyes"] == "sunglasses":
        lens = mix(ink, "#1c1a2c", 0.4)
        sheen = mix(lens, "#8c9cc8", 0.6)
        for ex, ey_ in ((lx, ny), (rx_, ny)):
            for dx in (-1, 0, 1):
                for dy in (0, 1):
                    put(ex + dx, ey_ + dy, lens)
            put(ex + 1, ey_, sheen)
        for x in range(lx + 2, rx_ - 1):
            put(x, ny, lens)
        # Temple arms towards the ears.
        put(lx - 2, ny, lens)
        put(rx_ + 2, ny, lens)
        if hurt:
            put(lx, ny + 2, ink)
            put(rx_, ny + 2, ink)
    else:
        frame = mix(ink, "#2c2438", 0.3)
        eye = mix(P["ink"], "#3a2a2a", 0.15)
        for ex in (lx - 1, rx_ - 1):
            for dx in range(4):
                put(ex + dx, ny - 1, frame)
                put(ex + dx, ny + 2, frame)
            for dy in range(0, 2):
                put(ex, ny + dy, frame)
                put(ex + 3, ny + dy, frame)
            if hurt:
                put(ex + 1, ny + 1, eye)
                put(ex + 2, ny, eye)
            else:
                put(ex + 1, ny, eye)
                put(ex + 1, ny + 1, eye)
                put(ex + 2, ny, glint)
        for x in range(lx + 3, rx_ - 1):
            put(x, ny, frame)


# ---------------------------------------------------------------- sprite table
_LOOKS: dict = {}
_RAMPS: dict = {}


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
                    out.append((f"cat-{cid}-{d}-{anim}-{f}", (lambda look=look, rec=rec, anim=anim, f=f, turn=turn: bake_cat(look, rec, anim, f, turn))))
    return out


def bake_cat(look: Look, rec: dict, anim: str, f: int, turn: int):
    m, info = build_cat(look, rec, anim, f, turn)
    b = bake(m, _RAMPS, shadow=False, outline=True)
    stamp_face(b, look, rec, info, turn)
    return b


# ---------------------------------------------------------------- contact sheets
def cat_sheets(baked: dict, out_dir) -> None:
    """Per cat: rows = directions, columns = idle 0-1, walk 0-5, hurt; 1x and 6x."""
    from PIL import Image

    out_dir.mkdir(parents=True, exist_ok=True)
    cats = sorted({k.split("-")[1] for k in baked if k.startswith("cat-")})
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
