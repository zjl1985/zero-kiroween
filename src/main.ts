import { t } from "./content/i18n.js";
import type { Locale } from "./content/keys.js";
import { isLocale } from "./content/i18n.js";
import { createClock, FIXED_DT, tickClock } from "./game/clock.js";
import { createInput } from "./game/input.js";
import { createSim, step } from "./game/sim.js";
import type { SimState, StyleMode } from "./game/types.js";
import { STATS } from "./game/types.js";
import { ensureCrayonFilter } from "./render/grain.js";
import type { CatPose } from "./render/layout.js";
import { drawWorld, present, VIEW_HEIGHT, VIEW_WIDTH } from "./render/world.js";
import { renderHud } from "./ui/hud.js";
import { createTouch, prefersTouch } from "./ui/touch.js";

type Screen = "title" | "play" | "pause" | "result";

interface App {
  locale: Locale;
  style: StyleMode;
  screen: Screen;
  hiddenPause: boolean;
  sim: SimState | null;
}

const PREF_KEY = "midnight-meow-prefs";

function loadPrefs(): { locale: Locale; style: StyleMode } {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return { locale: "zh", style: "paper" };
    const data = JSON.parse(raw) as { locale?: string; style?: string };
    return {
      locale: data.locale && isLocale(data.locale) ? data.locale : "zh",
      style: data.style === "pixel" ? "pixel" : "paper",
    };
  } catch {
    return { locale: "zh", style: "paper" };
  }
}

function savePrefs(app: App): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({ locale: app.locale, style: app.style }));
  } catch {
    // ignore storage errors
  }
}

function must<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as unknown as T;
}

