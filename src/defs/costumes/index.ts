/**
 * Every costume def, in wardrobe order (also the order unlocks are checked).
 * src/defs/index.ts registers this list last, after every other def, and
 * gates each costume's hooks to the night it is worn. Append new costumes.
 */
import type { CostumeDef } from "../types.js";
import { DARIO } from "./dario/def.js";
import { EICH } from "./eich/def.js";
import { GATES } from "./gates/def.js";
import { GUIDO } from "./guido/def.js";
import { HASSABIS } from "./hassabis/def.js";
import { JENSEN } from "./jensen/def.js";
import { JOBS } from "./jobs/def.js";
import { KARPATHY } from "./karpathy/def.js";
import { LEVELS } from "./levels/def.js";
import { LINUS } from "./linus/def.js";
import { MUSK } from "./musk/def.js";
import { POTETO } from "./poteto/def.js";
import { TIBO } from "./tibo/def.js";
import { ZUCKERBERG } from "./zuckerberg/def.js";

export const COSTUME_LIST: readonly CostumeDef[] = [
  TIBO,
  POTETO,
  MUSK,
  JENSEN,
  KARPATHY,
  LINUS,
  GUIDO,
  EICH,
  JOBS,
  GATES,
  ZUCKERBERG,
  HASSABIS,
  LEVELS,
  DARIO,
];
