# Add a costume (the costume workshop)

A costume is clothing and head makeup that the **chosen cat** (Zero or Nicole) wears for a whole night, plus one small auto skill and an unlock rule. It is never a second character, follower or companion, so the single-cat rule holds. The 14 meme-cat costumes (`src/defs/costumes/<id>/`) were all made with this recipe; use it as the production line for any new one ("提炼成工坊": distil a person into a papercraft cat costume).

User decisions behind it (2026-11-19): the meme cats are costumes ("就是 服装"); build all 14 ("都做"); cats only, distilled into a reusable workshop ("猫，而且要提炼成工坊"); each costume carries a small skill adapted from the old assist idea; the two cats' kits stay; costumes are unlocked by play, not all available at the start; the head may get makeup the way Meow Wall did it, as a layer over the untouched approved head. Random helper cats as separate characters remain not built.

Interfaces: `CostumeDef`, `CostumeSkill`, `CostumeUnlock` in `src/defs/types.ts`; `CostumeState`, `CostumeZone` in `src/game/types.ts`; `CostumeArt`, `CostumeMakeup`, `CostumeOutfit`, `OutfitPart`, `CostumeExpression` in `src/render/art-registry.ts`. Reference: `src/defs/costumes/poteto/` (worked example below).

## 1. Research card

Fill one card before any code, three columns, as in the archive cards (`docs/archive/PLAN-v0.7-obsolete.md` 4.3 / 4.4, research only):

| Source facts | Distilled elements | Cat mechanic |
| --- | --- | --- |
| Public, citable facts with a link (avatar, a well-known project, a widely reported hobby or phrase) | At most about 3 identifying elements: silhouette, colour, prop, accessory, pose | One original small skill with one main effect, adapted from the card's assist idea |

Copy the card into the def file's header comment (source, distilled elements, cat design, adapted skill). Every costume needs a main effect that no other costume has.

## 2. Boundaries

- Cats only. No human faces, no likeness of a real face; the cat keeps its own approved head.
- No real logos, trademarks or product names, in art or copy. Use plain, unbranded shapes (an unbranded paper chip, a cardboard car, an original folded-bird tag instead of a mascot).
- Player-facing names are cat nicknames ("Roast Sweet Potato Cat"), never a real name. `tests/costumes.test.mjs` blocks real names and brands in `costume.*`, `notice.costume-*` and `result.unlocked` (en and zh, word boundary, case-insensitive); add any new name to that blocklist.
- The flavour line (`costume.<id>.line`) is a fictional cat line, never a real quote. Gentle tone, no mockery, no claim of endorsement. A community meme stays community context (for example the night-desk seal is "put away for tonight", not a red ban stamp).

## 3. Head makeup (Meow Wall manner)

Meow Wall (`src/cats/meow-wall-art.ts`, copied from zjl1985/meow-wall `mascot-art.ts`) builds heads from three layered axes: skin and markings, expression, accessories. Costumes follow the same model with `CostumeMakeup`:

- `patches`: SVG paths in head units with `color` (hex or a palette role) and `alpha`, clipped to the cat's outline (cheek paint, sunscreen stripes).
- `expression`: `smile`, `wink` or `closed` (`paintExpression`); omit to keep the cat's own eyes.
- `accessories`: ids from `HEAD_ACCESSORIES` in `src/render/costume-accessories.ts` (Meow Wall's list redrawn as flat paper, plus costume pieces such as `spiky-tufts`, `goggles`, `bowler`, `bird-tag`). Add a new piece there as a flat paper painter; positions use `HEAD_CENTER` and `EYES`. Eyewear in `EYEWEAR_ACCESSORIES` replaces the cat's frames.

`paperFaceMakeup` in `src/render/paper-face.ts` paints this as a **separate cached layer** (`paper-face-makeup:<cat>:<costumeArtId>`, `MAKEUP_BOX`) on top of `paperFace` / `paperFaceEdge`. The approved heads (`2d8b25e`) and `src/cats/` stay untouched: `git diff 2d8b25e -- src/cats/` must stay empty, and `paperFace`, `FACE_STOCK`, `MUZZLE`, `paintEyes` and their cache keys must not change.

## 4. Outfit parts

`CostumeOutfit` has optional `coat` (Zero's `split-coat` tailoring) and `tee` (Nicole's `tee-and-jeans`) garment palette overrides (never fur or rim colours) and a list of `OutfitPart`s: `layer` (`under`, `back`, `torso`, `hand`, `front`), `box [l, t, r, b]`, `at [x, y]`, optional `angle` and `tailored`, and `paint(ctx, tailoring)`.

- Draw parts with `outfitCut` / `outfitLine` from `src/render/costume-outfit.ts` (flat paper at body scale, the paper ruleset: no gradients, no blur, shadow down-right).
- Each part is cached once as `costume-part:<artId>:<index>:<tailoring|any>`; keys never contain time, position or pose. Set `tailored` only when the part must differ between the two cats.
- Keep every part inside `CAT_BOX` (±54 / −106..22) for both tailorings; `tests/cat-art.test.mjs` measures the reach. The whole wardrobe on both cats in one pose stays below the shared 256-entry sprite LRU (150 at 14 costumes).
- Skill zones get their look from `zoneArt(LOOK, COLORS)` in `src/render/costume-fx.ts` (`ZoneLook`: `lane`, `circle`, `burst`, `telegraph`, `aura` motifs). Friendly zones sit under actors; armed zones show a closing telegraph ring. `preview` paints the gallery skill card, `ticket` the wardrobe glyph via `costumeTicket`.

## 5. Small skill

`CostumeDef` fields: `id`, `i18n` (`costume.<id>`), `art`, `skill { cooldown, firstAt, notice: "costume-<id>" }`, `unlock`, `activate(state, ps, ctx)`, optional `step`, `stats` (temporary buffs folded after weapons), `hooks`, `copyParams` (numbers the description interpolates).

- Put every number in one `<ID>_SKILL` const in the def file; shared limits live in `src/defs/costumes/tuning.ts` (`COSTUME.maxZones` 6).
- Build the effect from the shared primitives in `src/defs/costumes/skills.ts`: `pushRing`, `pushOutOfLane`, `slowNormals`, `slowEnemyShots`, `stunNormals`, `clearEnemyShots`, `pullShards`, `burst`, `fireArmedBursts`, `addZone`, `insideLane`, `insideCircle`, `heading`. Add a new primitive there only when two costumes could use it.
- Boss safety: the Eraser is never pushed, stunned, frozen or slowed (the primitives skip it). Bursts and turret shots may damage it; its shots may be cleared. Never touch the player's HP, time, levels or Boss HP as a "rewind".
- Determinism: no RNG and no `Math.random` in costumes. Use positions, headings and enemy lists. A plain run must stay byte-identical: `SimState.costume` is absent when no costume is worn, and hook gating tests `state.costume?.id`.
- Small means small: it sits on top of the full cat kit. Damage skills land at about 2 to 3% of a night's damage in the probe; no heal and no shield (shields are Nicole's).

