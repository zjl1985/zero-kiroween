"""Voxel costume layers for the cat puppets (FEAT-009).

A costume distils its character into at most about three identity points (no human
face, no real logo): a hat or a pair of headphones, something in the right paw, a
pack or a board, a collar, a garment dye and a few face marks. Each point is a small
voxel part hung on the same bones as the puppet while it is being built:

    behind   before the body (a pack on the back, a board under the paws, a shell)
    mid      after the hair and before the ears (a band the ears then cover)
    front    after the ears (hats, collars, the item in the paw)
    face     pixel stamps on the head of the two front views

Every costumed frame is baked in exactly the pose of its base frame and emitted as
the pixels that differ from the base frame, so the layer lies pixel-exact on the
base frame drawn under it and the result is the full costumed bake. A costume never
shrinks the silhouette: every pixel of the base frame is covered or kept.
"""
from __future__ import annotations

import math

import numpy as np

from puppet import ANIMS, DIRS, Look, _rgb, bake_cat, base_cat, mix
from voxel import Baked, gable

# ---------------------------------------------------------------- small builders
def ring(m, cx, cy, rx, ry, z0, z1, thick, material):
    """A thin band round a vertical axis: the rim of an ellipse between z0 and z1."""
    q = ((m.X - cx) / rx) ** 2 + ((m.Y - cy) / ry) ** 2
    return m.fill((q < 1) & (q > (1 - thick) ** 2) & (m.Z >= z0) & (m.Z < z1), material)


def card(m, cx, cy, cz, hw, hh, t, material):
    """A flat card facing forward: `hw` wide (x), `hh` tall (z), `t` half its thickness (y)."""
    m.box(cx - hw, cy - t, cz - hh, cx + hw, cy + t, cz + hh, material)


def between(a, b):
    return min(a, b), max(a, b)


def ear_space(rig, pad=0.9, top=0.7):
    """Voxels just round and above the ears: a hat carved there leaves the ears poking through it."""
    m = rig.m
    out = np.zeros(m.m.shape, bool)
    for e in rig.ears:
        k = (e["tip"] + top - m.Z) / (e["tip"] - e["base"])
        d = np.sqrt((m.X - e["x"]) ** 2 + (m.Y - e["y"]) ** 2)
        out |= (d < (e["r"] + pad) * k) & (m.Z > e["base"] - 0.3) & (m.Z < e["tip"] + top)
    return out


def hat(rig, materials):
    """Carves the ear space out of a hat so the ears show through it."""
    rig.m.carve(np.isin(rig.m.m, list(materials)) & ear_space(rig))


# ---------------------------------------------------------------- head
def bowler(rig, w):
    """guido: a round comic bowler hat with a band."""
    m, (hx, hz) = rig.m, rig.head
    felt = w.tone("hat", "#2b2730", light=0.36)
    band = w.tone("hatband", "#514a5c", light=0.3)
    m.cylinder(hx - 0.3, 0, 7.3, hz + 2.9, hz + 3.7, felt, ry=7.7)
    m.ellipsoid(hx - 0.3, 0, hz + 4.0, 5.4, 5.8, 3.0, felt)
    m.paint((m.m == felt) & (m.Z < hz + 4.4), band)
    hat(rig, (felt, band))


def cap(rig, w):
    """dario: a soft cap with a short visor."""
    m, (hx, hz) = rig.m, rig.head
    cloth = w.tone("cap", w.tag, light=0.28)
    visor = w.tone("visor", mix(w.tag, "#2a2236", 0.42), light=0.3)
    m.ellipsoid(hx + 0.2, 0.4, hz + 3.8, 5.8, 6.1, 2.9, cloth)
    m.box(hx + 4.6, -3.4, hz + 2.9, hx + 7.2, 3.8, hz + 3.7, visor)
    hat(rig, (cloth, visor))


def page_hat(rig, w):
    """gates: a folded paper hat: a band with a tent folded over it."""
    m, (hx, hz) = rig.m, rig.head
    paper = w.tone("paper", w.ink, light=0.1, shade=0.22, deep=0.42)
    m.cylinder(hx, 0, 5.7, hz + 3.5, hz + 4.7, paper, ry=6.1)
    m.roof(hx - 5.5, -5.8, hx + 5.5, 5.8, hz + 4.6, gable(4.6), "y", paper, thick=1.2)
    hat(rig, (paper,))


def headphones_band(rig, w):
    """karpathy, mid stage: the band passes behind the ears."""
    m, (hx, hz) = rig.m, rig.head
    dark = w.tone("phones", "#2f3440", light=0.34)
    pts = [(hx - 0.5, 6.0 * math.sin(t), hz + 2.0 + 6.2 * math.cos(t)) for t in np.linspace(-1.25, 1.25, 10)]
    for a, b in zip(pts, pts[1:]):
        m.segment(a, b, 0.62, dark)