function boot(): void {
  const prefs = loadPrefs();
  const params = new URLSearchParams(location.search);
  const styleParam = params.get("style");
  const app: App = {
    locale: prefs.locale,
    style: styleParam === "pixel" || styleParam === "paper" ? styleParam : prefs.style,
    screen: "title",
    hiddenPause: false,
    sim: null,
  };

  const stage = must<HTMLCanvasElement>("game");
  const overlay = must<HTMLElement>("overlay");
  const back = document.createElement("canvas");
  back.width = VIEW_WIDTH;
  back.height = VIEW_HEIGHT;
  const backCtx = back.getContext("2d");
  const frontCtx = stage.getContext("2d");
  if (!backCtx || !frontCtx) throw new Error("canvas 2d unavailable");

  const title = must<HTMLElement>("title-screen");
  const hud = must<HTMLElement>("hud");
  const pause = must<HTMLElement>("pause-screen");
  const result = must<HTMLElement>("result-screen");
  const touchRoot = must<HTMLElement>("touch");
  const startBtn = must<HTMLButtonElement>("btn-start");
  const langBtn = must<HTMLButtonElement>("btn-lang");
  const styleBtn = must<HTMLButtonElement>("btn-style");
  const pauseStyleBtn = must<HTMLButtonElement>("btn-pause-style");
  const resumeBtn = must<HTMLButtonElement>("btn-resume");
  const backBtn = must<HTMLButtonElement>("btn-back");
  const retryBtn = must<HTMLButtonElement>("btn-retry");
  const resultBackBtn = must<HTMLButtonElement>("btn-result-back");
  const pauseTitle = must<HTMLElement>("pause-title");
  const pauseNote = must<HTMLElement>("pause-note");
  const resultText = must<HTMLElement>("result-text");

  const hudRefs = {
    time: must<HTMLElement>("hud-time"),
    hearts: must<HTMLElement>("hud-hearts"),
    dash: must<HTMLElement>("hud-dash"),
    style: must<HTMLElement>("hud-style"),
    pause: must<HTMLButtonElement>("btn-hud-pause"),
  };

  ensureCrayonFilter();
  applyStyleClass(app.style);

  const input = createInput();
  input.attach(window);
  const touch = createTouch(touchRoot, must<HTMLElement>("stick"), must<HTMLButtonElement>("dash-btn"));
  const useTouch = prefersTouch();
  if (useTouch) touch.attach();

  const clock = createClock();
  let last = performance.now();
  let renderTime = 0;
  let viewCss = { w: window.innerWidth, h: window.innerHeight, dpr: 1 };

  const resize = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    viewCss = { w: cssW, h: cssH, dpr };
    stage.width = Math.max(1, Math.floor(cssW * dpr));
    stage.height = Math.max(1, Math.floor(cssH * dpr));
    stage.style.width = `${cssW}px`;
    stage.style.height = `${cssH}px`;
  };
  resize();
  window.addEventListener("resize", resize);

  const setStyle = (style: StyleMode) => {
    app.style = style;
    applyStyleClass(style);
    savePrefs(app);
    paintI18n();
  };

  const setLocale = (locale: Locale) => {
    app.locale = locale;
    document.documentElement.lang = locale === "zh" ? "zh-Hans" : "en";
    savePrefs(app);
    paintI18n();
  };

  const paintI18n = () => {
    must<HTMLElement>("title-name").textContent = t(app.locale, "title.name");
    must<HTMLElement>("title-sub").textContent = t(app.locale, "title.subtitle");
    must<HTMLElement>("title-tag").textContent = t(app.locale, "title.tagline");
    must<HTMLElement>("title-controls").textContent = t(app.locale, "title.controls");
    must<HTMLElement>("title-credit").textContent = t(app.locale, "title.credit");
    must<HTMLElement>("zero-role").textContent = `Zero · ${t(app.locale, "cat.zero.role")}`;
    must<HTMLElement>("nicole-role").textContent = `Nicole · ${t(app.locale, "cat.nicole.role")}`;
    startBtn.textContent = t(app.locale, "title.start");
    langBtn.textContent = t(app.locale, "title.language");
    styleBtn.textContent =
      app.style === "paper" ? t(app.locale, "title.style_pixel") : t(app.locale, "title.style_paper");
    pauseStyleBtn.textContent =
      `${t(app.locale, "hud.style")} · ` +
      (app.style === "paper" ? t(app.locale, "hud.style_pixel") : t(app.locale, "hud.style_paper"));
    resumeBtn.textContent = t(app.locale, "pause.continue");
    backBtn.textContent = t(app.locale, "hud.back");
    retryBtn.textContent = t(app.locale, "result.retry");
    resultBackBtn.textContent = t(app.locale, "hud.back");
    must<HTMLButtonElement>("dash-btn").textContent = t(app.locale, "touch.dash");
    pauseTitle.textContent = t(app.locale, "pause.title");
    pauseNote.textContent = app.hiddenPause ? t(app.locale, "pause.hidden") : "";
    if (app.sim && (app.screen === "play" || app.screen === "pause")) {
      renderHud(hudRefs, app.locale, app.style, app.sim);
    }
    if (app.sim && app.screen === "result") {
      resultText.textContent = t(app.locale, app.sim.ended === "won" ? "result.win" : "result.lose");
    }
  };

  const showScreen = (screen: Screen, hidden = false) => {
    app.screen = screen;
    app.hiddenPause = hidden;
    title.classList.toggle("hidden", screen !== "title");
    hud.classList.toggle("hidden", screen !== "play" && screen !== "pause");
    pause.classList.toggle("hidden", screen !== "pause");
    result.classList.toggle("hidden", screen !== "result");
    touchRoot.classList.toggle("hidden", !(useTouch && screen === "play"));
    document.body.classList.toggle("is-playing", screen === "play");
    paintI18n();
  };

  const startGame = () => {
    app.sim = createSim({ seed: 20261116, sessionSeconds: STATS.sessionSeconds });
    clock.acc = 0;
    last = performance.now();
    showScreen("play");
  };

  startBtn.addEventListener("click", startGame);
  retryBtn.addEventListener("click", startGame);
  langBtn.addEventListener("click", () => setLocale(app.locale === "zh" ? "en" : "zh"));
  styleBtn.addEventListener("click", () => setStyle(app.style === "paper" ? "pixel" : "paper"));
  pauseStyleBtn.addEventListener("click", () => setStyle(app.style === "paper" ? "pixel" : "paper"));
  must<HTMLButtonElement>("hud-style").addEventListener("click", () =>
    setStyle(app.style === "paper" ? "pixel" : "paper"),
  );
  hudRefs.pause.addEventListener("click", () => {
    if (app.screen === "play") showScreen("pause");
  });
  resumeBtn.addEventListener("click", () => {
    if (app.screen === "pause") {
      last = performance.now();
      clock.acc = 0;
      showScreen("play");
    }
  });
  const toTitle = () => {
    app.sim = null;
    showScreen("title");
  };
  backBtn.addEventListener("click", toTitle);
  resultBackBtn.addEventListener("click", toTitle);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && app.screen === "play") showScreen("pause", true);
  });

  setLocale(app.locale);
  showScreen("title");
  if (params.get("start") === "1") startGame();

  const titlePose = (id: "zero" | "nicole", x: number, y: number, facing: 1 | -1, time: number): CatPose => ({
    id,
    x,
    y,
    facing,
    moving: false,
    dashing: false,
    hurt: false,
    time,
    scale: 0.125,
  });

  const frame = (now: number) => {
    const real = (now - last) / 1000;
    last = now;
    renderTime += Math.min(real, 0.1);

    if (app.screen === "play" && app.sim) {
      if (input.consumePause()) {
        showScreen("pause");
      } else {
        const steps = tickClock(clock, real);
        for (let i = 0; i < steps; i += 1) {
          const frameInput = input.sample(touch.stick);
          step(app.sim, frameInput, FIXED_DT);
          if (app.sim.ended !== "playing") {
            showScreen("result");
            break;
          }
        }
        if (app.sim.ended === "playing") renderHud(hudRefs, app.locale, app.style, app.sim);
      }
    } else if (app.screen === "pause" && input.consumePause()) {
      last = performance.now();
      clock.acc = 0;
      showScreen("play");
    } else {
      input.consumePause();
    }

    backCtx.setTransform(1, 0, 0, 1, 0, 0);
    backCtx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    if (app.screen === "title" || !app.sim) {
      drawWorld(backCtx, null, { style: app.style, time: renderTime }, {
        nicole: titlePose("nicole", 255, 292, 1, renderTime),
        zero: titlePose("zero", 385, 296, -1, renderTime),
      });
    } else {
      drawWorld(backCtx, app.sim, { style: app.style, time: renderTime });
    }

    present(back, frontCtx, viewCss.w, viewCss.h, viewCss.dpr, app.style, overlay);
    stage.style.filter = "none";

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

function applyStyleClass(style: StyleMode): void {
  document.body.dataset.style = style;
}

boot();
