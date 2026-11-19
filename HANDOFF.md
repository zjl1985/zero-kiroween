# Midnight Meow handoff

Midnight Meow is a code-drawn papercraft survivor-like for Kiroween 2026. Read [AGENTS.md](AGENTS.md), the [development skill](.kiro/skills/midnight-meow-dev/SKILL.md) (wash-out contract in [paper-ecology.md](.kiro/skills/midnight-meow-dev/references/paper-ecology.md)) and [PLAN.md](PLAN.md). Finished work lives in Git history, not here.

## Checkpoint (design decisions, 2026-11-19, local commits only, not pushed)

The user answered the three open design questions: outrunning the Boss to dawn is not a win; a full passive bar gets a fallback; ink pinned under a Page Fold does not bite. Commits on `main` after `ca8ad06`:

| commit | change |
| --- | --- |
| `63e8928` | Dawn with the Eraser still alive ends the night as a loss. `SimState.endReason` is `'dawn' \| 'fallen' \| 'boss-escaped'` (null while playing). Beating the Boss does not end the night early. A run without a registered Boss still wins at dawn. New keys `result.heading_boss_escaped` / `result.boss_escaped`; `result.boss_left` now reads "Still loose" / "仍在游荡"; the Boss notice reads "The Eraser is coming · Wear it down before dawn" / "橡皮擦来了 · 天亮前把它磨平". |
| `6e7d657` | Evolution fallback in `readyEvolution`: the weapon at max plus either the partner passive or a full passive bar (`BUILD.passiveSlots`). Still granted only by opening a chest, never as a level-up card, once. Selector copy `evolution.rule` mentions the full bar. |
| `1d88912` | Test only: ink pinned under a Page Fold neither moves nor bites, through the shared stun skip in `stepEnemies` (the moon-lantern freeze uses the same skip). The earlier note that pinned ink still bites was a misreading. |
| docs commit | Records these rules in HANDOFF, PLAN, steering and the skill. |

Verification: `npm test` **332 / 332 pass** (327 plus 5 new cases). The new result heading, result line, Boss notice and selector copy were not viewed in a browser.

Probes (Node only, git-ignored references in `output/playwright/`, old ones kept as `*-reference-pre-decisions.txt`):

- `baseline-snapshot.mjs` and `baseline-long.mjs`: every checkpoint differs only by the new `endReason` field; kills, levels, builds and evolution timing are identical. The four long-run finals change from `won` to `lost` (`boss-escaped`), because none of those scripted runs defeats the Eraser.
- **Balance** (`balance-run.mjs`, same 16 runs, `balance-after-decisions.json` against `balance-pre-decisions.json`): wins 11/16 → 7/16 (Zero 6/8 → 6/8, Nicole 5/8 → 1/8). The 4 lost wins are Nicole runs that reached dawn with the Eraser alive (exclusive-first seed 91, brush-first seeds 45, 91, 2026); they now end `boss-escaped`. Boss defeats stay 7, and every win now defeats the Boss. Evolutions 11 → 12: brush-first Nicole seed 45 filled her bar without Deep Fold and now evolves Full Moon at 323 s through the fallback (she still loses at dawn). Every other evolution time is unchanged (265 to 375 s). No numbers were retuned; Nicole's Boss damage is the open balance question for a playtest.

## Checkpoint (open-work round, 2026-11-19, local commits only, not pushed)

Commits on `main` after `c9fee79`, in order:

