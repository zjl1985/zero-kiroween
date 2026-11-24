"""Voxel model authoring and the fixed-angle isometric bake (FEAT-003).

A model is a voxel grid around a world foot point. One voxel is 2 x 2 world
units on the ground and 1 native pixel high, so its top is a 2 x 1 px diamond
and 32 world units make the 32 x 16 px tile of src/render/iso/projection.ts
(k = 0.5). This is the sprite-stacking view of danielwh2/sprite-stacking
(stack turned 45 deg, squashed 0.5, lifted 1 px per slice), computed as an
exact orthographic ray cast per output pixel instead of drawing slices:

    screen x = a - b,  screen y = (a + b) / 2 - z     (a, b, z in voxel units)

so every pixel ray runs along (1, 1, 1) in voxel space and the first voxel
it meets is what the pixel shows, together with the face it entered through
(top, +x = screen-right, +y = screen-left).

Shading (docs/iso-art-spec.md): one moon light from the screen top-right.
Box voxels shade by their entered face (top step 4, right 3, left 2);
smooth primitives (blobs, roofs, cylinders) keep an analytic normal so a
roof plane is one flat tone and a leaf blob gets a lit top-right rim and a
dark lower-left. Then ambient occlusion in creases, crisp highlights on lit
edges, darker contour pixels where a nearer surface overlaps a farther one,
a single 1 px selective outline around the finished sprite, an emissive
layer (windows, lamp glass, candle flames) reported as light anchors, and a
hard ground shadow (moon top-right, shadow down-left) with a Bayer-dithered
edge. Everything is deterministic: no clocks, no unseeded randomness.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

# ---------------------------------------------------------------- light
_L = np.array([0.5, -0.3, 0.85], np.float64)
LIGHT = _L / np.linalg.norm(_L)
#: Shadow offset on the ground per pixel of height, in world units (down-left on screen).
SHADOW_DIR = (-0.15, 0.72)
#: Lambert thresholds -> ramp steps 5 (highlight) .. 1 (deep shade). Step 0 is the outline.
STEPS = ((0.93, 5), (0.62, 4), (0.18, 3), (-0.45, 2))


def step_of(d: np.ndarray) -> np.ndarray:
    out = np.ones(d.shape, np.int16)
    for thr, s in reversed(STEPS):
        out[d >= thr] = s
    return out


# ---------------------------------------------------------------- materials
@dataclass
class Material:
    name: str
    ramp: str
    bias: int = 0
    #: Light kind for emissive pixels (fixed tone, reported as anchors), or None.
    emit: str | None = None
    #: Fixed ramp step of an emissive material.
    glow: int = 4
    #: Chance per voxel of a +-1 tone (organic texture), from the voxel hash.
    jitter: float = 0.0
    #: Lit-edge highlight on box tops.
    rim: bool = True
    #: Smooth-normal highlight cap allowed.
    shine: bool = True


#: Most material ids (the voxel grid stores them as 16-bit values).
MATERIAL_CAP = 1024
MATERIALS: list[Material] = [Material("void", "ink")]
_BY_NAME: dict[str, int] = {"void": 0}


def mat(name: str, ramp: str, **kw) -> int:
    """Registers (once) and returns a material id."""
    if name in _BY_NAME:
        return _BY_NAME[name]
    MATERIALS.append(Material(name, ramp, **kw))
    _BY_NAME[name] = len(MATERIALS) - 1
    assert len(MATERIALS) < MATERIAL_CAP
    return _BY_NAME[name]


def vhash(i, j, k, salt: int) -> np.ndarray:
    """Integer hash of voxel coordinates in [0, 1) (numpy, deterministic)."""
    i = np.asarray(i, np.int64) & 0xFFFFFFFF
    j = np.asarray(j, np.int64) & 0xFFFFFFFF
    k = np.asarray(k, np.int64) & 0xFFFFFFFF
    salt = np.asarray(salt, np.int64) & 0xFFFFFFFF
    s = (i * 0x27D4EB2D) ^ (j * 0x165667B1) ^ (k * 0x9E3779B1) ^ (salt * 0x85EBCA6B)
    s &= 0xFFFFFFFF
    s ^= s >> 15
    s = (s * 0x2C1B3C6D) & 0xFFFFFFFF
    s ^= s >> 12
    s = (s * 0x297A2D39) & 0xFFFFFFFF
    s ^= s >> 15
    return (s & 0xFFFFFF) / float(0x1000000)


# ---------------------------------------------------------------- model
class Model:
    """
    A voxel grid x in [x0, x1), y in [y0, y1), z in [0, z1) (voxel units, foot at 0, 0).

    With `scale` s the grid holds s voxels per unit, so the same model function bakes an
    s times larger sprite made of unit pixels (an elite enemy at 1.55 times its size).
    Authoring code always works in units: X, Y, Z are divided back.
    """

    def __init__(self, x0: int, y0: int, x1: int, y1: int, z1: int, turn: float = 0, scale: float = 1):
        self.x0, self.y0 = round(x0 * scale), round(y0 * scale)
        X, Y, Z = round((x1 - x0) * scale), round((y1 - y0) * scale), round(z1 * scale)
        self.scale = scale
        self.m = np.zeros((X, Y, Z), np.uint16)
        self.n = np.zeros((X, Y, Z, 3), np.float32)
        wx, wy, wz = np.meshgrid(np.arange(X) + self.x0 + 0.5, np.arange(Y) + self.y0 + 0.5, np.arange(Z) + 0.5, indexing="ij")
        self.turn = turn % 4
        # Authoring coordinates: the world grid turned back by `turn` quarter turns, so the
        # same model function builds a real rotated variant (never a mirror).
        self.X, self.Y = self._unturn(wx, wy)
        self.X, self.Y, self.Z = self.X / scale, self.Y / scale, wz / scale

    def _unturn(self, x, y):
        if self.turn != int(self.turn):
            a = self.turn * math.pi / 2
            c, s = math.cos(a), math.sin(a)
            return c * x + s * y, c * y - s * x
        for _ in range(int(self.turn)):
            x, y = y, -x
        return x, y

    def _turn_normal(self, nx, ny):
        if self.turn != int(self.turn):
            a = self.turn * math.pi / 2
            c, s = math.cos(a), math.sin(a)
            return c * nx - s * ny, s * nx + c * ny
        for _ in range(int(self.turn)):
            nx, ny = -ny, nx
        return nx, ny

    # -------------------------------------------------- filling
    def fill(self, mask: np.ndarray, m: int, normal=None) -> np.ndarray:
        self.m[mask] = m
        if normal is None:
            self.n[mask] = 0
        else:
            nx, ny, nz = normal
            nx, ny = self._turn_normal(nx, ny)
            ln = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-9
            v = np.stack([nx / ln, ny / ln, nz / ln], -1).astype(np.float32)
            self.n[mask] = v[mask]
        return mask

    def paint(self, mask: np.ndarray, m: int) -> None:
        """Recolours filled voxels inside `mask` (keeps their normals)."""
        self.m[mask & (self.m > 0)] = m

    def carve(self, mask: np.ndarray) -> None:
        self.m[mask] = 0

    def filled(self) -> np.ndarray:
        return self.m > 0

    # -------------------------------------------------- primitives (authoring coordinates)
    def box(self, x0, y0, z0, x1, y1, z1, m: int, smooth=False):
        X, Y, Z = self.X, self.Y, self.Z
        mask = (X >= x0) & (X < x1) & (Y >= y0) & (Y < y1) & (Z >= z0) & (Z < z1)
        return self.fill(mask, m)

    def ellipsoid(self, cx, cy, cz, rx, ry, rz, m: int, lumpy=0.0, salt=0):
        dx, dy, dz = (self.X - cx) / rx, (self.Y - cy) / ry, (self.Z - cz) / rz
        q = dx * dx + dy * dy + dz * dz
        if lumpy:
            q = q + lumpy * (vhash(np.floor(self.X / 2), np.floor(self.Y / 2), np.floor(self.Z / 2), salt) - 0.5)
        mask = q < 1
        return self.fill(mask, m, (dx / rx, dy / ry, dz / rz))

    def cylinder(self, cx, cy, r, z0, z1, m: int, axis="z", ry=None):
        """Upright (axis z) or lying (axis x / y) cylinder; for lying ones (cx, cy) = (centre across, centre z)."""
        ry = ry or r
        if axis == "z":
            dx, dy = (self.X - cx) / r, (self.Y - cy) / ry
            mask = (dx * dx + dy * dy < 1) & (self.Z >= z0) & (self.Z < z1)
            return self.fill(mask, m, (dx, dy, np.zeros_like(dx)))
        if axis == "x":
            dy, dz = (self.Y - cx) / r, (self.Z - cy) / ry
            mask = (dy * dy + dz * dz < 1) & (self.X >= z0) & (self.X < z1)
            return self.fill(mask, m, (np.zeros_like(dy), dy, dz))
        dx, dz = (self.X - cx) / r, (self.Z - cy) / ry
        mask = (dx * dx + dz * dz < 1) & (self.Y >= z0) & (self.Y < z1)
        return self.fill(mask, m, (dx, np.zeros_like(dx), dz))

    def cone(self, cx, cy, r, z0, z1, m: int, ry=None):
        ry = ry or r
        h = z1 - z0
        k = np.clip((z1 - self.Z) / h, 0, 1)
        dx, dy = (self.X - cx) / ry, (self.Y - cy) / ry
        d = np.sqrt(dx * dx + dy * dy) + 1e-6
        mask = (d * ry < r * k) & (self.Z >= z0) & (self.Z < z1)
        return self.fill(mask, m, (dx / d * h, dy / d * h, np.full_like(dx, r)))

    def segment(self, p0, p1, r, m: int):
        """A round rod (branch, rope) from p0 to p1 with radius r."""
        p0, p1 = np.array(p0, float), np.array(p1, float)
        d = p1 - p0
        L2 = float(d @ d) + 1e-9
        px, py, pz = self.X - p0[0], self.Y - p0[1], self.Z - p0[2]
        t = np.clip((px * d[0] + py * d[1] + pz * d[2]) / L2, 0, 1)
        qx, qy, qz = px - t * d[0], py - t * d[1], pz - t * d[2]
        mask = qx * qx + qy * qy + qz * qz < r * r
        return self.fill(mask, m, (qx, qy, qz))

    def roof(self, x0, y0, x1, y1, z0, profile, ridge: str, m: int, thick=2.0):
        """A roof shell over (x0, y0) - (x1, y1): `profile(u)` gives the height over z0 at the
        distance u in [0, 1] from the ridge line (0) to the eave (1) and its slope dh/du."""
        X, Y, Z = self.X, self.Y, self.Z
        if ridge == "x":
            c, half, across, sgn = (y0 + y1) / 2, (y1 - y0) / 2, Y, np.sign(Y - (y0 + y1) / 2)
        else:
            c, half, across, sgn = (x0 + x1) / 2, (x1 - x0) / 2, X, np.sign(X - (x0 + x1) / 2)
        u = np.abs(across - c) / half
        h, slope = profile(np.clip(u, 0, 1))
        top = z0 + h
        inside = (X >= x0) & (X < x1) & (Y >= y0) & (Y < y1) & (u <= 1)
        mask = inside & (Z < top) & (Z >= top - thick - np.abs(slope) / half)
        g = sgn * slope / half  # dz per voxel across, outward
        flat = np.zeros_like(X)
        nrm = (g, flat, np.ones_like(X)) if ridge == "y" else (flat, g, np.ones_like(X))
        # Height decreases outward: the outward normal leans away from the ridge.
        nrm = (-nrm[0], -nrm[1], nrm[2])
        return self.fill(mask, m, nrm), top

    def under_roof(self, x0, y0, x1, y1, z0, profile, ridge: str, inset=1.0):
        """Mask of the gable wall volume under a roof profile (for end walls)."""
        X, Y, Z = self.X, self.Y, self.Z
        if ridge == "x":
            c, half, across = (y0 + y1) / 2, (y1 - y0) / 2, Y
        else:
            c, half, across = (x0 + x1) / 2, (x1 - x0) / 2, X
        u = np.abs(across - c) / half
        h, _ = profile(np.clip(u, 0, 1))
        return (X >= x0) & (X < x1) & (Y >= y0) & (Y < y1) & (Z >= z0) & (Z < z0 + h - inset)


def gable(h):
    return lambda u: (h * (1 - u), np.full_like(u, -h))


def gambrel(h_low, h_high, knee=0.55):
    """Barn roof: a steep lower slope from the eave to the knee, a shallow upper one to the ridge."""
    def f(u):
        upper = u < knee
        h = np.where(upper, h_low + h_high * (1 - u / knee), h_low * (1 - (u - knee) / (1 - knee)))
        s = np.where(upper, -h_high / knee, -h_low / (1 - knee))
        return h, s
    return f


def hip(m: Model, x0, y0, x1, y1, z0, h, mat_id, thick=2.0):
    """A hip roof: four planes meeting at a short ridge along the longer side."""
    X, Y, Z = m.X, m.Y, m.Z
    cx, cy, hx, hy = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
    s = min(hx, hy)
    ux = (np.abs(X - cx) - (hx - s)) / s
    uy = (np.abs(Y - cy) - (hy - s)) / s
    u = np.maximum(ux, uy)
    top = z0 + h * (1 - u)
    inside = (X >= x0) & (X < x1) & (Y >= y0) & (Y < y1) & (u <= 1)
    mask = inside & (Z < top) & (Z >= top - thick - h / s)
    useX = ux >= uy
    g = h / s
    nx = np.where(useX, np.sign(X - cx) * g, 0)
    ny = np.where(useX, 0, np.sign(Y - cy) * g)
    m.fill(mask, mat_id, (nx, ny, np.ones_like(X)))
    return top


# ---------------------------------------------------------------- four-view carving
def carve_views(m: Model, top: list[str], side: list[str], front: list[str], key: dict[str, int],
                origin=(0, 0), round_=False) -> None:
    """Visual-hull carving from ASCII orthographic views (the views_to_slices.py idea).

    `top` rows run along +y (north to south), columns along +x; `side` rows are z from the
    top down, columns along +y; `front` rows are z from the top down, columns along +x.
    A voxel is filled when all three views cover it; its material comes from the front view
    letter (falling back to the side view). With `round_`, each slice is clipped to the
    ellipse its spans describe (the vendored --round lathe)."""
    H = len(side)
    Wx = len(front[0])
    Wy = len(side[0])
    ox, oy = origin
    for z in range(H):
        r = H - 1 - z
        for yy in range(Wy):
            if side[r][yy] == ".":
                continue
            for xx in range(Wx):
                c = front[r][xx]
                if c == "." or top[yy][xx] == ".":
                    continue
                if round_:
                    xs = [i for i, ch in enumerate(front[r]) if ch != "."]
                    ys = [i for i, ch in enumerate(side[r]) if ch != "."]
                    rx = (xs[-1] - xs[0]) / 2 + 0.5
                    ry = (ys[-1] - ys[0]) / 2 + 0.5
                    if ((xx - (xs[0] + xs[-1]) / 2) / rx) ** 2 + ((yy - (ys[0] + ys[-1]) / 2) / ry) ** 2 >= 1:
                        continue
                i, j = ox + xx - m.x0, oy + yy - m.y0
                if 0 <= i < m.m.shape[0] and 0 <= j < m.m.shape[1] and z < m.m.shape[2]:
                    m.m[i, j, z] = key.get(c, key.get(side[r][yy], 0))
                    m.n[i, j, z] = 0


# ---------------------------------------------------------------- bake
@dataclass
class Baked:
    w: int
    h: int
    ax: int
    ay: int
    #: Row-major colour per pixel ('' transparent).
    pixels: list[str]
    lights: list[dict] = field(default_factory=list)
    shadow: dict | None = None
    #: Ground extent of the filled voxels in local world units (x, y, w, d).
    extent: dict | None = None


def _occ(m: np.ndarray, i, j, k) -> np.ndarray:
    X, Y, Z = m.shape
    ok = (i >= 0) & (i < X) & (j >= 0) & (j < Y) & (k >= 0) & (k < Z)
    out = np.zeros(np.shape(i), bool)
    out[ok] = m[i[ok], j[ok], k[ok]] > 0
    return out


def bake(model: Model, ramps: dict[str, list[str]], shadow=True, outline=True) -> Baked:
    occ = model.m
    X, Y, Z = occ.shape
    x0, y0 = model.x0, model.y0
    # Screen bounds of the grid box (foot-relative pixels).
    cs = [(a, b, z) for a in (x0, x0 + X) for b in (y0, y0 + Y) for z in (0, Z)]
    sxs = [a - b for a, b, _ in cs]
    sys_ = [(a + b) / 2 - z for a, b, z in cs]
    px0, px1 = math.floor(min(sxs)) - 2, math.ceil(max(sxs)) + 2
    py0, py1 = math.floor(min(sys_)) - 2, math.ceil(max(sys_)) + 2
    W, H = px1 - px0, py1 - py0
    py, px = np.mgrid[py0:py1, px0:px1]
    s = px.reshape(-1) + 0.5
    t = py.reshape(-1) + 0.5
    A0 = s / 2 + t + Z - x0
    B0 = t + Z - s / 2 - y0
    fa, fb = A0 - np.floor(A0), B0 - np.floor(B0)
    N = Z + 1
    n = np.arange(N, dtype=np.float64)
    lo, hi = np.minimum(fa, fb), np.maximum(fa, fb)
    a_first = fa < fb
    # Events per unit: z crossing at n, then the a / b crossings at n + frac.
    tau = np.stack([np.broadcast_to(n, (len(s), N)), n[None, :] + lo[:, None], n[None, :] + hi[:, None]], -1).reshape(len(s), -1)
    lab_lo = np.where(a_first, 1, 2)
    lab_hi = np.where(a_first, 2, 1)
    lab = np.stack([np.zeros((len(s), N), np.int8), np.broadcast_to(lab_lo[:, None], (len(s), N)), np.broadcast_to(lab_hi[:, None], (len(s), N))], -1).reshape(len(s), -1)
    eps = 1e-4
    ia = np.floor(A0[:, None] - tau - eps).astype(np.int64)
    ib = np.floor(B0[:, None] - tau - eps).astype(np.int64)
    ic = np.floor(Z - tau - eps).astype(np.int64)
    hit = _occ(occ, ia, ib, ic)
    anyhit = hit.any(1)
    first = hit.argmax(1)
    rows = np.arange(len(s))
    HI, HJ, HK = ia[rows, first], ib[rows, first], ic[rows, first]
    face = lab[rows, first]
    depth = tau[rows, first]
    HI, HJ, HK = np.where(anyhit, HI, 0), np.where(anyhit, HJ, 0), np.where(anyhit, HK, 0)
    mid = np.where(anyhit, occ[HI, HJ, HK], 0)

    # Normals: stored analytic ones, else the entered face.
    nrm = model.n[HI, HJ, HK].astype(np.float64)
    smooth = np.abs(nrm).sum(1) > 0
    fn = np.zeros((len(s), 3))
    fn[face == 0, 2] = 1
    fn[face == 1, 0] = 1
    fn[face == 2, 1] = 1
    nrm = np.where(smooth[:, None], nrm, fn)
    d = nrm @ LIGHT
    step = step_of(d)
    # Box voxels never reach the highlight from shading alone.
    step = np.where(~smooth & (step > 4), 4, step)

    mats = MATERIALS
    bias = np.array([mt.bias for mt in mats])[mid]
    jit = np.array([mt.jitter for mt in mats])[mid]
    rim = np.array([mt.rim for mt in mats], bool)[mid]
    shine = np.array([mt.shine for mt in mats], bool)[mid]
    emissive = np.array([mt.emit is not None for mt in mats], bool)[mid]
    glow = np.array([mt.glow for mt in mats])[mid]
    gi, gj = HI + x0, HJ + y0
    if True:
        hv = vhash(gi, gj, HK, 7 + mid)
        step = step + np.where(hv < jit / 2, -1, 0) + np.where((hv >= jit / 2) & (hv < jit), 1, 0)
    step = np.where(shine | (step <= 4), step, 4)
    # Ambient occlusion: creases next to walls, under overhangs, at the ground.
    top_face = (face == 0) & ~smooth
    crease_top = top_face & (
        _occ(occ, HI - 1, HJ, HK + 1) | _occ(occ, HI, HJ - 1, HK + 1) | _occ(occ, HI + 1, HJ, HK + 1) | _occ(occ, HI, HJ + 1, HK + 1))
    right = (face == 1) & ~smooth
    left = (face == 2) & ~smooth
    over_r = right & (_occ(occ, HI + 1, HJ, HK + 1) | _occ(occ, HI + 1, HJ, HK + 2) | _occ(occ, HI + 1, HJ - 1, HK) | _occ(occ, HI + 1, HJ + 1, HK))
    over_l = left & (_occ(occ, HI, HJ + 1, HK + 1) | _occ(occ, HI, HJ + 1, HK + 2) | _occ(occ, HI - 1, HJ + 1, HK) | _occ(occ, HI + 1, HJ + 1, HK))
    under = smooth & (_occ(occ, HI, HJ, HK + 1) & _occ(occ, HI + 1, HJ + 1, HK + 1))
    ground = (HK == 0) & ~top_face
    ao = crease_top | over_r | over_l | ground | under
    step = step - ao.astype(np.int16)
    # Lit edges: a box top whose +x neighbour is open gets the highlight.
    edge = top_face & rim & ~_occ(occ, HI + 1, HJ, HK) & ~crease_top
    step = np.where(edge, 5, step)
    step = step + bias
    step = np.where(emissive, glow, step)
    step = np.clip(step, 1, 5)

    step2 = step.reshape(H, W)
    mid2 = mid.reshape(H, W)
    dep2 = np.where(anyhit, depth, 1e9).reshape(H, W)
    opaque = mid2 > 0
    # Contours: a farther pixel next to a much nearer one steps down (cluster and eave lines).
    darker = np.zeros_like(opaque)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nb = np.roll(np.roll(dep2, dy, 0), dx, 1)
        nbo = np.roll(np.roll(opaque, dy, 0), dx, 1)
        darker |= opaque & nbo & (nb < dep2 - 2.6)
    em2 = emissive.reshape(H, W)
    step2 = np.where(darker & ~em2, np.maximum(1, step2 - 1), step2)

    ramp_of = [ramps[mt.ramp] for mt in mats]
    pix = np.full((H, W), "", dtype=object)
    for y in range(H):
        for x in range(W):
            if opaque[y, x]:
                pix[y, x] = ramp_of[mid2[y, x]][int(step2[y, x])]
    if outline:
        out = pix.copy()
        for y in range(H):
            for x in range(W):
                if opaque[y, x]:
                    continue
                for dy, dx in ((1, 0), (0, -1), (0, 1), (-1, 0)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and opaque[yy, xx]:
                        out[y, x] = ramp_of[mid2[yy, xx]][0]
                        break
        pix = out
    filled = pix != ""
    ys, xs = np.nonzero(filled)
    if not len(ys):
        raise ValueError("empty model")
    cy0, cy1, cx0, cx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = pix[cy0:cy1, cx0:cx1]
    ax, ay = int(-(px0 + cx0)), int(-(py0 + cy0))

    # Emissive anchors: clusters of emissive pixels, merged per kind within 5 px.
    lights = []
    seen = np.zeros_like(opaque)
    for y in range(H):
        for x in range(W):
            if not (em2[y, x] and opaque[y, x]) or seen[y, x]:
                continue
            kind = mats[mid2[y, x]].emit
            stack, pts = [(y, x)], []
            seen[y, x] = True
            while stack:
                cy, cx = stack.pop()
                pts.append((cy, cx))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = cy + dy, cx + dx
                        if 0 <= yy < H and 0 <= xx < W and not seen[yy, xx] and em2[yy, xx] and mats[mid2[yy, xx]].emit == kind:
                            seen[yy, xx] = True
                            stack.append((yy, xx))
            my = sum(p[0] for p in pts) / len(pts)
            mx = sum(p[1] for p in pts) / len(pts)
            lights.append({"kind": kind, "x": mx + px0 + 0.5, "y": my + py0 + 0.5, "n": len(pts)})
    merged: list[dict] = []
    for l in sorted(lights, key=lambda l: (-l["n"], l["y"], l["x"])):
        for q in merged:
            if q["kind"] == l["kind"] and abs(q["x"] - l["x"]) <= 5 and abs(q["y"] - l["y"]) <= 5:
                tot = q["n"] + l["n"]
                q["x"] = (q["x"] * q["n"] + l["x"] * l["n"]) / tot
                q["y"] = (q["y"] * q["n"] + l["y"] * l["n"]) / tot
                q["n"] = tot
                break
        else:
            merged.append(dict(l))
    lights = [{"kind": l["kind"], "x": int(round(l["x"])), "y": int(round(l["y"]))} for l in sorted(merged, key=lambda l: (l["y"], l["x"], l["kind"]))]

    # Ground extent in world units.
    fi, fj, _ = np.nonzero(occ)
    k = 2 / getattr(model, "scale", 1)
    extent = {"x": int(k * (x0 + fi.min())), "y": int(k * (y0 + fj.min())),
              "w": int(k * (fi.max() - fi.min() + 1)), "d": int(k * (fj.max() - fj.min() + 1))}

    sh = None
    if shadow:
        ci, cj, ck = np.nonzero(occ)
        wx = 2 * (ci + x0 + 0.5) + SHADOW_DIR[0] * (ck + 0.5)
        wy = 2 * (cj + y0 + 0.5) + SHADOW_DIR[1] * (ck + 0.5)
        sx = (wx - wy) / 2
        sy = (wx + wy) / 4
        gx = np.floor(sx).astype(np.int64)
        gy = np.floor(sy).astype(np.int64)
        pts = set()
        for ddx in (-1, 0):
            for a, b in zip((gx + ddx).tolist(), gy.tolist()):
                pts.add((a, b))
        sx0 = min(p[0] for p in pts)
        sy0 = min(p[1] for p in pts)
        sw = max(p[0] for p in pts) - sx0 + 1
        shh = max(p[1] for p in pts) - sy0 + 1
        grid = np.zeros((shh, sw), bool)
        for a, b in pts:
            grid[b - sy0, a - sx0] = True
        # Close one-pixel holes, then dither the rim with a checkerboard.
        pad = np.pad(grid, 1)
        holes = ~pad[1:-1, 1:-1] & pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
        grid |= holes
        pad = np.pad(grid, 1)
        inner = pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
        yy, xx = np.mgrid[0:shh, 0:sw]
        rimpx = grid & ~inner
        grid &= ~(rimpx & (((xx + sx0) + (yy + sy0)) % 2 == 1))
        sh = {"x": int(sx0), "y": int(sy0), "w": int(sw), "h": int(shh), "mask": grid}
    return Baked(w=int(cx1 - cx0), h=int(cy1 - cy0), ax=ax, ay=ay, pixels=crop.reshape(-1).tolist(),
                 lights=lights, shadow=sh, extent=extent)
