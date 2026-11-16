import {
  paintCharacterPanel,
  characterCopy,
  characterValues,
} from "./ui/character-panel.js";
import { formatTime } from "./content/i18n.js";
import type { CatId } from "./cats/types.js";
import { t, isLocale } from "./content/i18n.js";
import type { Locale } from "./content/keys.js";
import { createClock, FIXED_DT, tickClock } from "./game/clock.js";
import { createInput } from "./game/input.js";
import { chooseUpgrade, createSim, step } from "./game/sim.js";
import { evolutionFor, playerStats } from "./game/upgrades.js";
import { paintUpgradeCards, upgradeName } from "./ui/upgrade-cards.js";
import type { SimState } from "./game/types.js";
import { STATS } from "./game/types.js";
import { drawWorld, present, VIEW_HEIGHT, VIEW_WIDTH } from "./render/world.js";
import { renderHud } from "./ui/hud.js";
import { createTouch, prefersTouch } from "./ui/touch.js";

type Screen = "title" | "play" | "pause" | "upgrade" | "result";
const PREF_KEY = "midnight-meow-prefs";
function must<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as unknown as T;
}
function initialPrefs(): { locale: Locale; cat: CatId } {
  try {
    const value = JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}");
    return {
      locale: isLocale(value.locale) ? value.locale : "zh",
      cat: value.cat === "nicole" ? "nicole" : "zero",
    };
  } catch {
    return { locale: "zh", cat: "zero" };
  }
}
function boot(): void {
  const prefs = initialPrefs();
  let selectedCat: CatId = prefs.cat;
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
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let size = { w: innerWidth, h: innerHeight, dpr: devicePixelRatio || 1 };
  const hudRefs = {
    time: must<HTMLElement>("hud-time"),
    hearts: must<HTMLElement>("hud-hearts"),
    dash: must<HTMLElement>("hud-dash"),
    pause: must<HTMLButtonElement>("btn-hud-pause"),
    name: must<HTMLElement>("hud-name"),
    portrait: must<HTMLCanvasElement>("hud-portrait"),
    phase: must<HTMLElement>("hud-phase"),
    progress: must<HTMLElement>("hud-progress"),
    kills: must<HTMLElement>("hud-kills"),
    buff: must<HTMLElement>("hud-buff"),
    skill: must<HTMLButtonElement>("btn-skill"),
    skillName: must<HTMLElement>("hud-skill-name"),
    skillKey: must<HTMLElement>("hud-skill-key"),
    skillIcon: must<HTMLCanvasElement>("hud-skill-icon"),
    notice: must<HTMLElement>("hud-notice"),
    hint: must<HTMLElement>("hud-hint"),
    level: must<HTMLElement>("hud-level"),
    xp: must<HTMLElement>("hud-xp"),
    upgrades: must<HTMLElement>("hud-upgrades"),
    boss: must<HTMLElement>("hud-boss"),
    bossName: must<HTMLElement>("hud-boss-name"),
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
      "title-tag": "title.tagline",
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
        must("result-stats").innerHTML = [
          [t(locale, "result.duration"), formatTime(sim.elapsed)],
          [t(locale, "result.kills"), sim.stats.kills],
          [t(locale, "result.skills"), sim.stats.skillUses],
          [t(locale, "result.blocks"), sim.stats.shieldBlocks],
          [t(locale, "result.level"), sim.level],
          [
            t(locale, "result.evolution"),
            sim.upgrades[evolutionFor(id)]
              ? upgradeName(locale, evolutionFor(id))
              : t(locale, "result.none"),
          ],
          [
            t(locale, "result.boss"),
            t(
              locale,
              sim.stats.bossDefeated
                ? "result.boss_down"
                : sim.boss.spawned
                  ? "result.boss_left"
                  : "result.none",
            ),
          ],
        ]
          .map(
            ([label, value]) =>
              `<div><strong>${value}</strong><span>${label}</span></div>`,
          )
          .join("");
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
    if (next === "title") document.body.classList.remove("low-health");
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
    show("play");
  };
  const resume = () => {
    last = performance.now();
    clock.acc = 0;
    show("play");
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
    if (sim.pendingChoice) openCards();
    else resume();
  };
  for (let i = 0; i < 3; i++)
    must(`upgrade-card-${i}`).addEventListener("click", () => pick(i));
  const title = () => {
    sim = null;
    show("title");
  };
  const language = () => {
    locale = locale === "zh" ? "en" : "zh";
    try {
      localStorage.setItem(
        PREF_KEY,
        JSON.stringify({ locale, cat: selectedCat }),
      );
    } catch {}
    paint();
  };
  for (const id of ["zero", "nicole"] as const) {
    must(`btn-cat-${id}`).addEventListener("click", () => {
      if (screen !== "title") return;
      selectedCat = id;
      try {
        localStorage.setItem(
          PREF_KEY,
          JSON.stringify({ locale, cat: selectedCat }),
        );
      } catch {}
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
    if (screen === "play") show("pause");
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
    if (screen === "play") show("pause", true);
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
      input.consumePause();
      const choice = input.consumeChoice();
      if (choice !== null) pick(choice);
    } else if (screen === "pause" && input.consumePause()) resume();
    else input.consumePause();
    const time = reducedMotion.matches ? 0 : renderTime;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    drawWorld(
      ctx,
      screen === "title" ? null : sim,
      { time, reducedMotion: reducedMotion.matches },
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
