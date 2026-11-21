/** Native pixel actor painters. Shapes are authored on integer grids, never
 * rasterised from the archived paper paths. Simulation state is read only.
 */
import { cachedSprite } from "../engine/sprite.js";
import { officialRects, officialVariant, type MascotState } from "../cats/official.js";
import { costumeArtOf, type CatArt, type CostumeArt, type EnemyArt, type EffectPainter, type TownsfolkArt } from "./art-registry.js";
import type { CatPose } from "./layout.js";
import type { Ctx } from "./paper-material.js";
import { reducedPaperMotion } from "./paper-motion.js";
import { liveSketchStep } from "./sprite-sketch.js";
import { enemyMaxHp } from "../game/sim.js";

const INK = "#192333", LIGHT = "#f5e7c4";
function block(c: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}
function grid(c: Ctx, rows: readonly string[], palette: Readonly<Record<string, string>>, x: number, y: number, cell = 2): void {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const color = palette[row[i]];
      if (color) block(c, x + i * cell, y + j * cell, cell, cell, color);
    }
  });
}
function rimBox(c: Ctx, x: number, y: number, w: number, h: number, color: string, light = LIGHT): void {
  block(c, x, y, w, h, INK);
  if (w > 2 && h > 2) block(c, x + 1, y + 1, w - 2, h - 2, color);
  if (w > 3) block(c, x + 2, y + 1, w - 3, 1, light);
}
function shadow(c: Ctx, w: number): void {
  block(c, -w, -1, w * 2, 3, "#172631");
  block(c, -w + 3, -2, w * 2 - 6, 5, "#172631");
}
function accessory(c: Ctx, name: string, accent: string): void {
  // Head-local coordinates, chin at y=0; all outlines have integer steps.
  switch (name) {
    case "headphones":
      rimBox(c, -27, -31, 5, 16, accent); rimBox(c, 22, -31, 5, 16, accent);
      block(c, -24, -42, 48, 3, INK); block(c, -27, -39, 3, 10, INK); block(c, 24, -39, 3, 10, INK); break;
    case "cap":
      rimBox(c, -12, -44, 27, 9, "#467099"); block(c, 4, -36, 23, 3, "#315077"); break;
    case "bowler":
      rimBox(c, -12, -45, 25, 12, "#6c4c38"); block(c, -18, -35, 37, 4, INK); block(c, -11, -36, 23, 2, accent); break;
    case "page-hat":
      grid(c, [".....##.....", "....#LL#....", "...#LLLL#...", "..#LLSSLL#..", ".#LLLLLLLL#.", "############"], { "#": INK, L: LIGHT, S: "#b0bcc4" }, -24, -47, 4); break;
    case "round-glasses": case "goggles":
      for (const x of [-19, 5]) {
        rimBox(c, x, -21, 14, 10, name === "goggles" ? "#6eabc2" : "#c8b18a", accent);
        block(c, x + 3, -18, 8, 4, INK); block(c, x + 4, -18, 2, 2, LIGHT);
      }
      block(c, -5, -18, 10, 2, accent); break;
    case "spiky-tufts":
      grid(c, ["#...#...#", "##.###.##", "#########"], { "#": INK }, -18, -39, 4); break;
    case "thick-brows": block(c, -19, -24, 12, 3, INK); block(c, 7, -24, 12, 3, INK); break;
    case "turtleneck": case "leather-collar": case "jacket-collar":
      block(c, -16, -3, 32, 6, INK); block(c, -13, -2, 26, 2, accent); break;
    case "pencil-ear":
      block(c, 24, -34, 3, 22, "#dfb75c"); block(c, 24, -37, 3, 3, "#db7890"); block(c, 25, -12, 1, 4, INK); break;
    case "bird-tag":
      grid(c, [".##.", "#LL#", "#WL#", "####", ".##."], { "#": INK, L: LIGHT, W: "#e3ac4c" }, 15, -4, 2); break;
    case "sticky-note": rimBox(c, 14, -37, 13, 11, "#e1c35c"); block(c, 17, -32, 7, 1, INK); break;
    case "stone-pins":
      rimBox(c, -22, -5, 5, 5, LIGHT); rimBox(c, 17, -5, 5, 5, INK); break;
    case "lanyard":
      block(c, -6, -2, 2, 9, accent); block(c, 4, -2, 2, 9, accent); rimBox(c, -5, 5, 10, 7, LIGHT); break;
    default: rimBox(c, 18, -6, 6, 6, accent);
  }
}
function headSprite(art: CatArt, costume: CostumeArt | undefined) {
  const state: MascotState = costume?.makeup.expression === "closed" ? "sleeping" : costume?.makeup.expression === "wink" ? "wink" : "idle";
  return cachedSprite(`pixel-head:${art.id}:${costume?.id ?? "plain"}`, 84, 72, 1, c => {
    c.translate(42, 56);
    for (const r of officialRects(art.id, state)) {
      const x = Math.round(r.x * 0.16 - 31), y = Math.round(r.y * 0.16 - 46);
      block(c, x, y, Math.max(1, Math.round((r.x + r.w) * 0.16 - 31) - x),
        Math.max(1, Math.round((r.y + r.h) * 0.16 - 46) - y), r.fill);
    }
    if (costume) {
      const p = officialVariant(art.id).palette;
      costume.makeup.patches?.forEach((patch, i) => {
        const color = (p as unknown as Record<string, string>)[patch.color] ?? patch.color;
        // Native cheek/bridge markings stay away from the identifying eye accessories.
        if (i === 0) block(c, -3, -10, 6, 2, color);
        else { block(c, -22, -7, 7, 2, color); block(c, 15, -7, 7, 2, color); }
      });
      for (const name of costume.makeup.accessories ?? []) accessory(c, name, costume.colors.tag);
    }
  }, { x: 0.5, y: 56 / 72 });
}
function bodySprite(art: CatArt, costume: CostumeArt | undefined, frame: number, dash: boolean) {
  return cachedSprite(`pixel-body:${art.id}:${costume?.id ?? "plain"}:${frame}:${dash}`, 84, 42, 1, c => {
    c.translate(42, 35);
    const b = art.body, stride = [-2, 0, 2, 0][frame], accent = costume?.colors.tag ?? art.colors.hud;
    if (b.tailoring === "split-coat") {
      const look = { ...b, ...costume?.outfit.coat }, lean = dash ? 2 : 0,
        palette = { "#": INK, b: look.body, h: look.bodyEdge, s: look.fold,
          p: look.paw, l: look.pawEdge, a: look.arm, t: look.trim,
          c: look.cape, e: look.capeEdge, n: look.lining, f: b.tail };
      // The tail turns through small steps; the two dark pixels at the root
      // keep it behind the coat, instead of attaching a square pipe to its side.
      grid(c, [
        "..####............", ".#ffff#...........", "#ff##ff#..........",
        "#f#..#ff#.........", "#f#...#f#.........", "#f#...#f#.........",
        "#ff#..#f#.........", ".#ff##ff#.........", "..#fffff#.........",
        "...##fff##........", ".....#ffff###.....", "......##fffff####.",
        "........###ffffff#", "...........######.",
      ], palette, dash ? -34 : -29, dash ? -20 : -17, 1);
      // Legs are painted before the flared hem. Walk phases change both the
      // forward reach and sole height, while the screen anchor stays fixed.
      for (const side of [-1, 1]) {
        const dy = dash ? (side < 0 ? -2 : 0) : side * stride,
          x = (side < 0 ? -12 : 3) + (dash ? (side < 0 ? -4 : 4) : side * (frame === 1 ? 1 : frame === 3 ? -1 : 0));
        grid(c, [
          "...#####....", "..#ssssp#...", "..#spppp#...", ".#pplllpp#..",
          ".#plpppppp#.", "#pppppppppp#", "#pplllllppp#", ".##########.",
        ], palette, x, -6 + dy, 1);
      }
      // Back cloth has a separate silhouette and muted lining. The dash
      // stretches its stepped tip back without rotating the official head.
      grid(c, [
        ".........####", ".......##ccch", ".....##cccnnh", "...##ccccnnhh",
        "..#cccccnnnh.", ".#cccccnnnh..", "#cccccnnnh...", ".##cccnnh....",
        "...##nnh.....", ".....##......",
      ], palette, dash ? -27 : -22, dash ? -23 : -20, 1);
      // Scanline shoulders taper into a waist and separate into two coat
      // skirts. Larger contiguous shadow planes keep the tiny form legible.
      const edges = [
        [-11, 10], [-13, 12], [-15, 14], [-16, 15], [-17, 16],
        [-17, 16], [-16, 15], [-15, 14], [-14, 13], [-13, 12],
        [-12, 11], [-12, 11], [-11, 10], [-11, 10], [-12, 11],
        [-12, 12], [-13, 13], [-14, 14], [-15, 15], [-16, 16],
        [-17, 17], [-17, 17], [-16, 16], [-14, 14],
      ];
      edges.forEach(([left, right], row) => {
        const y = -28 + row, x = left + lean;
        block(c, x, y, right - left + 1, 1, INK);
        if (row > 0) {
          block(c, x + 1, y, right - left - 1, 1, look.body);
          block(c, x + 1, y, 2, 1, look.bodyEdge);
          block(c, right - 3 + lean, y, 3, 1, look.fold);
        }
        if (row >= 17) block(c, lean - 1, y, 2 + Math.floor((row - 17) / 2), 1, INK);
      });
      // An overlapping pair of tapered lapels, rather than parallel gold
      // bars. Their bottom points remain visible below the chin.
      grid(c, [
        "hhh........hhhh", ".hht......tbbh.", ".hhtt....tbbh..", "..hbtt..tbbh...",
        "...hbtttbbh....", "....hbttbh.....", ".....hbbh......", "......hh.......",
      ], palette, -8 + lean, -24, 1);
      block(c, -3 + lean, -17, 5, 5, look.bib);
      block(c, -1 + lean, -16, 1, 1, look.metal); block(c, -1 + lean, -13, 1, 1, look.metal);
      block(c, -10 + lean, -12, 20, 3, look.belt);
      block(c, -9 + lean, -12, 17, 1, look.lining);
      block(c, -2 + lean, -12, 5, 3, look.metal); block(c, -1 + lean, -11, 3, 1, look.fold);
      block(c, -11 + lean, -8, 5, 1, look.fold); block(c, 7 + lean, -8, 5, 1, look.fold);
      block(c, -13 + lean, -6, 7, 1, look.trim); block(c, 6 + lean, -6, 8, 1, look.bodyEdge);
      // Sleeves turn into cuffs and small paws; opposite walk phases move
      // the elbow horizontally as well as vertically, avoiding piston limbs.
      for (const side of [-1, 1]) {
        const dy = dash ? (side < 0 ? 2 : -2) : -side * stride,
          x = (side < 0 ? -21 : 13) + lean + (dash ? (side < 0 ? -2 : 3) : side * (frame % 2));
        const sleeve = [
          "...####..", "..#hhaa#.", ".#haaaa#.", ".#haaas#.", "#haaaas#.",
          "#haaass#.", "#haaass#.", ".#aaass#.", ".#aasst#.", "..#tttt#.",
          "..#pppp#.", "..#plppp#", "...#pppp#", "....####.",
        ];
        grid(c, side < 0 ? sleeve : sleeve.map(row => [...row].reverse().join("")), palette, x, -23 + dy, 1);
      }
    } else {
      const look = { ...b, ...costume?.outfit.tee }, lean = dash ? 2 : 0,
        palette = { "#": INK, b: look.body, h: look.bodyEdge,
          s: costume?.outfit.tee?.fold ?? "#cecac2", d: look.denim,
          e: look.denimEdge, n: "#344d69", p: look.paw, l: look.pawEdge,
          a: look.arm, f: b.tail };
      grid(c, [
        "..####............", ".#ffff#...........", "#ff##ff#..........",
        "#f#..#ff#.........", "#f#...#f#.........", "#ff#..#f#.........",
        ".#ff##ff#.........", "..#fffff#.........", "...##fff##........",
        ".....#ffff###.....", "......##fffff####.", "........###ffffff#",
        "...........######.",
      ], palette, dash ? -32 : -28, dash ? -20 : -16, 1);
      // Separate trouser legs tuck underneath the tee. Pocket welts and one
      // outside seam are enough to read denim without a stripe on every edge.
      for (const side of [-1, 1]) {
        const dy = dash ? (side < 0 ? -2 : 0) : side * stride,
          x = (side < 0 ? -12 : 2) + (dash ? (side < 0 ? -3 : 4) : side * (frame === 1 ? 1 : frame === 3 ? -1 : 0));
        const leg = [
          ".##########.", "#edddddddnn#", "#edddddddnn#", "#eddeddndnn#",
          "#eddeddndnn#", ".#ddddddnn#.", ".#edddddnn#.", ".#edddddnn#.",
          "..#eeeeen#..", "..#pppppp#..", ".#plllllpp#.", ".#ppppppppp#",
          "..#########.",
        ];
        grid(c, side < 0 ? leg : leg.map(row => [...row].reverse().join("")), palette, x, -10 + dy, 1);
      }
      block(c, -11 + lean, -12, 23, 3, look.denim);
      block(c, -10 + lean, -11, 21, 1, "#344d69");
      block(c, 0 + lean, -11, 2, 1, look.denimEdge);
      // Sloped shoulder lines and a slightly asymmetric lower hem make the
      // shirt drape over the waist instead of reading as a white signboard.
      const edges = [
        [-10, 9], [-12, 11], [-14, 13], [-15, 14], [-16, 15],
        [-16, 15], [-15, 14], [-14, 13], [-13, 12], [-13, 12],
        [-12, 12], [-12, 12], [-12, 11], [-13, 11], [-13, 12],
        [-12, 12], [-11, 11],
      ];
      edges.forEach(([left, right], row) => {
        const y = -28 + row;
        block(c, left + lean, y, right - left + 1, 1, INK);
        if (row > 0) {
          block(c, left + 1 + lean, y, right - left - 1, 1, look.body);
          block(c, left + 1 + lean, y, 1, 1, look.bodyEdge);
          if (row > 5) block(c, right - 2 + lean, y, 2, 1, palette.s);
        }
      });
      // Soft collar, one lower fold and a small shaped chest pocket. The
      // dark fold colour is limited to tiny occlusion marks, not outlines.
      grid(c, ["hhsssssshh", ".hhsssshh.", "..hhhhhh.."], palette, -5 + lean, -26, 1);
      grid(c, ["sssss", "hbbbs", "hbbbs", ".hbs.", "..s.."], palette, 4 + lean, -21, 1);
      block(c, -10 + lean, -16, 2, 1, palette.s); block(c, -8 + lean, -15, 4, 1, palette.s);
      block(c, -10 + lean, -13, 13, 1, palette.s); block(c, 3 + lean, -14, 6, 1, palette.s);
      // The short sleeve joins the shoulder and exposes a bent forearm;
      // hand and cuff silhouettes advance with the opposite walking leg.
      for (const side of [-1, 1]) {
        const dy = dash ? (side < 0 ? 2 : -2) : -side * stride,
          x = (side < 0 ? -21 : 13) + lean + (dash ? 0 : side * (frame % 2));
        const arm = [
          "...####..", "..#hbbb#.", ".#hbbbb#.", ".#hbbbs#.", ".#hbbss#.",
          "..#sss#..", "..#aaa#..", "..#alp#..", ".#alpp#..", ".#alpp#..",
          ".#lpppp#.", "..#pppp#.", "...####..",
        ];
        grid(c, side < 0 ? arm : arm.map(row => [...row].reverse().join("")), palette, x, -23 + dy, 1);
      }
    }
    if (costume) {
      // Preserve outfit functions with a native vocabulary: back garment, hand tool,
      // waist/front badge and underfoot board, selected from the existing part layers.
      for (const [i, part] of costume.outfit.parts.entries()) {
        if (part.layer === "under") { rimBox(c, -28, 1, 56, 4, LIGHT, accent); block(c, -7, 5, 20, 2, accent); }
        else if (part.layer === "back") { rimBox(c, -23, -27, 9, 23, accent); block(c, -22, -23, 5, 2, costume.colors.ink); }
        else if (part.layer === "hand") {
          rimBox(c, 20, -18, 10, 14, costume.colors.tag, costume.colors.ink);
          block(c, 23, -14, 4, 2, costume.colors.ink); block(c, 23 + i % 2, -10, 3, 2, INK);
        } else { rimBox(c, -4 + (i % 2) * 7, -20, 6, 7, accent, costume.colors.ink); }
      }
    }
  }, { x: 0.5, y: 35 / 42 });
}
export function pixelCatArt(art: CatArt): CatArt {
  const draw = (ctx: Ctx, pose: CatPose) => {
    const costume = costumeArtOf(pose.costume), reduced = reducedPaperMotion(),
      frame = !reduced && pose.moving ? Math.floor(pose.time * 9) % 4 : 0,
      scale = (pose.scale ?? 0.16) / 0.16, bob = frame % 2 && !pose.dashing ? -1 : 0;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(pose.x), Math.round(pose.y)); ctx.scale(pose.facing * scale, scale);
    ctx.globalAlpha *= pose.decoy ? 0.35 : pose.hurt ? 0.7 : 1;
    shadow(ctx, 16);
    bodySprite(art, costume, frame, pose.dashing).draw(ctx, { x: 0, y: bob });
    headSprite(art, costume).draw(ctx, { x: pose.dashing ? 2 : 0, y: -22 + bob });
    if (pose.wear?.marks) {
      block(ctx, -10, -16, 4, 2, INK); if (pose.wear.marks > 1) block(ctx, 6, -12, 3, 3, INK);
    }
    if (pose.wear?.tape) { ctx.globalAlpha *= pose.wear.tape; block(ctx, 6, -19, 7, 3, "#d5c798"); }
    ctx.restore();
  };
  const adapted: CatArt = { ...art, draw,
    skillPreview(ctx, pose) {
      const dash = art.body.tailoring === "split-coat";
      if (!dash) {
        ctx.save(); ctx.globalAlpha *= 0.55;
        for (let i = 0; i < 24; i++) {
          const a = i * Math.PI * 2 / 24;
          block(ctx, pose.x + Math.cos(a) * 44, pose.y - 16 + Math.sin(a) * 24, 4, 3, art.colors.tone);
        }
        ctx.restore();
        grid(ctx, ["..##..", ".###..", "####..", "####..", ".###..", "..##.."], { "#": art.colors.hud }, pose.x + 28, pose.y - 48, 2);
      }
      adapted.draw(ctx, { ...pose, dashing: dash });
    },
    portrait(ctx, pose, scale) {
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(pose.x), Math.round(pose.y));
      ctx.scale(pose.facing * scale / 0.16, scale / 0.16);
      headSprite(art, costumeArtOf(pose.costume)).draw(ctx, { x: 0, y: 0 }); ctx.restore();
    },
    heroAura(ctx, x, y) {
      ctx.save(); ctx.globalAlpha *= 0.3;
      for (let i = 0; i < 5; i++) {
        block(ctx, x - 52 + i * 24, y - 4 - (i % 2) * 8, 12, 3, art.colors.hud);
        block(ctx, x - 48 + i * 24, y - 20 - (i % 2) * 8, 3, 6, art.colors.hud);
      }
      ctx.restore();
    },
    skillIcon(ctx, kind) {
      const color = art.colors.icon;
      if (kind === "attack") for (let i = 0; i < 6; i++) block(ctx, 5 + i * 3, 24 - i * 3, 5, 3, color);
      else if (kind === "active") for (let i = 0; i < 3; i++) {
        block(ctx, 5 + i * 7, 8, 4, 4, color); block(ctx, 8 + i * 7, 12, 4, 8, color); block(ctx, 5 + i * 7, 20, 4, 4, color);
      } else grid(ctx, ["..##..", ".####.", "######", ".####.", "..##.."], { "#": color }, 4, 6, 4);
    },
  };
  return adapted;
}

