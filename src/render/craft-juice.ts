/** Native pixel feedback and pickups. Simulation and lifetimes are read-only. */
import { reducedPaperMotion } from './paper-motion.js';
import { EFFECT_LIFE, type ChestState, type Impact, type InteractState, type SimState, type TreatState, type EnemyState, type PickupState } from '../game/types.js';
import { enemyRadius } from '../game/sim.js';
import { PUMPKIN } from '../game/interactions.js';
import { LANDMARK_DEFS } from '../defs/registries.js';
import type { LandmarkPlace } from '../defs/types.js';
import { landmarkActivityPoint } from '../defs/landmark-activities.js';
import type { Ctx } from './pixel-art.js';
import { FX, glyph, rect, line, burst, pixelRing as ring, stamp } from './pixel-vfx.js';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export function cameraShake(sim: SimState, time: number, reduced: boolean): {
    x: number;
    y: number;
} {
    if (reduced)
        return { x: 0, y: 0 };
    let amp = 0;
    for (const e of sim.impacts) {
        if (e.kind === "hurt")
            amp = Math.max(amp, (e.life / 0.35) * 4);
        else if (e.kind === "evolve")
            amp = Math.max(amp, (e.life / EFFECT_LIFE.evolve) * 3);
        else if (e.kind === "erase")
            amp = Math.max(amp, (e.life / 0.6) * 4.5);
        else if (e.kind === "boss-down")
            amp = Math.max(amp, (e.life / 1.6) * 5);
        else if (e.kind === "moon-stun")
            amp = Math.max(amp, (e.life / EFFECT_LIFE["moon-stun"]) * 2.5);
    }
    for (const e of sim.enemies)
        if (e.kind === "eraser-boss" && e.act?.kind === "charge" && e.act.t <= 0 && e.act.run > 0)
            amp = Math.max(amp, 2);
    if (amp < 0.05)
        return { x: 0, y: 0 };
    amp = Math.min(amp, 5);
    return {
        x: Math.sin(time * 73) * amp * 0.8 + Math.sin(time * 41) * amp * 0.3,
        y: Math.cos(time * 67) * amp * 0.6,
    };
}
export function drawHitFlash(ctx: Ctx, e: EnemyState): void { const f = Math.min(1, (e.hitFlash ?? 0) / .14); if (f <= 0)
    return; const r = enemyRadius(e); ctx.save(); ctx.globalAlpha *= f; for (const side of [-1, 1]) {
    line(ctx, e.x + side * r * .5, e.y - r, e.x + side * r, e.y - r - 6, FX.cream, 2);
    rect(ctx, e.x + side * r, e.y - r + 2, 3, 3, FX.gold);
} ctx.restore(); }
export function drawStun(ctx: Ctx, e: EnemyState, time: number): void { if ((e.stun ?? 0) <= 0)
    return; const r = enemyRadius(e); for (let i = 0; i < 3; i++) {
    const a = (reducedPaperMotion() ? 0 : time * 3) + i * Math.PI * 2 / 3;
    glyph(ctx, 'star', e.x + Math.cos(a) * r * .9, e.y - r * 2.1 + Math.sin(a) * 3, 3, FX.blue);
} }
export function drawShardTrail(ctx: Ctx, s: PickupState, sim: SimState, reach: number, time: number): void { if (Math.hypot(s.x - sim.player.x, s.y - sim.player.y) > reach)
    return; rect(ctx, s.x - 2, s.y - 3, 2, 2, FX.gold); }
