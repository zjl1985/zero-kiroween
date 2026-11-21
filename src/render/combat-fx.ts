/** Pixel combat orchestration. All effects are authored grid marks, never paper rasterization. */
import type { SimState, Impact, ShotState } from '../game/types.js';
import { EFFECT_LIFE } from '../game/types.js';
import type { CatId } from '../cats/types.js';
import { activeWeaponArt, catArt, costumeArt, effectPainter, shotArt, type SkillIconKind } from './art-registry.js';
import { orbitPositions } from '../game/sim.js';
import type { Ctx } from './pixel-art.js';
import { FX, glyph, pixelRing, burst, rect, line } from './pixel-vfx.js';
import { reducedPaperMotion } from './paper-motion.js';
export function ring(ctx: Ctx, x: number, y: number, r: number, color: string, ratio = 1, progress = 1): void { pixelRing(ctx, x, y, r, color, ratio, progress); }
export function star(ctx: Ctx, x: number, y: number, r: number, color: string, _angle = 0): void { glyph(ctx, 'star', x, y, r, color); }
export function paperTrail(ctx: Ctx, x: number, y: number, angle: number, length: number, color: string, width = 1): void { for (let i = 1; i <= 3; i++) {
    const d = length * i / 4;
    rect(ctx, x - Math.cos(angle) * d, y - Math.sin(angle) * d, Math.max(2, width * 2), 2, color);
} }
export function drawOrbitStar(ctx: Ctx, x: number, y: number, _time: number, index: number, full = false): void { glyph(ctx, 'star', x, y - 12, full ? 9 : 7, index % 2 ? FX.cream : FX.purple); }
export function drawCombatGround(ctx: Ctx, state: SimState): void { catArt(state.player.id).ground?.(ctx, state); for (const w of activeWeaponArt(state))
    w.ground?.(ctx, state); if (state.costume)
    costumeArt(state)?.ground?.(ctx, state); }
export function drawCombatFront(ctx: Ctx, state: SimState): void { for (const w of activeWeaponArt(state))
    w.front?.(ctx, state); const p = state.player; if (p.shield > 0 && p.shieldTime > 0) {
    ctx.save();
    ctx.globalAlpha *= Math.min(.85, p.shieldTime * 2);
    pixelRing(ctx, p.x, p.y - 29, 35, FX.blue, 1.22);
    for (let i = 0; i < p.shield; i++)
        glyph(ctx, 'shield', p.x + (i - (p.shield - 1) / 2) * 10, p.y - 77, 3, FX.cream);
    ctx.restore();
} }
export function drawSkillEffect(ctx: Ctx, e: Impact, state?: SimState): void {
    const duration = (EFFECT_LIFE as Record<string, number>)[e.kind] ?? (e.kind === 'rescue' ? .8 : e.kind === 'fold' ? .6 : e.kind === 'hurt' ? .35 : .4), t = Math.max(0, Math.min(1, 1 - e.life / duration)), fade = 1 - t, ease = 1 - (1 - t) ** 3;
    const own = effectPainter(e.kind);
    if (own) {
        ctx.save();
        own(ctx, e, { t, fade, ease }, state);
        ctx.restore();
        return;
    }
    const color = e.kind === 'hurt' ? FX.red : e.kind === 'dash' ? FX.gold : e.kind === 'collect' ? FX.gold : FX.purple, k = reducedPaperMotion() ? .3 : ease;
    ctx.save();
    ctx.globalAlpha *= fade;
    if (e.kind === 'dash') {
        const side = state?.player.facing ?? 1;
        for (let i = 0; i < 3; i++) {
            const x = e.x - side * (8 + i * 12 + k * 12);
            line(ctx, x - side * 6, e.y - 26, x, e.y - 18, color, 2);
            line(ctx, x, e.y - 18, x - side * 6, e.y - 10, color, 2);
        }
    }
    else {
        const r = e.kind === 'evolve' ? 90 : e.kind === 'levelup' ? 46 : e.kind === 'fold' ? 60 : 24;
        pixelRing(ctx, e.x, e.y, 8 + k * r, color, .6);
        burst(ctx, e.x, e.y - 12, t, r, color, e.kind === 'evolve' ? 16 : 8);
    }
    ctx.restore();
}
export function drawWeaponShot(ctx: Ctx, s: ShotState, time: number): void { if (!s.weapon)
    return; ctx.save(); shotArt(s.weapon)?.shot?.(ctx, s, time); ctx.restore(); }
export function drawHeroAura(ctx: Ctx, id: CatId, x: number, y: number, time: number): void { catArt(id).heroAura(ctx, x, y, time); }
export function paintSkillIcon(canvas: HTMLCanvasElement, id: CatId, kind: SkillIconKind): void { const ctx = canvas.getContext('2d')!; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.setTransform(canvas.width / 32, 0, 0, canvas.height / 32, 0, 0); ctx.imageSmoothingEnabled = false; catArt(id).skillIcon(ctx, kind); }
export { orbitPositions };
