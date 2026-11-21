import { clockTowerModel } from "./pixel-clock-tower.js";
import { drawClockCourt } from "./pixel-clock-court.js";
import { teahouseModel } from "./pixel-teahouse.js";
import { teahouseTableModel, teahousePlanterModel } from "./pixel-teahouse-props.js";
import { drawTeahouseGarden } from "./pixel-teahouse-garden.js";
import { drawGreenhouseGarden } from "./pixel-greenhouse-garden.js";
import { greenhouseModel } from "./pixel-greenhouse.js";
import { greenhouseTrellisModel, greenhousePotsModel, greenhouseWorkbenchModel } from "./pixel-greenhouse-props.js";
import { observatoryModel } from "./pixel-observatory.js";
import { observatoryArmillaryModel, observatoryChartModel } from "./pixel-observatory-props.js";
import { drawObservatoryCourt } from "./pixel-observatory-court.js";
import { windmillModel } from "./pixel-windmill.js";
import { drawPixelWindmillRotor } from "./pixel-windmill-rotor.js";
/** Native-resolution voxel sections for world props and landmark dressing.
 * Adapters retain simulation identity, placements, bounds and lifecycle. Every
 * contour is authored in XY sections; the stack renderer bakes the projection.
 */
import type { ArtBounds, DecorPiece, LandmarkArt, PropArt } from "./art-registry.js";
import { drawPixelStack, type PixelStackModel } from "./pixel-stack.js";
import { hash, type Ctx } from "./paper-material.js";
import { LANDMARK_ACTIONS } from "../defs/landmark-activities.js";
import { RIVER } from "../defs/landmarks/stone-bridge/def.js";

const WOOD = ["#473c48", "#87634e", "#bd9566"] as const;
const STONE = ["#45495c", "#77818a", "#b7b7a1"] as const;
const LEAF = ["#3a5a54", "#658568", "#91a77c"] as const;
const GOLD = ["#8a4d43", "#d58d4e", "#f3ca78"] as const;
type Palette = readonly [string, string, string];

function fineModel(m:PixelStackModel):PixelStackModel {
  return {...m,id:m.id+":fine",width:m.width*2,depth:m.depth*2,count:m.count*2-1,
    ...(m.groundShadow ? {groundShadow:{rx:m.groundShadow.rx*2,ry:m.groundShadow.ry*2,dx:(m.groundShadow.dx??0)*2,dy:(m.groundShadow.dy??0)*2}} : {}),
    paint(c,z){m.paint(c,z/2);}};
}

function shapePainter(ctx: Ctx, w: number, d: number, colors: Palette, charred = false) {
  const rect = (x: number, y: number, width: number, depth: number, c: string | number = 1) => {
    ctx.fillStyle = typeof c === "number" ? colors[c]! : charred ? colors[c === GOLD[2] || c === STONE[2] ? 2 : 1] : c;
    ctx.fillRect(Math.round(x*2), Math.round(y*2), Math.max(1, Math.round(width*2)), Math.max(1, Math.round(depth*2)));
  };
  const box = (halfX: number, halfY: number, c: string | number = 1) => {
    rect(-halfX, -halfY, halfX * 2, halfY * 2, c);
    // A broad darker volume on the far side, never an outlined perimeter
    // repeated on every section (which would make the model look striped).
    if (halfX > 2 && halfY > 2) rect(-halfX, -halfY, Math.max(1, halfX * 0.28), halfY * 2, 0);
  };
  const oval = (x: number, y: number, rx: number, ry: number, c: string | number = 1, inner = 0) => {
    rx = Math.max(0.6, rx); ry = Math.max(0.6, ry);
    for (let iy = Math.ceil(-ry*2)/2; iy <= Math.floor(ry*2)/2; iy+=.5) {
      const k = 1 - iy * iy / (ry * ry); if (k < 0) continue;
      const reach = Math.max(1, Math.floor(rx * Math.sqrt(k)*2)/2);
      if (inner > 0 && Math.abs(iy) < ry * inner) {
        const hole = Math.floor(rx * inner * Math.sqrt(1 - iy * iy / (ry * ry * inner * inner)));
        rect(x - reach, y + iy, Math.max(1, reach - hole), .5, c);
        rect(x + hole, y + iy, Math.max(1, reach - hole), .5, c);
      } else rect(x - reach, y + iy, reach * 2, .5, c);
    }
  };
  return { rect, box, oval, w, d };
}
function metrics(bounds: ArtBounds, slim = false) {
  const width = Math.max(8, Math.floor((bounds.r - bounds.l) / 5.6) * 2),
    depth = Math.max(6, Math.min(24, Math.floor(width * (slim ? 0.22 : 0.42) / 2) * 2)),
    count = Math.max(4, Math.floor((-bounds.t - depth * 0.75 - 4) / 2));
  return { width, depth, count };
}
function paletteFor(id: string, burnt: boolean): Palette {
  if (burnt) return ["#242735", "#41404a", "#74615b"];
  if (/bush|grass|reeds|flowers|planter|pots/.test(id)) return LEAF;
  if (/stone|tomb|chapel|clock|well|observatory/.test(id)) return STONE;
  if (/mushroom|lantern|hay|candle/.test(id)) return GOLD;
  if (/vat|bucket|mailbox/.test(id)) return ["#344353", "#64838c", "#acd1c0"];
  return WOOD;
}

