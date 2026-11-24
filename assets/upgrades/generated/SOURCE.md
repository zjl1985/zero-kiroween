# Upgrade-card art

The built-in ImageGen tool made the two source sheets for the upgrade screen. [Weapons](raw/weapons.png) and [passive effects](raw/passives.png) are ordered left to right, top to bottom. The final slot in each sheet is empty.

`scripts/prepare-upgrade-card-art.py` assembles the sprites and emits the atlas coordinates used by the game. Rebuild it with `uv run --with pillow python scripts/prepare-upgrade-card-art.py`.

## Weapon sheet prompt

```text
Use case: stylized-concept. Asset: one atlas of weapon-item pixel icons for our original night-time village cat roguelike Midnight Meow. Make a production-ready sprite sheet on truly transparent background, a strictly aligned 4-column by 3-row grid of exactly 12 equally sized cells. Each object centered, with comfortably separated gutters and same optical size, occupying the middle 56 percent of each cell. Transparent space around each object, no base, no tile, no border, no panel, no text, no numerals. Premium handcrafted 32-bit RPG inventory icons with native 48–56 pixel visual resolution enlarged cleanly, precise square pixels and stair-stepped outlines, chunky readable forms, purposeful clustered highlights, violet/cool shadows and warm ivory shine. Night sky purple and aged gold unify the palette; colors should read on deep navy. Each object distinct. Ordered content, left to right:
Row 1: a crooked golden thunderbolt with two small sparks; violet five-point star taken from a cat's orbit, with a curved slender lavender ring and two tiny satellite stars; three curved silver and mauve claw slashes; an amber comet star falling diagonally with a short luminous trail.
Row 2: one cream origami crane with clear folded facets and a lilac shadow; a pumpkin seed with an orange-gold hull and tiny green sprout; a slim wooden watercolor brush tipped with turquoise-violet paint and one ink droplet; an elegant silver craft blade with brass handle and a single slit paper scrap near the blade.
Row 3: one sharply folded ivory page bent into an origami flap, small gold paper fastener; three layered short lightning bolts in gold and deep violet, central bolt foremost; a pale blue-violet cratered full moon with a tiny amber star on its edge; EMPTY transparent cell.
Do not merge or duplicate cells. Keep the silhouettes simple and objects legible even rendered around 64 CSS pixels. Clean true alpha. No repeated weapon shafts, no loose confetti, no human characters.
```

## Passive sheet prompt

```text
Use case: stylized-concept. Asset: one atlas of passive trinket pixel icons for our original night-time village cat roguelike Midnight Meow. Make a production-ready sprite sheet on truly transparent background, a strictly aligned 4-column by 3-row grid of exactly 12 equally sized cells. Each object centered, with comfortably separated gutters and same optical size, occupying the middle 56 percent of each cell. Transparent space around each object, no base, no tile, no border, no panel, no text, no numerals. Premium handcrafted 32-bit RPG inventory icons with native 48–56 pixel visual resolution enlarged cleanly, precise square pixels and stair-stepped outlines, chunky readable forms, purposeful clustered highlights, violet/cool shadows and warm ivory shine. Jade, mint, muted lavender and aged gold unify the palette; icons should read on deep navy. Ordered content, left to right:
Row 1: a rosy faceted heart with a small brass cross charm pinned near the heart's upper shoulder; one brown leather winged boot with ivory wings; a horseshoe magnet with opposite coral and blue pole tips and one magnetic shard; a sharp amethyst cat's eye in a small gold lens mount.
Row 2: an ancient open book with pale paper and red bookmark; a folded parchment kite shield with embossed mint rim; two bright mint feline eyes peering out of one compact indigo shadow; a small profile of a pointy-eared cat and its long violet cast shadow.
Row 3: a fan of three nested folded lavender paper shapes, emphasized creases; a deep blue silver shield with a bold crescent moon relief; a golden dried fish snack with a visible fish tail; EMPTY transparent cell.
Do not merge or duplicate cells. Keep silhouettes simple and objects legible even rendered around 64 CSS pixels. Clean true alpha. No thin glow, no gradients, no loose confetti, no landscape.
```
