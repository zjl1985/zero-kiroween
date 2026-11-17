import { formatTime, t } from "../content/i18n.js";
import type { Locale, MessageKey } from "../content/keys.js";
import type { SimState } from "../game/types.js";
import { evolutionFor } from "../game/upgrades.js";
import { landmarks } from "../game/world-gen.js";
import { paintPaw } from "../render/journal-ui.js";
import { paces } from "./journal-geometry.js";
import { upgradeName } from "./upgrade-cards.js";
import { catName } from "./character-panel.js";

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
}
/** Stamp ink: seal red after a dawn, night blue after a lost watch. */
const PAW_INK = { won: "#b8453f", lost: "#3e4a78" } as const;

/** The result screen as a night-watch journal entry: date line, logged numbers, landmarks and a paw stamp. */
export function paintJournal(locale: Locale, sim: SimState): void {
  const id = sim.player.id,
    name = catName(locale, id),
    all = landmarks(sim.seed),
    found = sim.landmarksFound
      .map((lid) => all.find((l) => l.id === lid))
      .filter((l) => !!l)
      .map((l) => t(locale, `landmark.${l.kind}` as MessageKey));
  const date = new Date().toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  must("result-date").textContent = t(locale, "result.date", { date, name });
  const evo = evolutionFor(id),
    rows: [MessageKey, string | number][] = [
      ["result.duration", formatTime(sim.elapsed)],
      ["result.kills", sim.stats.kills],
      ["result.level", sim.level],
      ["result.evolution", sim.upgrades[evo] ? upgradeName(locale, evo) : t(locale, "result.none")],
      ["result.distance", t(locale, "result.paces", { n: paces(sim.stats.distance) })],
      ["result.landmarks", `${found.length} / ${all.length}`],
      [
        "result.boss",
        t(
          locale,
          sim.stats.bossDefeated ? "result.boss_down" : sim.boss.spawned ? "result.boss_left" : "result.none",
        ),
      ],
      ["result.streak", sim.stats.bestStreak],
      ["result.elites", sim.stats.elitesDefeated],
      ["result.chests", sim.stats.chestsOpened],
      ["result.pumpkins", sim.stats.pumpkinsLit],
      ["result.props_torn", sim.stats.propsTorn],
      ["result.cells_burnt", sim.stats.cellsBurnt],
    ];
  must("result-stats").replaceChildren(
    ...rows.map(([label, value]) => {
      const row = document.createElement("div"),
        dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = t(locale, label);
      dd.textContent = String(value);
      row.append(dt, dd);
      return row;
    }),
  );
  must("result-landmarks").textContent = found.length
    ? t(locale, "result.landmarks_line", { names: found.join(t(locale, "result.sep")) })
    : t(locale, "result.landmarks_none");
  const paw = must<HTMLCanvasElement>("result-paw"),
    ink = sim.ended === "won" ? PAW_INK.won : PAW_INK.lost,
    sig = `${sim.seed}|${sim.elapsed}|${ink}`;
  if (paw.dataset.sig !== sig) {
    paw.dataset.sig = sig;
    paintPaw(paw, ink, (sim.stats.kills % 97) + 3);
  }
  paw.setAttribute("aria-label", t(locale, "result.paw", { name }));
}
