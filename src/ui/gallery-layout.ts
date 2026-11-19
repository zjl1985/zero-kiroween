/**
 * The ?gallery=1 page contents and layout, as pure data: one section per
 * registry (cats, enemies, props, landmarks, townsfolk, district biomes, weapons,
 * passives, the costume wardrobe), one item per
 * registered entry and state, and a grid of cells for a page width. Nothing
 * here names a single id, so new defs appear automatically. No DOM, import-safe
 * in Node (tested in tests/gallery.test.mjs).
 */
import type { MessageKey } from "../content/keys.js";
import { BIOME_DEFS, CATS, COSTUME_DEFS, ENEMY_DEFS, LANDMARK_DEFS, MATERIALS, PASSIVE_DEFS, PROP_DEFS, TOWNSFOLK_DEFS, WEAPON_DEFS } from "../defs/index.js";

export type GalleryKind = "cat" | "enemy" | "prop" | "landmark" | "townsfolk" | "biome" | "wash" | "weapon" | "passive" | "costume";
export type GalleryState =
  | "idle"
  | "skill"
  | "normal"
  | "elite"
  | "intact"
  | "damaged"
  | "scraps"
  | "burning"
  | "burnt"
  | "building"
  | "ground"
  | "painted"
  | "colourless"
  | "blank"
  | "tide"
  | "icon"
  | "worn";
export interface GalleryItem {
  readonly kind: GalleryKind;
  /** Registry id (cat, enemy, prop, biome, weapon or passive id, or landmark kind). */
  readonly id: string;
  readonly label: MessageKey;
  readonly state: GalleryState;
  /** Wardrobe cells: the cat wearing the costume `id`. */
  readonly cat?: string;
}
export interface GallerySection {
  readonly kind: GalleryKind;
  readonly title: MessageKey;
  /** Cell size in CSS px. */
  readonly cell: { readonly w: number; readonly h: number };
  readonly items: readonly GalleryItem[];
}
export const stateLabel = (s: GalleryState): MessageKey => `gallery.state.${s}` as MessageKey;

/** Cell sizes per section (presentation only). */
export const GALLERY_CELL: Readonly<Record<GalleryKind, { readonly w: number; readonly h: number }>> = {
  cat: { w: 190, h: 200 },
  enemy: { w: 170, h: 170 },
  prop: { w: 170, h: 140 },
  landmark: { w: 340, h: 300 },
  townsfolk: { w: 150, h: 150 },
  biome: { w: 260, h: 170 },
  wash: { w: 220, h: 160 },
  weapon: { w: 116, h: 120 },
  passive: { w: 116, h: 120 },
  costume: { w: 250, h: 210 },
};
export const PROP_STATES: readonly GalleryState[] = ["intact", "damaged", "scraps", "burning", "burnt"];
/** Washed-paper swatches per district: painted, colourless pencil, erased blank and a mid-transition tide line. */
export const WASH_STATES: readonly GalleryState[] = ["painted", "colourless", "blank", "tide"];

const items = (kind: GalleryKind, ids: readonly string[], label: (id: string) => string, states: (id: string) => readonly GalleryState[]) =>
  ids.flatMap((id) => states(id).map((state) => ({ kind, id, label: label(id) as MessageKey, state })));

