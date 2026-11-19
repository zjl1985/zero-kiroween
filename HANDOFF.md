# Midnight Meow handoff

Midnight Meow is a code-drawn papercraft survivor-like for Kiroween 2026. Read [AGENTS.md](AGENTS.md), the [development skill](.kiro/skills/midnight-meow-dev/SKILL.md) (wash-out contract in [paper-ecology.md](.kiro/skills/midnight-meow-dev/references/paper-ecology.md)) and [PLAN.md](PLAN.md). Finished work lives in Git history, not here.

## Checkpoint (open-work round, 2026-11-19, local commits only, not pushed)

Commits on `main` after `c9fee79`, in order:

| commit | change |
| --- | --- |
| `2effc4a` | Nicole in a white tee and denim, lantern halo removed. Her authored face patches (crown cut into both side locks, part line, cheek patch, chin inset) were redrawn by the earlier session and are **not user-approved**. Official head data `src/cats/` is unchanged against `2d8b25e`. |
| `528c55e` | Fold protection shows for its whole 6 s (`drawFoldGuards`), cut holes have one edge, Paper Cut pieces pruned by age (`PAPER_CUT.maxOuts` 8). The cat box (±54 / −106..22) was measured unclipped in tests (part reach x ±38.9, y −75..13, also at cue zoom 1.1). |
| `20a4c81` | Page Fold lays a dry paper bridge over water from level 2 (`FOLD_BRIDGE` in `page-fold.ts`, runtime decks in `src/game/water.ts`). |
| `996829e` | Neutral townsfolk: lamplighter mouse, stargazer owl, ferry frog (pure `src/game/townsfolk.ts`, cap 12, tips in en/zh). They are not cats. |
| `06d5691` | Balance: Wash Drip windup 0.7 → 0.8 s, drop speed 140 → 120 u/s. |
| `334b2da` | Audio mix table `src/audio/mix.ts`, every cue throttled, hard limiter after the compressor. |
| `decb960` | Sim speed-ups (enemy separation early-out, flat water index, wash lookups), behaviour byte-identical. |
| `3066542` | Pencil enemies use cached per-part pencil variants instead of scratch-canvas compositing. |
| `392a631` | Art pass: lighter, sparser pencil second pass and fibre; one tide line per wash edge (`WASH_LOOK.tideWidth` 3, alpha 0.42) instead of a soft band plus a dark line; the Paper Cut slit is drawn in 4 continuous bands so round caps no longer bead along it. No change to enemy art on dark ground in this commit. |

Verification at `392a631`: `npm run build` ok, `npm test` **325 / 325 pass** (301 at the start of the round; new suites `townsfolk`, `audio-mix`, plus new cases in `paper-verbs`, `paper-visuals`, `cat-art`, `water`, `gallery`). `git diff 2d8b25e -- src/cats/` is empty.

### Probe numbers

- **Sim step time** (`output/playwright/step-timing.mjs`, seed 7, 100 enemies, fire and water every 0.5 s, median of 3 runs): Zero 0.449 → 0.357 ms, Nicole 0.427 → 0.344 ms per step (before = `334b2da`, after = `decb960`). Older references: 0.453 / 0.418 at the round start, 0.386 / 0.352 at `e85365d`.
- **Browser frame time: not measured.** System Chrome headless crashed at launch every time in this OS sandbox (`signal=SIGABRT`, the exit-134 crash, with `kill EPERM`); the bundled `chromium_headless_shell-1248` hung until timeout.
- **Balance** (`output/playwright/balance-run.mjs`, simulated full 600 s nights, seeds 7 / 45 / 91 / 2026, two scripted card-pick policies, 16 runs). Before the Wash Drip change it dealt 60 damage against Smudge's 28 at about half the spawn share and caused 4 of 9 deaths. After: Zero wins 2/8 → 6/8, all runs 7/16 → 11/16. First chest at 69 to 110 s in every run; evolution at 265 to 375 s, or none when passive slots locked it out; levels 16 to 18 at 5 min, 31 to 35 at 10 min; peak 92 enemies (cap 100 never hit). Page Fold 18 to 34% of Nicole's damage, Watercolour Brush 12 to 15% of Nicole's and 0 to 1% of Zero's. Paper Cut shows 0% damage only because the scripted kiting keeps Zero 145 units from ink (probe limitation, not a measured weakness). Exclusive-first Nicole dies before the Boss on 3 of 4 seeds; brush-first Nicole wins 4/4. No other numbers were changed.
- **Audio levels** (`mixTable()` envelope peaks, not perceived loudness): the loudest frequent cue is now 0.074, below the quietest event cue 0.087 (defeat was 0.128 before). Snip and fold sit in the 0.060 to 0.080 band. Nobody has listened to it.

### The single screenshot of this round

Exactly one attempt was made with `output/playwright/open-work-shot.cjs` (review sheet `output/playwright/open-work-review.html` + `open-work-stage.mjs`: six 960 × 540 panels staged from real sims on seed 45 graveyard-woods and seed 5 canal: dense encounters for both cats with 60 enemies, Wash Drips, washed patches and sketches; Nicole on a Page Fold bridge with a fold guard; Zero after a closed Paper Cut loop; a townsfolk tip tag; evolution cue-zoom peak with a worn Zero). The staging ran in Node without errors. Chrome failed at launch: `browserType.launch: Target page, context or browser has been closed`, `<process did exit: exitCode=null, signal=SIGABRT>`, `exception while trying to kill process: Error: kill EPERM`. As instructed, no retry and no other tool. **No image of this round exists.** Every art change from `2effc4a` to `392a631` (outfit, fold guards, cut holes, bridge, townsfolk, per-part pencil enemies, the `392a631` pass) is unviewed in a browser. The last real still is the earlier [graveyard combat screenshot](output/playwright/combat-readability-2026-11-18.png).

## User verdict and P0

The user rated the wash-out round "只能说凑合" (only passable). The art is **not approved**. The P0 is still that the game must look good. The approved paper heads (`2d8b25e`) stay as they are: proportions, rectangular eyewear, markings, narrow head edge.

## Open work

Needs the user (cannot be finished by an agent):

1. **Art approval (P0).** View this round in a browser (the review sheet above can be rendered once Chrome runs, or play `/?start=1&seed=45`). Check pencil underdrawing, tide lines, Paper Cut / Page Fold, the bridge, townsfolk next to enemies, cat wear and Nicole's redrawn face patches. Enemy readability on graveyard ground was not changed in this round.
2. **Listen to the audio.** The new mix, the snip and fold cues and the limiter are unheard.
3. **Human playtest** on a real device, including touch controls through retry. Paper Cut and bridge use are under-sampled by the scripted probe.
4. **Design decisions.** Boss/dawn pressure policy (the Boss can be outrun and dawn still wins). Evolution slot lockout (a full passive bar blocks the partner passive; no hint or fallback). Whether ink pinned under a Page Fold should still deal contact damage (it does now; close-kiting Nicole walks into it).
5. **Random helper cats.** Not built. They conflict with the single-cat rule unless the user redefines it; need the user's go-ahead.
6. **Publishing.** All commits above are local. Push and deploy need explicit authorization (a GitHub push may trigger Vercel).
7. **Devpost copy and promotional media: not touched, the user's own work.** Agents must not draft them. Deadline 2026-12-05 06:00 Beijing time.

Blocked by the environment:

8. **Browser frame time** (p50 / p95 / max) and any screenshot: Chrome headless cannot run in this sandbox. `output/playwright/frame-time.cjs` is ready for a machine where it does.

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