def headphones_cups(rig, w):
    m, (hx, hz) = rig.m, rig.head
    dark = w.tone("phones", "#2f3440", light=0.34)
    pad = w.tone("phonepad", w.tag, light=0.22)
    for side in (-1, 1):
        m.ellipsoid(hx - 0.3, side * 6.0, hz + 2.4, 2.2, 1.3, 2.4, dark)
        m.paint((m.m == dark) & (side * m.Y > 6.5) & (np.abs(m.X - hx + 0.3) < 1.1) & (np.abs(m.Z - hz - 2.4) < 1.2), pad)


def goggles(rig, w):
    """musk: paper driving goggles pushed up on the forehead, with their strap."""
    m, (hx, hz) = rig.m, rig.head
    leather = w.tone("strap", "#4a3530", light=0.32)
    glass = w.tone("glass", "#8fb0c8", light=0.28, shade=0.25)
    ring(m, hx, 0, 4.0, 4.6, hz + 3.9, hz + 4.6, 0.26, leather)
    for side in (-1, 1):
        m.cylinder(side * 2.0, hz + 4.7, 1.5, hx + 1.6, hx + 3.7, leather, axis="x")
        m.paint((m.m == leather) & (m.X > hx + 2.9) & (np.abs(m.Y - side * 2.0) < 1.0) & (np.abs(m.Z - hz - 4.7) < 1.0), glass)


def pencil(rig, w):
    """eich, mid stage: a pencil tucked behind the left ear, eraser up."""
    m, (hx, hz) = rig.m, rig.head
    wood = w.tone("pencil", "#dfb75c", light=0.28)
    rubber = w.tone("eraser", "#db7890", light=0.18, shade=0.2)
    a, b = (hx - 1.4, 5.6, hz + 0.6), (hx - 3.0, 7.2, hz + 7.4)
    m.segment(a, b, 0.58, wood)
    m.ellipsoid(b[0], b[1], b[2] + 0.1, 0.72, 0.72, 0.72, rubber)


def stone_pins(rig, w):
    """hassabis: a white and a black go stone pinned to the ears."""
    for e, name, base in zip(rig.ears, ("stonew", "stoneb"), ("#f2ecdc", "#1f1b22")):
        rig.m.ellipsoid(e["x"] + 1.5, e["y"], e["base"] + 2.8, 1.0, 1.0, 1.0, w.tone(name, base, light=0.3 if name == "stoneb" else 0.08))


def sticky_ear(rig, w):
    """levels: a yellow sticky note stuck to the right ear."""
    e = rig.ears[0]
    note = w.tone("note", w.tag, light=0.16, shade=0.2)
    y0, y1 = between(e["y"] - 1.3, e["y"] + 1.3)
    rig.m.box(e["x"] + 0.9, y0, e["base"] + 1.9, e["x"] + 1.7, y1, e["base"] + 3.9, note)


def spikes(rig, w):
    """tibo: short spiky tufts standing up from the crown."""
    m, (hx, hz) = rig.m, rig.head
    dark = w.tone("tuft", "#453f4c", light=0.3)
    for dx, dy, h in ((0.8, -1.7, 2.6), (1.4, 0.0, 3.4), (0.8, 1.7, 2.6), (2.2, -0.8, 2.0), (2.2, 0.9, 2.0)):
        m.cone(hx + dx, dy, 1.05, hz + 4.4, hz + 4.4 + h, dark)


# ---------------------------------------------------------------- neck and torso
def collar(w, rig, base, height=1.3, rx=2.7, ry=3.0, z=3.2, thick=0.5, name="collar", stud=None):
    """A band round the neck, with an optional stud at its front."""
    m, (tx, tz) = rig.m, rig.torso
    ring(m, tx, 0, rx, ry, tz + z, tz + z + height, thick, w.tone(name, base, light=0.3))
    if stud:
        m.ellipsoid(tx + rx, 0, tz + z + height / 2, 0.62, 0.62, 0.62, w.tone("stud", stud, light=0.2))


def lanyard(rig, w):
    """dario: a band with a blank paper badge on the chest."""
    m, (tx, tz) = rig.m, rig.torso
    band = w.tone("lanyard", w.tag, light=0.24)
    badge = w.tone("badge", w.ink, light=0.06, shade=0.2)
    ring(m, tx, 0, 2.6, 3.0, tz + 3.3, tz + 4.1, 0.34, band)
    for side in (-1, 1):
        m.segment((tx + 1.8, side * 1.9, tz + 3.7), (tx + 3.1, side * 0.4, tz + 0.4), 0.42, band)
    card(m, tx + 3.4, 0.0, tz - 1.5, 1.3, 1.5, 0.4, badge)


