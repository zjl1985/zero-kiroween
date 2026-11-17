import type { MaterialDef } from "./types.js";

/** Paper materials. Numbers are multipliers on a prop's base values. */
export const THIN_PAPER: MaterialDef = { id: "thin-paper", durability: 1, flammability: 1, tearability: 1 };
export const CARD: MaterialDef = { id: "card", durability: 1.2, flammability: 0, tearability: 0.7 };
export const INK: MaterialDef = { id: "ink", durability: 1, flammability: 0, tearability: 0.3 };
export const CLOTH: MaterialDef = { id: "cloth", durability: 1.5, flammability: 0, tearability: 0.4 };
export const WAX: MaterialDef = { id: "wax", durability: 0.8, flammability: 0.5, tearability: 0.5 };
