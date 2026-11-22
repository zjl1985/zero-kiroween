/** Complete pixel weapon/passive adapters. Legacy paper art is never invoked. */
import type { WeaponArt, PassiveArt, CostumeArt, EffectPainter } from './art-registry.js';
import type { Ctx } from './pixel-art.js';
import type { FoldFlap } from '../game/types.js';
import { orbitPositions } from '../game/sim.js';
import { playerStats, UPGRADE_VALUES } from '../game/upgrades.js';
import { PAPER_CUT } from '../defs/weapons/paper-cut.js';
import { FX, GLYPHS, glyph, equipmentGlyph, rect, line, polygon, burst, area, edge } from './pixel-vfx.js';
import { reducedPaperMotion } from './paper-motion.js';
const ICONS: Record<string, keyof typeof GLYPHS> = { 'meow-bolt': 'bolt', 'echo-legion': 'bolt', 'moon-stars': 'star', 'full-moon': 'moon', 'night-claw': 'sword', 'star-fall': 'star', 'paper-crane': 'crane', 'pumpkin-seed': 'seed', 'paper-cut': 'sword', 'page-fold': 'book', 'watercolour-brush': 'brush', focus: 'eye', 'long-shadow': 'skull', 'paper-armor': 'shield', vitality: 'heart', 'night-eyes': 'eye', swift: 'boot', snack: 'seed', 'deep-fold': 'book', 'moon-shield': 'shield', magnet: 'magnet', scholar: 'book' };
/** Equipment miniatures fit a 32 px slot. Large value regions establish the
 * silhouette; one-pixel seams, fittings and bevels describe the material. */
