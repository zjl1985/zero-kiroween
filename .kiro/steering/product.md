---
inclusion: always
---

# Product: Midnight Meow (猫猫守夜)

Midnight Meow is a browser survival roguelike. The player chooses Zero or Nicole, crosses a seeded night town and survives a ten-minute watch. Each cat moves with the keyboard or touch stick and attacks automatically. Dawn is a win after the Eraser falls. The game uses a fixed 2:1 isometric camera, pixel-art scenery and HD-2D night lighting.

## Current work

[HANDOFF.md](../../HANDOFF.md) contains the active backlog and verification status. [PLAN.md](../../PLAN.md) records the current product decisions. The [isometric art specification](../../docs/iso-art-spec.md) governs the active renderer.

## Product constraints

- A run features the chosen cat. Keep each cat's starter weapon, passives, exclusive cards and chest-triggered evolution. The 14 meme cats are unlockable outfits with automatic effects.
- Keep the official Meow Wall heads and the approved full-body character sheet as identity sources. Runtime uses the original-resolution source crops. See [character art provenance](../../assets/characters/generated/SOURCE.md).
- Keep one active art style. Generated and code-authored pixel art both use checked-in source and reproducible preparation. The renderer keeps the shape of roads, water and collision footprints aligned with the simulation.
- Preserve the seeded simulation, lifecycle rules and registration order. Gameplay numbers live in definitions. Renderers read state and consume their own visual hashes.
- Route player-facing strings through `t()`. New profiles default to English. Saved language choices and the Chinese pack remain part of the interface.
- Use the [development skill](../skills/midnight-meow-dev/SKILL.md) for implementation and verification. Record which tests, browser views, devices and audio checks were actually completed. Changes to the published build require authorization for that round.
