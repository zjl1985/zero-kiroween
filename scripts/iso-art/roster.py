"""Front roster portraits traced from the generated character sheet.

The reference establishes the coat, tee, cuffs, short paws and curled tail.
The actual front heads are sampled directly from the official Meow Wall
rectangle data, keeping its silhouette, expression and eyewear on one grid.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from voxel import Baked

if TYPE_CHECKING:
    from puppet import Look

HEAD_WIDTH = 48
BODY_HEIGHT = 22

# Loose split coat over a black shirt. Gold fasteners echo the necklace
# already in the head art. The warm feet show beneath the short hem.
COAT = (
    "kkkkkkkkkkkkkkkkkkkkkk",
    "kkccccclsbsbsblsccccck",
    "kchhhcllskgbgksllchhhckk",
    "kchhhhcllskGGksllcchhhcck",
    "kchhhhccllkkkkllcchhhcck",
    "kchhhccclskbbbkslccchcck",
    "kchhkkcccsbbbbbsccckkhcck",
    "kccckkcccsbbbbbsccckkccck",
    "kkcckscccsbbbbbscccskcckk",
    "kppppkccccbbbbbbcccckppppk",
    "kpeeppkcccbbbbbbccckppeepk",
    "kppkppkcccbbbbbbccckppkppk",
    "kkkkkkkcccbbbbbbccckkkkkkk",
    "kkccclccccbbbbbbcccccccckk",
    "kcchhcccccbbbbbbccccccsck",
    "kcchhcccllbbbbbbclccccsck",
    "kccchccccsbbbbbbcsccccccck",
    "kscccccccsbbbbbbcsscccccsk",
    "kkkccsssskkkkkkkksssscckkk",
    "kkksssskk.....kksssskkk",
    "kpeeppek.......kepeppek",
    "kkkkkkkk.......kkkkkkkk",
)

# White folded tee, cool underside, dark rolled denim, and two small paws.
TEE = (
    "kkkkkkkkkkkkkkkkkkkkk",
    "kwwwhhpppppphhwwwwwwk",
    "kkwwwwwxwwwwwxwwwwwwkk",
    "kwwwwwwWWWWWWWWWWwwwwk",
    "kwwwwxwwWWWWWWWWwwxwwwwk",
    "kwwWkxwwWWWWWWWWwwxkhwwk",
    "khwwkkwwWWWWWWWWwwxkkhwwk",
    "kpppkwwWWWWWWWWWwwxhkpppk",
    "kpeppkwwWWWWWWWWwwxhkpeppk",
    "kppepkwwWWWWWWWwwxhhkpeppk",
    "kppkpkwwwWWWWWwwxhhhkppkpk",
    "kkkkkkhwwwWWWwwxhhhhkkkkkk",
    "kkkkkkkkkkkkkkkkkkkkkk",
    "kddbbbbbbbbbbbbbbbbddk",
    "kdbbbbbdddbbbbbbbbbbdk",
    "kdbbbbbbdbbbbbbbbbbddk",
    "kdbbbbbbkkkbbbbbbbbddk",
    "kDDDDDDDk.kDDDDDDDDDk",
    "kDDDDDDDk.kDDDDDDDDDk",
    "kkpppppkk.kkpppppppkk",
    "kpepeepk...kepepeepk",
    "kkkkkkkk...kkkkkkkk",
)

TAIL = (
    ".......kkkk",
    "......kaaak",
    "......kaeak",
    "......kapak",
    ".....kkpppk",
    "....kkppppk",
    "kkkkpppppk.",
    "kppppppkk..",
    "kkkkkkk....",
)


def _head_pixels(look: Look) -> dict[tuple[int, int], str]:
    rects = look.head_rects
    x0 = min(x for x, _, _, _, _ in rects)
    y0 = min(y for _, y, _, _, _ in rects)
    sw = max(x + w for x, _, w, _, _ in rects) - x0
    sh = max(y + h for _, y, _, h, _ in rects) - y0
    height = round(sh * HEAD_WIDTH / sw)
    head: dict[tuple[int, int], str] = {}
    # Sample at pixel centres. Later rectangles win, exactly as in the
    # source painter, so expressions and accessories retain their layering.
    for sy in range(height):
        v = y0 + (sy + .5) * sh / height
        for sx in range(HEAD_WIDTH):
            u = x0 + (sx + .5) * sw / HEAD_WIDTH
            for x, y, w, h, colour in reversed(rects):
                if x <= u < x + w and y <= v < y + h:
                    head[sx - HEAD_WIDTH // 2, sy - height - BODY_HEIGHT] = colour
                    break
    return head


def _body_pixels(look: Look) -> dict[tuple[int, int], str]:
    coat = look.body["tailoring"] == "split-coat"
    colours = {
        "k": look.p["ink"],
        "p": look.p["head"],
        "e": look.p["headLight"],
        "c": "#37303d",
        "h": "#514755" if coat else "#a1a7c5",
        "s": "#292331",
        "l": "#453948",
        "b": "#201a25" if coat else "#304c78",
        "G": "#ffcf53",
        "g": "#eeb540",
        "w": "#e5e5ed",
        "W": "#f8f2ec",
        "x": "#c7c6dd",
        "d": "#243758",
        "D": "#86a8cc",
    }
    tail_colours = {**colours, "a": look.p["head"], "p": look.p["head"] if coat else "#59434b"}
    pixels: dict[tuple[int, int], str] = {}
    for row, runs in enumerate(TAIL):
        for col, token in enumerate(runs):
            if token != ".":
                pixels[8 + col, row - 13] = tail_colours[token]
    for row, runs in enumerate(COAT if coat else TEE):
        left = -(len(runs) // 2)
        for col, token in enumerate(runs):
            if token != ".":
                pixels[left + col, row - BODY_HEIGHT] = colours[token]
    return pixels


def _pixels(frame: Baked) -> dict[tuple[int, int], str]:
    return {
        (x - frame.ax, y - frame.ay): frame.pixels[y * frame.w + x]
        for y in range(frame.h)
        for x in range(frame.w)
        if frame.pixels[y * frame.w + x]
    }


def _costume_pixels(worn: Baked, bare: Baked, head_top: int) -> dict[tuple[int, int], str]:
    """Fit the changed pixels of a voxel costume to the roster's shorter body."""
    base = _pixels(bare)
    # Neck lies between the bare figure's last head row and the torso.
    # Derive it from the pose proportion so arm/hand props and hats can
    # be placed independently above and below the new neck seam.
    neck = -round(bare.ay * .47)
    head_height = -head_top - BODY_HEIGHT
    head_scale = head_height / (bare.ay + neck)
    body_scale = BODY_HEIGHT / -neck
    costume = {}
    for (x, y), colour in _pixels(worn).items():
        if base.get((x, y)) == colour:
            continue
        if y < neck:
            tx = round(x * HEAD_WIDTH / bare.w)
            ty = round((y - neck) * head_scale) - BODY_HEIGHT
            # The original lenses and central expression remain legible.
            if -41 <= ty <= -26 and abs(tx) <= 17:
                continue
        else:
            tx = x
            ty = min(-1, round(y * body_scale)) if y < 0 else y
        costume[tx, ty] = colour
    return costume


def bake_roster(look: Look, posed: Baked | None = None, bare: Baked | None = None) -> Baked:
    """Return the finished front pose with its foot at the sprite anchor."""
    head = _head_pixels(look)
    pixels = {**_body_pixels(look), **head}
    if posed is not None and bare is not None:
        pixels.update(_costume_pixels(posed, bare, min(y for _, y in head)))
    x0 = min(x for x, _ in pixels)
    x1 = max(x for x, _ in pixels)
    y0 = min(y for _, y in pixels)
    y1 = max(0, max(y for _, y in pixels))
    return Baked(
        w=x1 - x0 + 1,
        h=y1 - y0 + 1,
        ax=-x0,
        ay=-y0,
        pixels=[pixels.get((x, y), "") for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)],
        extent={"x": -4, "y": -6, "w": 14, "d": 12},
    )