export function drawInteractGround(ctx: Ctx, sim: SimState, _time: number): void { for (const o of sim.interactables) {
    if (o.kind === 'pumpkin' && o.lit > 0) {
        ctx.save();
        ctx.globalAlpha *= .55 * Math.min(1, o.lit / .6);
        ring(ctx, o.x, o.y, PUMPKIN.auraRadius, FX.gold, .55);
        ctx.restore();
    }
    else if (o.kind === 'lantern' && o.charge >= 1)
        ring(ctx, o.x, o.y, 22, FX.blue, .45);
} }
export function drawLandmarkActivity(ctx: Ctx, sim: SimState, landmark: LandmarkPlace): void {
    const activity = LANDMARK_DEFS.find(landmark.kind)?.activity, point = landmarkActivityPoint(landmark);
    if (!activity || Math.hypot(sim.player.x - point.x, sim.player.y - point.y) > activity.radius + 80)
        return;
    const state = sim.landmarkEvents?.[landmark.id], cooling = (state?.cooldown ?? 0) > 0, progress = cooling ? 1 - (state?.cooldown ?? 0) / Math.max(0.01, activity.cooldown)
        : (state?.progress ?? 0) / Math.max(0.01, activity.seconds), color = cooling ? "#8b91a1" : activity.element ? "#a7c9cb" : "#e0c68f", x = point.x, y = point.y + activity.radius * 0.4;
    ctx.save();
    ctx.globalAlpha *= cooling ? 0.35 : 0.65;
    ring(ctx, point.x, point.y, activity.radius, color, 1, 1);
    ctx.globalAlpha *= 0.9;
    ring(ctx, x, y, 9, "#3c3546");
    ring(ctx, x, y, 9, color, 1, clamp01(progress));
    glyph(ctx, 'star', x, y, cooling ? 3 : 4, color);
    ctx.restore();
}
export function drawInteractable(ctx: Ctx, o: InteractState, _time: number): void { if (o.kind === 'pumpkin') {
    if (o.lit > 0) {
        rect(ctx, o.x - 8, o.y - 17, 4, 3, FX.cream);
        rect(ctx, o.x + 4, o.y - 17, 4, 3, FX.cream);
    }
    else if (o.cooldown > 0)
        ring(ctx, o.x, o.y - 35, 5, FX.gold, 1, 1 - o.cooldown / PUMPKIN.recharge);
    else
        glyph(ctx, 'flame', o.x, o.y - 36, 4, FX.gold);
}
else {
    glyph(ctx, 'moon', o.x + 15, o.y - 66, 6, o.charge >= 1 ? FX.cream : FX.shade);
    rect(ctx, o.x + 8, o.y - 56, 14, 3, FX.dark);
    if (o.charge > 0)
        rect(ctx, o.x + 8, o.y - 56, 14 * Math.min(1, o.charge), 3, FX.blue);
} }
export function drawTreat(ctx: Ctx, t: TreatState, time: number): void { if (!reducedPaperMotion() && t.life < 3 && Math.floor(time * 8) % 2 === 0)
    return; stamp(ctx, ['..1111..1', '12222211.', '123222111', '.11111..1'], t.x - 9, t.y - 12, FX.blue, 2); glyph(ctx, 'heart', t.x, t.y - 23, 3, FX.red); }
export function drawChest(ctx: Ctx, c: ChestState, _time: number): void { const s = c.big ? 1.4 : 1, x = c.x, y = c.y, body = c.big ? FX.blue : '#bd794c'; rect(ctx, x - 16 * s, y - 3 * s, 34 * s, 5 * s, FX.dark); rect(ctx, x - 14 * s, y - 19 * s, 28 * s, 18 * s, body); rect(ctx, x - 11 * s, y - 24 * s, 22 * s, 6 * s, body); rect(ctx, x - 14 * s, y - 17 * s, 28 * s, 3 * s, FX.dark); for (const side of [-1, 1])
    rect(ctx, x + side * 9 * s - 2 * s, y - 24 * s, 4 * s, 23 * s, FX.gold); rect(ctx, x - 3 * s, y - 18 * s, 6 * s, 7 * s, FX.cream); rect(ctx, x - s, y - 16 * s, 2 * s, 4 * s, FX.dark); }
const DIGITS: Record<string, string[]> = { '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'], '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'], '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'], '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'], '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'], '.': ['...', '...', '...', '...', '.1.'] };
export function drawJuiceEffect(ctx: Ctx, e: Impact): boolean {
    const handled = ['chest-open', 'damage', 'dissolve', 'streak', 'pumpkin-light', 'pumpkin-pulse', 'treat', 'moon-stun'];
    if (!handled.includes(e.kind))
        return false;
    const life = (EFFECT_LIFE as Record<string, number>)[e.kind] ?? .5, t = clamp01(1 - e.life / life), k = reducedPaperMotion() ? .25 : t;
    if (e.kind === 'damage') {
        const amount = e.amount ?? 0;
        // Ordinary contact already has a spark and hit reaction. A decimal
        // on every orbiting star hit reads like an unexplained timer.
        if (amount < 2)
            return true;
        const label = Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
        ctx.save();
        ctx.globalAlpha *= 1 - t;
        for (let i = 0; i < label.length; i++) {
            const rows = DIGITS[label[i]!] ?? DIGITS['0']!;
            stamp(ctx, rows.map(r => r.replaceAll('0', '.')), e.x - label.length * 4 + i * 8, e.y - 10 - k * 16, amount >= 3 ? FX.gold : FX.cream, 2);
        }
        ctx.restore();
        return true;
    }
    const color = e.kind === 'treat' ? FX.red : e.kind === 'moon-stun' ? FX.blue : e.kind === 'dissolve' ? FX.purple : FX.gold;
    const r = e.kind === 'moon-stun' ? 500 : e.kind === 'pumpkin-pulse' ? PUMPKIN.auraRadius : e.kind === 'chest-open' ? 70 : 30;
    ctx.save();
    ctx.globalAlpha *= 1 - t;
    if (e.kind !== 'dissolve')
        ring(ctx, e.x, e.y, 8 + k * r, color, .55);
    burst(ctx, e.x, e.y - 12, t, r, color, e.kind === 'dissolve' ? 12 : 8);
    ctx.restore();
    return true;
}
