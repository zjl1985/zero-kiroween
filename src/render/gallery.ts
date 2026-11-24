/**
 * Paints the ?gallery=1 page: one paper card per gallery cell, each with the
 * registered art in one state and an i18n label. Cells come from the pure
 * layout in src/ui/gallery-layout.ts, so the painters here only dispatch by
 * section kind and never name a single id. Static: drawn once per resize or
 * locale change at time 0, with fixed render-only seeds.
 */
import { drawVillageSprite, type VillageAsset, VILLAGE_PIXEL } from "./village-art.js";
import { drawPuppetFigure } from "./iso/puppet.js";
import { drawEnemyPuppet } from "./iso/enemy-puppets.js";
import { VILLAGE_PIXELS } from "./village-pixels.js";
import { t } from "../content/i18n.js";
import type { Locale } from "../content/keys.js";
import { BIOME_DEFS, ENEMY_DEFS, PROP_DEFS } from "../defs/index.js";
import type { EnemyState } from "../game/types.js";
import { ELITE } from "../game/enemies.js";
import { galleryLayout, gallerySections, stateLabel, type GalleryCell, type GalleryCheck, type GalleryKind } from "../ui/gallery-layout.js";
import { clearSpriteCache } from "../engine/sprite.js";
import { glossy, probeGloss } from "./paper-rules.js";
import { BIOME_ART, CAT_ART, costumeArtOf, ENEMY_ART, PASSIVE_ART, PROP_ART, TOWNSFOLK_ART, WEAPON_ART } from "./art-index.js";
import { CAT_BOX } from "./cat-detail.js";
import { drawTownsfolk, drawTownsfolkTag } from "./craft-townsfolk.js";
import { drawCraftEnemy } from "./craft-enemies.js";
import { drawProp } from "./craft-props.js";
import { landmarkPreview, type Bounds } from "./craft-world.js";
import { visHash } from "./hash.js";
import { paintSheet, sheetOutline } from "./paper-ground.js";
import { box, stroke, type Ctx, type Point } from "./paper-material.js";

/** Height of the cream label tag at the bottom of a card. */
const TAG = 38;
const INK = "#f3e8c8",
  INK_SOFT = "#9cbdba",
  CARD = "#182b3d",
  TAG_PAPER = "#10202e",
  ICON_INK = "#f0dfbf";

type Painter = (ctx: Ctx, cell: GalleryCell, stage: { x: number; y: number; w: number; h: number }) => void;

/** Fits a box of art `b` (at scale 1) into the stage; returns the scale and base point. */
function fit(b: Bounds, stage: { x: number; y: number; w: number; h: number }, max: number) {
  const k = Math.min(max, (stage.w - 16) / (b.r - b.l), (stage.h - 14) / (b.b - b.t));
  return {
    k,
    x: stage.x + stage.w / 2 - ((b.l + b.r) / 2) * k,
    y: stage.y + stage.h / 2 - ((b.t + b.b) / 2) * k,
  };
}
/** A registered landmark kind (LANDMARK_DEFS + LANDMARK_ART) drawn on its own. */
const landmarkArt = (id: string) => landmarkPreview(id);