def bird_tag(rig, w):
    """linus: a collar with a small folded paper bird hanging at the front."""
    m, (tx, tz) = rig.m, rig.torso
    collar(w, rig, "#3b3540", height=1.1, name="birdcollar")
    bird = w.tone("bird", "#8fa6b8", light=0.25)
    belly = w.tone("belly", "#efe6d2", light=0.06)
    beak = w.tone("beak", "#e0954a", light=0.2)
    bx, bz = tx + 3.5, tz + 1.9
    m.ellipsoid(bx, 0.5, bz, 0.9, 0.85, 0.95, bird)
    m.paint((m.m == bird) & (m.X > bx - 0.1) & (m.Z < bz - 0.1), belly)
    m.box(bx + 0.7, 0.1, bz + 0.3, bx + 1.5, 0.7, bz + 0.8, beak)


def jacket(rig, w):
    """jensen: a short leather jacket with lit lapels at the chin and a seam down its front (panels over a tee)."""
    m, (tx, tz) = rig.m, rig.torso
    lapel = w.tone("lapel", "#4a4550", light=0.3)
    seam = w.tone("seam", "#59535f", light=0.3)
    hide = rig.M.get("coat")
    if hide is not None:
        m.paint((m.m == hide) & (np.abs(m.Y) < 0.6) & (m.X > tx + 2.0) & (m.Z > tz - 3.2) & (m.Z < tz + 1.4), seam)
    if rig.rec["outfit"] != "coat":
        hide = w.tone("jacket", "#1f1d23", light=0.3, shade=0.3)
        for side in (-1, 1):
            y0, y1 = between(side * 0.9, side * 3.6)
            m.box(tx + 1.0, y0, tz - 3.4, tx + 3.9, y1, tz + 3.2, hide)
    for side in (-1, 1):
        y0, y1 = between(side * 0.7, side * 2.8)
        m.box(tx + 2.2, y0, tz + 3.2, tx + 3.9, y1, tz + 4.3, lapel)


def chest_notes(rig, w):
    """levels: two sticky notes stuck to the chest."""
    m, (tx, tz) = rig.m, rig.torso
    note = w.tone("note", w.tag, light=0.16, shade=0.2)
    for side in (-1, 1):
        y0, y1 = between(side * 0.5, side * 2.5)
        m.box(tx + 2.4, y0, tz - 0.5, tx + 3.3, y1, tz + 1.5, note)


def car_shell(rig, w):
    """musk, behind: an unbranded cardboard car shell round the hips with two paper wheels."""
    m, (tx, tz) = rig.m, rig.torso
    board = w.tone("card", w.tag, light=0.24, shade=0.24)
    edge = w.tone("cardfold", mix(w.tag, "#6a5030", 0.42), light=0.24)
    dark = w.tone("tyre", "#3a3236", light=0.3)
    hub = w.tone("hub", "#b9ad98", light=0.22)
    tape = w.tone("tape", "#e6d8b0", light=0.08)
    m.box(tx - 4.8, -8.2, tz - 3.2, tx + 5.4, 8.2, tz - 0.4, board)
    # Corrugation along the top, a taped seam down the middle of the hood, and arm holes on both sides.
    m.paint((m.m == board) & ((m.Y % 2.0 < 0.5)) & (m.Z > tz - 1.2), edge)
    m.box(tx + 0.2, -0.7, tz - 1.4, tx + 5.4, 0.7, tz - 0.2, tape)
    m.carve((m.m == board) & (np.abs(m.Y) > 2.4) & (np.abs(m.Y) < 5.4) & (m.X > tx - 3.0) & (m.X < tx + 3.6) & (m.Z > tz - 2.6))
    for x in (tx - 2.6, tx + 3.4):
        for side in (-1, 1):
            a, b = between(side * 8.2, side * 9.8)
            m.cylinder(x, tz - 3.0, 2.0, a, b, dark, axis="y")
            a, b = between(side * 9.8, side * 11.0)
            m.cylinder(x, tz - 3.0, 0.8, a, b, hub, axis="y")
    m.ellipsoid(tx + 5.6, -5.8, tz - 1.6, 0.9, 0.9, 0.9, tape)


def hydrofoil(rig, w):
    """zuckerberg, behind: a folded board under the paws."""
    m, (tx, tz) = rig.m, rig.torso
    deck = w.tone("deck", "#e6f6ff", light=0.04, shade=0.2)
    stripe = w.tone("deckstripe", w.tag, light=0.22)
    m.box(tx - 3.2, -3.0, -0.6, tx + 6.6, 3.0, 1.6, deck)
    m.box(tx - 3.2, -0.7, 1.0, tx + 6.6, 0.7, 1.6, stripe)