## 6. Unlock

`unlock: { stat, at }` is pure data (`CostumeUnlock`): a run stat of one finished night (`keyof RunStats`, booleans count 0 / 1), `level`, lifetime `nights` / `wins`, or `dawn` (the night reached dawn, won or not, so a boss-escaped dawn counts). `unlocksAfter` in `src/game/costumes.ts` checks it once per finished night, in wardrobe order.

Calibrate with the balance probe: run plain nights and pick a threshold that about 11 to 12 of 16 scripted nights reach, unless the costume is meant as an early (nights 1, treats 2) or late (wins 1) reward. Record the chosen threshold and its hit rate in the def comment or HANDOFF.

## 7. Files, registration, copy, tests

1. `src/defs/costumes/<id>/def.ts` exporting `<ID>_SKILL` and `<ID>: CostumeDef`.
2. `src/defs/costumes/<id>/art.ts` exporting `<ID>_ART: CostumeArt`.
3. Append `<ID>` to `COSTUME_LIST` in `src/defs/costumes/index.ts` (wardrobe and unlock order; `src/defs/index.ts` registers the list last).
4. Append the import and `<ID>_ART` to the costume list in `src/render/art-index.ts` (the only module that imports art).
5. i18n in `src/content/keys.ts`, `en.ts`, `zh.ts`: `costume.<id>.name`, `.skill`, `.desc` (placeholders must exist in `copyParams`), `.line`, `.unlock` (`{at}`), `notice.costume-<id>`.
6. Tests: `tests/costumes.test.mjs` (wardrobe order, schedule, determinism, Boss safety and zone cap, one behaviour case for the new effect read from `<ID>_SKILL`, unlock at and below the threshold, copy and blocklist); `tests/cat-art.test.mjs` (reach, cache count), `gallery`, `paper-rules`, `paper-visuals` and `wardrobe` cover the new entry through the registries. `tests/registry.test.mjs` fails if `src/game`, non-legacy render, `src/ui` or `main.ts` name a costume id.
7. Probes (Node only, git-ignored): `node output/playwright/baseline-snapshot.mjs` and `baseline-long.mjs` must stay byte-identical for plain runs; `COSTUMES=<id> node output/playwright/balance-run.mjs <out.json>` (also `SEEDS`, `POLICIES`, `CATS`) then `node output/playwright/balance-costumes-summary.mjs` for wins, deaths, Boss time-to-kill, costume damage share and skill uses against Plain.
8. Review: never launch a browser here. Ask the user to open `/?gallery=1` (Wardrobe section, also `&check=gloss`) and `/?start=1&seed=45&costume=<id>` on their machine; `?costume=` wears a costume for that run only and is never saved. Record the art as not viewed.

## 8. Worked example: poteto (Roast Sweet Potato Cat)

- **Card.** Facts: a public developer avatar with thin gold round glasses, a closed-eye smile, a black turtleneck and a roasted sweet potato. Elements: gold round glasses, closed-eye smile, dark turtleneck, split sweet potato. Mechanic: "Warm supplies", the old assist's two warm orbs as one trigger.
- **Def** (`src/defs/costumes/poteto/def.ts`): `POTETO_SKILL = { cooldown: 34, firstAt: 22, warmth: 4, speed: 1.12, pickup: 40, pull: 200 }`. `activate` sets `state.costume!.buff = warmth` and calls `pullShards(state, ctx, player.x, player.y, pull)`; `stats` multiplies speed and adds pickup reach while `buff > 0`. No heal, no shield. `unlock: { stat: "treatsEaten", at: 2 }`.
- **Art** (`src/defs/costumes/poteto/art.ts`): makeup = warm cheek patches, `expression: "smile"`, accessories `round-glasses` (clears the cat's frames) and `turtleneck`; outfit = dark turtleneck colours for `coat` and `tee`, one `hand` part with the split potato (purple-red skin, gold flesh); zones = `{ aura: warmth }`, a safe circle preview and an oval ticket.
- **Copy**: `costume.poteto.name` "Roast Sweet Potato Cat" / "烤红薯猫", line "Have something warm first." (fictional).
- **Probe** (16 nights, after tuning): 2 Zero wins and 0 Nicole wins against Plain's 6 and 1; the previous agent's extra seeds and a no-op costume showed the gap is seed noise, not a weak skill. Not retuned.
