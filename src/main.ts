import {
  buildCatTickets,
  catName,
  paintCharacterPanel,
  characterCopy,
  characterValues,
} from "./ui/character-panel.js";
import { CATS } from "./defs/index.js";
import "./render/art-index.js";
import type { CatId } from "./cats/types.js";
import { t, isLocale, DEFAULT_LOCALE } from "./content/i18n.js";
import type { Locale } from "./content/keys.js";
import { createClock, FIXED_DT } from "./game/clock.js";
import { createInput } from "./game/input.js";
import { parseSeed } from "./game/seed.js";
import { bossEnemy, chooseUpgrade, createSim, step } from "./game/sim.js";
import { evolutionFor, playerStats } from "./game/upgrades.js";
import { paintUpgradeCards } from "./ui/upgrade-cards.js";
import { paintJournal } from "./ui/journal.js";
import type { SimState } from "./game/types.js";
import { STATS } from "./game/types.js";
import { drawWorld, VIEW_HEIGHT, VIEW_WIDTH } from "./render/world.js";
import { viewport } from "./render/viewport.js";
import { clearWorldCache } from "./game/world-gen.js";
import { clearWorldRenderCache } from "./render/craft-world.js";
import { clearWashRender } from "./render/wash-art.js";
import { createCamera, followCamera, type Camera } from "./render/camera.js";
import { renderHud } from "./ui/hud.js";
import { createTouch, prefersTouch } from "./ui/touch.js";
import { inkReveal } from "./ui/ink.js";
import { createSfx } from "./audio/sfx.js";
import { paintGallery } from "./render/gallery.js";
import { galleryCheck } from "./ui/gallery-layout.js";
import { moonArc } from "./ui/journal-geometry.js";
import {
  advanceCues,
  beatLength,
  BEATS,
  cuePhase,
  DEAL,
  presentationSpeed,
  presentationSteps,
  type Cue,
  type CueKind,
} from "./render/timeline.js";

type Screen = "title" | "play" | "pause" | "upgrade" | "result";
const PREF_KEY = "midnight-meow-prefs";
function must<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as unknown as T;
}
interface Prefs {
  locale: Locale;
  cat: CatId;
  muted: boolean;
}
/** The first registered cat: the default pick. */
const firstCat = (): CatId => CATS.ids()[0]!;
function initialPrefs(): Prefs {
  try {
    const value = JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}");
    return {
      locale: isLocale(value.locale) ? value.locale : DEFAULT_LOCALE,
      cat: typeof value.cat === "string" && CATS.has(value.cat) ? value.cat : firstCat(),
      muted: value.muted === true,
    };
  } catch {
    return { locale: DEFAULT_LOCALE, cat: firstCat(), muted: false };
  }
}
function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {}
}
/**
 * A fresh night per run; `?seed=N` (a decimal uint32) pins the seed so a
 * run can be replayed. The sim stays deterministic for a given seed.
 */
function runSeed(): number {
  const pinned = parseSeed(new URLSearchParams(location.search).get("seed"));
  if (pinned !== null) return pinned;
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}
/** Counters the audio layer diffs each frame; audio never lives in the sim. */
function cueState(s: SimState) {
  return {
    shots: s.nextShotId,
    dealt: s.stats.damageDealt,
    kills: s.stats.kills,
    skills: s.stats.skillUses,
    taken: s.stats.damageTaken,
    blocks: s.stats.shieldBlocks,
    shards: s.stats.shardsCollected,
    level: s.level,
    pumpkins: s.stats.pumpkinsLit,
    treats: s.stats.treatsEaten,
    moon: s.stats.moonPulses,
    boss: s.boss.spawned,
    bossDown: s.boss.defeated,
    dawn: moonArc(s.elapsed, s.sessionSeconds).dawn,
    evolved: s.upgrades[evolutionFor(s.player.id)] ?? 0,
    chain: Math.floor(s.streak.count / STATS.streakMilestone),
    torn: s.stats.propsTorn,
    burning: Object.keys(s.fire.cells).length,
    splashes: s.wash.splashes,
    pigments: s.wash.pigments,
    rain: s.wash.rainPulses,
    snips: s.cut.cuts,
    folds: s.fold.folds,
    ended: s.ended,
  };
}
/**
 * `?gallery=1`: the paper workshop page instead of the game. Shows every
 * registered cat, enemy, prop, landmark and icon; no sim, no audio.
 */