const PAINTERS: Record<GalleryKind, Painter> = {
  scenery(ctx, cell, st) {
    const key = cell.id as VillageAsset, p = VILLAGE_PIXELS[key];
    if (!p) return;
    const b = { l: -p.ax * VILLAGE_PIXEL, r: (p.width-p.ax) * VILLAGE_PIXEL,
      t: -p.ay * VILLAGE_PIXEL, b: (p.height-p.ay) * VILLAGE_PIXEL };
    const f = fit(b, st, 2);
    // Same cached indexed art and footpoint as the game, not a second preview PNG.
    drawVillageSprite(ctx, key, f.x, f.y, f.k);
  },
  cat(ctx, cell, st) {
    const art = CAT_ART.find(cell.id);
    if (!art) return;
    // The baked puppet, enlarged by a whole factor so its pixels stay square and it fills the cell like the old figure.
    if (art.iso && drawPuppetFigure(ctx, art.iso, { x: st.x + st.w / 2, y: st.y + st.h - 10, scale: Math.min(4, Math.floor((st.h - 16) / 35)) })) return;
    const k = Math.min(2.1, st.h / 70);
    ctx.save();
    ctx.translate(st.x + st.w / 2, st.y + st.h - 10);
    ctx.scale(k, k);
    const pose = { id: cell.id, x: 0, y: 0, facing: 1 as const, moving: false, dashing: false, hurt: false, time: 0 };
    art.draw(ctx, pose);
    ctx.restore();
  },
  enemy(ctx, cell, st) {
    const def = ENEMY_DEFS.get(cell.id),
      elite = cell.state === "elite",
      r = def.stats.radius * (elite ? ELITE.radiusMul : 1),
      // Bodies stand on their point and reach about two radii up (crowns a bit more).
      k = Math.min(2.4, (st.h - 18) / (r * (elite ? 2.6 : 2.2))),
      e: EnemyState = {
        id: 1 + Math.floor(visHash(cell.id.length * 97 + (elite ? 1 : 0)) * 1000),
        kind: cell.id,
        x: 0,
        y: 0,
        hp: def.stats.hp,
        alive: true,
        orbitCooldown: 0,
        slowTime: 0,
        spawnTime: 0,
        ...(elite ? { elite: true, radius: r } : {}),
      };
    const art = ENEMY_ART.find(cell.id);
    if (!art) return;
    const p = (elite ? art.puppet?.elite : undefined) ?? art.puppet;
    if (p) {
      const bottom = Math.max(p.bottom, p.shadow[1]);
      const top = elite ? p.crown + 8 : p.top;
      const scale = Math.max(1, Math.min(4, Math.floor(Math.min((st.h - 12) / (top + bottom), (st.w - 16) / (2 * p.halfWidth)))));
      ctx.save();
      ctx.translate(Math.round(st.x + st.w / 2), Math.round(st.y + (st.h + (top - bottom) * scale) / 2));
      ctx.scale(scale, scale);
      drawEnemyPuppet(ctx, art.puppet!, { ...e, maxHp: e.hp }, 0, { x: 1, y: 0 }, false);
      ctx.restore();
      return;
    }
    const mul = elite ? ELITE.radiusMul : 1;
    const bounds = art.previewBounds;
    const f = bounds ? fit({
      l: bounds.l * mul, r: bounds.r * mul, b: bounds.b * mul,
      t: Math.min(bounds.t * mul, elite ? (art.crownY ?? -def.stats.radius * 2.05) * mul - r * 0.75 : 0),
    }, st, 2.4) : { k, x: st.x + st.w / 2, y: st.y + st.h - 8 };
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.k, f.k);
    drawCraftEnemy(ctx, e, 0, { x: 0, y: -1 });
    ctx.restore();
  },
  prop(ctx, cell, st) {
    const def = PROP_DEFS.get(cell.id),
      art = PROP_ART.find(def.art);
    if (!art) return;
    const f = fit(art.bounds, st, 1.6),
      phase = cell.state === "damaged" ? 1 : cell.state === "scraps" || cell.state === "burnt" ? 2 : 0;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.k, f.k);
    drawProp(ctx, art, { id: `gallery-${cell.id}`, kind: cell.id, x: 0, y: 0, s: 1, seed: 4 }, phase, cell.state === "burnt", cell.state === "burning", 0);
    ctx.restore();
  },
  landmark(ctx, cell, st) {
    const art = landmarkArt(cell.id),
      f = fit(art.bounds, st, 0.9);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.k, f.k);
    art.draw(ctx, 0);
    ctx.restore();
  },
  townsfolk(ctx, cell, st) {
    const art = TOWNSFOLK_ART.find(cell.id);
    if (!art) return;
    // Room above the head for the speech tag it shows while talking.
    const f = fit({ ...art.bounds, t: art.bounds.t - 22 }, st, 2);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.k, f.k);
    drawTownsfolk(ctx, art, 0, 0, { facing: 1, frame: 0 });
    drawTownsfolkTag(ctx, art, 0, 0);
    ctx.restore();
  },
  biome(ctx, cell, st) {
    biomeSwatch(ctx, cell, st, false);
  },
  wash(ctx, cell, st) {
    const art = BIOME_ART.find(cell.id);
    if (!art) return;
    biomeSwatch(ctx, cell, st, cell.state === "colourless");
    if (cell.state !== "blank" && cell.state !== "tide") return;
    // The same stepped palette transitions as the runtime dirty-tile overlay.
    const x = Math.round((st.x + st.w * 0.55) / 2) * 2,
      y = Math.round((st.y + st.h * 0.52) / 2) * 2,
      r = Math.round(Math.min(st.w, st.h) * 0.3 / 4) * 4;
    for (let yy = -r; yy < r; yy += 4) for (let xx = -r; xx < r; xx += 4) {
      if (Math.abs(xx) + Math.abs(yy) > r * 1.35) continue;
      ctx.fillStyle = cell.state === "blank" ? "#d3c9aa" : (xx + yy) % 8 ? "#a9aaa0" : "#bfc0ac";
      ctx.fillRect(x + xx, y + yy, 4, 4);
      if (cell.state === "tide" && xx > r * 0.25) {
        ctx.fillStyle = art.swatch[1]; ctx.fillRect(x + xx, y + yy, 4, 4);
      }
    }
    if (cell.state === "tide") {
      ctx.fillStyle = "#74b4bb";
      for (let i = 0; i < 5; i++) ctx.fillRect(x - r + i * 6, y + r - 4 - i % 2 * 2, 4, 2);
    }
  },
  weapon(ctx, cell, st) {
    icon(ctx, st, WEAPON_ART.find(cell.id)?.icon);
  },
  passive(ctx, cell, st) {
    icon(ctx, st, PASSIVE_ART.find(cell.id)?.icon);
  },
  costume(ctx, cell, st) {
    const cat = cell.cat === undefined ? undefined : CAT_ART.find(cell.cat), art = costumeArtOf(cell.id);
    if (!cat || !art) return;
    const pose = { id: cat.id, x: 0, y: 0, facing: 1 as const, moving: false, dashing: false, hurt: false, time: 0, costume: cell.id };
    // Full body on the left: the baked puppet under its costume layer, enlarged three times.
    if (cat.iso && drawPuppetFigure(ctx, cat.iso, { x: st.x + st.w * 0.3, y: st.y + st.h - 3, scale: 3, layer: cell.id })) {
      // (the portrait and the skill marks follow below)
    } else {
      const k = Math.min(1.5, (st.h - 6) / (CAT_BOX.b - CAT_BOX.t));
      ctx.save();
      ctx.translate(st.x + st.w * 0.3, st.y + st.h - 3 - CAT_BOX.b * k);
      ctx.scale(k, k);
      cat.draw(ctx, pose);
      ctx.restore();
    }
    // Head portrait with the makeup layer, top right.
    cat.portrait(ctx, { ...pose, x: st.x + st.w * 0.77, y: st.y + 8 + 52 * 0.85 }, 0.16 * 0.85);
    // The costume skill's ground marks, bottom right.
    ctx.save();
    ctx.translate(st.x + st.w * 0.77, st.y + st.h * 0.76);
    ctx.scale(0.36, 0.36);
    art.preview(ctx);
    ctx.restore();
    // The wardrobe tag glyph, top left.
    ctx.save();
    ctx.translate(st.x + 2, st.y + 2);
    ctx.scale(0.8, 0.8);
    art.ticket(ctx);
    ctx.restore();
  },
};
/**
 * A district ground swatch laid from two of its sheets, with three of its
 * patches and a few props of its mix. `pencil` shows the same swatch as its
 * washed pencil underdrawing: raw cream paper, the sheet seams and patches in
 * graphite, and the props in their pencil variants.
 */