const ENEMY_GRIDS: Readonly<Record<string, readonly string[]>> = {
  "ink-blob": ["....######....", "..##llllll##..", ".#llllllllll#.", "#llmmmmmmmlll#", "#lmmWWmmWWmll#", "#mmmWWmmWWmmm#", "#mmmmmmmmmmmm#", ".#mmmmm##mmmm#", ".#mmmmmmmmmm#.", "..###mmm###...", ".##..###..##.."],
  "paper-bat": ["#......................#", "##........##..........##", "#l##.....#ll#.......##l#", "#lll##..#llll#....##lll#", ".#llll###lWWl###lllll#.", "..#lmmmm#lWWl#mmmml#..", "...##mmm#mmmm#mmm##...", ".....#mm#mmmm#mm#.....", "......##.####.##......", ".........#..#........."],
  crumple: [".....####.....", "..###llll##...", ".#lllllmmmll#.", "#llllmmllllll#", "#llmmllllmmll#", "#lmlWllWllmll#", "#mmllmllllmll#", "#lmmmllllmmll#", ".#lllmmmllll#.", ".#mmllllmmm#..", "..##llllll#...", "....######...."],
  smudge: ["......########......", "...###llllllll###...", ".##llmmmmmmmmllll##.", "#lllmmWWmmmmWWmmlll#", "#mmmmmWWmmmmWWmmmmm#", ".#mmmmmmmmmmmmmmmm#.", "..##mmmmm##mmmmm##..", "###.############.###"],
  "kiro-ghost": [".....######.....", "...##llllll##...", "..#llllllllll#..", ".#llllllllllll#.", "#lllmmmmmmlllll#", "#lllWWllWWlllll#", "#lllWWllWWlllll#", "#llllllllllllll#", ".#lllllmmllllll#", ".#lllllllllllll#", "#lllllllllllll#.", "#lll##lll##lll#.", ".###..###..###.."],
  wash: [".......##.......", "......#ll#......", ".....#llll#.....", "....#llllll#....", "...#llllllll#...", "..#lllWWWWlll#..", ".#llllWllWllll#.", "#lllllWWWWlllll#", "#llmmllllllmmll#", "#lmmmmWWWWmmmml#", ".#mmmmmmmmmmmm#.", "..#mmmmmmmmmm#..", "...##########..."],
  sketch: ["..##......##..", ".#ll#....#ll#.", "#llll####llll#", "#llllmllmllll#", "#llWWllllWWll#", "#llWmllllmWll#", "#llllmmmmllll#", ".#llllmmllll#.", "..#llllllll#..", "..##llllll##..", ".#..######..#."],
};
const ENEMY_COLORS: Readonly<Record<string, readonly [string, string, string]>> = {
  "ink-blob": ["#675487", "#3a345b", "#edc973"], "paper-bat": ["#a981aa", "#614b7f", "#ffd681"],
  crumple: ["#d6d3ba", "#849795", "#243344"], smudge: ["#976280", "#51334f", "#f5bd72"],
  "kiro-ghost": ["#faf2e5", "#a591d4", "#7135bb"], wash: ["#86c9cd", "#39798b", "#26374d"],
  sketch: ["#d8d0ae", "#81908f", "#364555"],
};
function enemySprite(art: EnemyArt, frame: number, attack: boolean) {
  const wash = liveSketchStep();
  return cachedSprite(`pixel-enemy:${art.id}:${frame}:${attack}:${wash}`, 104, 112, 1, c => {
    c.translate(52, 104);
    if (art.id === "eraser-boss") {
      block(c, -30, -85, 60, 73, INK); block(c, -26, -88, 52, 8, INK);
      block(c, -26, -84, 52, 68, wash ? "#bbb9aa" : "#c88592"); block(c, -22, -83, 42, 12, wash ? "#ddd7bc" : "#e8b0b5");
      block(c, 18, -72, 8, 51, wash ? "#787e79" : "#99657e");
      rimBox(c, -29, -58, 58, 35, wash ? "#717f83" : "#4a6c8d", "#9cb8c7");
      block(c, -22, -52, 44, 3, "#7f9fb4"); block(c, -22, -32, 44, 2, "#243f60");
      for (const x of [-15, 5]) { block(c, x, -69, 10, 7, INK); block(c, x + 2, -68, 4, 2, "#ffd782"); }
      block(c, -9, -39, 18, 3, LIGHT); block(c, -5, -43, 10, 11, LIGHT);
      // Worn eraser bevel and a stitched sleeve: broad material planes first,
      // then restrained one-pixel edges and label lettering.
      block(c, -24, -81, 2, 19, "#f2c5c1"); block(c, -21, -84, 37, 1, "#f5d4c8");
      block(c, 24, -78, 2, 17, "#83596f"); block(c, -24, -61, 48, 2, "#a66e83");
      block(c, -25, -56, 1, 29, "#b6c8cb"); block(c, 25, -55, 2, 29, "#2f4c6a");
      block(c, -21, -49, 42, 1, "#345474"); block(c, -21, -28, 42, 1, "#8fa6b5");
      for (let i = 0; i < 7; i++) {
        block(c, -19 + i * 6, -54, 2, 1, "#c2cdd1");
        block(c, -19 + i * 6, -26, 2, 1, "#263e58");
      }
      block(c, -18, -44, 4, 1, "#b7cad1"); block(c, -18, -42, 3, 1, "#b7cad1");
      block(c, 14, -38, 4, 1, "#b7cad1"); block(c, 15, -36, 3, 1, "#b7cad1");
      block(c, -2, -42, 2, 8, "#fff6dc"); block(c, -7, -38, 14, 1, "#d7c49c");
      block(c, -7, -62, 14, 1, "#724b61"); block(c, -4, -61, 8, 1, "#f0bec0");
      for (const side of [-1, 1]) {
        rimBox(c, side < 0 ? -40 : 27, -44 - (attack ? 8 : frame * 2), 13, 25, "#b2758a");
        rimBox(c, side < 0 ? -24 : 6, -15 + side * (frame ? 2 : -2), 18, 13, "#35475d");
        const handX = side < 0 ? -40 : 27, handY = -44 - (attack ? 8 : frame * 2),
          bootX = side < 0 ? -24 : 6, bootY = -15 + side * (frame ? 2 : -2);
        block(c, handX + 2, handY + 3, 2, 14, "#d49aa1");
        block(c, handX + 3, handY + 19, 7, 1, "#795369");
        block(c, handX + 6, handY + 20, 1, 3, "#795369");
        block(c, bootX + 3, bootY + 3, 10, 2, "#627c91");
        block(c, bootX + 2, bootY + 10, 14, 1, "#192b40");
      }
      if (attack) { block(c, -16, -74, 12, 3, "#f3765c"); block(c, 5, -74, 12, 3, "#f3765c"); }
      return;
    }
    const rows = ENEMY_GRIDS[art.id] ?? ENEMY_GRIDS["ink-blob"], colors = wash >= 1 ? ["#d8d0ae", "#81908f", "#364555"] : wash > 0 ? ["#afa99e", "#6d7580", "#d8c99d"] : ENEMY_COLORS[art.id] ?? ENEMY_COLORS["ink-blob"],
      width = Math.max(...rows.map(row => row.length)) * 2;
    const ox = -width / 2, oy = -rows.length * 2 - (frame ? 1 : 0);
    grid(c, rows, { "#": INK, l: colors[0], m: colors[1], W: colors[2] }, ox, oy);
    // Resolve the two-pixel silhouette into single-pixel bevels at material
    // boundaries. These follow form, never scatter random texture over a face.
    const glint = wash ? "#e8dfc9" : art.id === "wash" ? "#d6f0df" : art.id === "kiro-ghost" ? "#fffdf0" : "#c8b7c3";
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const cell = row[i], x = ox + i * 2, y = oy + j * 2;
        if (cell === "l") {
          if (j > 0 && rows[j - 1][i] === "#") block(c, x, y, 2, 1, glint);
          if (row[i + 1] === "#") block(c, x + 1, y, 1, 2, colors[1]);
          if (rows[j + 1]?.[i] === "m") block(c, x, y + 1, 2, 1, colors[1]);
        } else if (cell === "W" && row[i - 1] !== "W") {
          // Upper catchlight and lower pupil distinguish eyes from flat squares.
          if (rows[j - 1]?.[i] !== "W") block(c, x, y, 1, 1, LIGHT);
          if (rows[j + 1]?.[i] !== "W") block(c, x + 1, y + 1, 1, 1, INK);
        }
      }
    });
    if (art.id === "paper-bat") {
      // Long membrane ribs connect the shoulder to stepped wing tips.
      for (const side of [-1, 1]) for (let i = 0; i < 5; i++)
        block(c, side < 0 ? -20 + i * 3 : 18 - i * 3, oy + 5 + i * 2, 2, 1, colors[1]);
      block(c, -2, oy + 13, 1, 2, LIGHT); block(c, 2, oy + 13, 1, 2, LIGHT);
    } else if (art.id === "wash") {
      block(c, -7, oy + 10, 2, 5, glint); block(c, -8, oy + 16, 1, 3, glint);
      block(c, 6, oy + 20, 3, 1, colors[0]);
    } else if (art.id === "kiro-ghost") {
      block(c, -10, oy + 8, 1, 6, glint); block(c, -2, oy + 18, 4, 1, colors[1]);
      block(c, -1, oy + 19, 2, 2, colors[1]);
    } else if (art.id === "ink-blob" || art.id === "smudge") {
      block(c, -8, oy + 4, 5, 1, glint); block(c, -10, oy + 5, 2, 2, glint);
    }
    if (art.id === "paper-bat" && frame) {
      block(c, -24, -23, 9, 3, colors[0]); block(c, 15, -23, 9, 3, colors[0]);
    }
    if (attack) { block(c, -7, -rows.length * 2 - 4, 14, 2, "#f18e66"); }
  }, { x: 0.5, y: 104 / 112 });
}
export function pixelEnemyArt(art: EnemyArt): EnemyArt {
  const effects: Record<string, EffectPainter> = {};
  for (const kind of Object.keys(art.effects ?? {})) effects[kind] = (ctx, e, { fade, ease }) => {
    const k = reducedPaperMotion() ? 0.35 : ease, count = kind === "boss-down" ? 16 : 8,
      reach = kind === "boss-down" ? 80 : kind === "summon" ? 40 : 24;
    ctx.save(); ctx.globalAlpha *= fade;
    if (kind === "erase") {
      ctx.globalAlpha *= 0.5; block(ctx, e.x - 26 - k * 40, e.y - 10, 52 + k * 80, 20, LIGHT); ctx.globalAlpha *= 2;
    }
    for (let i = 0; i < count; i++) {
      const a = i * Math.PI * 2 / count, r = 6 + k * reach;
      rimBox(ctx, e.x + Math.cos(a) * r, e.y - (kind === "boss-down" ? 20 : 4) + Math.sin(a) * r * 0.6, 4, 3,
        art.dissolve.flakes[i % art.dissolve.flakes.length]);
    }
    ctx.restore();
  };
  return { ...art, effects, ground: art.ground ? (ctx, e) => {
    ctx.save(); ctx.globalAlpha *= 0.35;
    block(ctx, e.x - 10, e.y - 1, 20, 3, art.dissolve.flakes[0]); ctx.restore();
  } : undefined, draw(ctx, e, time) {
    const frame = reducedPaperMotion() || (e.stun ?? 0) > 0 ? 0 : Math.floor(time * 7 + e.id % 2) % 2,
      attack = (e.windup ?? 0) > 0 || !!e.act && e.act.t > 0;
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(e.x), Math.round(e.y));
    if (e.spawnTime > 0) {
      ctx.globalAlpha *= 0.6;
      rimBox(ctx, -12, -3, 24, 5, art.dissolve.flakes[0] ?? LIGHT);
      block(ctx, -17, -1, 3, 3, LIGHT); block(ctx, 14, -1, 3, 3, LIGHT);
    } else {
      shadow(ctx, art.id === "eraser-boss" ? 30 : 13);
      enemySprite(art, frame, attack).draw(ctx, { x: 0, y: 0 });
      const max = enemyMaxHp(e);
      if (e.hp < max) { block(ctx, -13, 4, 26, 3, INK); block(ctx, -12, 5, Math.max(1, 24 * Math.max(0, e.hp) / max), 1, "#d3a4bf"); }
    }
    ctx.restore();
  } };
}