function propModel(art: PropArt, v: number, phase: string, burnt: boolean): PixelStackModel {
  const dims = metrics(art.bounds, /fence|line|lantern|grass|flowers|reeds/.test(art.id)),
    count = phase === "scraps" ? 5 : phase === "damaged" ? Math.max(3, Math.ceil(dims.count * 0.7)) : dims.count, colors = paletteFor(art.id, burnt),
    W = dims.width / 2 - 2, D = dims.depth / 2 - 1;
  return { ...dims, count, id: `prop:${art.id}:${v}:${phase}:${burnt ? 1 : 0}${art.id === "paper-fence" ? ":joinery-v2" : ""}`,
    ...(art.id === "paper-fence" ? {groundShadow:{rx:W+1,ry:1.8,dx:.5,dy:1}} : {}),
    paint(ctx, z) {
      const { rect, oval, box } = shapePainter(ctx, dims.width, dims.depth, colors, burnt),
        h = z / Math.max(1, dims.count - 1), id = art.id;
      if (phase === "scraps") {
        for (let i = 0; i < 7; i++) if (z < 1 + Math.floor(hash(v * 17 + i) * 4)) {
          const x = (hash(i * 13 + v) - 0.5) * W * 1.5, y = (hash(i * 23 + v) - 0.5) * D;
          rect(x, y, 2 + i % 3, 2, i % 3);
        }
        return;
      }
      // Missing upper sections vary by material; the surviving cross-section
      // shows its pale inner material instead of a generic front-facing tear.
      const damagedTop = phase === "damaged" && h > 0.6;
      if (id === "paper-fence") {
        // The old mid-tone is nearly identical to farm soil. Exposed timber
        // faces must describe the whole structure, not only the upper rail.
        for (const [bottom, top] of [[0.22, 0.35], [0.65, 0.78]]) {
          if (h <= bottom! || h >= top!) continue;
          rect(-W, -1, W * 2, 3, 1);
          rect(-W, 1.5, W * 2, .5, 2);
          rect(-W, -1, 1, 3, 0);
          rect(W - 1, -1, 1, 3, 2);
          if (h < bottom! + .035) rect(-W, 1.5, W * 2, .5, 0);
          if (h > top! - .035) rect(-W, -1, W * 2, 3, 2);
        }
        // Posts stand in front of the rails, with dark left faces and narrow
        // illuminated front faces continuing all the way down to the footing.
        for (const x of [-W + 2, W - 2]) {
          rect(x - 1, -1, 3, 3, damagedTop ? 2 : 1);
          rect(x - 1, -1, 1, 3, 0);
          rect(x, 1.5, 2, .5, 2);
          if (h > .94 || damagedTop) rect(x - 1, -1, 3, 3, 2);
          if (h < .04) rect(x - 1, 1.5, 3, .5, 0);
          // Two small iron pins join rails to posts; no repeated slice stripes.
          if (Math.abs(h - .29) < .02 || Math.abs(h - .71) < .02)
            rect(x + .5, 1.5, .5, .5, 0);
        }
      } else if (id === "laundry-line" || id === "paper-lanterns") {
        for (const x of [-W + 1, W - 1]) rect(x - 1, -1, 2, 2, WOOD[1]);
        if (h > 0.9) rect(-W, 0, W * 2, 1, WOOD[0]);
        if (id === "laundry-line" && h > 0.48 && h < 0.89) for (let i = 0; i < 3; i++) {
          const x = -W * 0.65 + i * W * 0.62;
          rect(x - 3, -1, 6, 2, ["#88b1ac", "#d6ad8d", "#a594b7"][i]!);
          if (h < 0.57) rect(x - 2, -1, 1, 2, WOOD[0]);
        }
        if (id === "paper-lanterns" && h > 0.56 && h < 0.87) {
          const radius = Math.sin((h - 0.56) / 0.31 * Math.PI) * Math.min(4, W / 5);
          for (let i = 0; i < 4; i++) {
            const x = -W * 0.72 + i * W * 0.48;
            oval(x, 0, radius, Math.max(1, radius * 0.8), i % 2 ? "#ce7757" : GOLD[1]);
            rect(x, -radius * 0.7, 1, radius * 1.4, GOLD[2]);
          }
        }
      } else if (/grass|reeds|flowers/.test(id)) {
        for (let i = 0; i < 9; i++) {
          const height = 0.45 + hash(v * 19 + i) * 0.55;
          if (h > height) continue;
          const x = -W * 0.85 + (i / 8) * W * 1.7 + (h * h * (i % 2 ? 2 : -2)), y = ((i % 3) - 1) * D * 0.5;
          rect(x, y, 1 + (h < 0.2 ? 1 : 0), 1, i % 3);
          if (id.includes("flowers") && h > height - 0.17) { oval(x, y, 2.3, 2, ["#d99885", "#d4bf7c", "#a4b9c8"][i % 3]!); rect(x, y, 1, 1, GOLD[2]); }
          if (id.includes("reeds") && h > height - 0.2) rect(x, y, 2, 2, GOLD[0]);
        }
      } else if (id === "paper-bush") {
        for (let i = 0; i < 5; i++) {
          const r = Math.sqrt(Math.max(0, 1 - ((h - 0.42 - (i % 2) * 0.13) / 0.55) ** 2));
          oval((i - 2) * W * 0.3, (i % 2 ? -1 : 1) * D * 0.3, W * 0.45 * r, D * r, h > .62 ? 2 : i === 0 ? 0 : 1);
        }
      } else if (id === "dead-tree") {
        rect(-2 + Math.sin(h * 5 + v) * 1.3, -1, 4 - h * 2, 3, 1);
        if (h > 0.38) for (const side of [-1, 1]) {
          const b = Math.max(0, (h - (side < 0 ? 0.38 : 0.5)) * W * 1.5);
          if (b < W) rect(side * b, -1 + side, 2, 2, side < 0 ? 0 : 2);
        }
      } else if (id === "paper-mushroom") {
        if (h < 0.5) oval(0, 0, W * 0.19, D * 0.25, 2);
        else {
          const r = Math.sqrt(Math.max(0, 1 - ((h - 0.55) / 0.5) ** 2));
          oval(0, 0, W * r, D * r, h < 0.58 ? 0 : "#b85c62");
          if (z % 4 === 0) for (let i = 0; i < 3; i++) rect((i - 1) * W * 0.4, (i % 2 ? 1 : -1) * D * 0.25, 2, 2, 2);
        }
      } else if (id === "paper-tombstone") {
        const r = h < 0.75 ? 1 : Math.sqrt(Math.max(0, 1 - ((h - 0.75) / 0.26) ** 2));
        box(W * r, Math.max(1.5, D * 0.4), damagedTop ? 2 : 1);
        if (h > 0.38 && h < 0.68) rect(-1, D * 0.4 - 1, 2, 1, 0);
        if (h > 0.53 && h < 0.6) rect(-W * 0.4, D * 0.4 - 1, W * 0.8, 1, 0);
      } else if (id === "signpost") {
        rect(-1, -1, 3, 3, WOOD[1]);
        if (h > 0.62 && h < 0.83 || h > 0.88) { box(W, 2, h > 0.88 ? GOLD[1] : WOOD[2]); if (z % 3 === 0) rect(-W * 0.6, 1, W, 1, WOOD[0]); }
      } else if (id === "scarecrow") {
        rect(-1, -1, 2, 2, WOOD[1]);
        if (h > 0.35 && h < 0.72) { box(W * (h < 0.5 ? 0.5 : 0.3), D * 0.6, "#658a91"); if (h > 0.59) rect(-W, 0, W * 2, 2, "#aa795b"); }
        if (h > 0.72 && h < 0.91) oval(0, 0, W * 0.26, D * 0.8, GOLD[1]);
        if (h > 0.87) box(W * (h > 0.92 ? 0.25 : 0.5), D * 0.7, WOOD[1]);
      } else if (id === "mailbox") {
        if (h < 0.45) rect(-1, -1, 3, 3, WOOD[1]);
        else { const r = h < 0.8 ? 1 : Math.sqrt(Math.max(0, 1 - ((h - 0.8) / 0.21) ** 2)); box(W * r, D * 0.8, 1); if (h > 0.62 && h < 0.7) rect(-W * 0.6, D * 0.8 - 1, W * 1.2, 1, 0); }
      } else if (id === "wax-candle") {
        if (h < 0.12) oval(0, 0, W, D, STONE[1]);
        else if (h < 0.91) { oval(0, 0, W * 0.46, D * 0.6, h > 0.84 ? 0 : 2); if (h < 0.8) rect(W * 0.25, 0, 1, D * 0.4, 1); }
        else rect(0, 0, 1, 1, WOOD[0]);
      } else if (/bucket|vat/.test(id)) {
        const r = 0.7 + h * 0.3;
        oval(0, 0, W * r, D * r, h > 0.83 ? 2 : 1, h > 0.84 ? 0.72 : 0);
        if (h > 0.82 && h < 0.89) oval(0, 0, W * 0.72, D * 0.72, id.includes("vat") ? "#302c4b" : "#75b4b6");
        if (id.includes("bucket") && h > 0.7) for (const side of [-1, 1]) rect(side * W * 0.9, -1, 1, 2, WOOD[2]);
      } else if (id === "haybale") {
        const r = Math.sqrt(Math.max(0, 1 - ((h - 0.5) / 0.53) ** 2));
        oval(0, 0, W, D * Math.max(0.3, r), h < .15 ? 0 : 1);
        for (const x of [-W * 0.55, W * 0.55]) rect(x, -D * r, 2, D * r * 2, WOOD[0]);
      } else { // Crate: slab, plank seams, bands, and a top seam in actual sections.
        box(W * 0.88, D * 0.9, h < .05 || h > .94 ? 2 : 1);
        for (const x of [-W * 0.74, W * 0.74]) rect(x, -D * 0.9, 2, D * 1.8, 2);
        if (h > 0.94) rect(-1, -D * 0.9, 1, D * 1.8, 0);
      }
    },
  };
}