function biomeSwatch(ctx: Ctx, cell: GalleryCell, st: { x: number; y: number; w: number; h: number }, pencil: boolean): void {
  const art = BIOME_ART.find(cell.id),
    def = BIOME_DEFS.get(cell.id);
  if (!art) return;
  const g = box(st.x + 4, st.y + 4, st.w - 8, st.h - 8, cell.id.length),
    sheets: [Point[], number][] = [
      [[[st.x + st.w * 0.46, st.y - 14], [st.x + st.w + 14, st.y - 10], [st.x + st.w + 14, st.y + st.h + 14], [st.x + st.w * 0.5, st.y + st.h + 12]], 9],
      [[[st.x - 14, st.y - 12], [st.x + st.w * 0.6, st.y - 8], [st.x + st.w * 0.56, st.y + st.h * 0.7], [st.x - 14, st.y + st.h * 0.74]], 3],
    ],
    cy = st.y + st.h * 0.58,
    patches = [0.22, 0.55, 0.85].map((fx, i) => [st.x + st.w * fx, cy + (i % 2 ? -14 : 10), Math.min(54, st.w * 0.2), 11 + i * 17] as const);
  ctx.save();
  ctx.clip(g);
  if (pencil) {
    ctx.fillStyle = "#a9aaa0"; ctx.fillRect(st.x, st.y, st.w, st.h);
    for (let yy = Math.ceil(st.y / 12) * 12; yy < st.y + st.h; yy += 12)
      for (let xx = Math.ceil(st.x / 16) * 16; xx < st.x + st.w; xx += 16) {
        ctx.fillStyle = "#899590"; ctx.fillRect(xx, yy, 4, 2);
        ctx.fillStyle = "#bec1af"; ctx.fillRect(xx + 2, yy - 2, 2, 2);
      }
  } else {
    ctx.fillStyle = art.swatch[0];
    ctx.fillRect(st.x, st.y, st.w, st.h);
    for (const [corners, sd] of sheets) paintSheet(ctx, corners, art.sheet, sd);
    for (const [x, y, r, sd] of patches) art.patch(ctx, x, y, r, sd);
  }
  const shown = def.props.map((p) => p.prop).filter((id, i, a) => a.indexOf(id) === i && id !== "paper-grass").slice(0, 3);
  shown.forEach((id, i) => {
    const pa = PROP_ART.find(PROP_DEFS.get(id).art);
    if (!pa) return;
    const k = Math.min(0.8, (st.h * 0.55) / (pa.bounds.b - pa.bounds.t));
    ctx.save();
    ctx.translate(st.x + st.w * (0.2 + i * 0.3), st.y + st.h * 0.82);
    ctx.scale(k, k);
    drawProp(ctx, pa, { id: `gallery-${id}`, kind: id, x: 0, y: 0, s: 1, seed: 3 + i }, 0, false, false, 0, pencil ? { sketch: 1 } : {});
    ctx.restore();
  });
  ctx.restore();
}
function icon(ctx: Ctx, st: { x: number; y: number; w: number; h: number }, paint?: (ctx: Ctx, ink: string) => void): void {
  if (!paint) return;
  const k = Math.min(2, (st.h - 8) / 32);
  ctx.save();
  ctx.translate(st.x + st.w / 2 - 16 * k, st.y + st.h / 2 - 16 * k);
  ctx.scale(k, k);
  paint(ctx, ICON_INK);
  ctx.restore();
}

