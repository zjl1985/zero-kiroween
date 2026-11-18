# Midnight Meow

Choose a cat and keep watch until dawn in a town made of paper. Midnight Meow is a survivor roguelike built for Kiroween 2026. Explore a seeded town, collect ink shards, and build a loadout that can carry you through ten minutes of night.

[Play Midnight Meow in your browser](https://zero-kiroween.vercel.app/)

## How to play

Weapons attack automatically. Collect ink shards from defeated enemies to level up and choose upgrades. Elites and the Eraser drop treasure chests. Survive until dawn to win.

| Action | Desktop control |
| --- | --- |
| Move | WASD or arrow keys |
| Use your cat's skill | Space |
| Pause | Esc or P |
| Choose an upgrade | 1, 2, or 3, or click a card |

On touch screens, move with the stick and tap the skill button. English is the default, and you can switch to Chinese in the game.

## Meet the cats

| Cat | Starting weapon and skill | Weapon evolution |
| --- | --- | --- |
| **Zero** | Meowline fires at nearby enemies. His dash leaves an afterimage that distracts enemies and briefly boosts his shots. | With maxed Meowline and Long Shadow, open a chest to unlock **Echo Legion**. The afterimage fires its own shots and bursts as it fades. |
| **Nicole** | Moonstars orbit her. Moonfold slows enemies in its field and gives her a shield. | With maxed Moonstars and Deep Fold, open a chest to unlock **Full Moon**. More stars join the orbit and a recurring pulse pushes enemies away. |

## Explore the paper town

- Visit five districts linked by roads and bridges. Rest at a teahouse, tend the greenhouse, or align the observatory.
- Tear or fold paper obstacles to open routes. Paper Crane can fold nearby props and drive windmills.
- Fire spreads through flammable paper and can burn your cat. Shallow water puts out flames, and bridges let you cross deep water.
- Watch for Ink Blobs, Paper Bats, Crumples, Smudges, Kiro Ghosts, and the Eraser.

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
| `/?gallery=1` | The Paper Workshop Gallery of characters, weapons, props, and landmarks |

## Credits

The world and characters are drawn in TypeScript with Canvas. Sound is synthesized with Web Audio.

The original cat designs come from [Meow Wall](https://meow-wall.vercel.app/).

The game uses [Allo by Josh Puckett](https://allo.joshpuckett.me/) under the [SIL Open Font License](assets/fonts/OFL.txt).
