/** Native material-specific secondary weapons. All state here is render-only. */
import { cachedSprite } from '../engine/sprite.js';
import type { ShotState, Impact, SimState } from '../game/types.js';
import type { EffectProgress } from './art-registry.js';
import { rect, line, polygon, type Ctx, type Point } from './pixel-art.js';
import { area, edge } from './pixel-vfx.js';
import { reducedPaperMotion } from './paper-motion.js';
import { PIXEL_PAPER as paper } from './pixel-paper-colors.js';

const FRONT = '#e1d4b7', BACK = paper.reverse, INK = paper.edge, EDGE = paper.fiber;

export function drawSecondaryShot(c: Ctx, s: ShotState, time: number): void {
    const kind = s.weapon;
    if (kind !== 'crane' && kind !== 'seed') return;
    const headings = 16, size = 36, origin = size / 2;
    const heading = (Math.round(Math.atan2(s.vy, s.vx) * headings / (2 * Math.PI)) + headings) % headings;
    const pose = kind === 'seed' ? 0 : reducedPaperMotion() ? 1 : Math.floor(time * 9 + s.id % 3) % 3;
    // Project the vertices onto the pixel grid before baking. Rotating an
    // already drawn head on the live canvas smears its one-pixel edges.
    cachedSprite(`paper-shot:${kind}:${heading}:${pose}`, size, size, 1, ctx => {
        const angle = heading / headings * Math.PI * 2, dx = Math.cos(angle), dy = Math.sin(angle);
        const at = (x: number, y: number): Point => [origin + dx * x - dy * y, origin + dy * x + dx * y];
        const face = (points: readonly Point[], color: string) => polygon(ctx, points.map(([x,y]) => at(x,y)), color);
        const mark = (x: number, y: number, u: number, v: number, color: string) => line(ctx, ...at(x,y), ...at(u,v), color);
        if (kind === 'crane') {
            const tip = pose === 0 ? -13 : pose === 1 ? -6 : 3;
            face([[-3,1],[-13,-2],[-8,4],[1,3]], BACK);
            face([[-2,0],[-8,tip],[4,-3],[6,1]], INK);
            face([[-2,0],[-7,tip+1],[3,-3],[4,1]], pose === 2 ? BACK : FRONT);
            face([[-2,2],[-5,9-pose*3],[5,3],[4,-1]], BACK);
            mark(-2,1,-5,7-pose*3,EDGE);
            face([[-5,1],[5,-2],[8,-7],[10,-6],[8,-1],[14,1],[6,2],[0,4]], FRONT);
            mark(-4,1,5,0,EDGE);
            mark(0,3,6,1,'#8492a5');
            rect(ctx, ...at(9,-5), 1, 1, INK);
        } else {
            face([[-7,0],[-3,-4],[3,-3],[7,0],[2,4],[-3,3]], '#7c5839');
            face([[-5,0],[-2,-3],[3,-2],[5,0],[2,3],[-2,2]], '#d9b978');
            mark(-4,0,4,0,'#8d673f');
            mark(-1,-2,3,-1,EDGE);
            mark(-10,1,-7,1,'#b78d57');
        }
    }, { x: .5, y: .5 }).draw(c, { x: Math.round(s.x), y: Math.round(s.y - 14) });
}

/** Draw one hooked arc, in the attack's local direction. */
function claw(c: Ctx, r: number, offset: number, progress: number, heading: number): void {
    const end = -.7 + 1.4 * progress;
    const offsetX = -Math.sin(heading) * offset, offsetY = Math.cos(heading) * offset;
    let px = Math.cos(heading - .7) * r + offsetX, py = Math.sin(heading - .7) * r + offsetY;
    for (let i = 1; i <= 12; i++) {
        const a = heading - .7 + (end + .7) * i / 12;
        const rr = r - Math.max(0, i - 9) * 1.3;
        const x = Math.cos(a) * rr + offsetX, y = Math.sin(a) * rr + offsetY;
        line(c, px - 2, py + 1, x - 2, y + 1, '#6c6679', 2);
        line(c, px, py, x, y, EDGE, i > 9 ? 1 : 2);
        px = x; py = y;
    }
}