function card(ctx: Ctx, cell: GalleryCell, locale: Locale, seed: number, check: GalleryCheck): void {
  const { x, y, w, h } = cell;
  ctx.fillStyle = "#090f1e"; ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = "#466774"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = CARD; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = "#213c4d"; ctx.fillRect(x + 10, y + h - TAG - 20, w - 20, 12);
  const stage = { x: x + 6, y: y + 6, w: w - 12, h: h - TAG - 10 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 2, y + 2, w - 4, h - TAG - 2);
  ctx.clip();
  let gloss = false;
  if (check === "gloss") {
    // Repaint cached parts inside the probe so their own painters are seen too.
    clearSpriteCache();
    gloss = glossy(probeGloss(contextPrototypes(), () => PAINTERS[cell.kind](ctx, cell, stage)));
  } else PAINTERS[cell.kind](ctx, cell, stage);
  ctx.restore();
  // Crisp catalogue labels stay separate from the sprite's native grid.
  const ty = y + h - TAG + 2;
  ctx.fillStyle = TAG_PAPER; ctx.fillRect(x + 2, ty, w - 4, TAG - 4);
  ctx.fillStyle = "#587b83"; ctx.fillRect(x + 2, ty, w - 4, 1);
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.font = `600 12px Allo, "Songti SC", sans-serif`;
  // Technical asset IDs intentionally match filenames in the model handoff.
  ctx.fillText(cell.kind === "scenery" ? cell.id : t(locale, cell.label), x + w / 2, ty + 13, w - 22);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `10px Allo, "Songti SC", sans-serif`;
  ctx.fillText(t(locale, stateLabel(cell.state)), x + w / 2, ty + 24, w - 22);
  ctx.restore();
  if (gloss) {
    ctx.save();
    ctx.strokeStyle = GLOSS_MARK;
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 4]);
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    ctx.restore();
  }
}
/** Outline colour of a cell that broke the paper ruleset in the gloss check. */
const GLOSS_MARK = "#e0402f";
/** 2D context prototypes present in this runtime (page and offscreen canvases). */
function contextPrototypes(): object[] {
  const g = globalThis as { CanvasRenderingContext2D?: { prototype: object }; OffscreenCanvasRenderingContext2D?: { prototype: object } };
  return [g.CanvasRenderingContext2D?.prototype, g.OffscreenCanvasRenderingContext2D?.prototype].filter((p): p is object => !!p);
}
/** Value check: the painted page reduced to luminance only (greyscale), so value contrast is visible. */
function toLuminance(canvas: HTMLCanvasElement): void {
  const copy = document.createElement("canvas");
  copy.width = canvas.width;
  copy.height = canvas.height;
  copy.getContext("2d")!.drawImage(canvas, 0, 0);
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.filter = "grayscale(1)";
  ctx.drawImage(copy, 0, 0);
  ctx.restore();
}

