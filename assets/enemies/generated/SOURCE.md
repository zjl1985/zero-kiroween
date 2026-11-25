# Enemy model sheet

Generated pixel-art sprite sheet for all 8 enemies in Midnight Meow (`ink-blob`, `paper-bat`, `crumple`, `smudge`, `wash`, `sketch`, `kiro-ghost`, `eraser-boss`).

- Source sheet: [enemies-model-sheet.png](raw/enemies-model-sheet.png) (1376 × 768, 4 × 2 grid on uniform `#d8d4c8` background).
- Extraction script: [reference_enemies.py](../../../scripts/iso-art/reference_enemies.py) -> [enemy-reference-atlas.png](../render/enemy-reference-atlas.png) and [enemy-reference-atlas.ts](../../../src/render/iso/gen/enemy-reference-atlas.ts).
- Runtime renderer: [reference-enemy-art.ts](../../../src/render/iso/reference-enemy-art.ts), drawn at display resolution with crisp nearest-neighbour scaling and horizontal mirroring for opposite facings, falling back to voxel puppets in headless Node tests.
