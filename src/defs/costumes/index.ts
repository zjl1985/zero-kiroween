/**
 * Every costume def, in wardrobe order (also the order unlocks are checked).
 * src/defs/index.ts registers this list last, after every other def, and
 * gates each costume's hooks to the night it is worn. Append new costumes.
 */
import type { CostumeDef } from "../types.js";

export const COSTUME_LIST: readonly CostumeDef[] = [];
