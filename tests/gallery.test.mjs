import assert from "node:assert/strict";
import { test } from "node:test";
import { BIOME_DEFS, CATS, COSTUME_DEFS, ENEMY_DEFS, PASSIVE_DEFS, PROP_DEFS, TOWNSFOLK_DEFS, WEAPON_DEFS } from "../dist/defs/index.js";
import { LANDMARK_KINDS } from "../dist/game/world-gen.js";
import { MESSAGE_KEYS } from "../dist/content/keys.js";
import { GALLERY_GRID, galleryLayout, gallerySections, PROP_STATES, stateLabel, WASH_STATES } from "../dist/ui/gallery-layout.js";
import { variant } from "../dist/render/variants.js";
import "../dist/render/art-index.js";
import { tornEdge } from "../dist/render/paper-kit.js";
import { tornEdge as legacyTornEdge } from "../dist/render/paper-scraps.js";

const idsOf = (layout, kind) => new Set(layout.cells.filter((c) => c.kind === kind).map((c) => c.id));

test("every registered cat, enemy, prop, landmark, townsfolk, biome, weapon, passive and costume gets a gallery cell", () => {
  for (const width of [320, 760, 1240]) {
    const layout = galleryLayout(gallerySections(), width);
    assert.deepEqual([...idsOf(layout, "cat")], CATS.ids());
    assert.deepEqual([...idsOf(layout, "enemy")], ENEMY_DEFS.ids());
    assert.deepEqual([...idsOf(layout, "prop")], PROP_DEFS.ids());
    assert.deepEqual([...idsOf(layout, "landmark")], [...LANDMARK_KINDS]);
    assert.deepEqual([...idsOf(layout, "biome")], BIOME_DEFS.ids());
    assert.deepEqual([...idsOf(layout, "weapon")], WEAPON_DEFS.ids());
    assert.deepEqual([...idsOf(layout, "passive")], PASSIVE_DEFS.ids());
    assert.deepEqual([...idsOf(layout, "wash")], BIOME_DEFS.ids());
    assert.deepEqual([...idsOf(layout, "townsfolk")], TOWNSFOLK_DEFS.ids());
    assert.deepEqual([...idsOf(layout, "costume")], COSTUME_DEFS.ids());
    assert.equal(layout.headers.length, 10);
  }
});

test("the wardrobe shows every costume on every cat (14 x 2 worn cards)", () => {
  const sections = gallerySections(), wardrobe = sections.find((s) => s.kind === "costume");
  assert.ok(wardrobe, "a wardrobe section");
  assert.equal(wardrobe.title, "gallery.section.wardrobe");
  assert.equal(COSTUME_DEFS.ids().length, 14);
  assert.equal(wardrobe.items.length, COSTUME_DEFS.ids().length * CATS.ids().length);
  assert.deepEqual(wardrobe.items.map((i) => [i.id, i.cat, i.state]),
    COSTUME_DEFS.ids().flatMap((id) => CATS.ids().map((cat) => [id, cat, "worn"])));
  for (const item of wardrobe.items) assert.equal(item.label, `${COSTUME_DEFS.get(item.id).i18n}.name`);
  const cells = galleryLayout(sections, 1000).cells.filter((c) => c.kind === "costume");
  assert.equal(cells.length, 28);
});

test("every district shows a washed-paper swatch: painted, colourless, blank and a mid tide line", () => {
  const cells = galleryLayout(gallerySections(), 1000).cells;
  for (const id of BIOME_DEFS.ids())
    assert.deepEqual(cells.filter((c) => c.kind === "wash" && c.id === id).map((c) => c.state), [...WASH_STATES]);
  assert.deepEqual([...WASH_STATES], ["painted", "colourless", "blank", "tide"]);
});

test("gallery states match cat poses, elite eligibility and the prop's fire rules", () => {
  const cells = galleryLayout(gallerySections(), 1000).cells;
  for (const id of CATS.ids())
    assert.deepEqual(cells.filter((c) => c.id === id && c.kind === "cat").map((c) => c.state), ["idle", "skill"]);
  for (const def of ENEMY_DEFS.all())
    assert.equal(cells.some((c) => c.kind === "enemy" && c.id === def.id && c.state === "elite"), def.eliteable);
  const states = (id) => cells.filter((c) => c.kind === "prop" && c.id === id).map((c) => c.state);
  assert.deepEqual(states("ink-vat"), ["intact", "damaged", "scraps"]);
  assert.deepEqual(states("paper-fence"), [...PROP_STATES]);
  assert.deepEqual(states("wax-candle"), [...PROP_STATES]);
});

