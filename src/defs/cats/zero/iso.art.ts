/**
 * Zero as a baked voxel puppet (scripts/iso-art/puppet.py): swept gold hair
 * over dark roots, sunglasses, a gold chain whose pendant hangs on the cat's
 * left, a broad coat with a cape. Colours and accessories are baked from the
 * official head data (src/cats/, untouched) by scripts/iso-art/dump-inputs.mjs.
 */
import { isoCatPuppet } from "../../../render/iso/cat-sheet.js";
import { ZERO_ART } from "./art.js";

export const ZERO_ISO = isoCatPuppet(ZERO_ART.id);
