/**
 * The ?gallery=1 page contents and layout, as pure data: one section per
 * registry (cats, enemies, props, landmarks, weapons, passives), one item per
 * registered entry and state, and a grid of cells for a page width. Nothing
 * here names a single id, so new defs appear automatically. No DOM, import-safe
 * in Node (tested in tests/gallery.test.mjs).
 */
import type { MessageKey } from "../content/keys.js";
import { CATS, ENEMY_DEFS, PASSIVE_DEFS, PROP_DEFS, WEAPON_DEFS } from "../defs/index.js";
import { LANDMARK_KINDS } from "../game/world-gen.js";

export type GalleryKind = "cat" | "enemy" | "prop" | "landmark" | "weapon" | "passive";
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
  | "icon";
export interface GalleryItem {
  readonly kind: GalleryKind;
  /** Registry id (cat, enemy, prop, weapon or passive id, or landmark kind). */
  readonly id: string;
  readonly label: MessageKey;
  readonly state: GalleryState;
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
  weapon: { w: 116, h: 120 },
  passive: { w: 116, h: 120 },
};
export const PROP_STATES: readonly GalleryState[] = ["intact", "damaged", "scraps", "burning", "burnt"];

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
    section("prop", "props", items("prop", PROP_DEFS.ids(), (id) => `prop.${id}.name`, () => PROP_STATES)),
    section("landmark", "landmarks", items("landmark", LANDMARK_KINDS, (id) => `landmark.${id}`, () => ["building"])),
    section("weapon", "weapons", items("weapon", WEAPON_DEFS.ids(), (id) => `upgrade.${id}.name`, () => ["icon"])),
    section("passive", "passives", items("passive", PASSIVE_DEFS.ids(), (id) => `upgrade.${id}.name`, () => ["icon"])),
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
