import type { SimState, StyleMode } from "../game/types.js";
import { STATS } from "../game/types.js";
import { PLAY_CAST, TITLE_CAST, drawGuest, withTime } from "./cast.js";
import { paperGrain, pixelGrain } from "./grain.js";
import type { CatPose } from "./layout.js";
import {
  drawPixelBlob,
  drawPixelCat,
  drawPixelShot,
  drawPixelStroke,
} from "./pixel.js";
import {
  drawPaperBlob,
  drawPaperCat,
  drawPaperShot,
  drawPaperStroke,
} from "./paper.js";
import {
  YARD_PROPS,
  drawAtmosphere,
  drawPageChrome,
  drawPaperProp,
  drawPaperScene,
  drawPixelProp,
  drawPixelScene,
} from "./scene.js";

export const VIEW_WIDTH = 640;
export const VIEW_HEIGHT = 400;

export interface ViewState {
  style: StyleMode;
  time: number;
}

interface Sprite {
  y: number;
  draw: () => void;
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  sim: SimState | null,
  view: ViewState,
  titleCats?: { zero: CatPose; nicole: CatPose },
): void {
  ctx.imageSmoothingEnabled = view.style === "paper";
  const grain = view.style === "paper" ? paperGrain() : pixelGrain();
  if (view.style === "paper") {
    drawPaperScene(ctx, VIEW_WIDTH, VIEW_HEIGHT, grain, { time: view.time });
  } else {
    drawPixelScene(ctx, VIEW_WIDTH, VIEW_HEIGHT, grain, { time: view.time });
  }

  if (sim) {
    const stroke = sim.stroke;
    const blank = stroke.ink <= 0 && stroke.blankTime > 0;
    if (view.style === "paper") {
      drawPaperStroke(ctx, stroke.points, stroke.ink, blank, stroke.thickness);
    } else {
      drawPixelStroke(ctx, stroke.points, stroke.ink, blank, stroke.thickness);
    }
  }

  const sprites: Sprite[] = [];

  for (const prop of YARD_PROPS) {
    const p = prop;
    sprites.push({
      y: p.y,
      draw: () => {
        if (view.style === "paper") drawPaperProp(ctx, p, view.time);
        else drawPixelProp(ctx, p, view.time);
      },
    });
  }

  const guests = withTime(sim ? PLAY_CAST : TITLE_CAST, view.time);
  for (const guest of guests) {
    const g = guest;
    sprites.push({
      y: g.y,
      draw: () => drawGuest(ctx, view.style, g),
    });
  }

  if (!sim && titleCats) {
    sprites.push({
      y: titleCats.nicole.y,
      draw: () => drawCat(ctx, view.style, titleCats.nicole),
    });
    sprites.push({
      y: titleCats.zero.y,
      draw: () => drawCat(ctx, view.style, titleCats.zero),
    });
  }

  if (sim) {
    if (sim.decoy.live) {
      const decoy: CatPose = {
        id: sim.player.id,
        x: sim.decoy.x,
        y: sim.decoy.y,
        facing: sim.player.facing,
        moving: false,
        dashing: false,
        hurt: false,
        decoy: true,
        time: view.time,
      };
      sprites.push({ y: decoy.y, draw: () => drawCat(ctx, view.style, decoy) });
    }
    sprites.push({
      y: sim.partner.y,
      draw: () =>
        drawCat(ctx, view.style, {
          id: sim.partner.id,
          x: sim.partner.x,
          y: sim.partner.y,
          facing: sim.partner.facing,
          moving: false,
          dashing: false,
          hurt: false,
          time: view.time,
        }),
    });
    for (const enemy of sim.enemies) {
      if (!enemy.alive) continue;
      const e = enemy;
      sprites.push({
        y: e.y,
        draw: () => {
          if (view.style === "paper") drawPaperBlob(ctx, e.x, e.y, view.time, e.id);
          else drawPixelBlob(ctx, e.x, e.y, view.time);
        },
      });
    }
    for (const shot of sim.shots) {
      if (!shot.alive) continue;
      const s = shot;
      sprites.push({
        y: s.y,
        draw: () => {
          if (view.style === "paper") drawPaperShot(ctx, s.x, s.y, s.vx, s.vy);
          else drawPixelShot(ctx, s.x, s.y, s.vx, s.vy);
        },
      });
    }
    sprites.push({
      y: sim.player.y,
      draw: () =>
        drawCat(ctx, view.style, {
          id: sim.player.id,
          x: sim.player.x,
          y: sim.player.y,
          facing: sim.player.facing,
          moving: Math.hypot(sim.player.vx, sim.player.vy) > 8 && sim.player.dashTime <= 0,
          dashing: sim.player.dashTime > 0,
          hurt: sim.player.invuln > 0 && sim.player.dashTime <= 0 && Math.floor(view.time * 16) % 2 === 0,
          time: view.time,
        }),
    });
  }

  sprites.sort((a, b) => a.y - b.y);
  for (const sprite of sprites) sprite.draw();

  drawAtmosphere(ctx, view.style, VIEW_WIDTH, VIEW_HEIGHT, view.time);
  drawPageChrome(ctx, view.style, VIEW_WIDTH, VIEW_HEIGHT);
  void STATS;
}

function drawCat(ctx: CanvasRenderingContext2D, style: StyleMode, pose: CatPose): void {
  if (style === "paper") drawPaperCat(ctx, pose);
  else drawPixelCat(ctx, pose);
}

export function present(
  source: HTMLCanvasElement,
  dest: CanvasRenderingContext2D,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
  style: StyleMode,
  overlay?: HTMLElement,
): void {
  const fit = Math.min(cssWidth / VIEW_WIDTH, cssHeight / VIEW_HEIGHT);
  const cssScale = fit >= 1 ? Math.max(1, Math.floor(fit)) : Math.max(fit, 0.25);
  const boxW = VIEW_WIDTH * cssScale;
  const boxH = VIEW_HEIGHT * cssScale;
  const cssX = Math.floor((cssWidth - boxW) / 2);
  const cssY = Math.floor((cssHeight - boxH) / 2);
  const x = Math.round(cssX * dpr);
  const y = Math.round(cssY * dpr);
  const w = Math.round(boxW * dpr);
  const h = Math.round(boxH * dpr);
  dest.setTransform(1, 0, 0, 1, 0, 0);
  dest.imageSmoothingEnabled = style === "paper" || cssScale < 1;
  dest.fillStyle = "#1C1814";
  dest.fillRect(0, 0, cssWidth * dpr, cssHeight * dpr);
  dest.drawImage(source, 0, 0, VIEW_WIDTH, VIEW_HEIGHT, x, y, w, h);
  if (overlay) {
    overlay.style.left = `${cssX}px`;
    overlay.style.top = `${cssY}px`;
    overlay.style.width = `${boxW}px`;
    overlay.style.height = `${boxH}px`;
  }
}
