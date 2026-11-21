/** Complete pixel weapon/passive adapters. Legacy paper art is never invoked. */
import type { WeaponArt, PassiveArt, CostumeArt, EffectPainter } from './art-registry.js';
import type { Ctx } from './pixel-art.js';
import { orbitPositions } from '../game/sim.js';
import { playerStats, UPGRADE_VALUES } from '../game/upgrades.js';
import { PAGE_FOLD } from '../defs/weapons/page-fold.js';
import { PAPER_CUT } from '../defs/weapons/paper-cut.js';
import { FX, GLYPHS, glyph, rect, line, pixelRing, burst, area, edge } from './pixel-vfx.js';
import { reducedPaperMotion } from './paper-motion.js';
const ICONS: Record<string, keyof typeof GLYPHS> = { 'meow-bolt': 'bolt', 'echo-legion': 'bolt', 'moon-stars': 'star', 'full-moon': 'moon', 'night-claw': 'sword', 'star-fall': 'star', 'paper-crane': 'crane', 'pumpkin-seed': 'seed', 'paper-cut': 'sword', 'page-fold': 'book', 'watercolour-brush': 'brush', focus: 'eye', 'long-shadow': 'skull', 'paper-armor': 'shield', vitality: 'heart', 'night-eyes': 'eye', swift: 'boot', snack: 'seed', 'deep-fold': 'book', 'moon-shield': 'shield', magnet: 'magnet', scholar: 'book' };
export function pixelUpgradeGlyph(ctx: Ctx, id: string, ink: string): void {
    const kind = ICONS[id] ?? 'star';
    if (id === 'echo-legion') {
        glyph(ctx, 'bolt', 12, 18, 7, FX.blue);
        glyph(ctx, 'bolt', 20, 12, 7, ink);
        return;
    }
    glyph(ctx, kind, 16, 16, 9, ink);
    if (id === 'star-fall') {
        rect(ctx, 25, 3, 2, 5, FX.purple);
        rect(ctx, 22, 7, 2, 5, FX.purple);
    }
    if (id === 'moon-shield')
        glyph(ctx, 'moon', 16, 15, 3, FX.blue);
    if (id === 'deep-fold') {
        line(ctx, 6, 27, 26, 27, FX.purple, 2);
    }
    if (id === 'scholar')
        glyph(ctx, 'star', 25, 6, 3, FX.gold);
    if (id === 'night-eyes') {
        rect(ctx, 7, 7, 3, 3, FX.purple);
        rect(ctx, 23, 7, 3, 3, FX.purple);
    }
}
function effectFor(id: string, kind: string): EffectPainter {
    return (ctx, e, { t, fade, ease }, state) => {
        const calm = reducedPaperMotion(), k = calm ? .35 : ease, r = e.radius ?? (kind === 'claw' ? 58 : 40), color = id === 'pumpkin-seed' ? FX.gold : id === 'echo-legion' ? FX.blue : FX.purple;
        ctx.save();
        ctx.globalAlpha *= fade;
        if (kind === 'claw') {
            for (let i = -1; i <= 1; i++) {
                const a = (e.angle ?? 0) + i * .3;
                line(ctx, e.x + Math.cos(a) * r * .25, e.y - 10 + Math.sin(a) * r * .25, e.x + Math.cos(a) * r, e.y - 10 + Math.sin(a) * r, FX.cream, 3);
                line(ctx, e.x + Math.cos(a) * r * .4, e.y - 7 + Math.sin(a) * r * .4, e.x + Math.cos(a) * r * .9, e.y - 7 + Math.sin(a) * r * .9, color, 2);
            }
        }
        else if (kind === 'star-fall') {
            const drop = calm ? 0 : 1 - Math.min(1, t * 2.4);
            glyph(ctx, 'star', e.x + 10 * drop, e.y - 8 - 70 * drop, 9, FX.cream);
            pixelRing(ctx, e.x, e.y, r * (.25 + k * .75), color, .6);
        }
        else if (kind === 'page-fold') {
            const a = (e.angle ?? 0) + Math.PI / 2;
            line(ctx, e.x - Math.cos(a) * r * .8, e.y - Math.sin(a) * r * .8, e.x + Math.cos(a) * r * .8, e.y + Math.sin(a) * r * .8, FX.cream, 3);
        }
        else if (kind === 'costume-pull') {
            pixelRing(ctx, e.x, e.y, r * (1 - .8 * k), FX.blue, .62);
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3, d = r * (1 - .85 * k);
                rect(ctx, e.x + Math.cos(a) * d, e.y + Math.sin(a) * d * .62, 3, 3, FX.cream);
            }
        }
        else {
            pixelRing(ctx, e.x, e.y, 6 + k * r, color, .6);
            burst(ctx, e.x, e.y - 8, t, r, color, kind === 'echo-burst' ? 12 : 8);
        }
        ctx.restore();
    };
}
export function pixelWeaponArt(old: WeaponArt): WeaponArt {
    const id = old.id;
    const art: WeaponArt = { id, icon: (c, ink) => pixelUpgradeGlyph(c, id, ink), ...(old.shotTag ? { shotTag: old.shotTag } : {}),
        ...(old.effects ? { effects: Object.fromEntries(Object.keys(old.effects).map(kind => [kind, effectFor(id, kind)])) } : {}),
    };
    if (old.shot)
        art.shot = (ctx, s, time) => { const a = Math.atan2(s.vy, s.vx), wing = reducedPaperMotion() ? 0 : Math.floor(time * 8) % 2; line(ctx, s.x - Math.cos(a) * 14, s.y - 14 - Math.sin(a) * 14, s.x, s.y - 14, id === 'paper-crane' ? FX.blue : FX.gold, 2); glyph(ctx, id === 'paper-crane' ? 'crane' : 'seed', s.x, s.y - 14, id === 'paper-crane' ? 6 : 5, id === 'paper-crane' ? FX.cream : FX.gold); if (id === 'paper-crane' && wing)
            rect(ctx, s.x - 5, s.y - 23, 10, 2, FX.blue); };
    if (id === 'moon-stars') {
        art.ground = (c, s) => { c.save(); c.globalAlpha *= .3; pixelRing(c, s.player.x, s.player.y, playerStats(s).orbitRadius, FX.purple, .6); c.restore(); };
        art.sprites = (c, s, time, add) => orbitPositions(s).forEach((p, i) => add(p.y, () => glyph(c, 'star', p.x, p.y - 12, playerStats(s).fullMoon ? 9 : 7, i % 2 ? FX.cream : FX.purple)));
    }
    if (id === 'full-moon') {
        art.ground = (c, s) => { const ps = playerStats(s), m = UPGRADE_VALUES['full-moon']; pixelRing(c, s.player.x, s.player.y, ps.orbitRadius + m.pulseReach, FX.gold, .55, 1 - Math.max(0, s.pulseTimer) / m.pulseInterval); };
        art.front = (c, s) => glyph(c, 'moon', s.player.x - s.player.facing * 22, s.player.y - 64, 8, FX.cream);
    }
    if (id === 'echo-legion')
        art.sprites = (c, s, time, add) => { const d = s.decoy; if (!d.live || !playerStats(s).echo)
            return; add(d.y + .5, () => { c.save(); c.globalAlpha *= .6; pixelRing(c, d.x, d.y, UPGRADE_VALUES['echo-legion'].burstRadius, FX.blue, .5, Math.min(1, d.time / 1.2)); for (let i = 0; i < 4; i++) {
            const a = (reducedPaperMotion() ? 0 : time * 2.6) + i * Math.PI / 2;
            rect(c, d.x + Math.cos(a) * 20, d.y - 20 + Math.sin(a) * 9, 4, 4, i % 2 ? FX.gold : FX.blue);
        } c.restore(); }); };
    if (id === 'watercolour-brush') {
        const trail: {
            x: number;
            y: number;
            t: number;
        }[] = [];
        let clock = -1, seed = NaN;
        art.ground = (c, s) => {
            if (s.elapsed < clock || s.seed !== seed) {
                trail.length = 0;
                seed = s.seed;
            }
            clock = s.elapsed;
            const last = trail[trail.length - 1];
            if (!last || Math.hypot(last.x - s.player.x, last.y - s.player.y) >= 7)
                trail.push({ x: s.player.x, y: s.player.y, t: s.elapsed });
            else
                last.t = s.elapsed;
            while (trail.length && (s.elapsed - trail[0]!.t > .9 || trail.length > 48))
                trail.shift();
            c.save();
            for (let i = 1; i < trail.length; i++) {
                const p = trail[i]!, q = trail[i - 1]!;
                c.globalAlpha = .6 * (1 - (s.elapsed - p.t) / .9);
                line(c, q.x, q.y, p.x, p.y, FX.purple, 8);
                rect(c, p.x - 3, p.y + 2, 4, 2, FX.blue);
            }
            c.restore();
        };
    }
    if (id === 'paper-cut')
        art.ground = (c, s) => {
            c.save();
            for (const out of s.cut.outs) {
                const u = (s.elapsed - out.at) / PAPER_CUT.outLife;
                if (u < 0 || u >= 1)
                    continue;
                c.globalAlpha = 1 - u;
                area(c, out.points, FX.dark);
                edge(c, out.points, FX.cream);
            }
            edge(c, s.cut.points, FX.blue, false);
            if (s.cut.points.length)
                glyph(c, 'sword', s.player.x, s.player.y - 5, 6, FX.cream);
            c.restore();
        };
    if (id === 'page-fold') {
        art.ground = (c, s) => {
            for (const b of s.fold.bridges ?? []) {
                area(c, b.polygon, '#9a8b80');
                edge(c, b.polygon, FX.cream);
            }
            for (const f of s.fold.flaps) {
                const age = s.elapsed - f.at;
                if (age < 0 || age >= PAGE_FOLD.flapLife)
                    continue;
                const tx = -f.ny, ty = f.nx, pts = [{ x: f.x - tx * f.half, y: f.y - ty * f.half }, { x: f.x + tx * f.half, y: f.y + ty * f.half }, { x: f.x + tx * f.half - f.nx * f.band, y: f.y + ty * f.half - f.ny * f.band }, { x: f.x - tx * f.half - f.nx * f.band, y: f.y - ty * f.half - f.ny * f.band }];
                c.save();
                c.globalAlpha *= .65 * (1 - age / PAGE_FOLD.flapLife);
                area(c, pts, FX.purple);
                edge(c, pts, FX.cream);
                c.restore();
            }
        };
        art.sprites = (c, s, _time, add) => { for (const w of s.walls)
            add((w.y1 + w.y2) / 2, () => { line(c, w.x1, w.y1, w.x2, w.y2, FX.dark, 5); for (let i = 0; i <= Math.ceil(Math.hypot(w.x2 - w.x1, w.y2 - w.y1) / 6); i++) {
                const n = Math.max(1, Math.ceil(Math.hypot(w.x2 - w.x1, w.y2 - w.y1) / 6)), x = w.x1 + (w.x2 - w.x1) * i / n, y = w.y1 + (w.y2 - w.y1) * i / n;
                rect(c, x, y - 16, 5, 16, i % 2 ? FX.purple : FX.shade);
                rect(c, x, y - 16, 5, 2, FX.cream);
            } }); };
    }
    return art;
}
export function pixelPassiveArt(old: PassiveArt): PassiveArt { return { id: old.id, icon: (c, ink) => pixelUpgradeGlyph(c, old.id, ink) }; }
/** Native pixel zone rendering keeps the original zone centre, radius and arming clock. */
export function pixelCostumeEffects(old: CostumeArt): CostumeArt {
    return { ...old, effects: Object.fromEntries(Object.keys(old.effects ?? {}).map(kind => [kind, effectFor('costume', kind)])),
        ground(c, s) {
            for (const z of s.costume?.zones ?? []) {
                if (z.until <= s.elapsed)
                    continue;
                c.save();
                c.globalAlpha *= Math.min(1, (z.until - s.elapsed) * 3);
                const color = (z.armed ?? 0) > s.elapsed ? FX.gold : FX.blue;
                if (z.kind === 'lane') {
                    const dx = (z.x2 ?? z.x) - z.x, dy = (z.y2 ?? z.y) - z.y, n = Math.hypot(dx, dy) || 1, nx = -dy / n * z.radius, ny = dx / n * z.radius;
                    const pts = [{ x: z.x + nx, y: z.y + ny }, { x: (z.x2 ?? z.x) + nx, y: (z.y2 ?? z.y) + ny }, { x: (z.x2 ?? z.x) - nx, y: (z.y2 ?? z.y) - ny }, { x: z.x - nx, y: z.y - ny }];
                    c.save();
                    c.globalAlpha *= .15;
                    area(c, pts, color);
                    c.restore();
                    edge(c, pts, color);
                }
                else
                    pixelRing(c, z.x, z.y, z.radius, color, .62);
                c.restore();
            }
            if ((s.costume?.buff ?? 0) > 0)
                pixelRing(c, s.player.x, s.player.y, 24, FX.purple, .5);
        },
        sprites(c, s, _time, add) { for (const z of s.costume?.zones ?? []) {
            if (z.until <= s.elapsed)
                continue;
            if (z.kind === 'turret')
                add(z.y, () => { rect(c, z.x - 10, z.y - 10, 20, 10, FX.shade); rect(c, z.x - 6, z.y - 24, 12, 14, FX.blue); rect(c, z.x - 2, z.y - 29, 16, 5, FX.cream); });
            else if (z.kind === 'pad' || (z.kind === 'circle' && z.radius <= 14))
                add(z.y, () => glyph(c, 'star', z.x, z.y - 4, 5, FX.purple));
        } }
    };
}