function bootGallery(): void {
  const prefs = initialPrefs();
  let locale = prefs.locale;
  const page = must<HTMLElement>("gallery-screen"),
    canvas = must<HTMLCanvasElement>("gallery-canvas");
  must("app").classList.add("hidden");
  page.classList.remove("hidden");
  document.body.dataset.screen = "gallery";
  document.body.dataset.cat = prefs.cat;
  let painted = "";
  // Developer-only check views, selected by the URL alone (?gallery=1&check=value|gloss).
  const check = galleryCheck(location.search);
  const paint = () => {
    const width = Math.max(280, Math.floor(canvas.parentElement!.clientWidth)),
      dpr = Math.min(2, window.devicePixelRatio || 1),
      key = `${locale}:${width}:${dpr}`;
    if (key === painted) return;
    painted = key;
    document.documentElement.lang = locale === "zh" ? "zh-Hans" : "en";
    document.title = t(locale, "gallery.title");
    must("gallery-title").textContent = t(locale, "gallery.title");
    must("gallery-sub").textContent = t(locale, check === "none" ? "gallery.subtitle" : `gallery.check.${check}`);
    must("btn-gallery-lang").textContent = t(locale, "title.language");
    canvas.setAttribute("aria-label", t(locale, "gallery.title"));
    paintGallery(canvas, locale, width, dpr, check);
  };
  must("btn-gallery-lang").addEventListener("click", () => {
    locale = locale === "zh" ? "en" : "zh";
    savePrefs({ ...prefs, locale });
    paint();
  });
  let pending = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(paint);
  });
  paint();
}
function boot(): void {
  const prefs = initialPrefs();
  let selectedCat: CatId = prefs.cat;
  let muted = prefs.muted;
  const sfx = createSfx(muted);
  let cues: ReturnType<typeof cueState> | null = null;
  let locale = prefs.locale,
    screen: Screen = "title",
    hiddenPause = false,
    sim: SimState | null = null;
  const stage = must<HTMLCanvasElement>("game"),
    overlay = must<HTMLElement>("overlay"),
    skillButton = must<HTMLButtonElement>("dash-btn");
  // The visible board is also the 2× drawing surface. CSS scales it into the viewport.
  stage.width = VIEW_WIDTH * 2;
  stage.height = VIEW_HEIGHT * 2;
  const ctx = stage.getContext("2d")!;
  const input = createInput();
  input.attach(window);
  const touch = createTouch(must("touch"), must("stick"), must("dash-btn")),
    useTouch = prefersTouch();
  if (useTouch) touch.attach();
  document.body.classList.toggle("has-touch", useTouch);
  const clock = createClock();
  let last = performance.now(),
    renderTime = 0;
  // The follow camera is presentation state; it never enters the sim.
  let camera: Camera = createCamera();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const compactPlaybill = matchMedia("(max-aspect-ratio: 1/1), (max-height: 600px)");
  const layoutPlaybill = () => {
    document.querySelectorAll<HTMLDetailsElement>(".skill-row").forEach((skill) => {
      if (compactPlaybill.matches) {
        skill.open = false;
        skill.setAttribute("name", "playbill-kit");
      } else {
        skill.removeAttribute("name");
        skill.open = true;
      }
    });
  };
  layoutPlaybill();
  compactPlaybill.addEventListener("change", layoutPlaybill);
  let size = { w: innerWidth, h: innerHeight, dpr: devicePixelRatio || 1 };
  let worldNeedsPaint = true;
  reducedMotion.addEventListener("change", () => { worldNeedsPaint = true; });
  const hudRefs = {
    time: must<HTMLElement>("hud-time"),
    phase: must<HTMLElement>("hud-phase"),
    sky: must<HTMLCanvasElement>("hud-sky"),
    hearts: must<HTMLCanvasElement>("hud-hearts"),
    name: must<HTMLElement>("hud-name"),
    portrait: must<HTMLCanvasElement>("hud-portrait"),
    kills: must<HTMLElement>("hud-kills"),
    buff: must<HTMLElement>("hud-buff"),
    map: must<HTMLCanvasElement>("hud-map"),
    pause: must<HTMLButtonElement>("btn-hud-pause"),
    skill: must<HTMLButtonElement>("btn-skill"),
    skillName: must<HTMLElement>("hud-skill-name"),
    skillKey: must<HTMLElement>("hud-skill-key"),
    dash: must<HTMLElement>("hud-dash"),
    wick: must<HTMLCanvasElement>("hud-wick"),
    hint: must<HTMLElement>("hud-hint"),
    level: must<HTMLElement>("hud-level"),
    xp: must<HTMLElement>("hud-xp"),
    upgrades: must<HTMLElement>("hud-upgrades"),
    chest: must<HTMLElement>("hud-chest"),
    notice: must<HTMLElement>("hud-notice"),
    boss: must<HTMLElement>("hud-boss"),
    bossName: must<HTMLElement>("hud-boss-name"),
    streak: must<HTMLElement>("hud-streak"),
    banner: must<HTMLElement>("boss-banner"),
    bannerKicker: must<HTMLElement>("boss-banner-kicker"),
    bannerName: must<HTMLElement>("boss-banner-name"),
    bannerLine: must<HTMLElement>("boss-banner-line"),
  };
  // Presentation cues (timeline.ts): derived from sim counters like the audio
  // cues above, aged in real time, never stored in the sim.
  let motionCues: Cue[] = [],
    finale = false,
    lastBoss: { x: number; y: number } | null = null;
  const cue = (kind: CueKind, at?: { x: number; y: number } | null) => {
    motionCues = [...motionCues.filter((c) => c.kind !== kind), { kind, t: 0, x: at?.x, y: at?.y }];
  };
  const replay = (el: HTMLElement, cls: string) => {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  };
  const cueMotion = (
    s: SimState,
    now: ReturnType<typeof cueState>,
    p: ReturnType<typeof cueState>,
  ) => {
    if (now.evolved > p.evolved) cue("evolution");
    if (now.boss && !p.boss) cue("boss", bossEnemy(s));
    if (now.bossDown && !p.bossDown) cue("boss-down", lastBoss);
    if (now.dawn && !p.dawn && now.ended === "playing") {
      cue("dawn");
      hudRefs.sky.style.setProperty("--flip-ms", `${Math.round(beatLength(BEATS.dawn) * 1000)}ms`);
      replay(hudRefs.sky, "flip");
    }
  };
  const cueSounds = (s: SimState) => {
    const now = cueState(s),
      p = cues;
    cues = now;
    if (!p) return;
    cueMotion(s, now, p);
    if (now.ended !== p.ended) {
      sfx.play(now.ended === "won" ? "win" : "lose");
      return;
    }
    if (now.shots > p.shots) sfx.play("shot");
    if (now.kills > p.kills) sfx.play("defeat", now.kills - p.kills);
    else if (now.dealt > p.dealt) sfx.play("hit");
    if (now.skills > p.skills) sfx.play("skill");
    if (now.blocks > p.blocks) sfx.play("shield");
    else if (now.taken > p.taken) sfx.play("hurt");
    if (now.shards > p.shards) sfx.play("pickup", s.streak.count);
    if (now.evolved > p.evolved) sfx.play("evolve");
    else if (now.level > p.level) sfx.play("levelup");
    if (now.pumpkins > p.pumpkins) sfx.play("pumpkin");
    if (now.treats > p.treats) sfx.play("treat");
    if (now.moon > p.moon) sfx.play("moon");
    if (now.boss && !p.boss) sfx.play("boss");
    if (now.chain > p.chain) sfx.play("streak", s.streak.count);
    if (now.torn > p.torn) sfx.play("tear");
    if (now.burning > 0) sfx.play("crackle", now.burning);
    if (now.rain > p.rain) sfx.play("rain");
    else if (now.splashes > p.splashes) sfx.play("splash");
    if (now.pigments > p.pigments) sfx.play("pigment", now.pigments - p.pigments);
    if (now.snips > p.snips) sfx.play("snip");
    if (now.folds > p.folds) sfx.play("fold");
  };
  // Cards ignore input briefly so a held key or tap cannot pick blindly.
  let cardsArmedAt = 0;
  const resize = () => {
    touch.reset();
    size = {
      w: innerWidth,
      h: innerHeight,
      dpr: Math.max(1, devicePixelRatio || 1),
    };
    const v = viewport(size.w, size.h, size.dpr, false);
    for (const layer of [stage, overlay]) {
      layer.style.left = `${v.cssX}px`;
      layer.style.top = `${v.cssY}px`;
      layer.style.width = `${v.cssW}px`;
      layer.style.height = `${v.cssH}px`;
    }
    worldNeedsPaint = true;
  };
  resize();
  window.addEventListener("resize", resize);
  const paint = () => {
    worldNeedsPaint = true;
    document.title = t(locale, "title.name");
    document.documentElement.lang = locale === "zh" ? "zh-Hans" : "en";
    const labels: Record<string, Parameters<typeof t>[1]> = {
      "title-name": "title.name",
      "title-sub": "title.subtitle",
      "title-credit": "title.credit",
      "btn-start": "title.start",
      "btn-lang": "title.language",
      "btn-pause-lang": "title.language",
      "btn-resume": "pause.continue",
      "btn-back": "hud.back",
      "btn-result-back": "hud.back",
      "btn-retry": "result.retry",
      "pause-title": "pause.title",
    };
    for (const [id, key] of Object.entries(labels))
      must(id).textContent = t(locale, key);
    inkReveal(must("title-tag"), t(locale, "title.tagline"));
    for (const id of ["btn-mute", "btn-hud-mute"]) {
      const b = must<HTMLButtonElement>(id),
        label = t(locale, muted ? "hud.unmute" : "hud.mute");
      b.setAttribute("aria-label", label);
      b.title = label;
      b.setAttribute("aria-pressed", String(muted));
      b.classList.toggle("muted", muted);
    }
    must("title-controls").textContent = t(
      locale,
      useTouch ? "title.controls_touch" : "title.controls",
    );
    paintCharacterPanel(locale, selectedCat);
    stage.setAttribute(
      "aria-label",
      `${t(locale, "title.name")} · ${catName(locale, sim?.player.id ?? selectedCat)}`,
    );
    must("pause-note").textContent = [
      ...(hiddenPause ? [t(locale, "pause.hidden")] : []),
      t(locale, "help.paper-world"),
    ].join(" ");
    skillButton.textContent = characterCopy(
      locale,
      selectedCat,
      "active.short",
    );
    must("btn-fullscreen").setAttribute(
      "aria-label",
      t(locale, "hud.fullscreen"),
    );
    if (sim) renderHud(hudRefs, locale, sim);
    if (sim && screen === "upgrade") paintUpgradeCards(locale, sim, useTouch);
    if (sim) {
      const id = sim.player.id;
      must("pause-kit").textContent = t(
        locale,
        "pause.kit",
        characterValues(locale, id),
      );
      must("pause-skill").textContent = characterCopy(
        locale,
        id,
        "active.desc",
      );
      if (screen === "result") {
        must("result-title").textContent = t(
          locale,
          sim.ended === "won" ? "result.heading_win" : "result.heading_lose",
        );
        must("result-text").textContent = t(
          locale,
          sim.ended === "won" ? "result.win" : "result.lose",
        );
        must("result-cat").textContent =
          `${catName(locale, id).toUpperCase()} · ${characterCopy(locale, id, "role")}`;
        must("btn-result-back").textContent = t(locale, "result.change");
        paintJournal(locale, sim);
      }
    }
  };
  const show = (next: Screen, hidden = false) => {
    input.reset();
    touch.reset();
    screen = next;
    hiddenPause = hidden;
    for (const [id, visible] of Object.entries({
      "title-screen": next === "title",
      hud: next === "play" || next === "pause" || next === "upgrade",
      "pause-screen": next === "pause",
      "upgrade-screen": next === "upgrade",
      "result-screen": next === "result",
      touch: useTouch && next === "play",
    }))
      must(id).classList.toggle("hidden", !visible);
    document.body.classList.toggle("is-playing", next === "play");
    document.body.dataset.screen = next;
    if (next === "title")
      document.body.classList.remove("low-health", "critical-health", "is-dawn");
    sfx.setAmbience(next === "play" || next === "upgrade");
    paint();
  };
  const releaseRun = () => {
    sim = null;
    lastBoss = null;
    motionCues = [];
    clearWorldRenderCache();
    clearWashRender();
    clearWorldCache();
  };
  const start = () => {
    releaseRun();
    sim = createSim({
      cat: selectedCat,
      seed: runSeed(),
      sessionSeconds: STATS.sessionSeconds,
    });
    clock.acc = 0;
    last = performance.now();
    cues = cueState(sim);
    camera = createCamera();
    motionCues = [];
    finale = false;
    lastBoss = null;
    hudRefs.sky.classList.remove("flip");
    show("play");
  };
  const resume = () => {
    last = performance.now();
    clock.acc = 0;
    // A pause taken over the card hand returns to the same hand.
    if (sim?.pendingChoice) openCards();
    else show("play");
  };
  const openCards = () => {
    cardsArmedAt = performance.now() + 320;
    show("upgrade");
    // Replay the deal-in animation for every new hand.
    const hand = must<HTMLElement>("upgrade-screen");
    hand.style.setProperty("--stagger", `${DEAL.staggerMs}ms`);
    hand.style.setProperty("--flight", `${DEAL.flightMs}ms`);
    hand.style.setProperty("--settle", `${DEAL.settleMs}ms`);
    replay(hand, "dealt");
  };
  const pick = (index: number) => {
    if (!sim || screen !== "upgrade" || performance.now() < cardsArmedAt)
      return;
    if (!chooseUpgrade(sim, index)) return;
    sfx.play("card");
    if (sim.pendingChoice) openCards();
    else resume();
  };
  for (let i = 0; i < 3; i++)
    must(`upgrade-card-${i}`).addEventListener("click", () => pick(i));
  const title = () => {
    releaseRun();
    camera = createCamera();
    motionCues = [];
    finale = false;
    show("title");
  };
  const language = () => {
    locale = locale === "zh" ? "en" : "zh";
    savePrefs({ locale, cat: selectedCat, muted });
    paint();
  };
  const toggleMute = () => {
    muted = !muted;
    sfx.unlock();
    sfx.setMuted(muted);
    savePrefs({ locale, cat: selectedCat, muted });
    paint();
  };
  must("btn-mute").addEventListener("click", toggleMute);
  must("btn-hud-mute").addEventListener("click", toggleMute);
  // Browsers only allow audio after a gesture; any first press unlocks it.
  for (const type of ["pointerdown", "keydown"] as const)
    window.addEventListener(type, () => sfx.unlock(), { capture: true });
  // Magnetic Start button: it leans toward the pointer and floods with warm
  // colour from the side the pointer entered (styles.css draws the flood).
  const magnet = must<HTMLElement>("btn-start");
  const aim = (event: PointerEvent, lean: boolean) => {
    const r = magnet.getBoundingClientRect(),
      fx = (event.clientX - r.left) / (r.width || 1),
      fy = (event.clientY - r.top) / (r.height || 1);
    magnet.style.setProperty("--fx", `${Math.round(fx * 100)}%`);
    magnet.style.setProperty("--fy", `${Math.round(fy * 100)}%`);
    const pull = lean && !reducedMotion.matches ? 1 : 0;
    magnet.style.setProperty("--mx", `${((fx - 0.5) * 10 * pull).toFixed(1)}px`);
    magnet.style.setProperty("--my", `${((fy - 0.5) * 6 * pull).toFixed(1)}px`);
  };
  magnet.addEventListener("pointerenter", (e) => aim(e, true));
  magnet.addEventListener("pointermove", (e) => aim(e, true));
  magnet.addEventListener("pointerleave", (e) => aim(e, false));
  for (const ticket of buildCatTickets()) {
    const id = ticket.dataset.cat!;
    ticket.addEventListener("click", () => {
      if (screen !== "title") return;
      selectedCat = id;
      savePrefs({ locale, cat: selectedCat, muted });
      paint();
    });
  }
  document
    .querySelector(".cat-choices")!
    .addEventListener("keydown", (event) => {
      const key = (event as KeyboardEvent).key;
      if (
        screen !== "title" ||
        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      // Home / End jump to the first / last ticket; arrows step and wrap.
      const ids = CATS.ids(),
        at = Math.max(0, ids.indexOf(selectedCat)),
        id =
          key === "Home"
            ? ids[0]!
            : key === "End"
              ? ids[ids.length - 1]!
              : ids[(at + (key === "ArrowLeft" ? -1 : 1) + ids.length) % ids.length]!;
      const button = must<HTMLButtonElement>(`btn-cat-${id}`);
      button.focus();
      button.click();
    });
  must("btn-start").addEventListener("click", start);
  must("btn-skill").addEventListener("click", () => {
    if (screen === "play") input.queueSkill();
  });
  must("btn-retry").addEventListener("click", start);
  must("btn-lang").addEventListener("click", language);
  must("btn-pause-lang").addEventListener("click", language);
  must("btn-hud-pause").addEventListener("click", () => {
    if (screen === "play" || screen === "upgrade") show("pause");
  });
  must("btn-resume").addEventListener("click", resume);
  must("btn-back").addEventListener("click", title);
  must("btn-result-back").addEventListener("click", title);
  must("btn-fullscreen").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await must<HTMLElement>("app").requestFullscreen();
    } catch {
      /* Not all mobile browsers expose fullscreen. */
    }
  });
  const background = () => {
    // Pausing also stops the ambience, including over the card hand.
    if (screen === "play" || screen === "upgrade") show("pause", true);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) background();
  });
  window.addEventListener("blur", background);
  show("title");
  if (new URLSearchParams(location.search).get("start") === "1") start();
  const frame = (now: number) => {
    const real = Math.min((now - last) / 1000, 0.25);
    last = now;
    if (screen === "play" || screen === "title")
      renderTime += Math.min(real, 0.1);
    if (screen === "play" && sim) {
      if (finale) {
        // The night is over: the sim stops and the dawn finale plays out, then the journal opens.
        input.consumePause();
        renderHud(hudRefs, locale, sim);
        if (!motionCues.some((c) => c.kind === "finale")) {
          finale = false;
          show("result");
        }
      } else if (input.consumePause()) show("pause");
      else {
        // Slow motion = fewer FIXED_DT steps per real second; dt never changes.
        const speed = presentationSpeed(motionCues, reducedMotion.matches);
        const count = presentationSteps(clock, real, speed);
        for (let i = 0; i < count; i++) {
          step(sim, input.sample(touch.stick), FIXED_DT);
          if (sim.ended !== "playing") {
            if (sim.ended === "won") {
              finale = true;
              cue("finale");
            } else show("result");
            break;
          }
          if (sim.pendingChoice) {
            openCards();
            break;
          }
        }
        if (screen === "play" && count > 0) renderHud(hudRefs, locale, sim);
      }
    } else if (screen === "upgrade") {
      if (input.consumePause()) show("pause");
      else {
        const choice = input.consumeChoice();
        if (choice !== null) pick(choice);
      }
    } else if (screen === "pause" && input.consumePause()) resume();
    else input.consumePause();
    if (sim) cueSounds(sim);
    if (sim) {
      const boss = bossEnemy(sim);
      if (boss) {
        lastBoss = { x: boss.x, y: boss.y };
        // The arrival cue follows the Eraser as it walks in.
        motionCues = motionCues.map((c) => (c.kind === "boss" ? { ...c, x: boss.x, y: boss.y } : c));
      }
      if (screen === "play") motionCues = advanceCues(motionCues, real, reducedMotion.matches);
      // The Boss pamphlet waits folded through the anticipation beat, then unfolds.
      hudRefs.banner.classList.toggle(
        "waiting",
        motionCues.some((c) => c.kind === "boss" && cuePhase(c, reducedMotion.matches).phase === "anticipation"),
      );
    }
    const still = reducedMotion.matches;
    if (worldNeedsPaint || screen === "play" || (screen === "title" && !still)) {
      if (sim && screen === "play") camera = followCamera(camera, sim.player, still ? 1 : Math.min(real, 0.1));
      const time = still ? 0 : renderTime;
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      drawWorld(
        ctx,
        screen === "title" ? null : sim,
        { time, reducedMotion: still, camera, locale, cues: motionCues },
        screen === "title" && size.w > size.h
          ? {
              id: selectedCat,
              x: 705,
              y: 418,
              facing: 1,
              moving: false,
              dashing: false,
              hurt: false,
              time,
              scale: size.h < 500 ? 0.25 : 0.29,
            }
          : undefined,
      );
      worldNeedsPaint = false;
    }
    if (useTouch && sim && screen === "play") {
      skillButton.disabled = sim.player.dashCooldown > 0;
      const label = skillButton.disabled
        ? `${sim.player.dashCooldown.toFixed(1)}s`
        : characterCopy(locale, sim.player.id, "active.short");
      if (skillButton.textContent !== label) skillButton.textContent = label;
      skillButton.style.setProperty(
        "--charge",
        `${100 * (1 - sim.player.dashCooldown / playerStats(sim).cooldown)}%`,
      );
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
// Canvas labels are cached: wait for the local face before the first paint.
const fontReady = document.fonts?.load('400 16px "Allo"') ?? Promise.resolve([]);
void fontReady.catch(() => []).then(() => {
  if (new URLSearchParams(location.search).get("gallery") === "1") bootGallery();
  else boot();
});