def go_board(rig, w):
    """hassabis, behind: a small go board set down behind the right paw."""
    m, (tx, tz) = rig.m, rig.torso
    wood = w.tone("goboard", "#d6b57a", light=0.2, shade=0.24)
    line = w.tone("grid", "#5a4630", light=0.2)
    black = w.tone("stoneb", "#1f1b22", light=0.3)
    white = w.tone("stonew", "#f2ecdc", light=0.08)
    m.box(tx - 5.0, -8.4, -0.6, tx + 0.8, -3.0, 0.6, wood)
    m.paint((m.m == wood) & (((m.X - tx + 5.0) % 2.0 < 0.5) | ((m.Y + 8.4) % 2.0 < 0.5)), line)
    for sx, sy, material in ((-3.6, -6.8, black), (-1.6, -4.8, white), (-0.2, -6.4, black), (-2.8, -4.0, white)):
        m.ellipsoid(tx + sx, sy, 0.8, 0.7, 0.7, 0.4, material)


# ---------------------------------------------------------------- back
def rocket(rig, w):
    """musk, behind: a folded paper rocket standing in a back strap, its tip beside the ear."""
    m, (tx, tz) = rig.m, rig.torso
    cream = w.tone("rocket", "#e9e0cc", light=0.1, shade=0.25)
    red = w.tone("fin", "#b8483e", light=0.28)
    blue = w.tone("port", "#6f93b8", light=0.28)
    bx = tx - 5.2
    m.ellipsoid(bx, 0, tz + 3.2, 1.7, 1.9, 6.8, cream)
    for side in (-1, 1):
        y0, y1 = between(side * 1.4, side * 3.2)
        m.box(bx - 1.2, y0, tz - 3.8, bx + 1.4, y1, tz - 0.6, red)
    m.ellipsoid(bx - 1.5, 0, tz + 3.8, 0.8, 1.1, 1.1, blue)


def stage(rig, w):
    """guido, behind: a tiny theatre with two velvet curtains and a gold pelmet."""
    m, (tx, tz) = rig.m, rig.torso
    frame = w.tone("stageframe", "#3a2c33", light=0.3)
    velvet = w.tone("velvet", "#a8433c", light=0.26)
    gold = w.tone("pelmet", "#d8b35c", light=0.28)
    bx = tx - 4.4
    m.box(bx - 0.5, -3.8, tz - 4.8, bx + 0.5, 3.8, tz + 5.0, frame)
    for y0, y1 in ((-3.4, -0.4), (0.4, 3.4)):
        m.box(bx - 1.2, y0, tz - 4.2, bx - 0.5, y1, tz + 4.0, velvet)
    m.box(bx - 1.4, -4.0, tz + 4.2, bx + 0.6, 4.0, tz + 5.4, gold)


def curtain(rig, w):
    """jobs, behind: a plain paper curtain with one star peeking out of the top."""
    m, (tx, tz) = rig.m, rig.torso
    paper = w.tone("curtain", "#e9e2d0", light=0.08, shade=0.24)
    star = w.tone("star", w.ink, light=0.06)
    bx = tx - 4.3
    m.box(bx - 0.9, -3.4, tz - 4.8, bx - 0.1, 3.4, tz + 4.2, paper)
    for dx, dz in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
        m.box(bx - 1.3, -2.9 + dx * 0.95 - 0.45, tz + 4.9 + dz * 0.95 - 0.45, bx - 0.9, -2.9 + dx * 0.95 + 0.45, tz + 4.9 + dz * 0.95 + 0.45, star)


# ---------------------------------------------------------------- right paw
def tag_card(w, rig, h):
    """tibo: a cream paper tag with a loop arrow."""
    m = rig.m
    x, y, z = h[0] + 0.9, h[1] - 1.5, h[2] - 2.0
    paper = w.tone("tag", "#e9dfc8", light=0.06, shade=0.22)
    ink = w.tone("tagink", "#3a3542", light=0.25)
    m.segment((h[0] + 0.4, h[1] - 0.4, h[2] - 0.6), (x, y, z + 1.6), 0.28, ink)
    card(m, x, y, z, 1.7, 2.2, 0.4, paper)
    q = ((m.X - x) / 1.15) ** 2 + ((m.Z - z) / 1.15) ** 2
    m.paint((m.m == paper) & (q > 0.42) & (q < 1), ink)


def sweet_potato(w, rig, h):
    """poteto: a roasted sweet potato in two halves, one turned to its golden flesh."""
    m = rig.m
    x, y, z = h[0] + 0.7, h[1] - 1.6, h[2] - 1.6
    skin = w.tone("skin", "#8e3a52", light=0.24)
    flesh = w.tone("flesh", "#e8b54a", light=0.22)
    m.ellipsoid(x - 0.3, y - 1.5, z, 1.5, 2.1, 1.5, skin)
    m.ellipsoid(x + 0.4, y + 1.7, z + 0.3, 1.5, 1.8, 1.4, skin)
    m.paint((m.m == skin) & (m.X > x + 1.0) & (m.Y > y + 0.3) & (m.Y < y + 3.2) & (np.abs(m.Z - z - 0.3) < 1.15), flesh)


