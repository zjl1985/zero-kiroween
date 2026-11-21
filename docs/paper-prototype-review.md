# Paper prototype: manual iPhone Safari A/B review

This is a measurement protocol, not collected evidence. No iPhone performance, browser pixels, visual approval or gameplay equivalence is established by this document or by passing command-level tests.

## Versions and setup

- Build both playable versions with `node scripts/prepare-paper-comparison.mjs`. It checks out frozen baseline `6d1eab6` temporarily, adds the identical capture hooks, builds both versions and compares complete serializable simulation state for two cats and two seeds across 1800 fixed-input steps per run. It writes generated sites and a manifest into `output/paper-comparison/` and removes its temporary worktree.
- Serve with `python3 -m http.server 4174 --directory output/paper-comparison` and open `http://<computer-LAN-IP>:4174/` on the iPhone on the same network. The index links to separate A/B games; there is no player-facing style switch.
- **A:** the supplied baseline build with the same developer instrumentation.
- **B:** the supplied paper prototype build.
- Open each supplied URL with `?start=1&seed=7&profile=1` (append with `&` if the URL already has a query). The profile panel exists only when explicitly enabled.
- Record both exact revision/build identifiers and the exported `variant`; do not compare an old deployed build with an unidentified local build. Both variants must use the same instrumentation and viewport settings.
- Use the same iPhone, iOS/Safari version, orientation, browser zoom, selected cat/costume, reduced-motion setting, battery/power mode and starting temperature. Keep Safari toolbar state and the rendered viewport consistent. Do not rotate during a capture.
- For each run reload into a fresh seed-7 game. A fresh page resets game/render caches; it does not guarantee a cold HTTP/browser cache. Use the same reload procedure for A and B. Do not clear one version's caches only.
- The phone panel retains 3600 callbacks (the standalone recorder default is 1800). Export before starting the next label: Start resets the previous capture. `framesOverwritten > 0` means statistics cover only the latest retained window, not the entire run.

## Three alternating pairs

Perform three A/B pairs in this order: **A1 → B1, B2 → A2, A3 → B3**. Let the device return to a comparable temperature between runs. Use the same route, movement duration, weapon/upgrade selections and combat actions within each pair. Seed alone does not reproduce a run with different inputs. Record deviations and repeat a mismatched pair instead of attributing its differences to rendering.

Before comparing timings, rehearse the route once outside the measured runs and write down the exact travel/upgrade sequence. Keep that sequence unchanged for all six runs. A repeatable human route is still approximate; it is not a deterministic recorded-input replay.

## Four scenarios / five capture labels

1. **Dry (`dry`, 10 seconds):** remain in the starting yard before entering the shallow teaching pond to the east. Begin at the same game time, keep the camera still and do not trigger water effects. Record the current weapon/upgrade loadout.
2. **Crowded combat (`crowded`, 10 seconds):** follow the rehearsed dry route to the same encounter/time and perform the same attacks. Record visible enemy count (or a screenshot), loadout and active effects. If density differs substantially, mark the pair unmatched; do not compare it as a rendering-only result.
3. **Water transition:** return to the agreed approach to the teaching pond east of the yard, around world `(1040, 420)`, without having washed that area earlier in the run.
   - Select `first-water`, press Start **before** crossing the shoreline, then enter with the rehearsed movement and stop/export after 5 seconds. This captures first-use work rather than starting after the cache has already warmed.
   - Remain at the same pond position, let the pencil/wash look settle, select `steady-wash`, and capture 10 seconds with a still camera. Keep ongoing attacks and enemy density comparable. This is a separate sample from first entry.
4. **Repaint (`repaint`, 10 seconds):** use the same existing repaint source and the same prepared washed area in both runs. Prefer a preselected Watercolour Brush loadout if available; start capture before its scheduled strokes reach the area. If the same upgrade/source is not available, mark this scenario uncollected and repeat with matched preparation. Do not introduce a new gameplay control or change damage/duration just for the capture.

For every label: select label → Start → perform the scenario → Stop → export JSON. Name exports with variant, pair, label, revision and device (for example `B-pair2-first-water-<revision>-iphone.json`). Stop/export before leaving the page. Pausing, backgrounding, resize or a reduced-motion change stops the capture; restart a fresh matched capture afterward so suspension gaps are not mistaken for rendering stalls.

## What the numbers mean

The recorder is DOM-free and keeps preallocated numeric rings. It calculates summaries only on export:

- `frameIntervals`: successive valid rAF callback timestamps in milliseconds. The first callback has no interval. These are scheduling/frame-cadence observations, not isolated renderer CPU or GPU timings.
- `cpuMs.gen`: main-loop simulation/HUD/audio portion before world drawing. The historical short label **does not mean pure terrain generation**.
- `cpuMs.mask`: CPU time around `washFrame` plus `drawWashGround`; includes water bucketing/drawing submission but excludes sketch tile baking in `drawChunks`.
- `cpuMs.composite`: the rest of `drawWorld` CPU time after subtracting the mask measurement. Includes terrain bake work, actors and other draw submission; **not** only `drawImage`, GPU compositing, or final presentation.
- `cpuMs.total`: CPU duration of the rAF handler's measured work; phase sums need not equal total because work outside the named ranges remains.
- Every stream reports valid sample count, nearest-rank `p50Ms`, `p95Ms`, `p99Ms`, `maxMs`, and count/fraction **strictly greater than 33 ms**. A rate of `0.1` means 10%. Empty streams report null values; small samples still yield percentiles but are weak evidence, especially p99.
- `framesRecorded`, `framesRetained`, `framesOverwritten`, rejected timestamp count and retained time bounds make the measured window explicit. Missing/invalid CPU samples are excluded, never treated as zero.
- Metadata captures version, viewport, DPR, reduced-motion setting, seed and variant. Capture separate exports after any of these change. Metadata alone does not prove matched routes or equal enemy load.

Compare paired runs per label, retaining all three pairs rather than selecting the fastest run. Report sample counts and duration with p95/p99 and >33 ms rate. Keep first-water and steady-wash separate. A difference in these metrics identifies where further investigation is needed; it does not establish GC, GPU upload, draw-call count, dirty-tile count or a particular API as the cause. Canvas work may execute after its JavaScript call returns, and worker work is not fully represented by these main-thread CPU ranges.

## Visual review alongside timing

Using the same matched scenes, inspect cut thickness, back faces, fold light/shadow, contact shadows, weapon silhouette/flight, hit rebound, torn fibres, char curls/burn openings and water wrinkles. Confirm attack paths, hit moments, radius and lifetimes still read consistently with the unchanged game rules. Check reduced-motion mode separately: paper flips/rebound/scrap travel should become stable shapes with fades, while gameplay continues.

Record visual concerns and timing results separately. A still screenshot cannot verify animation quality, and passing unit tests cannot establish Safari performance. Do not label the art accepted until the user reviews it.