export function pixelUpgradeGlyph(ctx: Ctx, id: string, ink: string): void {
    const dark = FX.dark, metal = '#b2c8cc', steel = '#667f98', gold = FX.gold;
    const r = (x: number, y: number, w: number, h: number, c: string) => rect(ctx, x, y, w, h, c);
    const l = (x: number, y: number, xx: number, yy: number, c: string, w = 1) => line(ctx, x, y, xx, yy, c, w);
    const blade = (offset: number, color: string) => {
        polygon(ctx, [[7 + offset, 24], [20 + offset, 7], [26 + offset, 4], [25 + offset, 10], [10 + offset, 27]], dark);
        polygon(ctx, [[9 + offset, 24], [21 + offset, 8], [25 + offset, 5], [23 + offset, 11], [10 + offset, 25]], steel);
        l(10 + offset, 23, 24 + offset, 6, metal);
        l(5 + offset, 23, 11 + offset, 28, color, 2);
        l(7 + offset, 26, 4 + offset, 29, '#8d6555', 2);
    };
    const book = (cover: string) => {
        polygon(ctx, [[4, 7], [14, 5], [16, 7], [18, 5], [28, 7], [28, 25], [18, 23], [16, 25], [14, 23], [4, 25]], dark);
        polygon(ctx, [[5, 8], [14, 6], [16, 8], [16, 23], [14, 21], [5, 23]], cover);
        polygon(ctx, [[17, 8], [19, 6], [27, 8], [27, 23], [19, 21], [17, 23]], steel);
        l(6, 9, 13, 8, FX.cream);
        l(19, 8, 26, 10, FX.cream);
        l(16, 9, 16, 23, gold);
        l(5, 25, 13, 23, cover);
        l(19, 23, 27, 25, cover);
        for (let y = 12; y <= 18; y += 3) {
            l(7, y, 12, y - 1, metal);
            l(20, y - 1, 25, y, metal);
        }
    };
    const shield = (color: string) => {
        polygon(ctx, [[5, 6], [16, 3], [27, 6], [26, 19], [22, 25], [16, 29], [10, 25], [6, 19]], dark);
        polygon(ctx, [[7, 7], [16, 5], [25, 7], [24, 18], [21, 23], [16, 27], [11, 23], [8, 18]], steel);
        polygon(ctx, [[9, 9], [16, 7], [23, 9], [22, 18], [19, 23], [16, 25], [12, 21], [10, 17]], color);
        l(8, 8, 16, 6, metal);
        l(16, 6, 24, 8, metal);
        l(16, 9, 16, 23, FX.cream);
        r(10, 10, 1, 2, gold);
        r(22, 10, 1, 2, gold);
    };
    const eye = (x: number, y: number, color: string) => {
        polygon(ctx, [[x - 11, y], [x - 6, y - 5], [x + 5, y - 5], [x + 11, y], [x + 5, y + 5], [x - 6, y + 5]], dark);
        polygon(ctx, [[x - 9, y], [x - 5, y - 3], [x + 5, y - 3], [x + 9, y], [x + 5, y + 3], [x - 5, y + 3]], FX.cream);
        r(x - 3, y - 3, 6, 7, color);
        r(x - 1, y - 3, 2, 7, dark);
        r(x - 2, y - 2, 1, 2, metal);
    };
    switch (id) {
        case 'paper-crane':
            equipmentGlyph(ctx, 'crane', 16, 16, ink, 27);
            break;
        case 'pumpkin-seed':
            equipmentGlyph(ctx, 'seed', 16, 17, gold, 20);
            l(18, 5, 23, 3, FX.green, 2);
            r(22, 3, 3, 2, FX.green);
            break;
        case 'moon-stars':
            equipmentGlyph(ctx, 'star', 13, 17, ink, 20);
            glyph(ctx, 'star', 26, 7, 3, gold);
            break;
        case 'star-fall':
            for (let i = 0; i < 3; i++)
                l(18 + i * 3, 3, 11 + i * 3, 12, i === 1 ? FX.cream : FX.purple);
            equipmentGlyph(ctx, 'star', 13, 21, gold, 17);
            break;
        case 'full-moon':
            for (let y = -11; y <= 11; y++) {
                const w = Math.floor(Math.sqrt(121 - y * y));
                r(16 - w, 16 + y, w * 2 + 1, 1, y < 0 ? '#e7ddba' : '#bab9b0');
            }
            l(8, 8, 12, 5, FX.cream);
            r(10, 12, 4, 2, '#c6c6b6');
            r(20, 19, 3, 3, '#9ea7ac');
            equipmentGlyph(ctx, 'star', 24, 25, gold, 9);
            break;
        case 'paper-cut':
            blade(0, ink);
            l(11, 27, 18, 29, FX.purple);
            l(18, 29, 26, 26, FX.purple);
            break;
        case 'night-claw':
            for (let i = 0; i < 3; i++) {
                polygon(ctx, [[5 + i * 7, 24], [9 + i * 7, 10], [14 + i * 6, 5], [11 + i * 7, 19], [8 + i * 7, 27]], steel);
                l(7 + i * 7, 22, 13 + i * 6, 7, FX.cream);
            }
            l(7, 27, 23, 27, FX.purple);
            break;
        case 'meow-bolt':
        case 'echo-legion':
            if (id === 'echo-legion') {
                l(4, 9, 11, 3, FX.blue);
                l(3, 15, 9, 9, steel);
                l(21, 27, 28, 21, FX.blue);
            }
            polygon(ctx, [[17, 3], [8, 15], [14, 15], [9, 29], [25, 12], [18, 12], [23, 3]], dark);
            polygon(ctx, [[17, 5], [11, 13], [17, 13], [12, 24], [22, 14], [16, 14], [20, 5]], ink);
            l(17, 6, 12, 12, FX.cream);
            l(16, 16, 13, 22, FX.cream);
            break;
        case 'page-fold':
        case 'deep-fold':
        case 'scholar':
            book(id === 'page-fold' ? ink : FX.purple);
            if (id === 'deep-fold') {
                l(5, 28, 16, 26, FX.purple);
                l(16, 26, 27, 28, FX.purple);
            }
            if (id === 'scholar') {
                r(21, 5, 3, 9, gold);
                polygon(ctx, [[21, 14], [24, 14], [24, 18], [22, 16], [21, 18]], gold);
            }
            break;
        case 'watercolour-brush':
            l(11, 21, 25, 5, dark, 5);
            l(12, 20, 25, 5, '#976e57', 3);
            l(14, 17, 25, 5, '#cba079');
            l(9, 23, 14, 17, metal, 5);
            l(10, 21, 13, 18, FX.cream);
            polygon(ctx, [[8, 19], [13, 24], [10, 28], [3, 29], [5, 23]], FX.purple);
            l(5, 27, 9, 22, FX.blue);
            r(3, 29, 10, 1, FX.purple);
            break;
        case 'paper-armor':
        case 'moon-shield':
            shield(id === 'paper-armor' ? ink : FX.purple);
            if (id === 'moon-shield')
                glyph(ctx, 'moon', 16, 16, 4, FX.cream);
            else {
                l(12, 13, 20, 13, steel);
                l(12, 18, 20, 18, steel);
            }
            break;
        case 'focus':
            eye(16, 16, FX.blue);
            l(16, 3, 16, 7, gold);
            l(16, 25, 16, 29, gold);
            l(2, 16, 5, 16, gold);
            l(27, 16, 30, 16, gold);
            break;
        case 'night-eyes':
            eye(16, 17, FX.purple);
            polygon(ctx, [[6, 12], [5, 4], [12, 10]], steel);
            polygon(ctx, [[20, 10], [27, 4], [26, 12]], steel);
            break;
        case 'long-shadow':
            polygon(ctx, [[5, 27], [12, 14], [14, 5], [18, 8], [21, 5], [22, 18], [28, 27]], dark);
            polygon(ctx, [[10, 24], [14, 15], [15, 8], [18, 11], [20, 8], [20, 20], [25, 25]], FX.purple);
            r(15, 13, 2, 1, FX.cream);
            r(19, 13, 2, 1, FX.cream);
            l(8, 28, 27, 28, steel);
            break;
        case 'vitality':
            polygon(ctx, [[4, 9], [8, 5], [13, 5], [16, 8], [19, 5], [24, 5], [28, 9], [28, 16], [16, 29], [4, 16]], dark);
            polygon(ctx, [[6, 10], [9, 7], [12, 7], [16, 11], [20, 7], [23, 7], [26, 10], [26, 15], [16, 26], [6, 15]], '#c96970');
            l(8, 10, 11, 9, '#f0b7a0', 2);
            l(21, 20, 16, 25, '#8d4c67');
            l(10, 17, 14, 17, FX.cream);
            l(14, 17, 16, 13, FX.cream);
            l(16, 13, 18, 20, FX.cream);
            l(18, 20, 20, 17, FX.cream);
            break;
        case 'swift':
            polygon(ctx, [[11, 5], [22, 5], [21, 17], [27, 21], [28, 27], [5, 27], [5, 22], [10, 18]], dark);
            polygon(ctx, [[12, 7], [20, 7], [19, 18], [25, 22], [26, 25], [7, 25], [7, 23], [12, 19]], '#8e7896');
            r(7, 26, 20, 2, metal);
            l(13, 9, 19, 9, FX.cream);
            l(13, 12, 18, 12, FX.cream);
            l(13, 15, 18, 15, FX.cream);
            l(3, 12, 8, 12, FX.blue);
            l(1, 17, 7, 17, FX.blue);
            break;
        case 'snack':
            polygon(ctx, [[5, 12], [11, 7], [20, 8], [25, 13], [25, 22], [18, 27], [9, 26], [4, 21]], '#8d6555');
            polygon(ctx, [[6, 12], [11, 9], [19, 10], [23, 14], [23, 20], [18, 24], [10, 23], [6, 20]], '#d2a576');
            l(9, 12, 17, 11, FX.cream);
            r(11, 16, 2, 3, '#8d6555');
            r(18, 18, 2, 3, '#8d6555');
            l(5, 26, 24, 28, steel);
            break;
        case 'magnet':
            polygon(ctx, [[5, 5], [12, 5], [12, 20], [15, 23], [18, 23], [21, 20], [21, 5], [28, 5], [28, 21], [23, 28], [10, 28], [5, 22]], dark);
            l(8, 7, 8, 20, '#c96970', 4);
            l(24, 7, 24, 20, steel, 4);
            l(8, 21, 12, 25, '#c96970', 4);
            l(12, 25, 21, 25, steel, 4);
            l(21, 25, 25, 20, steel, 4);
            r(6, 5, 5, 5, metal);
            r(22, 5, 5, 5, metal);
            l(7, 12, 7, 19, '#f0b7a0');
            break;
        default: glyph(ctx, ICONS[id] ?? 'star', 16, 16, 9, ink);
    }
}
/** A small paper corner flips beside the cat. Its shape comes from the
 * paper itself and has no dependence on the attack's hit dimensions. */
