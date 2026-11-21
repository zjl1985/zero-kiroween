# Sprite-stacking correction

The user specified [danielwh2/sprite-stacking](https://github.com/danielwh2/sprite-stacking).
The preceding `113072c` prototype enhanced flat drawn facades and did **not** implement
that reference's volume reconstruction/rendering technique. It must not be described
as a sprite-stacking implementation or accepted art.

This implementation follows the reference [skill](https://github.com/danielwh2/sprite-stacking/blob/main/skills/sprite-stacking/SKILL.md)
and Canvas recipe: centred horizontal XY sections, bottom-to-top order, common
rotation, camera squash, and per-section Z lift. It is an independently written
Canvas implementation. No reference source code, generated images or dependencies
are bundled. The project's code-only papercraft requirement means sections are
authored procedurally instead of carved from a four-view PNG; paper palettes and
the approved cat heads remain in place.

## Integrated sample

- `paper-sprite-stack.ts` bakes bounded procedural section atlases using the existing
  256-entry LRU. Sections occupy at most 16 columns, avoiding ultra-wide strips.
  Dimensions, layer count, pixel area and projected height are checked before allocation.
  Hard ground shadows union the height-projected sections on an isolated surface,
  then tint once. They never erase or tint the scene canvas.
- `paper-stacked-lamp.ts` builds actual horizontal sections for the base, post,
  inset windows, bars, four-sided cap and finial. Existing street-lamp cache and
  placement paths call it; there is no extra live game canvas or render pipeline.
- The two opening cottages use 76 sections: foundation, wall-edge windows/door,
  contracting pitched roof and hollow chimney. These render into the existing
  start-yard background. Other cottage/landmark painters, hanging lanterns,
  trees, actors, weapons and UI have not yet been converted to volume stacks.

Static objects retain the renderer's existing scene order and anchors. They are
not rebuilt as dozens of layers each frame. This sample does not add camera
rotation or any player control. There is no new decorative motion, so reduced
motion receives the same stable stack. Sim, RNG, colliders, damage, input and
skill mechanics are unchanged.

## Review limits

Static desktop Chromium captures of the actual seed-7 opening and a four-angle
street-lamp study were inspected. This is not an iPhone test, frame-time benchmark,
full-turn animation review, gallery completion, or user acceptance. Section-edge
stepping remains visible in enlarged views; the rest of the art still uses the
old construction. Keep this at sample scope pending visual/device review.

Rebuild with `npm run build`, test with `npm test`, and reproduce the playable
sample at `/?start=1&seed=7`. `scripts/prepare-paper-comparison.mjs` rebuilds
the original baseline and current sample with identical measurement hooks and
runs the deterministic gameplay comparison. No runtime style toggle is added.

Validation for this correction: build succeeded; 418 tests passed; all 64
baseline/current full-state checkpoints matched; `git diff --check` passed.
