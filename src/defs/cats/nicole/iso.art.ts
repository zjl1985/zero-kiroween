/**
 * Nicole as a four-direction isometric pixel sprite: long dark hair heavier on
 * one side, rectangular glasses, a light muzzle, a white T-shirt and jeans.
 * Colours and accessories are read from the official head data (src/cats/,
 * untouched).
 */
import { officialVariant } from "../../../cats/official.js";
import { isoCatSheet } from "../../../render/iso/cat-sheet.js";
import { NICOLE_ART } from "./art.js";

const official = officialVariant(NICOLE_ART.id);

export const NICOLE_ISO = isoCatSheet({
  identity: `cat-${NICOLE_ART.id}`,
  palette: official.palette,
  accessories: official.accessories ?? [],
  body: NICOLE_ART.body,
  hair: { color: "headDark", style: "long" },
  build: "slim",
});