test("gallery labels, section titles and state labels are all i18n keys", () => {
  const sections = gallerySections();
  for (const s of sections) {
    assert.ok(MESSAGE_KEYS.includes(s.title), s.title);
    for (const item of s.items) {
      assert.ok(MESSAGE_KEYS.includes(item.label), item.label);
      assert.ok(MESSAGE_KEYS.includes(stateLabel(item.state)), item.state);
    }
  }
  assert.ok(MESSAGE_KEYS.includes("gallery.title"));
});

test("gallery cells stay inside the page and never overlap", () => {
  for (const width of [300, 900, 1240]) {
    const layout = galleryLayout(gallerySections(), width),
      { pad } = GALLERY_GRID;
    for (const c of layout.cells) {
      assert.ok(c.x >= pad - 1e-9 && c.x + c.w <= width - pad + 1e-9, `${c.id} fits ${width}`);
      assert.ok(c.y + c.h <= layout.height);
    }
    for (let i = 0; i < layout.cells.length; i++)
      for (let j = i + 1; j < layout.cells.length; j++) {
        const a = layout.cells[i],
          b = layout.cells[j];
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        assert.ok(apart, `${a.id}/${a.state} vs ${b.id}/${b.state}`);
      }
  }
});

const BASE = {
  palette: ["#556044", "#6c7150", "#737850", "#5a6548"],
  shift: 0.3,
  scale: [0.9, 1.1],
  angle: [-0.05, 0.05],
  wear: [0.1, 0.6],
  flip: true,
};

test("variants: the same seed always gives the same variant", () => {
  for (const seed of [0, 1, 7, 12345, -99, 2 ** 31 - 1]) assert.deepEqual(variant(seed, BASE), variant(seed, BASE));
});

test("variants: different seeds spread within the configured ranges", () => {
  const looks = Array.from({ length: 400 }, (_, i) => variant(i * 7919 + 3, BASE));
  for (const v of looks) {
    assert.ok(v.scale >= 0.9 && v.scale <= 1.1);
    assert.ok(v.angle >= -0.05 && v.angle <= 0.05);
    assert.ok(v.wear >= 0.1 && v.wear <= 0.6);
    assert.ok(v.flip === 1 || v.flip === -1);
    assert.ok(v.index >= 0 && v.index < BASE.palette.length);
    assert.match(v.color, /^#[0-9a-f]{6}$/);
  }
  // Spread: every palette entry is used, both facings occur, ranges are covered.
  assert.equal(new Set(looks.map((v) => v.index)).size, BASE.palette.length);
  assert.equal(new Set(looks.map((v) => v.flip)).size, 2);
  const scales = looks.map((v) => v.scale);
  assert.ok(Math.max(...scales) - Math.min(...scales) > 0.15);
  // Blends between palette neighbours give more colours than the palette has.
  assert.ok(new Set(looks.map((v) => v.color)).size > BASE.palette.length * 4);
  // Neutral defaults when a field is omitted.
  const plain = variant(5, { palette: ["#123456"] });
  assert.deepEqual(plain, { index: 0, color: "#123456", scale: 1, angle: 0, wear: 0, flip: 1 });
});

test("variants do not touch Math.random (render-only hash)", () => {
  const original = Math.random;
  Math.random = () => {
    throw new Error("variant used Math.random");
  };
  try {
    variant(42, BASE);
  } finally {
    Math.random = original;
  }
});

test("paper kit keeps the legacy tornEdge export working", () => {
  assert.equal(legacyTornEdge, tornEdge);
  assert.deepEqual(tornEdge(0, 0, 10, 0, 4, 2, 3), tornEdge(0, 0, 10, 0, 4, 2, 3));
  assert.equal(tornEdge(0, 0, 10, 0, 4, 2, 3).length, 5);
});