function drawFoldCorner(ctx: Ctx, flap: FoldFlap, age: number): void {
    const life = .34;
    if (age < 0 || age >= life) return;
    const u = age / life, calm = reducedPaperMotion();
    const offset = calm ? 18 : 11 + u * 16;
    const rise = calm ? 3 : Math.sin(u * Math.PI) * 8;
    const tx = -flap.ny, ty = flap.nx;
    const x = flap.x + tx * 24 - flap.nx * offset;
    const y = flap.y + ty * 24 - flap.ny * offset;
    const point = (across: number, along: number, lift = 0) => ({
        x: x + tx * across - flap.nx * along,
        y: y + ty * across - flap.ny * along - lift,
    });
    const a = point(-12, 0), b = point(11, 0), c = point(7, 10, rise), d = point(-10, 12, rise);
    const fold = point(1, 5, rise * .6);
    ctx.save();
    ctx.globalAlpha *= Math.min(1, (1 - u) * 2.2);
    area(ctx, [a, b, c, d], '#bfad91');
    area(ctx, [a, d, fold], '#f0ddba');
    area(ctx, [fold, d, c], '#d6c0a9');
    line(ctx, a.x, a.y, fold.x, fold.y, '#97816f', 1);
    ctx.restore();
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
            if (drop < .5) burst(ctx, e.x, e.y - 2, t, 17, color, 5);
        }
        else if (kind === 'page-fold') {
            burst(ctx, e.x, e.y - 5, t, 13, '#c6b99e', 4);
        }
        else if (kind === 'costume-pull') {
            for (let i = 0; i < 4; i++) {
                const a = i * Math.PI / 2 + .22;
                const d = Math.min(r, 34) * (1 - .85 * k) * (.7 + i * .1);
                rect(ctx, e.x + Math.cos(a) * d, e.y + Math.sin(a) * d * .62, 3, 3, FX.cream);
            }
        }
        else {
            burst(ctx, e.x, e.y - 8, t, Math.min(r, 35), color, kind === 'echo-burst' ? 12 : 8);
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
        art.shot = (ctx, s, time) => {
            const a = Math.atan2(s.vy, s.vx), wing = reducedPaperMotion() ? 0 : Math.floor(time * 8) % 2;
            line(ctx, s.x - Math.cos(a) * 14, s.y - 14 - Math.sin(a) * 14, s.x, s.y - 14, id === 'paper-crane' ? FX.blue : FX.gold, 2);
            equipmentGlyph(ctx, id === 'paper-crane' ? 'crane' : 'seed', s.x, s.y - 14, id === 'paper-crane' ? FX.blue : FX.gold, id === 'paper-crane' ? 19 : 10);
            if (id === 'paper-crane' && wing)
                line(ctx, s.x - 7, s.y - 19, s.x - 3, s.y - 16, FX.cream, 1);
        };
    if (id === 'moon-stars') {
        // The moving stars already describe their exact orbit. A second
        // permanent ground ring obscures nearby attacks without adding a cue.
        art.sprites = (c, s, time, add) => orbitPositions(s).forEach((p, i) => add(p.y, () => equipmentGlyph(c, 'star', p.x, p.y - 12, i % 2 ? FX.gold : FX.purple, playerStats(s).fullMoon ? 18 : 16)));
    }
    if (id === 'full-moon') {
        art.front = (c, s) => {
            const x = s.player.x - s.player.facing * 22, y = s.player.y - 64;
            const charge = Math.max(0, Math.min(1, 1 - s.pulseTimer / UPGRADE_VALUES['full-moon'].pulseInterval));
            glyph(c, 'moon', x, y, 8, FX.cream);
            rect(c, x - 6, y + 9, 12, 2, FX.dark);
            if (charge > 0) rect(c, x - 6, y + 9, 12 * charge, 2, FX.gold);
        };
    }
    if (id === 'echo-legion')
        art.sprites = (c, s, time, add) => {
            const d = s.decoy;
            if (!d.live || !playerStats(s).echo)
                return;
            add(d.y + .5, () => {
                c.save();
                c.globalAlpha *= .6;
                for (let i = 0; i < 4; i++) {
                    const a = (reducedPaperMotion() ? 0 : time * 2.6) + i * Math.PI / 2;
                    rect(c, d.x + Math.cos(a) * 20, d.y - 20 + Math.sin(a) * 9, 4, 4, i % 2 ? FX.gold : FX.blue);
                }
                c.restore();
            });
        };
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
            for (const flap of s.fold.flaps) drawFoldCorner(c, flap, s.elapsed - flap.at);
        };
        art.sprites = (c, s, _time, add) => {
            for (const w of s.walls)
                add((w.y1 + w.y2) / 2, () => {
                    line(c, w.x1, w.y1, w.x2, w.y2, FX.dark, 5);
                    for (let i = 0; i <= Math.ceil(Math.hypot(w.x2 - w.x1, w.y2 - w.y1) / 6); i++) {
                        const n = Math.max(1, Math.ceil(Math.hypot(w.x2 - w.x1, w.y2 - w.y1) / 6)), x = w.x1 + (w.x2 - w.x1) * i / n, y = w.y1 + (w.y2 - w.y1) * i / n;
                        rect(c, x, y - 16, 5, 16, i % 2 ? FX.purple : FX.shade);
                        rect(c, x, y - 16, 5, 2, FX.cream);
                    }
                });
        };
    }
    return art;
}
export function pixelPassiveArt(old: PassiveArt): PassiveArt { return { id: old.id, icon: (c, ink) => pixelUpgradeGlyph(c, old.id, ink) }; }
/** Small paper objects and trails show where the costume is working. */
export function pixelCostumeEffects(old: CostumeArt): CostumeArt {
    return { ...old, effects: Object.fromEntries(Object.keys(old.effects ?? {}).map(kind => [kind, effectFor('costume', kind)])),
        ground(c, s) {
            for (const z of s.costume?.zones ?? []) {
                if (z.until <= s.elapsed) continue;
                if (z.kind === 'turret' || z.kind === 'pad' || (z.kind === 'circle' && z.radius <= 14)) continue;
                const color = (z.armed ?? 0) > s.elapsed ? FX.gold : FX.blue;
                c.save();
                c.globalAlpha *= Math.min(1, (z.until - s.elapsed) * 3);
                if (z.kind === 'lane') {
                    line(c, z.x, z.y, z.x2 ?? z.x, z.y2 ?? z.y, color, 3);
                } else {
                    glyph(c, 'star', z.x, z.y - 4, 4, color);
                }
                c.restore();
            }
        },
        sprites(c, s, _time, add) {
            for (const z of s.costume?.zones ?? []) {
                if (z.until <= s.elapsed)
                    continue;
                if (z.kind === 'turret')
                    add(z.y, () => { rect(c, z.x - 10, z.y - 10, 20, 10, FX.shade); rect(c, z.x - 6, z.y - 24, 12, 14, FX.blue); rect(c, z.x - 2, z.y - 29, 16, 5, FX.cream); });
                else if (z.kind === 'pad' || (z.kind === 'circle' && z.radius <= 14))
                    add(z.y, () => glyph(c, 'star', z.x, z.y - 4, 5, FX.purple));
            }
        }
    };
}
