# Agent entry point

Midnight Meow (猫猫守夜) is a browser survival roguelike for Kiroween 2026. The user explicitly authorized a complete pixel-art / sprite-stacking refactor on 2026-11-21. The previous papercraft version is frozen at tag `archive/papercraft-2026-11-21` (`d26859b`).

## Start here

- Read [HANDOFF.md](HANDOFF.md) for the current checkpoint, user decisions and known gaps; [PLAN.md](PLAN.md) for task order and acceptance criteria; [README.md](README.md) for setup.
- For content, art, i18n, verification or commits, follow the [development skill](.kiro/skills/midnight-meow-dev/SKILL.md) and the relevant `references/` recipe. Architecture and file maps belong there and in `.kiro/steering/`, not duplicated here. Read the relevant product, tech, structure and papercraft-art steering files.
- `docs/archive/` is obsolete history, not instructions. Old test counts and completed one-off publication approvals are not current evidence or standing permission.

## Product and art boundaries

- **Latest user override: movement only.** No manual dash, displacement, active skill buttons or Space/Shift activation. Retain automatic attacks and automatic costume effects; do not restore removed cat actives. This supersedes historical mechanics-preservation instructions.

- **One active style: native pixel art with sprite-stacked scenery**, following `danielwh2/sprite-stacking`. No style toggle. This explicit user direction supersedes paper-only / approved-paper-contour constraints in older steering and skill recipes. Preserve cat identities and gameplay, not the previous rendering technique.
- Draw game art and effects in code (Canvas / CSS); synthesize sound with Web Audio. No image or audio assets. Reference images are art targets, never backgrounds, textures or generated game assets. Offscreen canvases may cache procedural drawing.
- The explicitly authorized, unmodified Allo fonts in `assets/fonts/` are the typography exception. Use them for English UI and Canvas text, retain Chinese fallbacks, the build font allowlist and OFL license.
- Choose Zero (male) or Nicole (female) at the start. Only the chosen cat appears in a run; the other is never a follower or companion. Preserve their distinct starting weapons, passives, exclusive equipment and chest-triggered evolutions (Echo Legion and Full Moon).
- The meme cats are costumes the chosen cat wears (unlocked by play, one small skill each, makeup only as a layer over the untouched approved head); random helper cats as separate characters are not built, so ask before starting them. Do not expand the game's scope just to complete a technical task.
- Keep the reference's pixel lattice, compact volume, hue-shifted palettes and readable silhouettes. Preserve the cats' face/accessory identity and original source data. A passing build is not art approval.
- Ideas from public descriptions of [Snapblocks](https://www.snapblocks.site/) and the rhythm ideas of [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) may be rebuilt in Canvas / CSS; never copy their code.
- Route player-facing strings through `t(locale, key)`; update `src/content/keys.ts` and every language pack. Default new sessions to English, respect saved choices, and ask before removing Chinese or the language toggle.

## Change discipline

- Preserve the development skill's layer boundaries, generic registries and deterministic simulation. Rendering must not mutate simulation state or consume its RNG. Gameplay numbers belong in definitions. Append registrations: their order affects behaviour.
- Inspect Git status before editing and preserve unrelated work. Define the requested outcome and observable acceptance criteria before a substantial change; use the current plan rather than inventing a new roadmap.
- Use subagents when independent work benefits from parallelism, with separate file ownership and shared constraints. Integrate and verify their results; avoid parallel builds competing for CPU or memory on a shared computer.
- Match investigation depth to uncertainty and risk. Keep routine implementation choices autonomous; ask when a missing answer changes product scope, permissions or an irreversible decision.

## Verification and handoff

- Required game verification: `npm run build` and `npm test` (the latter includes a build). Run checks sequentially; report exact commands, results and anything blocked or not run. Do not reuse historical results as proof of a new revision.
- The user requested actual screenshots for this pixel refactor. Linux Chromium has been verified working here; the previous macOS launch restriction does not apply to this environment. Browser captures are not iPhone Safari performance evidence.
- State clearly what was not viewed, heard or measured. Build/test success, visual inspection, user art approval and live deployment are separate claims.
- Leave actionable review findings and handoff information in the appropriate project document when requested or needed for another agent: paths, reference versions, verification limits and next steps. Keep this entry point lean; recipes belong in the skill and changing status in HANDOFF.md.
- Stop only background jobs you started and remove your own disposable temporary files when no longer needed; preserve requested evidence and follow the deletion policy below.

## Git, publication and deletion

- Local commits are allowed; use gitmoji plus a type prefix, e.g. `📝 docs: ...`. Do not commit `.agents/`, generated output or unrelated work, and do not change Git configuration.
- **Do not push or deploy unless the user explicitly authorizes that publication.** Completion and passing tests are not authorization. A GitHub push may trigger Vercel deployment. Verify the exact remote/deployed commit before reporting publication.
- Delete with `trash` (macOS Trash) by default. Git-tracked files, temporary files and files the user explicitly asks to delete directly may be deleted directly. Otherwise, if `trash` is unavailable, do not silently permanently delete.