/** Every section of the gallery, built from the registries in registration order. */
export function gallerySections(): GallerySection[] {
  const section = (kind: GalleryKind, title: string, list: GalleryItem[]): GallerySection => ({
    kind,
    title: `gallery.section.${title}` as MessageKey,
    cell: GALLERY_CELL[kind],
    items: list,
  });
  return [
    section("cat", "cats", items("cat", CATS.ids(), (id) => `${id}.name`, () => ["idle", "skill"])),
    section(
      "enemy",
      "enemies",
      items("enemy", ENEMY_DEFS.ids(), (id) => `enemy.${id}.name`, (id) =>
        ENEMY_DEFS.get(id).eliteable ? ["normal", "elite"] : ["normal"],
      ),
    ),
    section("prop", "props", items("prop", PROP_DEFS.ids(), (id) => `prop.${id}.name`, (id) => {
      const prop = PROP_DEFS.get(id);
      return prop.accepts.includes("fire") && MATERIALS.get(prop.material).flammability > 0
        ? PROP_STATES : ["intact", "damaged", "scraps"];
    })),
    section("landmark", "landmarks", items("landmark", LANDMARK_DEFS.ids(), (id) => `landmark.${id}`, () => ["building"])),
    section("townsfolk", "townsfolk", items("townsfolk", TOWNSFOLK_DEFS.ids(), (id) => `townsfolk.${id}.name`, () => ["idle"])),
    section("biome", "biomes", items("biome", BIOME_DEFS.ids(), (id) => `biome.${id}.name`, () => ["ground"])),
    section("wash", "wash", items("wash", BIOME_DEFS.ids(), (id) => `biome.${id}.name`, () => WASH_STATES)),
    section("weapon", "weapons", items("weapon", WEAPON_DEFS.ids(), (id) => `upgrade.${id}.name`, () => ["icon"])),
    section("passive", "passives", items("passive", PASSIVE_DEFS.ids(), (id) => `upgrade.${id}.name`, () => ["icon"])),
    // Every costume on every cat: full body, portrait with makeup and the skill preview.
    section("costume", "wardrobe", COSTUME_DEFS.all().flatMap((def) => CATS.ids().map((cat) => ({
      kind: "costume" as const, id: def.id, cat, label: `${def.i18n}.name` as MessageKey, state: "worn" as const,
    })))),
  ];
}

export interface GalleryCell extends GalleryItem {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export interface GalleryHeader {
  readonly kind: GalleryKind;
  readonly title: MessageKey;
  readonly x: number;
  readonly y: number;
  readonly w: number;
}
export interface GalleryLayout {
  readonly width: number;
  readonly height: number;
  readonly headers: readonly GalleryHeader[];
  readonly cells: readonly GalleryCell[];
}
/**
 * Developer check views of the gallery, chosen only by the page URL
 * (`?gallery=1&check=value|gloss`); never reachable from the game UI.
 * `value` shows luminance only, `gloss` outlines cells that used gradients,
 * blurred shadows or additive light.
 */
export type GalleryCheck = "none" | "value" | "gloss";
export const GALLERY_CHECKS: readonly GalleryCheck[] = ["none", "value", "gloss"];
/** The check view named by a location.search string; anything else is "none". */
export function galleryCheck(search: string): GalleryCheck {
  const v = new URLSearchParams(search).get("check");
  return v === "value" || v === "gloss" ? v : "none";
}

export const GALLERY_GRID = { pad: 24, gap: 14, header: 46, sectionGap: 22 } as const;

/** Cells for a page `width` (CSS px): sections stacked, each a left-aligned grid. */
export function galleryLayout(sections: readonly GallerySection[], width: number): GalleryLayout {
  const { pad, gap, header, sectionGap } = GALLERY_GRID,
    inner = Math.max(1, width - pad * 2),
    headers: GalleryHeader[] = [],
    cells: GalleryCell[] = [];
  let y = pad;
  for (const s of sections) {
    if (!s.items.length) continue;
    headers.push({ kind: s.kind, title: s.title, x: pad, y, w: inner });
    y += header;
    // Cells shrink to fit when the page is narrower than one cell.
    const w = Math.min(s.cell.w, inner),
      h = Math.round((s.cell.h * w) / s.cell.w),
      cols = Math.max(1, Math.floor((inner + gap) / (w + gap)));
    s.items.forEach((item, i) =>
      cells.push({ ...item, x: pad + (i % cols) * (w + gap), y: y + Math.floor(i / cols) * (h + gap), w, h }),
    );
    y += Math.ceil(s.items.length / cols) * (h + gap) - gap + sectionGap;
  }
  return { width, height: Math.ceil(y - sectionGap + pad), headers, cells };
}