def chip(w, rig, h):
    """jensen: an unbranded green paper chip with gold pins along its sides."""
    m = rig.m
    x, y, z = h[0] + 0.9, h[1] - 1.5, h[2] - 1.7
    green = w.tone("chip", "#3f7d52", light=0.24)
    core = w.tone("chipcore", "#2a4f36", light=0.24)
    pin = w.tone("pin", "#d8b35c", light=0.22)
    card(m, x, y, z, 1.9, 1.9, 0.4, green)
    card(m, x, y, z, 1.0, 1.0, 0.5, core)
    for k in (-1, 0, 1):
        for side in (-1, 1):
            a, b = between(x + side * 1.9, x + side * 2.5)
            m.box(a, y - 0.25, z + k * 1.3 - 0.3, b, y + 0.25, z + k * 1.3 + 0.3, pin)


def note_card(w, rig, h):
    """karpathy: a cream card with a cut-out music note."""
    m = rig.m
    x, y, z = h[0] + 0.9, h[1] - 1.5, h[2] - 1.9
    paper = w.tone("card", "#ece2cb", light=0.06, shade=0.22)
    ink = w.tone("noteink", "#2a2840", light=0.25)
    card(m, x, y, z, 1.9, 2.3, 0.4, paper)
    m.paint((m.m == paper) & (((np.abs(m.X - x - 0.5) < 0.45) & (m.Z > z - 0.6) & (m.Z < z + 1.3)) | ((m.X > x + 0.3) & (m.X < x + 1.6) & (np.abs(m.Z - z - 1.0) < 0.45)) | (((m.X - x + 0.9) ** 2 + (m.Z - z + 0.9) ** 2) < 0.7)), ink)


def sapling(w, rig, h):
    """linus: a forked paper sapling with leaf clusters, held leaning out so its top shows from behind."""
    m = rig.m
    x, y, z = h[0] + 0.5, h[1] - 1.5, h[2] - 0.4
    bark = w.tone("bark", "#7b5a3f", light=0.26)
    leaf = w.tone("leaf", "#6f9b5a", light=0.3)
    top = (x - 0.8, y - 2.6, z + 4.4)
    m.segment((x, y + 0.4, z - 2.6), top, 0.5, bark)
    m.segment((x - 0.4, y - 1.3, z + 2.2), (x - 0.6, y - 4.4, z + 3.9), 0.4, bark)
    m.segment((x - 0.6, y - 2.0, z + 3.4), (x + 0.6, y - 0.4, z + 6.0), 0.4, bark)
    for lx, ly, lz, r in ((-0.8, -2.8, 4.9, 1.6), (-0.6, -4.6, 4.2, 1.4), (0.6, -0.2, 6.2, 1.5), (-1.2, -1.6, 5.8, 1.3)):
        m.ellipsoid(x + lx, y + ly, z + lz, r, r, r * 0.85, leaf)


def calendar(w, rig, h):
    """eich: a ten-cell mini calendar, seven days ticked."""
    m = rig.m
    x, y, z = h[0] + 0.9, h[1] - 1.5, h[2] - 1.9
    paper = w.tone("calendar", w.ink, light=0.04, shade=0.2)
    ink = w.tone("calink", "#3a3542", light=0.25)
    card(m, x, y, z, 1.9, 2.3, 0.4, paper)
    cells = (m.m == paper) & (((m.X - x + 1.9) % 0.95) < 0.5) & (((m.Z - z + 2.3) % 1.1) < 0.55)
    m.paint(cells & (m.X < x + 0.5), ink)


def books(w, rig, h):
    """gates: a stack of three untitled little books with a cat-tail bookmark."""
    m = rig.m
    x, y, z = h[0] + 0.8, h[1] - 1.4, h[2] - 1.9
    mark = w.tone("bookmark", w.tag, light=0.22)
    for k, (name, base) in enumerate((("bookblue", "#6f8fc0"), ("bookred", "#b8483e"), ("bookgreen", "#6f9b5a"))):
        m.box(x - 2.0, y - 1.5, z - 1.7 + k * 1.15, x + 2.0, y + 1.5, z - 0.7 + k * 1.15, w.tone(name, base, light=0.24))
    m.box(x + 0.6, y + 1.1, z - 1.6, x + 1.3, y + 1.6, z + 0.6, mark)


