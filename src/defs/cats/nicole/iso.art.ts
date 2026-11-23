/**
 * Nicole as a baked voxel puppet (scripts/iso-art/puppet.py): long dark hair
 * heavier on one side, rectangular glasses, a light muzzle, pink cheeks, a
 * white T-shirt and jeans. Colours and accessories are baked from the
 * official head data (src/cats/, untouched) by scripts/iso-art/dump-inputs.mjs.
 */
import { isoCatPuppet } from "../../../render/iso/cat-sheet.js";
import { NICOLE_ART } from "./art.js";

export const NICOLE_ISO = isoCatPuppet(NICOLE_ART.id);
