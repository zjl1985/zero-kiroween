# Midnight Meow

Choose a cat and keep watch until dawn in a pixel-art town with sprite-stacked scenery. Midnight Meow is a survivor roguelike built for Kiroween 2026. Explore a seeded town, collect ink shards, and build a loadout that can carry you through ten minutes of night.

[Play the published Midnight Meow](https://zero-kiroween.vercel.app/)

The playable pixel checkpoint `4fd9245` is published. Further asset-by-asset art refinement is on `refactor/pixel-stacking`; see [the review log](docs/pixel-asset-review.md). The previous paper-art version is preserved at `archive/papercraft-2026-11-21` (`d26859b`). Run `npm install`, `npm run build`, then `npm start` to preview locally. See [pixel refactor notes](docs/pixel-refactor.md) for architecture and verification.

## Pixel art workshop / 像素素材工坊

后续模型请先读 **[像素素材工坊与接手说明](docs/PIXEL_ART_WORKSHOP.md)**：原始生成表、提示词与参考、裁切透明化/调色/编译、脚点与 Y 排序、验证命令及待优化项均已入仓。

运行后打开 `/?gallery=1&assets=generated` 预览全部现用素材，`npm run art:prepare` 从仓库内原图重建；这不是重新调用云端模型。

## How to play

Weapons attack automatically. Collect ink shards from defeated enemies to level up and choose upgrades. Elites and the Eraser drop treasure chests. Defeat the Eraser and survive until dawn to win; if the Eraser is still loose at dawn, the night is lost.

| Action | Desktop control |
| --- | --- |
| Move | WASD or arrow keys |
| Pause | Esc or P |
| Choose an upgrade | 1, 2, or 3, or click a card |

On touch screens, move with the stick; attacks are automatic. English is the default, and you can switch to Chinese in the game.

## Meet the cats

| Cat | Starting weapon | Weapon evolution |
| --- | --- | --- |
| **Zero** | Meowline fires at nearby enemies. He keeps his distance using ordinary movement. | With maxed Meowline and Long Shadow, open a chest to unlock **Echo Legion**. Automatic afterimages fire their own shots and burst as they fade. |
| **Nicole** | Moonstars orbit her. Move to keep enemies within their orbit. | With maxed Moonstars and Deep Fold, open a chest to unlock **Full Moon**. More stars join the orbit and a recurring pulse pushes enemies away. |

## Explore the paper town

- Visit five districts linked by roads and bridges. Rest at a teahouse, tend the greenhouse, or align the observatory.
- Tear or fold paper obstacles to open routes. Paper Crane can fold nearby props and drive windmills.
- Fire spreads through flammable paper and can burn your cat. Shallow water puts out flames, and bridges let you cross deep water.
- Watch for Ink Blobs, Paper Bats, Crumples, Smudges, Kiro Ghosts, Wash Drips, Pencil Sketches, and the Eraser.

## Wash-out: keep the colour on the page

Water lifts the colour off the paper. Wash Drips spit water drops, Water Buckets spill when torn, wading splashes the page, and a short paper rain falls in the middle of the night. Washed paper turns back into raw cream paper with its pencil underdrawing showing. While it is wet it slows you, cannot burn, and tears easily. Pencil Sketches wake on colourless paper near you.

The Eraser rubs the page blank: no colour and no pencil lines. Paint it back before more sketches wake.

Colour comes back from pigment. Defeated ink splashes its own colour where it falls, lit pumpkins and full moon lanterns slowly repaint the paper around them, and dawn repaints the whole town. The result page shows how much colour you kept.

The **Watercolour Brush** is a weapon either cat can pick up. It dabs your cat's colour back onto the page as you walk, grazes nearby ink, and rubs out pencil sketches quickly.

## Paper verbs

Each cat has one more exclusive card that works the page itself:

| Card | Cat | What it does |
| --- | --- | --- |
| **Paper Cut** | Zero | Your path slits the page for a moment. Close the line into a loop to cut the piece out: ink inside takes damage and paper inside tears. The open slit nicks ink that crosses it. |
| **Page Fold** | Nicole | Every few seconds, when ink is close, the page folds over toward it. Ink in the fold is flipped across, pinned and hit. At level 3 the fold also raises a short paper wall. |

Your cat shows damage as creases and tears on its clothes, and healing as tape patches. Controls are unchanged.

## Run locally

Install Node.js 22 or newer, npm, and Python 3 for the preview server.

```sh
npm ci
npm run build
npm start
```

Open <http://localhost:4173/>. Run `npm test` for the automated tests. The build produces `site/` for static hosting.

| URL option | What it opens |
| --- | --- |
| `/?start=1&seed=7` | A run with the saved cat and a fixed world seed |
| `/?gallery=1` | Pixel Town Atlas, including generated scenery, characters, weapons, props, and landmarks |
| `/?gallery=1&assets=generated` | Focused generated-asset workshop; same compiled sprites as the game |

For the playable paper-prototype A/B, run `node scripts/prepare-paper-comparison.mjs`,
then `python3 -m http.server 4174 --directory output/paper-comparison`.
Open <http://localhost:4174/> for separate frozen-baseline and prototype games.
The opt-in developer capture panel (`?profile=1`) exports frame intervals and CPU
timings; it is not a player-facing art switch. See the [iPhone review protocol](docs/paper-prototype-review.md).

## Credits

Characters and effects are drawn in TypeScript with Canvas. Village scenery uses generated pixel sprites compiled into synchronous Canvas row runs; original sheets, generation records and the inactive previous pack attribution are preserved in [the workshop](docs/PIXEL_ART_WORKSHOP.md). Sound is synthesized with Web Audio.

The original cat designs come from [Meow Wall](https://meow-wall.vercel.app/).

The game uses [Allo by Josh Puckett](https://allo.joshpuckett.me/) under the [SIL Open Font License](assets/fonts/OFL.txt).
