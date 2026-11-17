import {
  paintCharacterPanel,
  characterCopy,
  characterValues,
} from "./ui/character-panel.js";
import type { CatId } from "./cats/types.js";
import { t, isLocale } from "./content/i18n.js";
import type { Locale } from "./content/keys.js";
import { createClock, FIXED_DT, tickClock } from "./game/clock.js";
import { createInput } from "./game/input.js";
import { chooseUpgrade, createSim, step } from "./game/sim.js";
import { evolutionFor, playerStats } from "./game/upgrades.js";
import { paintUpgradeCards } from "./ui/upgrade-cards.js";
import { paintJournal } from "./ui/journal.js";
import type { SimState } from "./game/types.js";
import { STATS } from "./game/types.js";
import { drawWorld, present, VIEW_HEIGHT, VIEW_WIDTH } from "./render/world.js";
import { createCamera, followCamera, type Camera } from "./render/camera.js";
import { renderHud } from "./ui/hud.js";
import { createTouch, prefersTouch } from "./ui/touch.js";
import { inkReveal } from "./ui/ink.js";
import { createSfx } from "./audio/sfx.js";

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
function initialPrefs(): Prefs {
  try {
    const value = JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}");
    return {
      locale: isLocale(value.locale) ? value.locale : "zh",
      cat: value.cat === "nicole" ? "nicole" : "zero",
      muted: value.muted === true,
    };
  } catch {
    return { locale: "zh", cat: "zero", muted: false };
  }
}
function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {}
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
    evolved: s.upgrades[evolutionFor(s.player.id)] ?? 0,
    chain: Math.floor(s.streak.count / STATS.streakMilestone),
    ended: s.ended,
  };
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
    overlay = must<HTMLElement>("overlay");
  const back = document.createElement("canvas");
  back.width = VIEW_WIDTH * 2;
  back.height = VIEW_HEIGHT * 2;
  const ctx = back.getContext("2d")!,
    dest = stage.getContext("2d")!;
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
  let size = { w: innerWidth, h: innerHeight, dpr: devicePixelRatio || 1 };
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
  const cueSounds = (s: SimState) => {
    const now = cueState(s),
      p = cues;
    cues = now;
    if (!p) return;
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
    stage.width = Math.floor(size.w * size.dpr);
    stage.height = Math.floor(size.h * size.dpr);
    stage.style.width = `${size.w}px`;
    stage.style.height = `${size.h}px`;
  };
  resize();
  window.addEventListener("resize", resize);
  const paint = () => {
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
      `${t(locale, "title.name")} · ${(sim?.player.id ?? selectedCat) === "zero" ? "Zero" : "Nicole"}`,
    );
    must("pause-note").textContent = hiddenPause
      ? t(locale, "pause.hidden")
      : "";
    must("dash-btn").textContent = characterCopy(
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
        characterValues(id),
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
          `${id === "zero" ? "ZERO" : "NICOLE"} · ${characterCopy(locale, id, "role")}`;
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
  const start = () => {
    sim = createSim({
      cat: selectedCat,
      seed: 20261116,
      sessionSeconds: STATS.sessionSeconds,
    });
    clock.acc = 0;
    last = performance.now();
    cues = cueState(sim);
    camera = createCamera();
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
    hand.classList.remove("dealt");
    void hand.offsetWidth;
    hand.classList.add("dealt");
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
    sim = null;
    camera = createCamera();
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
  for (const id of ["zero", "nicole"] as const) {
    must(`btn-cat-${id}`).addEventListener("click", () => {
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
      const id =
        key === "Home"
          ? "zero"
          : key === "End"
            ? "nicole"
            : selectedCat === "zero"
              ? "nicole"
              : "zero";
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
      if (input.consumePause()) show("pause");
      else {
        const count = tickClock(clock, real);
        for (let i = 0; i < count; i++) {
          step(sim, input.sample(touch.stick), FIXED_DT);
          if (sim.ended !== "playing") {
            show("result");
            break;
          }
          if (sim.pendingChoice) {
            openCards();
            break;
          }
        }
        if (screen === "play") renderHud(hudRefs, locale, sim);
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
    if (sim && screen !== "title")
      camera = followCamera(
        camera,
        sim.player,
        reducedMotion.matches ? 1 : Math.min(real, 0.1),
      );
    const time = reducedMotion.matches ? 0 : renderTime;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    drawWorld(
      ctx,
      screen === "title" ? null : sim,
      { time, reducedMotion: reducedMotion.matches, camera, locale },
      screen === "title" && size.w > size.h
        ? {
            id: selectedCat,
            x: 705,
            y: 399,
            facing: 1,
            moving: false,
            dashing: false,
            hurt: false,
            time,
            scale: size.h < 500 ? 0.25 : 0.29,
          }
        : undefined,
    );
    present(back, dest, size.w, size.h, size.dpr, overlay);
    if (useTouch && sim) {
      const button = must<HTMLButtonElement>("dash-btn");
      button.disabled = sim.player.dashCooldown > 0;
      button.textContent = button.disabled
        ? `${sim.player.dashCooldown.toFixed(1)}s`
        : characterCopy(locale, sim.player.id, "active.short");
      button.style.setProperty(
        "--charge",
        `${100 * (1 - sim.player.dashCooldown / playerStats(sim).cooldown)}%`,
      );
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
boot();
