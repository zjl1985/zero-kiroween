# Midnight Meow handoff

Midnight Meow is a code-drawn papercraft survivor-like for Kiroween 2026. Read [AGENTS.md](AGENTS.md), the [development skill](.kiro/skills/midnight-meow-dev/SKILL.md) (wash-out contract in [paper-ecology.md](.kiro/skills/midnight-meow-dev/references/paper-ecology.md)) and [PLAN.md](PLAN.md). Finished work lives in Git history, not here.

## Checkpoint

- `70de2e0` on `main` polished road joins, the start lawn, the pause crease and the ink blob. The combat readability pass improves graveyard ground and washed paper. Warning outlines share their geometry with the ground tint and stay above foreground effects. Overlapping scenery yields to the selected cat, whose printed colours stay visible on washed paper.
- `npm run build` and `npm test` pass with 301 tests. [One Chrome game screenshot](output/playwright/combat-readability-2026-11-18.png) shows seed 2026 at the graveyard observatory. The scene was staged at a fixed moment with Nicole, an Eraser sweep, two lob warnings, a Page Fold and a washed patch. The full-run playtest remains deferred.

## User verdict and P0

The user viewed the wash-out round and rated it "只能说凑合" (only passable). The art is **not approved**. The P0 is still that the game must look good, so visual quality is the top open item. The approved paper heads (2d8b25e) stay as they are: proportions, rectangular eyewear, markings, narrow head edge.

## Open work

1. **Visual quality (P0).** Review the graveyard combat still with the user. Continue reviewing emblems, enemies, district sheets, landmark bases, pencil underdrawing, tide lines, Paper Cut / Page Fold and cat wear.
2. **Gameplay visibility.** The static frame shows the cat in front of the observatory and the attack outlines across both ground values. Other seeds, camera positions and dense encounters remain to be checked.
3. **Browser frame time (unmeasured).** Per-frame cat rim (two scratch canvases), `drawSketched` pencil compositing (four scratch layers, about 12 blend drawImages per actor, up to 32 actors) and sketch tile baking. Measure before adding more wash content; if slow, cache enemy sketch variants per art part like `sketchedSprite`. No still confirms the enlarged cat box (±54 / −106..22) is unclipped at cue zoom.
4. **Sim cost.** The Node step probe (seed 7, 100 enemies, fire and water every 0.5 s, `output/playwright/step-timing.mjs`) is 0.453 / 0.426 ms per step (Zero / Nicole), about 17 to 21% slower than e85365d with wash active. No hotspot found yet.
5. **Page Fold dry bridge over water** is not built: the shared water contract has no runtime crossing API (crossings come only from world-gen).
6. **Balance and playtest** (deferred by the user, needs authorization): Wash Drip in the last two spawn-table rows, the 0.3 smudge stain (wet 7 s, x0.8 slow outside puddles), the unconditional mid-night paper rain, the common brush card in both pools, Paper Cut, Page Fold. Also one full run per cat for upgrade pacing, chests, Eraser pressure, water access, landmark rewards, hazard/skill overlap on dark ground and touch controls through retry.
7. **Audio.** The snip and fold sounds and the overall mix are unheard.
8. **Review leftovers.**
   - Fold protection lasts 6 s (`WASH.fold.seconds`) but its visual shows only about 0.6 s.
   - The cut-hole blot edge may read as a double line.
   - A fourth Paper Cut loop within 2.5 s re-exposes the oldest holes.
   - Untested branches include `underCutOut` and `rasterScale >= scale`.
9. **Pending user decisions.** The Boss can be outrun and dawn still wins (confirmed rule, but Boss/dawn pressure policy is open). If passive slots fill first, the evolution partner passive is locked out for that run (confirmed rule; no hint or fallback added).
10. **Release.** English is the default and both packs are complete. Publishing the latest round, Devpost copy and media are pending; deadline 2026-12-05 06:00 Beijing time. Push, deploy and video recording need explicit authorization.
11. **Not started.** Random helper cats (ask the user first) and neutral town NPCs.

## Run

Node.js 22+, Python 3 for the preview, `npm ci` if needed.

```sh
npm run build   # tsc -> dist/, static output -> site/
npm start       # serves site/ on port 4173 (check for an existing listener first)
npm test        # builds, then runs node --test tests/*.test.mjs
```

- `http://localhost:4173/?start=1` starts a run with the saved cat; add `&seed=N` (or `?seed=N`) to pin the seed.
- `/?gallery=1` shows every registered entry; `&check=value` shows values only, `&check=gloss` flags gradients, blurred shadows and additive light.
- Verification is build plus tests plus at most one static screenshot. No animation or recording checks unless the user asks.