def go_discs(w, rig, h):
    """hassabis: a black and a white paper disc."""
    m = rig.m
    x, y, z = h[0] + 0.5, h[1] - 1.2, h[2] - 1.1
    m.cylinder(x - 0.5, y - 0.9, 1.5, z - 1.3, z - 0.5, w.tone("stoneb", "#1f1b22", light=0.3))
    m.cylinder(x + 0.9, y + 1.0, 1.5, z - 0.6, z + 0.2, w.tone("stonew", "#f2ecdc", light=0.08))


def notebook(w, rig, h):
    """levels: a twelve-cell folded notebook."""
    m = rig.m
    x, y, z = h[0] + 0.9, h[1] - 1.5, h[2] - 2.0
    cover = w.tone("note", w.tag, light=0.16, shade=0.2)
    ink = w.tone("noteink", "#3a3542", light=0.25)
    card(m, x, y, z, 1.9, 2.4, 0.4, cover)
    m.paint((m.m == cover) & (((m.X - x + 1.9) % 1.3) < 0.45) & (((m.Z - z + 2.4) % 1.2) < 0.45), ink)


def seal_tag(w, rig, h):
    """dario: a cream tag with a violet wax seal pressed with a crescent."""
    m = rig.m
    x, y, z = h[0] + 0.9, h[1] - 1.5, h[2] - 1.9
    paper = w.tone("seal", "#efe9ff", light=0.04, shade=0.2)
    wax = w.tone("wax", w.tag, light=0.2)
    moon = w.tone("moon", "#c9bef0", light=0.1)
    card(m, x, y, z, 1.5, 2.0, 0.4, paper)
    m.ellipsoid(x + 0.5, y - 0.1, z + 0.1, 0.35, 0.9, 0.9, wax)
    m.paint((m.m == wax) & (m.Y < y - 0.4) & (m.X > x + 0.6), moon)


# ---------------------------------------------------------------- face marks
def brows(face, look, rec):
    """thick brows: short dark blocks over the eyes."""
    for ex in (face.lx, face.rx_):
        for dx in (-1, 0, 1):
            face.put(ex + dx, face.ny - 2, look.p["headDark"])


def round_glasses(face, look, rec):
    """thin gold round glasses, worn over the cat's own eyewear."""
    for ex in (face.lx, face.rx_):
        for dx, dy in ((-2, -1), (-2, 0), (-1, -2), (0, -2), (1, -2), (2, -1), (2, 0), (-1, 1), (0, 1), (1, 1)):
            face.put(ex + dx, face.ny + dy, "#f0c85a")


def cheek_paint(colour, nose=False):
    """Warm paint or sunscreen stripes across both cheeks (and the nose bridge)."""
    def stamp(face, look, rec):
        for c, other in zip(face.cheeks, (face.rx_, face.lx)):
            step = 1 if c[0] > (face.lx + face.rx_) / 2 else -1
            face.put(c[0], c[1], colour)
            face.put(c[0] + step, c[1], colour)
            face.put(c[0], c[1] - 1, colour)
        if nose:
            face.put(face.nose[0], face.nose[1] - 1, colour)
    return stamp


def expression(kind):
    """smile, closed (listening) or wink: the mouth corners rise; visible eyes close."""
    def stamp(face, look, rec):
        ink = look.p["ink"]
        mx, my = face.mouth
        if kind != "closed":
            face.put(mx - 1, my - 1, ink)
            face.put(mx + 1, my - 1, ink)
        if rec["eyes"] == "sunglasses" or face.hurt:
            return
        # The open eye is pupil (ex, ny), (ex, ny + 1) and glint (ex + 1, ny) for ex in lx / rx_.
        for ex, closed in ((face.lx, kind != "wink"), (face.rx_, True)):
            if not closed:
                continue
            face.put(ex + 1, face.ny, look.p["head"])
            face.put(ex + 1, face.ny + 1, ink)
    return stamp


