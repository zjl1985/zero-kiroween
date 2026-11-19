import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CATS, COSTUME_DEFS } from "../dist/defs/index.js";
import { t } from "../dist/content/i18n.js";
import { emptyProgress, parseCostumePin, unlocksAfter } from "../dist/game/costumes.js";
import { PREF_KEY, readPrefs } from "../dist/ui/prefs.js";
import { costumeCharge, costumeCopy, unlockedLines, wardrobeEntries } from "../dist/ui/wardrobe.js";

const ids = () => COSTUME_DEFS.ids();
const night = (over = {}) => ({
  stats: { kills: 0, damageDealt: 0, shardsCollected: 0, distance: 0 },
  level: 1,
  endReason: "fallen",
  ...over,
});

test("prefs keep the same key and old saves load as plain with no progress", () => {
  assert.equal(PREF_KEY, "midnight-meow-prefs");
  const old = readPrefs({ locale: "zh", cat: CATS.ids()[1], muted: true });
  assert.equal(old.locale, "zh");
  assert.equal(old.cat, CATS.ids()[1]);
  assert.equal(old.muted, true);
  assert.equal(old.costume, null);
  assert.deepEqual(old.progress, emptyProgress());
  for (const raw of [null, 7, "x", [], {}]) {
    const p = readPrefs(raw);
    assert.equal(p.locale, "en");
    assert.equal(p.cat, CATS.ids()[0]);
    assert.equal(p.costume, null);
  }
});

test("a saved costume survives only when it is registered and unlocked", () => {
  const [first, second] = ids();
  const progress = { nights: 2, wins: 1, unlocked: [first] };
  assert.equal(readPrefs({ costume: first, progress }).costume, first);
  assert.equal(readPrefs({ costume: second, progress }).costume, null, "locked falls back to plain");
  assert.equal(readPrefs({ costume: "no-such-cat", progress }).costume, null, "unknown falls back to plain");
  assert.equal(readPrefs({ costume: 3, progress }).costume, null);
  const dirty = readPrefs({ progress: { nights: -4, wins: 9, unlocked: [second, "nope", second, 5, first] } });
  assert.deepEqual(dirty.progress, { nights: 0, wins: 0, unlocked: [first, second] }, "sanitised in wardrobe order");
});

test("prefs round-trip through JSON with costume and progress", () => {
  const { progress } = unlocksAfter(emptyProgress(), night());
  assert.ok(progress.unlocked.length > 0, "a first finished night unlocks something");
  const saved = { locale: "en", cat: CATS.ids()[0], muted: false, costume: progress.unlocked[0], progress };
  assert.deepEqual(readPrefs(JSON.parse(JSON.stringify(saved))), saved);
});

test("?costume pins only registered ids", () => {
  for (const id of ids()) assert.equal(parseCostumePin(id), id);
  for (const bad of [null, "", "none", "plain", "ZERO", " tibo", "__proto__", "toString"])
    assert.equal(parseCostumePin(bad), null, `ignores ${JSON.stringify(bad)}`);
});

test("wardrobe lists plain first, then every costume with its lock state", () => {
  const none = wardrobeEntries(emptyProgress());
  assert.deepEqual(none.map((e) => e.id), [null, ...ids()]);
  assert.deepEqual(none.map((e) => e.unlocked), [true, ...ids().map(() => false)], "only plain at the start");
  const some = wardrobeEntries({ nights: 1, wins: 0, unlocked: [ids()[2]] });
  assert.deepEqual(some.filter((e) => e.unlocked).map((e) => e.id), [null, ids()[2]]);
});

test("wardrobe copy and the result unlock line are localized with the def numbers", () => {
  for (const locale of ["en", "zh"]) {
    assert.equal(costumeCopy(locale, null, "name"), t(locale, "costume.none.name"));
    assert.equal(costumeCopy(locale, null, "unlock"), "");
    for (const def of COSTUME_DEFS.all()) {
      for (const part of ["name", "skill", "desc", "unlock"]) {
        const text = costumeCopy(locale, def.id, part);
        assert.ok(text.length > 0 && !/[{}]/.test(text), `${def.id}.${part} (${locale}) filled: ${text}`);
      }
    }
    const [a, b] = ids();
    const lines = unlockedLines(locale, [a, b]);
    assert.deepEqual(lines, [a, b].map((id) =>
      t(locale, "result.unlocked", { name: costumeCopy(locale, id, "name") })));
    assert.ok(lines[0].includes(costumeCopy(locale, a, "name")));
    assert.deepEqual(unlockedLines(locale, []), []);
  }
});

test("a finished night's newly unlocked costumes feed the result lines once", () => {
  const first = unlocksAfter(emptyProgress(), night());
  const again = unlocksAfter(first.progress, night());
  assert.ok(first.newly.length > 0);
  for (const id of first.newly) assert.ok(!again.newly.includes(id), `${id} is announced once`);
  assert.equal(unlockedLines("en", first.newly).length, first.newly.length);
});

test("HUD costume charge fills from 0 to 1 as the timer runs down", () => {
  assert.equal(costumeCharge(10, 10), 0);
  assert.equal(costumeCharge(5, 10), 0.5);
  assert.equal(costumeCharge(0, 10), 1);
  assert.equal(costumeCharge(-1, 10), 1);
  assert.equal(costumeCharge(20, 10), 0);
  assert.equal(costumeCharge(3, 0), 1);
});

test("the page has the wardrobe strip, HUD tag and result unlock line; locked tags are guarded", () => {
  const html = readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
  for (const hook of ['class="wardrobe-strip"', 'id="wardrobe-label"', 'id="hud-costume"', 'id="result-unlocked"'])
    assert.ok(html.includes(hook), hook);
  assert.match(html, /id="hud-costume" class="costume-tag hidden"/, "the HUD tag starts hidden (plain runs)");
  const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
  assert.match(main, /!isUnlocked\(progress, costume\)\) return/, "a locked ticket click is ignored");
  assert.match(main, /pinnedCostume\(\) \?\? selectedCostume/, "the pin wears for the run only");
  assert.match(main, /savePrefs\(\{ locale, cat: selectedCat, muted, costume: selectedCostume, progress \}\)/,
    "only the chosen costume is saved");
  assert.equal(main.match(/selectedCostume = /g)?.length, 1, "only a wardrobe click changes the saved choice");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /\.wardrobe-strip\s*\{[^}]*overflow-x:\s*auto/, "the strip scrolls sideways");
});
