/**
 * Zero as a four-direction isometric pixel sprite: swept gold hair over dark
 * roots, sunglasses, gold chain on the bib, a broad coat with a cape. Colours
 * and accessories are read from the official head data (src/cats/, untouched).
 */
import { officialVariant } from "../../../cats/official.js";
import { isoCatSheet } from "../../../render/iso/cat-sheet.js";
import { ZERO_ART } from "./art.js";

const official = officialVariant(ZERO_ART.id);

export const ZERO_ISO = isoCatSheet({
  identity: `cat-${ZERO_ART.id}`,
  palette: official.palette,
  accessories: official.accessories ?? [],
  body: ZERO_ART.body,
  hair: { color: "mark", root: "headDark", style: "swept" },
  build: "broad",
});