export function drawSecondaryEffect(c: Ctx, e: Impact, look: EffectProgress): boolean {
    if (!['claw', 'seed-burst', 'paper-cut', 'page-fold'].includes(e.kind)) return false;
    const calm = reducedPaperMotion(), t = Math.max(0, Math.min(1, look.t));
    c.save(); c.translate(Math.round(e.x), Math.round(e.y)); c.globalAlpha *= look.fade;
    if (e.kind === 'claw') {
        for (let i = 0; i < 3; i++) {
            const p = calm ? .85 : Math.min(1, Math.max(0, .35 + t * 2.5 - i * .24));
            if (p > 0) claw(c, (e.radius ?? 58) * (.68 + i * .1), (i - 1) * 4, p, e.angle ?? 0);
        }
    } else if (e.kind === 'seed-burst') {
        const p = calm ? .55 : t;
        const spread = Math.min(e.radius ?? 40, 34) * p;
        // The casing splits first, then five short flame tongues consume the
        // exposed core. No disc, expanding ring or blanket bloom.
        for (let side = -1; side <= 1; side += 2) {
            const x = side * (3 + spread * .35);
            polygon(c, [[x, -7], [x + side * 5, -4], [x + side * 4, 1], [x, 3]], '#b99155');
            line(c, x, -6, x, 1, FRONT);
        }
        for (let i = 0; i < 5; i++) {
            const a = i * 2.399, x = Math.cos(a) * spread * .65, y = Math.sin(a) * spread * .4 - 3;
            const h = calm ? 8 : Math.max(2, Math.round(12 * Math.sin(Math.PI * Math.min(1, t + .1))));
            polygon(c, [[x - 3, y], [x - 2, y - h / 2], [x + 1, y - h], [x + 2, y - 4], [x + 4, y], [x, y + 2]], '#b66f44');
            line(c, x, y, x + 1, y - h * .55, '#efc077', 2);
        }
    } else if (e.kind === 'paper-cut') {
        const d = calm ? 4 : 3 + look.ease * 10;
        for (let i = 0; i < 3; i++) {
            const x = (i - 1) * d;
            polygon(c, [[x - 3, -3], [x + 4, -7 - i], [x + 2, -1], [x - 2, 1]], i % 2 ? BACK : FRONT);
            line(c, x - 2, -3, x + 2, -5, EDGE);
        }
    } else {
        const spread = calm ? 5 : 4 + look.ease * 8;
        line(c, -spread, -2, -spread - 4, -4, EDGE);
        line(c, spread, -1, spread + 4, -5, BACK);
    }
    c.restore(); return true;
}

export function createBrushGround(): (c: Ctx, s: SimState) => void {
    type Sample = { x: number; y: number; at: number };
    const trails = new WeakMap<SimState, Sample[]>();
    return (c, s) => {
        let trail = trails.get(s);
        if (!trail || (trail.at(-1)?.at ?? 0) > s.elapsed) {
            trail = [];
            trails.set(s, trail);
        }
        const last = trail[trail.length - 1];
        if (!last || Math.hypot(last.x - s.player.x, last.y - s.player.y) >= 7)
            trail.push({ x: s.player.x, y: s.player.y, at: s.elapsed });
        else last.at = s.elapsed;
        while (trail.length && (s.elapsed - trail[0]!.at > .9 || trail.length > 48)) trail.shift();
        c.save(); const alpha = c.globalAlpha;
        for (let i = 1; i < trail.length; i++) {
            const p = trail[i]!, q = trail[i - 1]!, age = (s.elapsed - p.at) / .9;
            const len = Math.hypot(p.x - q.x, p.y - q.y) || 1, nx = -(p.y - q.y) / len, ny = (p.x - q.x) / len;
            c.globalAlpha = alpha * (1 - age) * .48;
            // Wet central pigment at the leading edge; separate dry bristles
            // break into shorter marks at the rear instead of a solid ribbon.
            if (age < .38) line(c, q.x, q.y, p.x, p.y, '#7770a1', 4);
            for (let j = -1; j <= 1; j++) {
                const u = age < .38 ? 0 : .2 + (i + j + 3) % 3 * .15;
                line(c, q.x + (p.x - q.x) * u + nx * j * 3, q.y + (p.y - q.y) * u + ny * j * 3,
                    p.x + nx * j * 3, p.y + ny * j * 3, j === 0 ? '#9a7b9e' : '#779ca3', 1);
            }
        }
        const head = trail.at(-1), previous = trail.at(-2);
        if (head && previous && s.elapsed - head.at < .1) {
            const dx = head.x - previous.x, dy = head.y - previous.y, d = Math.hypot(dx, dy) || 1;
            const tx = dx / d, ty = dy / d, nx = -ty, ny = tx;
            const at = (u: number, v: number): readonly [number, number] => [head.x + tx*u + nx*v, head.y + ty*u + ny*v];
            c.globalAlpha = alpha * .52;
            polygon(c, [at(-12,-5), at(-6,-7), at(5,-4), at(7,0), at(4,4), at(-5,7), at(-11,3)], '#8f75a0');
            polygon(c, [at(-4,-6), at(4,-4), at(7,0), at(4,4), at(2,1)], '#82acaf');
        }
        c.restore();
    };
}