/**
 * Sizes `canvas` to the layout for a page `width` (CSS px) and paints every
 * section header and card. Returns the CSS height. `check` selects a
 * developer check view (luminance or gloss outlines); the layout is the same.
 */
export function paintGallery(canvas: HTMLCanvasElement, locale: Locale, width: number, dpr: number, check: GalleryCheck = "none", generatedOnly = false): number {
  const layout = galleryLayout(gallerySections(generatedOnly), width),
    // Keep the backing store under common browser canvas limits.
    scale = Math.max(1, Math.min(dpr, Math.floor(16000 / layout.height)));
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(layout.height * scale);
  canvas.style.height = `${layout.height}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, layout.height);
  for (const hd of layout.headers) {
    ctx.fillStyle = "#264858"; ctx.fillRect(hd.x, hd.y + 4, Math.min(hd.w, 260), 30);
    ctx.fillStyle = "#e8b86b"; ctx.fillRect(hd.x, hd.y + 4, 4, 30);
    ctx.save();
    ctx.fillStyle = INK;
    ctx.font = `600 17px Allo, "Songti SC", sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(t(locale, hd.title), hd.x + 16, hd.y + 20, 230);
    ctx.restore();
  }
  layout.cells.forEach((c, i) => card(ctx, c, locale, i * 7 + 1, check));
  if (check === "value") toLuminance(canvas);
  return layout.height;
}