# ---------------------------------------------------------------- the costume
class Wear:
    """One costume on one cat: garment dyes, the parts of each build stage and its face marks."""

    def __init__(self, look: Look, rec: dict, cid: str, data: dict):
        self.look, self.rec, self.cid, self.d = look, rec, cid, data
        self._behind, self._mid, self._front, self._face = [], [], [], []
        RECIPES[cid](self)

    @property
    def tag(self) -> str:
        return self.d["colors"]["tag"]

    @property
    def ink(self) -> str:
        return self.d["colors"]["ink"]

    def tone(self, role: str, base: str, **kw) -> int:
        """A costume part material, shared by both cats (every puppet ramp mixes toward the same night and moon)."""
        return self.look.tone(f"puppet@{self.cid}-{role}", base, **kw)

    def behind_add(self, fn): self._behind.append(fn)
    def mid_add(self, fn): self._mid.append(fn)
    def front_add(self, fn): self._front.append(fn)
    def face_add(self, fn): self._face.append(fn)

    def hold(self, item):
        """Carries `item` in the right paw: the paw position is its anchor."""
        self._front.append(lambda rig, w: item(w, rig, rig.hands[0]))

    def garments(self, rec: dict) -> dict:
        """The cat's own garment materials dyed with the costume's palette for its tailoring."""
        d, out = self.d, {}
        if rec["outfit"] == "coat":
            for role, key in (("coat", "body"), ("cape", "cape"), ("bib", "bib")):
                if key in d["coat"]:
                    out[role] = self.look.worn(self.cid, role, d["coat"][key].lower())
        else:
            if "body" in d["tee"]:
                for role in ("tee", "sleeve"):
                    out[role] = self.look.worn(self.cid, role, d["tee"]["body"].lower())
            if "denim" in d["tee"]:
                out["jeans"] = self.look.worn(self.cid, "jeans", d["tee"]["denim"].lower())
        return out

    def behind(self, rig):
        for fn in self._behind:
            fn(rig, self)

    def mid(self, rig):
        for fn in self._mid:
            fn(rig, self)

    def front(self, rig):
        for fn in self._front:
            fn(rig, self)

    def stamp(self, face, look, rec):
        for fn in self._face:
            fn(face, look, rec)


RECIPES = {
    "tibo": lambda w: (
        w.front_add(spikes),
        w.front_add(lambda rig, w: collar(w, rig, "#2a2530", name="leather", stud="#b9ad98")),
        w.face_add(brows),
        w.hold(tag_card),
    ),
    "poteto": lambda w: (
        w.front_add(lambda rig, w: collar(w, rig, "#3a333c", height=2.3, rx=3.0, ry=3.3, z=2.6, thick=0.5, name="roll")),
        w.face_add(round_glasses),
        w.face_add(expression("smile")),
        w.face_add(cheek_paint("#e48f62")),
        w.hold(sweet_potato),
    ),
    "musk": lambda w: (
        w.behind_add(car_shell),
        w.behind_add(rocket),
        w.front_add(goggles),
    ),
    "jensen": lambda w: (
        w.front_add(jacket),
        w.hold(chip),
    ),
    "karpathy": lambda w: (
        w.mid_add(headphones_band),
        w.front_add(headphones_cups),
        w.face_add(expression("closed")),
        w.hold(note_card),
    ),
    "linus": lambda w: (
        w.front_add(bird_tag),
        w.hold(sapling),
    ),
    "guido": lambda w: (
        w.behind_add(stage),
        w.front_add(bowler),
    ),
    "eich": lambda w: (
        w.mid_add(pencil),
        w.hold(calendar),
    ),
    "jobs": lambda w: (
        w.behind_add(curtain),
        w.front_add(lambda rig, w: collar(w, rig, "#222026", height=2.3, rx=3.0, ry=3.3, z=2.6, thick=0.5, name="roll")),
        w.face_add(expression("wink")),
    ),
    "gates": lambda w: (
        w.front_add(page_hat),
        w.hold(books),
    ),
    "zuckerberg": lambda w: (
        w.behind_add(hydrofoil),
        w.face_add(cheek_paint("#f6f2ea", nose=True)),
    ),
    "hassabis": lambda w: (
        w.behind_add(go_board),
        w.front_add(stone_pins),
        w.hold(go_discs),
    ),
    "levels": lambda w: (
        w.front_add(sticky_ear),
        w.front_add(chest_notes),
        w.hold(notebook),
    ),
    "dario": lambda w: (
        w.front_add(cap),
        w.front_add(lanyard),
        w.hold(seal_tag),
    ),
}


# ---------------------------------------------------------------- bake
_WEAR: list[Wear] = []


def wears(inputs: dict, looks: dict) -> list[Wear]:
    """Every (costume, cat) pair once, costumes in their dumped order."""
    if not _WEAR:
        for cid, data in inputs["costumes"].items():
            if cid not in RECIPES:
                continue
            for look, rec in looks.values():
                _WEAR.append(Wear(look, rec, cid, data))
    return _WEAR


def costume_ramps(inputs: dict, looks: dict) -> dict:
    out = {}
    for wear in wears(inputs, looks):
        out.update(wear.look.ramps)
    return out


def costume_sprites(inputs: dict, looks: dict):
    """[(sprite id, builder -> Baked or None)] of every costume layer on every cat frame."""
    out = []
    for wear in wears(inputs, looks):
        for turn, d in enumerate(DIRS):
            for anim, n in ANIMS:
                for f in range(n):
                    sid = f"cat-{wear.look.id}@{wear.cid}-{d}-{anim}-{f}"
                    out.append((sid, (lambda wear=wear, anim=anim, f=f, turn=turn, sid=sid: bake_worn(wear, anim, f, turn, sid))))
    return out


