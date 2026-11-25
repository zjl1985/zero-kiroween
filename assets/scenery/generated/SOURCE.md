# HD Scenery & Biome Props Atlas

Generated pixel-art sprite sheets upgrading high-frequency core scenery (`tree-oak`, `tree-maple`, `tree-pine`, `tree-dead`, `cottage`, `bush`, `lamp`, `headstone`) and adding 8 biome-signature props (`town-bench`, `town-board`, `farm-cart`, `farm-giant-pumpkin`, `grave-arch`, `canal-lantern-rack`, `canal-dock-crates`, `meadow-mushrooms`).

- Source sheets:
  - [scenery-core-sheet.png](raw/scenery-core-sheet.png)
  - [scenery-biomes-sheet.png](raw/scenery-biomes-sheet.png)
- Extraction script: [reference_scenery.py](../../../scripts/iso-art/reference_scenery.py) -> [scenery-reference-atlas.png](../render/scenery-reference-atlas.png) and [scenery-reference-atlas.ts](../../../src/render/iso/gen/scenery-reference-atlas.ts).
- Runtime renderer: [reference-scenery-art.ts](../../../src/render/iso/reference-scenery-art.ts), drawn at display resolution with crisp nearest-neighbour scaling and automatic fallback to baked voxel sprites in headless Node tests.
