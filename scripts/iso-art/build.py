"""Bakes the voxel models into src/render/iso/gen/*-pixels.ts (FEAT-003 to FEAT-009).

    UV_CACHE_DIR=output/tools/uv-cache uv run --with pillow --with numpy python scripts/iso-art/build.py [--only <id>] [--no-sheets]

Inputs: scripts/iso-art/inputs.json (palette ramps, yard footprints and the cats' / costumes'
identity data dumped from dist/ by scripts/iso-art/dump-inputs.mjs) and the models in
scripts/iso-art/models.py, world_models.py, puppet.py, roster.py and costumes.py. Output: a
palette-indexed, run-length encoded TS module (byte-identical on every run) plus contact
sheets in output/iso-art/sheets/ (1x and 4x, git-ignored) for review.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))

import numpy as np  # noqa: E402

import costumes as cs  # noqa: E402
import enemies as en  # noqa: E402
import models as md  # noqa: E402
import puppet as pz  # noqa: E402
import world_models as wm  # noqa: E402
from reference_cats import write_reference_atlas  # noqa: E402
from voxel import bake  # noqa: E402

OUT = ROOT / "src/render/iso/gen/scenery-pixels.ts"
SHEETS = ROOT / "output/iso-art/sheets"
INPUTS = json.loads((HERE / "inputs.json").read_text())
#: Most palette entries (index 0 is transparent); the run encoding holds indices below U+0500 - U+0100.
PALETTE_CAP = 1024


def hexmix(a: str, b: str, t: float) -> str:
    pa = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
    pb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * t):02x}" for x, y in zip(pa, pb))


def ramps() -> dict[str, list[str]]:
    """palette.ts ramps (5 steps) plus a warm highlight step, and the extra scenery ramps."""
    out = {}
    for name, steps in INPUTS["ramps"].items():
        out[name] = list(steps) + [hexmix(steps[-1], "#fff0c4", 0.38)]
    out.update(md.EXTRA_RAMPS)
    out.update(wm.EXTRA_RAMPS)
    out.update(pz.cat_ramps(INPUTS, out))
    out.update(cs.costume_ramps(INPUTS, pz.looks()))
    out.update(en.enemy_ramps(out))
    pz.use_ramps(out)
    en.use_bake_ramps(out)
    return out


def sprites() -> dict:
    """Sprite id -> (group, model builder). Order is the output order."""
    B = INPUTS["bases"]
    S: dict = {}

    def add(group, sid, fn, base=None):
        S[sid] = (group, fn, base)

    # Tiny ground dressing reads cleaner without the sel-out ring.


    add("yard", "yard-barn", lambda: md.barn(B["yard-barn"]), B["yard-barn"])
    add("yard", "yard-cottage", lambda: md.cottage(B["yard-cottage"]), B["yard-cottage"])
    add("yard", "yard-west-cottage", lambda: md.west_cottage(B["yard-west-cottage"]), B["yard-west-cottage"])
    rb = B["yard-rail"]
    add("yard", "yard-rail", lambda: md.rail_fence(rb["x"] + 1, rb["x"] + rb["w"] - 1), rb)
    for i, f in enumerate(INPUTS["fences"]):
        fb = f["base"]
        add("yard", f"yard-fence-{i}", (lambda fb=fb: md.rail_fence(fb["x"] + 1, fb["x"] + fb["w"] - 1)), fb)
    add("yard", "yard-woodpile", lambda: md.woodpile(B["yard-woodpile"]), B["yard-woodpile"])
    add("yard", "yard-west-planter", lambda: md.planter(B["yard-west-planter"], ("pink", "yellow")), B["yard-west-planter"])
    add("yard", "yard-tool-rack", lambda: md.tool_rack(B["yard-tool-rack"]), B["yard-tool-rack"])
    add("yard", "yard-east-planter", lambda: md.planter(B["yard-east-planter"], ("blue", "white")), B["yard-east-planter"])
    add("yard", "yard-hay-bales", lambda: md.hay_bales(B["yard-hay-bales"]), B["yard-hay-bales"])
    add("yard", "yard-cart", lambda: md.cart(B["yard-cart"]), B["yard-cart"])
    add("yard", "yard-well", lambda: md.well(B["yard-well"]), B["yard-well"])
    add("yard", "yard-boulder", lambda: md.boulder(B["yard-boulder"]), B["yard-boulder"])
    add("yard", "yard-scarecrow", lambda: md.scarecrow(B["yard-scarecrow"]), B["yard-scarecrow"])
    for kind in ("wheat", "cabbage", "pumpkin"):
        for v in range(3):
            add("crops", f"crop-{kind}-{v}", (lambda k=kind, v=v: md.crop(k, v)), B[f"crop-{kind}-{v}"])
    add("small", "lamp-iron-0", lambda: md.lamp(True))
    add("small", "lamp-iron-1", lambda: md.lamp(False))
    add("small", "lamp-lantern", md.lantern_post)
    for name, fn in (("oak", md.oak), ("maple", md.maple), ("pine", md.pine), ("dead", md.dead_tree), ("birch", md.birch)):
        for v in range(3):
            add("trees", f"tree-{name}-{v}", (lambda fn=fn, v=v: fn(v, turn=v)))
    for name, pal, seed in (("green", ("leaf", "leaf_b"), 5), ("autumn", ("maple", "maple_b", "leaf_b"), 9), ("dark", ("pine", "pine_b"), 13)):
        for v in range(3):
            add("small", f"bush-{name}-{v}", (lambda pal=pal, v=v, seed=seed: md.bush(v, pal, seed)))
    for kind in ("pink", "blue", "white", "yellow"):
        add("small", f"flowers-{kind}", (lambda k=kind: md.flowers(k, 1)))
    for v in range(3):
        add("small", f"tuft-{v}", (lambda v=v: md.tuft(v)))
        add("small", f"rock-{v}", (lambda v=v: md.rock(v)))
        add("small", f"pumpkin-{v}", (lambda v=v: md.pumpkin(v)))
    add("small", "stump", md.stump)
    add("small", "candles", md.candles)
    for kind in ("slab", "cross", "obelisk"):
        add("district", f"headstone-{kind}", (lambda k=kind: md.headstone(k)))
    add("district", "barrel", md.barrel)
    add("district", "crates", md.crates)
    add("district", "hay-bale", md.hay_bale)
    add("district", "iron-fence-x", lambda: md.iron_fence(80, 0))
    add("district", "iron-fence-y", lambda: md.iron_fence(80, 1))
    add("district", "fence-x", lambda: md.decor_fence(0))
    add("district", "fence-y", lambda: md.decor_fence(1))
    for v, s in enumerate((0.76, 0.84, 0.92)):
        add("district", f"terrace-{v}", (lambda v=v, s=s: md.terrace(200 + v * 7, s)))
    # FEAT-004: sim props (all phases), landmark pieces / bases / extras and townsfolk puppets.
    for sid, fn in wm.prop_sprites():
        add("props", sid, fn)
    for sid, fn in wm.piece_sprites():
        add("rotor" if sid.startswith("rotor-") else "pieces", sid, fn)
    for sid, fn in wm.landmark_sprites()[0]:
        add("lmbase" if sid.startswith("lmbase-") else "pieces", sid, fn)
    for sid, fn in wm.townsfolk_sprites():
        add("folk", sid, fn)
    # The playable cat poses come from the model sheet. The builders return a finished bake.
    for sid, fn in pz.cat_sprites():
        add("cats", sid, fn)
    # FEAT-009: costume layers on every cat frame (the builder returns the finished layer, or None).
    for sid, fn in cs.costume_sprites(INPUTS, pz.looks()):
        add("costumes", sid, fn)
    # FEAT-006: every enemy frame (elites are the same model on a finer grid), the elite crown and the thrown drops.
    for sid, fn in en.enemy_sprites(INPUTS["elite"]):
        add("enemies", sid, fn)
    return S


#: Output module of each group (the scenery module also carries the shared palette and types).
MODULES = {
    "props": ("props-pixels.ts", "PROP_SPRITES"),
    "pieces": ("landmarks-pixels.ts", "LANDMARK_SPRITES"),
    "rotor": ("landmarks-pixels.ts", "LANDMARK_SPRITES"),
    "lmbase": ("landmarks-pixels.ts", "LANDMARK_SPRITES"),
    "folk": ("townsfolk-pixels.ts", "TOWNSFOLK_SPRITES"),
    "cats": ("cats-pixels.ts", "CAT_SPRITES"),
    "costumes": ("costumes-pixels.ts", "COSTUME_SPRITES"),
    "enemies": ("enemies-pixels.ts", "ENEMY_SPRITES"),
}


def bake_options(sid: str, group: str) -> dict:
    if group == "lmbase":
        return {"shadow": False, "outline": False}
    plain = sid.startswith(("crop-", "tuft-", "flowers-")) or sid.endswith("-ash") or sid.startswith(("prop-paper-grass-", "prop-paper-flowers-"))
    return {"outline": not plain}


# ---------------------------------------------------------------- encoding
def rle(indices: list[int]) -> str:
    """Runs of palette indices: U+0100 + index (at most 1023), then U+0500 + length when a run is longer than 1."""
    out = []
    i, n = 0, len(indices)
    while i < n:
        v = indices[i]
        j = i + 1
        while j < n and indices[j] == v and j - i < 255:
            j += 1
        out.append(chr(0x100 + v))
        if j - i > 1:
            out.append(chr(0x500 + (j - i)))
        i = j
    return "".join(out)


def source_hash() -> str:
    h = hashlib.sha256()
    for p in ("build.py", "voxel.py", "models.py", "world_models.py", "puppet.py", "roster.py", "reference_cats.py", "costumes.py", "enemies.py", "inputs.json"):
        h.update((HERE / p).read_bytes())
    h.update((ROOT / "assets/characters/generated/raw/zero-nicole-model-sheet.png").read_bytes())
    return h.hexdigest()


def contact_sheets(baked: dict, groups: dict) -> None:
    from PIL import Image

    SHEETS.mkdir(parents=True, exist_ok=True)
    for group, ids in groups.items():
        pad = 6
        cols = max(1, min(len(ids), {"small": 8, "crops": 8, "props": 4, "folk": 8, "rotor": 4}.get(group, 4)))
        cells = [baked[i] for i in ids]
        cw = max(b.w for b in cells) + 2 * pad + 16
        ch = max(b.h for b in cells) + 2 * pad + 8
        rows = (len(cells) + cols - 1) // cols
        im = Image.new("RGBA", (cw * cols, ch * rows), (22, 36, 44, 255))
        px = im.load()
        for k, b in enumerate(cells):
            ox, oy = (k % cols) * cw + pad + 8, (k // cols) * ch + pad
            fx, fy = ox + b.ax, oy + b.ay
            # Ground diamond hint under the foot, then the shadow, then the sprite.
            if b.shadow:
                sh = b.shadow
                for y in range(sh["h"]):
                    for x in range(sh["w"]):
                        if sh["mask"][y, x]:
                            X, Y = fx + sh["x"] + x, fy + sh["y"] + y
                            if 0 <= X < im.width and 0 <= Y < im.height:
                                r, g, bb, _ = px[X, Y]
                                px[X, Y] = (int(r * 0.58), int(g * 0.58), int(bb * 0.62), 255)
            for y in range(b.h):
                for x in range(b.w):
                    c = b.pixels[y * b.w + x]
                    if c:
                        px[ox + x, oy + y] = (int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), 255)
            for l in b.lights:
                X, Y = fx + l["x"], fy + l["y"]
                if 0 <= X < im.width and 0 <= Y < im.height:
                    pass
        im.save(SHEETS / f"{group}.png")
        im.resize((im.width * 4, im.height * 4), Image.NEAREST).save(SHEETS / f"{group}@4x.png")


def ground_extent(model) -> dict:
    """Ground-level extent (the lowest 3 layers) in local world units: the footprint a piece stands on."""
    occ = model.m[:, :, :3] > 0
    fi, fj = np.nonzero(occ.any(2))
    return {"x": int(2 * (model.x0 + fi.min())), "y": int(2 * (model.y0 + fj.min())),
            "w": int(2 * (fi.max() - fi.min() + 1)), "d": int(2 * (fj.max() - fj.min() + 1))}


HEADER = ("// GENERATED by scripts/iso-art/build.py from the voxel models in scripts/iso-art/; do not edit.\n"
          "// Rebuild: UV_CACHE_DIR=output/tools/uv-cache uv run --with pillow --with numpy python scripts/iso-art/build.py\n"
          "// Pixels: runs of palette indices (U+0100 + index, then U+0500 + length for runs over 1), row-major.\n")


def body_of(entries: dict) -> str:
    return ",\n".join(f"  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False, separators=(',', ':'))}" for k, v in entries.items())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None)
    ap.add_argument("--no-sheets", action="store_true")
    args = ap.parse_args()
    R = ramps()
    table = sprites()
    baked, groups = {}, {}
    for sid, (group, fn, base) in table.items():
        if args.only and args.only not in sid:
            continue
        if group in ("cats", "costumes", "enemies"):
            b = fn()
            if b is None:
                continue
            baked[sid] = (b, None)
            groups.setdefault(group, []).append(sid)
            continue
        model = fn()
        b = bake(model, R, **bake_options(sid, group))
        if base is not None:
            e = b.extent
            assert e["x"] >= base["x"] - 1 and e["y"] >= base["y"] - 1 and e["x"] + e["w"] <= base["x"] + base["w"] + 1 and e["y"] + e["d"] <= base["y"] + base["d"] + 1, (sid, e, base)
            if not (e["x"] >= base["x"] and e["y"] >= base["y"] and e["x"] + e["w"] <= base["x"] + base["w"] and e["y"] + e["d"] <= base["y"] + base["d"]): print("outside base", sid, e, base)
        elif group == "pieces" and (model.m[:, :, :3] > 0).any():
            base = ground_extent(model)
        baked[sid] = (b, base)
        groups.setdefault(group, []).append(sid)
    if not args.no_sheets:
        contact_sheets({k: v[0] for k, v in baked.items()}, {g: ids for g, ids in groups.items() if g not in ("cats", "costumes", "enemies")})
        pz.cat_sheets({k: v[0] for k, v in baked.items() if k.startswith("cat-")}, SHEETS)
        cs.costume_sheets({k: v[0] for k, v in baked.items()}, SHEETS)
        en.enemy_sheets({k: v[0] for k, v in baked.items()}, SHEETS)
    if args.only:
        print(f"baked {len(baked)} (no TS written with --only)")
        return
    write_reference_atlas()
    palette = [""]
    index = {"": 0}
    for sid, (b, _) in baked.items():
        for c in b.pixels:
            if c not in index:
                index[c] = len(palette)
                palette.append(c)
    assert len(palette) <= PALETTE_CAP, f"{len(palette) - 1} colours over the cap of {PALETTE_CAP - 1}"
    modules: dict[str, dict] = {}
    for sid, (b, base) in baked.items():
        e = {"w": b.w, "h": b.h, "ax": b.ax, "ay": b.ay, "data": rle([index[c] for c in b.pixels])}
        if b.shadow:
            sh = b.shadow
            e["shadow"] = {"x": sh["x"], "y": sh["y"], "w": sh["w"], "h": sh["h"],
                           "data": rle([1 if v else 0 for v in sh["mask"].reshape(-1).tolist()])}
        e["lights"] = b.lights
        e["extent"] = b.extent
        if base is not None:
            e["base"] = base
        group = table[sid][0]
        modules.setdefault(MODULES.get(group, ("scenery-pixels.ts", "SCENERY_SPRITES")), {})[sid] = e
    entries = modules.pop(("scenery-pixels.ts", "SCENERY_SPRITES"))
    text = HEADER
    text += f"export const SCENERY_SOURCE_HASH = {json.dumps(source_hash())};\n"
    text += "/** One palette shared by every generated sprite module (scenery, props, landmarks, townsfolk, cats, costumes). */\n"
    text += "export const SCENERY_PALETTE: readonly string[] = " + json.dumps(palette) + ";\n"
    text += "export type GenLightKind = \"window\" | \"lamp\" | \"lantern\" | \"candle\" | \"pumpkin\";\n"
    text += "export interface GenRect { readonly x: number; readonly y: number; readonly w: number; readonly d: number }\n"
    text += "export interface GenShadow { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly data: string }\n"
    text += "export interface GenLight { readonly kind: GenLightKind; readonly x: number; readonly y: number }\n"
    text += "export interface GenSprite {\n  readonly w: number;\n  readonly h: number;\n  /** Foot point inside the sprite (pixels from its top-left). */\n  readonly ax: number;\n  readonly ay: number;\n  readonly data: string;\n  readonly shadow?: GenShadow;\n  /** Emissive anchors in pixels from the foot. */\n  readonly lights: readonly GenLight[];\n  /** Ground extent of the voxels and the declared footprint (local world units). */\n  readonly extent: GenRect;\n  readonly base?: GenRect;\n}\n"
    text += "export const SCENERY_SPRITES: Readonly<Record<string, GenSprite>> = {\n" + body_of(entries) + ",\n};\n"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    total = len(text.encode())
    sets = wm.landmark_sprites()[1]
    for (fname, const), ents in modules.items():
        t = HEADER + "import type { GenSprite } from \"./scenery-pixels.js\";\n"
        if fname == "cats-pixels.ts":
            t += "/** Model-sheet frames per animation; ids are <identity>-<se|sw|nw|ne>-<anim>-<frame>. */\n"
            t += "export const CAT_PUPPET_FRAMES = " + json.dumps({a: n for a, n in pz.ANIMS}, separators=(",", ":")) + ";\n"
        if fname == "enemies-pixels.ts":
            t += "/** Per enemy variant (`<kind>`, `<kind>@elite`): frames per animation and its native-pixel box, crown row and shadow. */\n"
            t += "export interface EnemyPuppetMeta { readonly frames: Readonly<Record<string, number>>; readonly halfWidth: number; readonly top: number; readonly bottom: number; readonly crown: number; readonly shadow: readonly [number, number] }\n"
            t += "export const ENEMY_PUPPETS: Readonly<Record<string, EnemyPuppetMeta>> = " + json.dumps(en.puppet_meta({k: v[0] for k, v in baked.items()}, INPUTS["elite"], INPUTS["enemyRadii"]), separators=(",", ":")) + ";\n"
        if fname == "landmarks-pixels.ts":
            t += "/** Rotor frames over a quarter turn (four-fold symmetric sails); rotor-windmill-<frame>. */\n"
            t += f"export const ROTOR_FRAMES = {wm.ROTOR_FRAMES};\n"
            t += "/** Per landmark kind: a flat ground base and extra standing pieces, [sprite, dx, dy] from the centre (world units). */\n"
            t += "export interface LandmarkSet { readonly base?: readonly [string, number, number]; readonly extras?: readonly (readonly [string, number, number])[] }\n"
            t += "export const LANDMARK_SETS: Readonly<Record<string, LandmarkSet>> = " + json.dumps(sets, separators=(",", ":")) + ";\n"
        t += f"export const {const}: Readonly<Record<string, GenSprite>> = {{\n" + body_of(ents) + ",\n};\n"
        (OUT.parent / fname).write_text(t, encoding="utf-8")
        total += len(t.encode())
        print(f"{len(ents)} sprites, {len(t.encode())} bytes -> src/render/iso/gen/{fname}")
    terrain = set(c.lower() for c in INPUTS["terrainColours"])
    union = terrain | set(palette[1:])
    print(f"{len(baked)} sprites, {len(palette) - 1} colours ({len(union)} with terrain), {total} bytes total")


if __name__ == "__main__":
    main()