export function pixelPropArt(a: PropArt): PropArt {
  return { ...a, look: { ...a.look, angle: [0, 0] },
    paint(ctx, x, y, s, v, phase, burnt) {
      const model = fineModel(propModel(a, v % Math.max(1, a.variants), phase, burnt));
      drawPixelStack(ctx, model, { x: Math.round(x), y: Math.round(y - model.depth * s * 0.2), scale: s, turn: 0.2, shadow: true });
    },
  };
}

function landmarkModel(piece: DecorPiece, v: number): PixelStackModel {
  if (piece.kind === "clock-tower") return clockTowerModel(v);
  if (piece.kind === "paper-teahouse-building") return teahouseModel(v);
  if (piece.kind === "paper-teahouse-table") return teahouseTableModel(v);
  if (piece.kind === "paper-teahouse-planter") return teahousePlanterModel(v);
  if (piece.kind === "fold-greenhouse-building") return greenhouseModel(v);
  if (piece.kind === "fold-greenhouse-trellis") return greenhouseTrellisModel(v);
  if (piece.kind === "fold-greenhouse-pots") return greenhousePotsModel(v);
  if (piece.kind === "fold-greenhouse-workbench") return greenhouseWorkbenchModel(v);
  if (piece.kind === "windmill") return windmillModel(v);
  if (piece.kind === "star-observatory-building") return observatoryModel(v);
  if (piece.kind === "star-observatory-armillary") return observatoryArmillaryModel(v);
  if (piece.kind === "star-observatory-chart") return observatoryChartModel(v);
  const kind = piece.kind, dims = metrics(piece.bounds, /lights|trellis|chart/.test(kind)),
    colors = paletteFor(kind, false), W = dims.width / 2 - 2, D = dims.depth / 2 - 1,
    roof: Palette = /greenhouse/.test(kind) ? ["#315565", "#608b91", "#b0ccc0"]
      : /observatory/.test(kind) ? ["#334c68", "#567d9a", "#91b5bd"]
      : /teahouse/.test(kind) ? ["#493b51", "#8c5862", "#c1806a"]
      : ["#383b56", "#615a78", "#9b8591"];
  return { ...dims, id: `landmark:${kind}:${v}`,
    paint(ctx, z) {
      const { rect, oval, box } = shapePainter(ctx, dims.width, dims.depth, colors), h = z / (dims.count - 1);
      const roofSection = (start: number, end: number, halfX = W, halfY = D) => {
        if (h < start || h > end) return;
        const t = (h - start) / (end - start), depth = Math.max(1, halfY * (1 - t));
        rect(-halfX, -depth, halfX * 2, depth, roof[1]);
        rect(-halfX, 0, halfX * 2, depth, roof[0]);
        // One-pixel, low-contrast joints follow staggered tile courses.
        const course=Math.floor((z-start*(dims.count-1))/3);
        for(let x=-halfX+3+(course%2)*2;x<halfX;x+=5)
          rect(x,-depth,.5,.5,roof[0]);
        if(t<.04){rect(-halfX,-depth,halfX*2,.5,roof[2]);rect(-halfX,depth-.5,halfX*2,.5,WOOD[0]);}
        if(t>.95)rect(-halfX,-.5,halfX*2,1,roof[1]);
      };
      const windows = (start: number, end: number, count = 3, halfX = W * 0.75, halfY = D * 0.8) => {
        if (h < start || h > end) return;
        const t=(h-start)/(end-start), zSpan=(end-start)*(dims.count-1);
        for (let i = 0; i < count; i++) {
          const x = (i - (count - 1) / 2) * halfX * 1.6 / Math.max(1, count - 1), width = Math.min(7, halfX / count * 0.8);
          rect(x-width/2-.5,halfY-1,width+1,1,WOOD[0]);
          if(t>1/zSpan&&t<1-1/zSpan){
            rect(x-width/2+.5,halfY-.5,width-1,.5,t>.7?"#83a6b1":"#e6c88e");
            rect(x-.25,halfY-.5,.5,.5,WOOD[0]);
            if(Math.abs(t-.5)<.5/zSpan)rect(x-width/2,halfY-.5,width,.5,WOOD[0]);
          }
          if(t<1/zSpan||t>1-1/zSpan)rect(x-width/2-1,halfY-1,width+2,1,"#c4b39a");
          for(const side of [-1,1]){
            rect(x+side*(width/2+1)-.5,halfY-1,1,1,"#547c7c");
            if(t>.2&&t<.2+.5/zSpan||t>.8&&t<.8+.5/zSpan)rect(x+side*(width/2+1)-.5,halfY-.5,1,.5,WOOD[0]);
          }
        }
      };
      if (kind === "lights") {
        for (let i = -Math.floor(W); i <= W; i++) {
          const cord = dims.count - 3 - Math.round((1 - (i / W) ** 2) * 7);
          if (z === cord) rect(i, 0, 1, 1, WOOD[1]);
          if (i % 8 === 0 && z < cord && z > cord - 7) {
            const r = Math.sin((cord - z) / 7 * Math.PI) * 2.5;
            oval(i, 0, r, r, i % 16 === 0 ? GOLD[1] : "#bd6a72");
          }
        }
      } else if (kind === "tomb") {
        const r = h < 0.72 ? 1 : Math.sqrt(Math.max(0, 1 - ((h - 0.72) / 0.3) ** 2));
        box(Math.max(1, W * r), D * 0.5, h < .08 ? 0 : 1);
        if (h > 0.28 && h < 0.7) rect(-1, D * 0.5 - 1, 2, 1, 0);
        if (h > 0.49 && h < 0.58) rect(-W * 0.5, D * 0.5 - 1, W, 1, 0);
      } else if (/table|bench|workbench/.test(kind)) {
        const top = kind === "bench" ? 0.46 : 0.57;
        if (h < top) for (const x of [-W * 0.7, W * 0.7]) for (const y of [-D * 0.6, D * 0.6]) rect(x, y, 2, 2, WOOD[0]);
        if (h >= top && h < top + 0.12) {
          box(W, D, z % 2 ? WOOD[1] : WOOD[2]);
          for (let x = -W + 4; x < W; x += 6) rect(x, -D, 1, D * 2, WOOD[0]);
        }
        if (kind === "bench" && h > top + 0.12) {
          for (const x of [-W + 1, W - 2]) rect(x, -D + 1, 2, 2, WOOD[1]);
          if (h > 0.78) rect(-W, -D, W * 2, 2, WOOD[2]);
        } else if (h > top + 0.12 && h < 0.92) {
          for (const x of [-W * 0.5, W * 0.35]) oval(x, 0, h < 0.8 ? 2 : 3, 2, h > 0.85 ? GOLD[2] : "#729ca0", h > 0.87 ? 0.5 : 0);
        }
      } else if (/planter|pots/.test(kind)) {
        for (let i = 0; i < 3; i++) {
          const x = (i - 1) * W * 0.6, base = 0.38 + (i % 2) * 0.08;
          if (h < base) oval(x, 0, W * (0.16 + h * 0.18), D * 0.7, z % 5 === 0 ? "#8c5354" : "#b77962", h > base - 0.08 ? 0.55 : 0);
          else {
            rect(x, 0, 1, 1, LEAF[0]);
            const r = Math.sin((h - base) / (1 - base) * Math.PI) * W * 0.25;
            oval(x + (i % 2 ? -1 : 1) * r * 0.5, 0, Math.max(1, r), D * 0.75, h > .76 ? LEAF[2] : LEAF[1]);
          }
        }
      } else if (/trellis/.test(kind)) {
        for (const x of [-W * 0.8, W * 0.8]) rect(x, 0, 2, 2, WOOD[1]);
        if (z % 6 === 0) rect(-W, 0, W * 2, 1, WOOD[2]);
        for (let i = 0; i < 5; i++) {
          const x = (i - 2) * W * 0.35;
          rect(x, 0, 1, 1, WOOD[1]);
          if ((z + i * 3) % 9 < 4) oval(x + Math.sin(z * 0.4) * 2, 1, 3, 2, i % 2 ? LEAF[1] : LEAF[2]);
        }
      } else if (kind === "well") {
        if (h < 0.33) oval(0, 0, W * 0.82, D, h < .15 ? 0 : 1, 0.62);
        else for (const x of [-W * 0.75, W * 0.75]) rect(x, 0, 2, 2, WOOD[1]);
        if (h > 0.58 && h < 0.63) rect(-W * 0.75, 0, W * 1.5, 2, WOOD[2]);
        roofSection(0.73, 1);
      } else if (kind === "stall") {
        if (h < 0.74) for (const x of [-W * 0.85, W * 0.85]) for (const y of [-D * 0.75, D * 0.75]) rect(x, y, 2, 2, WOOD[1]);
        if (h > 0.22 && h < 0.45) box(W * 0.9, D * 0.9, z % 4 === 0 ? WOOD[0] : WOOD[1]);
        if (h >= 0.45 && h < 0.5) box(W, D, WOOD[2]);
        if (h > 0.5 && h < 0.64) for (const x of [-W * 0.5, 0, W * 0.5]) oval(x, 0, 3, 2, x < 0 ? GOLD[1] : "#8fa969");
        if (h > 0.74) {
          const yy = -D + (1 - h) / 0.26 * D * 2;
          for (let x = -W; x < W; x += 4) rect(x, yy, 4, 2, Math.floor((x + W) / 4) % 2 ? "#ddc79c" : "#ab6264");
        }
      } else if (kind === "theatre") {
        if (h < 0.12) box(W, D, WOOD[1]);
        if (h >= 0.12 && h < 0.83) {
          rect(-W * 0.88, -D, W * 1.76, 3, "#3c344e");
          for (const side of [-1, 1]) {
            rect(side * W * 0.84 - 2, -D, 4, D * 2, GOLD[1]);
            const curtain = W * (0.18 + Math.max(0, h - 0.55) * 1.3);
            rect(side < 0 ? -W * 0.78 : W * 0.78 - curtain, D - 3, curtain, 3, side < 0 ? "#a35369" : "#b96778");
          }
          if (h < 0.36) { oval(-W * 0.22, 0, 3, 2, "#c0aa7b"); oval(W * 0.3, 0, 3, 2, "#81a5a2"); }
        }
        roofSection(0.82, 1, W, D);
      } else { // Teahouse and chapel keep distinct roof volumes and facades.
        const teahouse = /teahouse-building/.test(kind), bodyTop = teahouse ? 0.53 : 0.65;
        if (h < bodyTop) {
          box(W * 0.82, D * 0.9, h<.06?STONE[1]:h>bodyTop-.035?WOOD[0]:"#d2bea0");
          for(const side of [-1,1])rect(side*W*.8-.5,D*.9-1,1,1,"#a18c79");
          for (const x of [-W * 0.78, 0, W * 0.78]) rect(x, D * 0.9 - 1, 2, 1, WOOD[1]);
          windows(0.22, 0.43, teahouse ? 4 : 3, W * 0.65, D * 0.9);
          if (h < 0.27) {
            rect(-4,D*.9-1,8,1,WOOD[0]);
            if(h>.035&&h<.25){rect(-3,D*.9-.5,6,.5,"#5b7875");rect(-.25,D*.9-.5,.5,.5,WOOD[0]);}
            if(h>.12&&h<.12+1/(dims.count-1))rect(2,D*.9-.5,.5,.5,GOLD[2]);
          }
        }
        if (teahouse) {
          roofSection(0.53, 0.78);
          if (h > 0.75 && h < 0.86) box(W * 0.42, D * 0.5, "#d2bea0");
          roofSection(0.85, 1, W * 0.58, D * 0.7);
        } else {
          roofSection(0.65, 0.9);
          if (h > 0.76) {
            box(W * 0.15, D * 0.22, STONE[1]);
            if (h > 0.94) rect(-W * 0.32, -1, W * 0.64, 2, GOLD[2]);
          }
        }
      }
    },
  };
}