export function drawPaperCutGround(c: Ctx, s: SimState): void {
    c.save(); const alpha = c.globalAlpha;
    for (const out of s.cut.outs) {
        const u = (s.elapsed - out.at) / .42;
        if (u < 0 || u >= 1) continue;
        const p = out.points[0], q = out.points.at(-1);
        if (!p || !q) continue;
        const dx = q.x - p.x, dy = q.y - p.y, length = Math.hypot(dx,dy);
        if (length < 1) continue;
        // Lift only a short piece of the last seam. The already-cut terrain
        // shows the rest of the outcome without a second attack outline.
        const span = Math.min(1, 19 / length), x = p.x + dx*span, y = p.y + dy*span;
        const lift = reducedPaperMotion() ? 4 : 2 + Math.sin(Math.PI * u) * 6;
        const side = dx < 0 ? -1 : 1;
        const liftX = dy / length * side * lift, liftY = -dx / length * side * lift - 1;
        c.globalAlpha = alpha * Math.min(1, (1 - u) * 1.6);
        const tip: Point = [p.x + dx*span*.42 + liftX, p.y + dy*span*.42 + liftY];
        const corner: Point = [x + liftX*.48, y + liftY*.48];
        line(c, p.x, p.y + 1, x, y + 1, paper.shadow, 2);
        polygon(c, [[p.x,p.y],[x,y],corner,tip], BACK);
        line(c, p.x,p.y, ...tip, FRONT);
        line(c, ...tip, ...corner, EDGE);
    }
    c.globalAlpha = alpha * .75;
    for (let i = 1; i < s.cut.points.length; i++) {
        const p = s.cut.points[i - 1]!, q = s.cut.points[i]!;
        line(c, p.x, p.y, q.x, q.y, INK, 2);
        line(c, p.x, p.y - 1, q.x, q.y - 1, FRONT);
    }
    c.restore();
}

export function drawPageFoldGround(c: Ctx, s: SimState): void {
    // Physical bridge remains the exact simulation polygon, never an implied
    // opening or decorative slab placed over another route.
    for (const b of s.fold.bridges ?? []) { area(c, b.polygon, '#9a8b80'); edge(c, b.polygon, FRONT); }
    for (const f of s.fold.flaps) {
        const age = s.elapsed - f.at, life = .34;
        if (age < 0 || age >= life) continue;
        const calm = reducedPaperMotion(), progress = calm ? .7 : age / life;
        const tx = -f.ny, ty = f.nx;
        const width = 13 * Math.cos(progress * Math.PI);
        const rise = 8 * Math.sin(progress * Math.PI) * Math.min(1, 2 * (1 - progress));
        const distance = calm ? 18 : 12 + progress * 12;
        const x = f.x + tx * 25 - f.nx * distance, y = f.y + ty * 25 - f.ny * distance;
        const at = (u: number, v: number, z = 0): readonly [number, number] => [x + tx*u - f.nx*v, y + ty*u - f.ny*v - z];
        const a = at(-12,0), b = at(11,0), d = at(-10,width,rise), e = at(7,width*.85,rise);
        const mid = at(1,width*.59,rise*.72);
        c.save(); c.globalAlpha *= Math.min(1, (1 - age / life) * 2.15);
        // Shadow follows the little paper hinge; the reverse comes around as
        // the signed projected width passes through the cut edge.
        c.save(); c.globalAlpha *= .42;
        line(c, a[0]+2, a[1]+3, b[0]+2, b[1]+3, paper.shadow, 3);
        c.restore();
        if (Math.abs(width) >= 1) {
            polygon(c, [a,b,e,d], width >= 0 ? FRONT : BACK);
            polygon(c, [a,d,mid], width >= 0 ? EDGE : paper.reverseShade);
            polygon(c, [mid,e,b], width >= 0 ? '#b89e83' : '#c8c6c4');
            line(c, a[0], a[1], mid[0], mid[1], width >= 0 ? '#9d8469' : EDGE);
        }
        line(c, a[0], a[1], b[0], b[1], EDGE);
        c.restore();
    }
}