| commit | change |
| --- | --- |
| `2effc4a` | Nicole in a white tee and denim. This commit (the user's own pending work, committed as found) also removed the lantern for **both** cats: `cat-detail.ts` no longer has the `lantern` part, `paintLantern`, the lamp glow or the lantern swing, `world.ts` dropped `drawGroundLight` beside the cat, and `ZERO_ART` lost `lantern: "shutter"` and `accessory: "watch-chain"` (the watch chain is still drawn inside his coat). Zero no longer carries a lantern; this was not reverted and needs the user's review. Nicole's authored face patches (crown cut into both side locks, part line, cheek patch, chin inset) were redrawn by the earlier session and are **not user-approved**. Official head data `src/cats/` is unchanged against `2d8b25e`. |
| `528c55e` | Fold protection shows for its whole 6 s (`drawFoldGuards`), cut holes have one edge, Paper Cut pieces pruned by age (`PAPER_CUT.maxOuts` 8). The cat box (±54 / −106..22) was measured unclipped in tests (part reach x ±38.9, y −75..13, also at cue zoom 1.1). |
| `20a4c81` | Page Fold lays a dry paper bridge over water from level 2 (`FOLD_BRIDGE` in `page-fold.ts`, runtime decks in `src/game/water.ts`). Fire cells never occupy a deck (`props.ts` `wetCell` ignores decks), while a burning actor on a deck counts as dry and keeps burning until it reaches water. |
| `996829e` | Neutral townsfolk: lamplighter mouse, stargazer owl, ferry frog (pure `src/game/townsfolk.ts`, cap 12, tips in en/zh). They are not cats. |
| `06d5691` | Balance: Wash Drip windup 0.7 → 0.8 s, drop speed 140 → 120 u/s. |
| `334b2da` | Audio mix table `src/audio/mix.ts`, every cue throttled, hard limiter after the compressor. |
| `decb960` | Sim speed-ups (enemy separation early-out, flat water index, wash lookups), behaviour byte-identical. |
| `3066542` | Pencil enemies use cached per-part pencil variants instead of scratch-canvas compositing. |
| `392a631` | Art pass: lighter, sparser pencil second pass and fibre; one tide line per wash edge (`WASH_LOOK.tideWidth` 3, alpha 0.42) instead of a soft band plus a dark line; the Paper Cut slit is drawn in 4 continuous bands so round caps no longer bead along it. No change to enemy art on dark ground in this commit. |
| review fixes (after `2ae1105`) | Contact knockback now passes the Page Fold decks to `resolveWaterMove` for the cat and the enemy, so a hit on a bridge no longer throws either actor about 53 units off the deck. New `paper-verbs` cases: knockback mid-deck keeps both on the deck (fails without the fix), and expiry waits for a frozen enemy over the core, then sets it on a bank. Sprite cache: the reviewer's "102 parts" was the sum of enemy radii; a dense Node sweep (8 kinds, painted plus both pencil steps, elites, hit flash, slow, stun, many ids, times and facings) caches 91 entries in the shared 256 LRU, now asserted at most 128 in `paper-visuals`. No separate cache budget was added. Scene-wide cache use with props, decor, cat and townsfolk together was not measured. Verified: `npm test` **327 / 327 pass**; `baseline-snapshot.mjs` and `baseline-long.mjs` outputs byte-identical to their references (those runs never lay a bridge). |

Verification at `392a631`: `npm run build` ok, `npm test` **325 / 325 pass** (301 at the start of the round; new suites `townsfolk`, `audio-mix`, plus new cases in `paper-verbs`, `paper-visuals`, `cat-art`, `water`, `gallery`). `git diff 2d8b25e -- src/cats/` is empty.

### Probe numbers

- **Sim step time** (`output/playwright/step-timing.mjs`, seed 7, 100 enemies, fire and water every 0.5 s, median of 3 runs): Zero 0.449 → 0.357 ms, Nicole 0.427 → 0.344 ms per step (before = `334b2da`, after = `decb960`). Older references: 0.453 / 0.418 at the round start, 0.386 / 0.352 at `e85365d`.
- **Browser frame time: not measured.** System Chrome headless crashed at launch every time in this OS sandbox (`signal=SIGABRT`, the exit-134 crash, with `kill EPERM`); the bundled `chromium_headless_shell-1248` hung until timeout.
- **Balance** (`output/playwright/balance-run.mjs`, simulated full 600 s nights, seeds 7 / 45 / 91 / 2026, two scripted card-pick policies, 16 runs). Before the Wash Drip change it dealt 60 damage against Smudge's 28 at about half the spawn share and caused 4 of 9 deaths. After: Zero wins 2/8 → 6/8, all runs 7/16 → 11/16 (under the old rule that dawn always wins; 7/16 under the design-decisions rule, see above). First chest at 69 to 110 s in every run; evolution at 265 to 375 s, or none when passive slots locked it out (fixed by the fallback); levels 16 to 18 at 5 min, 31 to 35 at 10 min; peak 92 enemies (cap 100 never hit). Page Fold 18 to 34% of Nicole's damage, Watercolour Brush 12 to 15% of Nicole's and 0 to 1% of Zero's. Paper Cut shows 0% damage only because the scripted kiting keeps Zero 145 units from ink (probe limitation, not a measured weakness). Exclusive-first Nicole dies before the Boss on 3 of 4 seeds; brush-first Nicole wins 4/4. No other numbers were changed.
- **Audio levels** (`mixTable()` envelope peaks, not perceived loudness): the loudest frequent cue is now 0.074, below the quietest event cue 0.087 (defeat was 0.128 before). Snip and fold sit in the 0.060 to 0.080 band. Nobody has listened to it.

### The single screenshot of this round

Exactly one attempt was made with `output/playwright/open-work-shot.cjs` (review sheet `output/playwright/open-work-review.html` + `open-work-stage.mjs`: six 960 × 540 panels staged from real sims on seed 45 graveyard-woods and seed 5 canal: dense encounters for both cats with 60 enemies, Wash Drips, washed patches and sketches; Nicole on a Page Fold bridge with a fold guard; Zero after a closed Paper Cut loop; a townsfolk tip tag; evolution cue-zoom peak with a worn Zero). The staging ran in Node without errors. Chrome failed at launch: `browserType.launch: Target page, context or browser has been closed`, `<process did exit: exitCode=null, signal=SIGABRT>`, `exception while trying to kill process: Error: kill EPERM`. As instructed, no retry and no other tool. **No image of this round exists.** Every art change from `2effc4a` to `392a631` (outfit, fold guards, cut holes, bridge, townsfolk, per-part pencil enemies, the `392a631` pass) is unviewed in a browser. The last real still is the earlier [graveyard combat screenshot](output/playwright/combat-readability-2026-11-18.png).

## User verdict and P0

The user rated the wash-out round "只能说凑合" (only passable). The art is **not approved**. The P0 is still that the game must look good. The approved paper heads (`2d8b25e`) stay as they are: proportions, rectangular eyewear, markings, narrow head edge.

## Open work

Needs the user (cannot be finished by an agent):

1. **Art approval (P0).** View this round in a browser (the review sheet above can be rendered once Chrome runs, or play `/?start=1&seed=45`). Check pencil underdrawing, tide lines, Paper Cut / Page Fold, the bridge, townsfolk next to enemies, cat wear, Nicole's redrawn face patches and both cats without their lanterns (Zero lost his shutter lantern and its ground light in `2effc4a`; decide whether to keep that or restore it). Enemy readability on graveyard ground was not changed in this round.
2. **Listen to the audio.** The new mix, the snip and fold cues and the limiter are unheard.
3. **Human playtest** on a real device, including touch controls through retry. Paper Cut and bridge use are under-sampled by the scripted probe.
4. **Design decisions: resolved** (see the design-decisions checkpoint). Dawn with a living Eraser is a loss (`boss-escaped`). A full passive bar counts in place of the missing partner passive, so a chest still evolves the maxed weapon. Ink pinned under a Page Fold deals no contact damage. Still open: whether Nicole needs more Boss damage now that 3 of her 4 brush-first dawns are losses (balance, not retuned).
5. **Random helper cats.** Not built. They conflict with the single-cat rule unless the user redefines it; need the user's go-ahead.
6. **Publishing.** All commits above are local. Push and deploy need explicit authorization (a GitHub push may trigger Vercel).
7. **Devpost copy and promotional media: not touched, the user's own work.** Agents must not draft them. Deadline 2026-12-05 06:00 Beijing time.

Blocked by the environment:

8. **Browser frame time** (p50 / p95 / max) and any screenshot: the user runs these on their own machine (`node output/playwright/frame-time.cjs`, `node output/playwright/open-work-shot.cjs`). Agents must not launch any browser in the sandbox.

## Run

Node.js 22+, Python 3 for the preview, `npm ci` if needed.

```sh
npm run build   # tsc -> dist/, static output -> site/
npm start       # serves site/ on port 4173 (check for an existing listener first)
npm test        # builds, then runs node --test tests/*.test.mjs
```

- `http://localhost:4173/?start=1` starts a run with the saved cat; add `&seed=N` (or `?seed=N`) to pin the seed.
- `/?gallery=1` shows every registered entry; `&check=value` shows values only, `&check=gloss` flags gradients, blurred shadows and additive light.
- Agent verification is build plus tests. Agents must never launch Chrome, Chromium or a Playwright browser in the sandbox (each crash shows the user a macOS dialog). The user takes screenshots with `node output/playwright/open-work-shot.cjs` and measures frame time with `node output/playwright/frame-time.cjs`; agents name the command and record the art as not viewed. No animation or recording checks unless the user asks.