export function pixelLandmarkArt(a: LandmarkArt): LandmarkArt {
  return { ...a,
    base(ctx, l) {
      if (a.id === "clock-tower") { drawClockCourt(ctx,l.x,l.y); return; }
      if (a.id === "paper-teahouse") { drawTeahouseGarden(ctx,l.x,l.y); return; }
      if (a.id === "fold-greenhouse") { drawGreenhouseGarden(ctx,l.x,l.y); return; }
      if (a.id === "star-observatory") { drawObservatoryCourt(ctx,l.x,l.y); return; }
      const tile = 8, rx = Math.min(l.radius + 30, 180), ry = rx * 0.55,
        wood = /market|teahouse|theatre/.test(a.id), garden = /field|greenhouse|windmill|hill/.test(a.id),
        colors = wood ? WOOD : garden ? LEAF : STONE;
      if (a.id === "stone-bridge") {
        const span = l.span ?? RIVER.halfLength;
        for (const side of [-1, 1]) for (let px = -span; px < span; px += tile) for (let py = 10; py < 40; py += tile) {
          ctx.fillStyle = LEAF[(Math.floor(px / tile) + Math.floor(py / tile) + 300) % 3]!;
          ctx.fillRect(Math.round((l.x + px) / 2) * 2, Math.round((l.y + side * (RIVER.halfWidth + py)) / 2) * 2, tile, tile);
        }
        return;
      }
      for (let iy = -Math.ceil(ry / tile); iy <= Math.ceil(ry / tile); iy++) for (let ix = -Math.ceil(rx / tile); ix <= Math.ceil(rx / tile); ix++) {
        if ((ix * tile / rx) ** 2 + (iy * tile / ry) ** 2 > 1) continue;
        const h = hash(l.seed + ix * 7919 + iy * 131), c = colors[1]!;
        ctx.fillStyle = a.id === "pumpkin-field" ? (iy % 2 ? "#614b43" : "#80624a") : c;
        ctx.fillRect(Math.round((l.x + ix * tile) / 2) * 2, Math.round((l.y + iy * tile) / 2) * 2,
          wood ? tile - 1 : tile, wood ? tile - 2 : tile);
        if (!garden && h > 0.88) { ctx.fillStyle = colors[2]; ctx.fillRect(Math.round((l.x + ix * tile) / 2) * 2, Math.round((l.y + iy * tile) / 2) * 2, tile - 2, 2); }
      }
    },
    ground(ctx, l) {
      if (a.id === "clock-tower") return; // Court owns the flush entry stones.
      if (a.id === "paper-teahouse") return; // Baked garden includes the rest marker and approach.
      if (a.id === "fold-greenhouse") return; // Garden already owns its flush approach.
      if (a.id === "star-observatory") return; // Its compass court owns the flush doorway path.
      if (a.id === "stone-bridge") return; // All walkable decks still come from the shared water geometry.
      if (a.id === "moon-hill") {
        for (let yy = -8; yy <= 8; yy += 2) for (let xx = -22; xx <= 22; xx += 2) {
          if ((xx / 22) ** 2 + (yy / 8) ** 2 > 1 || ((xx - 7) / 18) ** 2 + ((yy + 2) / 8) ** 2 < 1) continue;
          ctx.fillStyle = "#bdc8c6"; ctx.fillRect(Math.round(l.x + xx), Math.round(l.y - 8 + yy), 2, 2);
        }
      } else if (a.id === "pumpkin-field") {
        for (let i = 0; i < 12; i++) {
          const x = Math.round((l.x + (hash(l.seed + i * 7) - 0.5) * 270) / 2) * 2,
            y = Math.round((l.y + (hash(l.seed + i * 13) - 0.5) * 140) / 2) * 2;
          ctx.fillStyle = LEAF[1];
          for (let k = 0; k < 12; k++) ctx.fillRect(x + k * 2, y + Math.round(Math.sin(k * 0.5) * 2) * 2, 2, 2);
        }
      } else {
        // Stone or timber approach, never an additional collision wall.
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = i % 2 ? "#9c947b" : "#85887a";
          ctx.fillRect(Math.round(l.x - 9 + (i % 2) * 2), Math.round(l.y + i * 10), 18, 7);
        }
      }
    },
    pieces: a.pieces?.map(piece => ({ ...piece,
      paint(ctx, x, y, s, v) {
        const model = fineModel(landmarkModel(piece, v % (piece.variants ?? 1)));
        const grounded = piece.kind === "clock-tower" || piece.kind === "windmill" || piece.kind.startsWith("star-observatory-")
          || piece.kind.startsWith("fold-greenhouse-") || piece.kind.startsWith("paper-teahouse-");
        drawPixelStack(ctx, model, { x: Math.round(x), y: Math.round(grounded ? y : y - model.depth * s * 0.2), scale: s, turn: 0.2, shadow: true });
      },
      ...(piece.kind === "windmill" ? { live(ctx: Ctx, x: number, y: number, s: number, v: number, time: number, activity?: Parameters<NonNullable<DecorPiece["live"]>>[6]) {
        drawPixelWindmillRotor(ctx, x, y, s, v, activity?.turn ?? time * LANDMARK_ACTIONS.idleTurn);
      } } : {}),
    })),
  };
}