def bake_worn(wear: Wear, anim: str, f: int, turn: int, sid: str):
    """The pixels where the costumed frame differs from its base frame, cropped around them.

    Where the costume recedes from the base silhouette (a hat over a hair tuft), the layer is
    dilated with the costumed frame's next colour until it covers every base pixel, so no pixel
    of the base frame is left showing outside the costumed silhouette.
    """
    look, rec = wear.look, wear.rec
    full = bake_cat(look, rec, anim, f, turn, wear)
    base = base_cat(look, rec, anim, f, turn)
    b = {(x - base.ax, y - base.ay): base.pixels[y * base.w + x]
         for y in range(base.h) for x in range(base.w) if base.pixels[y * base.w + x]}
    keep = {(x - full.ax, y - full.ay): full.pixels[y * full.w + x]
            for y in range(full.h) for x in range(full.w) if full.pixels[y * full.w + x]}
    lost = [p for p in b if p not in keep]
    while lost:
        rest = []
        for p in lost:
            for q in ((p[0] + 1, p[1]), (p[0] - 1, p[1]), (p[0], p[1] + 1), (p[0], p[1] - 1)):
                c = keep.get(q)
                if c:
                    keep[p] = c
                    break
            else:
                rest.append(p)
        assert len(rest) < len(lost), f"{sid}: {len(rest)} base pixels cannot be covered"
        lost = rest
    keep = {p: c for p, c in keep.items() if b.get(p) != c}
    if not keep:
        return None
    xs = [p[0] for p in keep]
    ys = [p[1] for p in keep]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    W, H = x1 - x0 + 1, y1 - y0 + 1
    px = [""] * (W * H)
    for (x, y), c in keep.items():
        px[(y - y0) * W + (x - x0)] = c
    return Baked(w=W, h=H, ax=-x0, ay=-y0, pixels=px, extent=base.extent)


# ---------------------------------------------------------------- contact sheets
def _stamp(pxs, im, ox, oy, *bakes):
    """Composited foot-relative pixels of frames (later ones over earlier ones) at cell origin (ox, oy)."""
    for x in range(-9, 10):
        rr, gg, bb, _ = pxs[ox + x, oy]
        pxs[ox + x, oy] = (int(rr * 0.6), int(gg * 0.6), int(bb * 0.7), 255)
    for b in (q for q in bakes if q):
        for y in range(b.h):
            for x in range(b.w):
                col = b.pixels[y * b.w + x]
                if col and 0 <= ox + x - b.ax < im.width and 0 <= oy + y - b.ay < im.height:
                    pxs[ox + x - b.ax, oy + y - b.ay] = _rgb(col) + (255,)


def _sheet(baked: dict, out_dir, name: str, cells: list, cols: int, k: int):
    """cells: [(cid, cat, dir, frame)] laid out left to right, top to bottom; each shows the base frame under its layer."""
    from PIL import Image

    cw, ch, fx, fy = 60, 56, 30, 44
    rows = (len(cells) + cols - 1) // cols
    im = Image.new("RGBA", (cw * cols, ch * rows), (44, 66, 48, 255))
    pxs = im.load()
    for i, (cid, cat, d, fr) in enumerate(cells):
        ox, oy = (i % cols) * cw + fx, (i // cols) * ch + fy
        _stamp(pxs, im, ox, oy, baked.get(f"cat-{cat}-{d}-{fr}"), baked.get(f"cat-{cat}@{cid}-{d}-{fr}"))
    im.resize((im.width * k, im.height * k), Image.NEAREST).save(out_dir / name)


def costume_sheets(baked: dict, out_dir) -> None:
    """Per costume: every direction with idle, mid-walk and hurt frames on both cats (2x), plus two line-ups
    (costumes side by side, front view, 4x) so all fourteen can be compared at a glance."""
    out_dir.mkdir(parents=True, exist_ok=True)
    ids = sorted({k.split("@")[1].split("-")[0] for k in baked if k.startswith("cat-") and "@" in k})
    frames = ("idle-0", "walk-2", "hurt-0")
    for cid in ids:
        cats = sorted({k.split("-")[1].split("@")[0] for k in baked if f"@{cid}-" in k})
        cells = [(cid, cat, d, fr) for cat in cats for pair in (("se", "sw"), ("nw", "ne")) for d in pair for fr in frames]
        _sheet(baked, out_dir, f"costumes-{cid}.png", cells, 6, 2)
    if not ids:
        return
    cats = sorted({k.split("-")[1].split("@")[0] for k in baked if k.startswith("cat-") and "@" in k})
    half = (len(ids) + 1) // 2
    for n, group in enumerate((ids[:half], ids[half:]), 1):
        _sheet(baked, out_dir, f"costumes-lineup-{n}.png", [(cid, cat, "se", fr) for cat in cats for cid in group for fr in frames], len(group) * 3, 4)
