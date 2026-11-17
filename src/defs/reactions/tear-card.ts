import { tearRow } from "./tear.js";

/** Card (fences) tears too, more slowly through its tearability. */
export const TEAR_CARD = tearRow("tear-card", "card", "cut", 1);
