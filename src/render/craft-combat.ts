import { FX, glyph, burst, rect as pxRect, line as pxLine } from "./pixel-vfx.js";
import { reducedPaperMotion } from "./paper-motion.js";
import { piece, path, oval, stroke, line, glow, mix, type Ctx, } from "./paper-material.js";
import { PAPER_STOCK, PAPER_VALUE } from "./paper-rules.js";
import { cachedSprite } from "../engine/sprite.js";
import { crease, flatCut, flatLayer, foldLine, tornEdge } from "./paper-kit.js";
import { backSide } from "./paper-scraps.js";
import { enemyPart, enemyShadow } from "./craft-enemies.js";
/** Static weapon cuts: placement, rotation and flight never participate in the key. */
export function combatPart(key: string, w: number, h: number, paint: (ctx: Ctx) => void) {
    return cachedSprite(`combat-part:${key}`, w, h, 2, (ctx) => {
        ctx.translate(w / 2, h / 2);
        paint(ctx);
    }, { x: 0.5, y: 0.5 });
}
/**
 * A player shot cut: a dark paper outline, then one solid flat colour (no
 * glow, no translucency), so shots read against ground, decor and ink.
 */
export function shotCut(ctx: Ctx, p: Path2D, color: string): void {
    const o = PAPER_VALUE.shotOutline;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.globalAlpha *= o.alpha;
    ctx.strokeStyle = o.color;
    ctx.lineWidth = o.width * 1.6;
    ctx.stroke(p);
    ctx.restore();
    ctx.fillStyle = color;
    ctx.fill(p);
}
export function paperFleck(ctx: Ctx, x: number, y: number, size: number, color: string, angle = 0, back = false): void {
    pxRect(ctx, x - size / 2, y - size / 2, Math.max(2, size), Math.max(2, size), color);
}
/** A pressed valley and a hinged paper lip; phase follows the existing hit lifetime. */
export function paperDent(ctx: Ctx, x: number, y: number, size: number, phase: number, angle = 0): void {
    burst(ctx, x, y, phase, size, FX.cream, 4);
}
/** One dark dyed cut, creased toward the moon and pooled along the foot. */
function inkBlobSheet(v: number) {
    return enemyPart(`ink-body:${v}`, 56, 52, (c) => {
        const crown = (v - 1) * 2, foot = 3 - v * 2;
        const cut = new Path2D();
        cut.moveTo(crown, -17);
        cut.bezierCurveTo(9 + crown, -17.8, 15, -9, 15.2, -2);
        cut.quadraticCurveTo(15.4, 2.8, 17.3, 6);
        cut.quadraticCurveTo(17.8, 9.7, 12, 9.2);
        cut.lineTo(8.4, 8.6);
        cut.quadraticCurveTo(foot + 4, 10, foot + 2, 11.4);
        cut.quadraticCurveTo(foot - 0.4, 12.4, foot - 2, 9.8);
        cut.lineTo(-7, 10.6);
        cut.quadraticCurveTo(-15.7, 11.1, -17, 6);
        cut.bezierCurveTo(-16.4, 1.7, -15.6, -13.8, crown, -17);
        cut.closePath();
        flatLayer(c, { shape: cut, color: ["#4b3b61", "#493956", "#514063"][v]!, rim: "#9b84b4", texture: 0.43, lift: 0.8, thickness: 1.3 });
        // Two broad facets share the dyed face. The darker one curves into the trailing drip.
        c.save();
        c.clip(cut);
        c.fillStyle = "#32263f";
        c.fill(path([[-14.5, 3], [-9.2, 0], [-3, 4.2], [5.1, 5.3], [12.6, 2.6],
            [15.1, 6.5], [8.4, 8.3], [foot + 2, 10.8], [-7, 9.6], [-13.6, 7.3]], true));
        c.fillStyle = "#625078";
        c.fill(path([[crown, -15.1], [7.8, -14.3], [12.8, -9.5], [13.7, -4.4], [8.2, -7], [5.2, -11.6]]));
        crease(c, crown + 1.2, -14.5, 11.4, -6.4, 0.34);
        line(c, foot - 1, 7.4, foot + 1.8, 8.1, "#88719a", 0.6, 0.56);
        c.restore();
        for (const dx of [-5, 5])
            flatLayer(c, { shape: oval(dx, -3.5, 1.9, 2.3), color: "#f0c16d", rim: "#ffe1a0", lift: 0.3, texture: 0.1 });
        stroke(c, new Path2D(v === 2 ? "M -3 2 Q 0 -1 3 2" : "M -3.5 1 L -1.5 2.6 L 0 1.2 L 1.5 2.6 L 3.5 1"), "#d6c8e6", 0.7, 0.85);
    }, false); // The dyed cut has its own coloured rim.
}
/** A separate ink splash on the ground beside the blob (finite variants). */
function inkSpot(v: number) {
    return enemyPart(`ink-spot:${v}`, 22, 14, (c) => {
        flatLayer(c, { shape: oval(0, 0, 5 + v, 2.6, v + 41, 0.4), color: "#241d36", rim: "#5d4f80", lift: 0, texture: 0.3 });
    }, false);
}
export function drawCraftBlob(ctx: Ctx, x: number, y: number, time: number, id = 0, hp = 3, slowed = false, spawnTime = 0): void {
    if (spawnTime > 0) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        stroke(ctx, oval(x, y, 7 + (0.65 - spawnTime) * 15, 3), "#9d7ca9", 1);
        ctx.restore();
        return;
    }
    enemyShadow(ctx, x + 1, y, 15, 4.2);
    const v = Math.abs(id) % 3, beat = Math.sin(time * 3 + id), cy = y - 9 + beat * 0.8;
    inkSpot(v).draw(ctx, { x: x + (v - 1) * 9 + 11, y: y + 2 });
    // The soaked sheet sags and swells; feet stay on the ground.
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 + beat * 0.035, 1 - beat * 0.045);
    ctx.translate(-x, -y);
    inkBlobSheet(v).draw(ctx, { x, y: cy });
    ctx.restore();
    if (slowed)
        stroke(ctx, new Path2D(`M ${x - 7} ${y + 3} Q ${x} ${y + 6} ${x + 7} ${y + 3}`), "#b5c9d6", 1);
    if (hp < 3) {
        line(ctx, x - 10, y + 7, x + 10, y + 7, "#433b4a", 1.5);
        line(ctx, x - 10, y + 7, x - 10 + (hp / 3) * 20, y + 7, "#b69ac4", 1.5);
    }
}
export function drawCraftShot(ctx: Ctx, x: number, y: number, vx: number, vy: number, empowered = false, echo = false): void {
    const a = Math.atan2(vy, vx), color = echo ? FX.blue : FX.gold;
    pxLine(ctx, x - Math.cos(a) * 18, y - Math.sin(a) * 18, x, y, color, empowered ? 5 : 3);
    pxRect(ctx, x - 2, y - 2, 4, 4, FX.cream);
}
/** A brief clipped-paper impact, keeping the centre open enough to read the target. */
export function drawPaperImpact(ctx: Ctx, impact: {
    x: number;
    y: number;
    life: number;
    kind: "hit" | "defeat";
}): void {
    const t = Math.max(0, Math.min(1, 1 - impact.life / (impact.kind === "defeat" ? .32 : .16)));
    burst(ctx, impact.x, impact.y, t, impact.kind === "defeat" ? 26 : 12, FX.gold, impact.kind === "defeat" ? 8 : 4);
}
/** A paper-moon crescent with cut edge, thickness and contact shadow. */
export function crescent(cx: number, cy: number, r: number, rot: number): Path2D {
    const pts: [
        number,
        number
    ][] = [], c = Math.cos(rot), s = Math.sin(rot), put = (x: number, y: number) => pts.push([cx + x * c - y * s, cy + x * s + y * c]);
    for (let a = -2.3; a <= 2.3; a += 0.23)
        put(Math.cos(a) * r, Math.sin(a) * r);
    for (let b = 1.97; b >= -1.97; b -= 0.25)
        put(-0.35 * r + Math.cos(b) * 0.81 * r, Math.sin(b) * 0.81 * r);
    return path(pts);
}
export function drawInkShard(ctx: Ctx, x: number, y: number, time: number, id: number, value = 1): void {
    if (value <= 1) {
        // Ordinary drops read as small ground chips. Save the bright raised
        // crescent for richer drops, especially when a field is full of ink.
        pxRect(ctx, x - 2, y, 5, 2, FX.dark);
        pxRect(ctx, x - 1, y - 3, 3, 4, "#af965f");
        pxRect(ctx, x - 1, y - 3, 2, 1, "#dac389");
        return;
    }
    const lift = reducedPaperMotion() ? 8 : 8 + Math.floor(Math.sin(time * 4 + id) * 2);
    pxRect(ctx, x - 4, y, 8, 2, FX.dark);
    glyph(ctx, 'moon', x, y - lift, 4 + Math.min(3, value - 1), FX.gold);
}