export function pixelTownsfolkArt(art: TownsfolkArt): TownsfolkArt {
  return { ...art, paint(c, facing, frame) {
    c.save(); c.imageSmoothingEnabled = false; c.scale(facing, 1);
    const step = frame ? 1 : -1;
    if (art.id === "lamplighter-mouse") {
      block(c, -20, -12, 13, 3, "#9a9292"); block(c, -21, -17, 3, 7, "#9a9292");
      rimBox(c, -9, -26, 18, 23, "#496e8b"); block(c, -7, -25, 14, 3, "#dcc79f");
      rimBox(c, -9, -39, 19, 14, "#a69c94"); rimBox(c, -10, -46, 8, 9, "#c49b97"); rimBox(c, 3, -47, 8, 9, "#c49b97");
      block(c, 9, -34, 7, 6, "#a69c94"); block(c, 14, -32, 3, 3, INK); block(c, 5, -36, 2, 3, INK);
      block(c, 17, -48, 2, 42, "#805f3e"); block(c, 17, -49, 7, 2, "#805f3e");
      rimBox(c, 20, -43, 6, 10, "#eec15a"); block(c, 21, -41, 2, 5, "#fff0a4");
    } else if (art.id === "stargazer-owl") {
      grid(c, ["#........#", "##......##", "#l######l#", "#llllllll#", "#lWWllWWl#", "#lW#ll#Wl#", "#lllmmlll#", "#llllmlll#", "#lWWWWWll#", "#lWWWWWll#", ".#llllll#.", "..######.."], { "#": INK, l: "#987552", m: "#ddb664", W: "#e0cca6" }, -10, -38, 2);
      for (let i = 0; i < 6; i++) rimBox(c, 7 + i * 2, -14 - i * 2, 5, 5, "#5c83a1", "#c4a15b");
    } else {
      rimBox(c, -11, -23, 23, 18, "#789f73"); rimBox(c, -13, -31, 26, 12, "#8eb17d");
      rimBox(c, -10, -35, 7, 7, "#adc990"); rimBox(c, 5, -35, 7, 7, "#adc990");
      block(c, -8, -33, 2, 3, INK); block(c, 7, -33, 2, 3, INK); block(c, -5, -24, 13, 2, INK);
      block(c, -15, -38, 31, 3, "#d0b16c"); rimBox(c, -8, -44, 18, 7, "#d0b16c");
      block(c, -5, -17, 12, 9, "#c5d5a1");
    }
    rimBox(c, -9, -4 + step, 8, 5, "#6c624f"); rimBox(c, 2, -4 - step, 8, 5, "#6c624f");
    c.restore();
  } };
}
export function pixelCostumeArt(art: CostumeArt): CostumeArt {
  const ticket = (c: Ctx) => {
    cachedSprite(`pixel-costume-ticket:${art.id}`, 32, 32, 1, p => {
      rimBox(p, 3, 3, 26, 26, art.colors.tag, art.colors.ink);
      const motif = art.makeup.accessories?.[0] ?? "sun";
      const rows = motif.includes("glasses") || motif === "goggles"
        ? [".###.###.", "#..###..#", "#..#.#..#", ".##...##."]
        : motif.includes("hat") || motif === "cap" || motif === "bowler"
          ? ["...###...", "..#####..", ".#######.", "#########"]
          : motif === "headphones"
            ? ["..#####..", ".#.....#.", "##.....##", "##.....##"]
            : motif === "pencil-ear"
              ? ["......##.", "....####.", "..####...", ".###....."]
              : ["....#....", "..#####..", "#########", "..#####..", "....#...."];
      grid(p, rows, { "#": art.colors.ink }, 7, 10, 2);
      block(p, 9, 24, 14, 2, art.colors.ink);
    }).draw(c, { x: 0, y: 0 });
  };
  const outfit = { ...art.outfit, parts: art.outfit.parts.map(part => ({ ...part,
    paint(c: Ctx) {
      const [l, t, r, b] = part.box, w = Math.max(3, Math.round((r - l) * 0.55)), h = Math.max(3, Math.round((b - t) * 0.65)),
        x = Math.round((l + r - w) / 2), y = Math.round((t + b - h) / 2);
      rimBox(c, x, y, w, h, art.colors.tag, art.colors.ink);
      block(c, x + 2, y + 3, Math.max(1, w - 4), 2, art.colors.ink);
    },
  })) };
  return { ...art, outfit, ticket, preview(ctx) {
    ctx.save(); ctx.translate(-16, -28); ticket(ctx); ctx.restore();
  } };
}
