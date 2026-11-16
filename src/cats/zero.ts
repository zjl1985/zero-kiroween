import type { CatDef } from "./types.js";

/** Meow Wall special guest Zero: slick gold hair, sunglasses, chain, black shirt. */
export const ZERO: CatDef = {
  id: "zero",
  palette: {
    head: "#E3B686",
    headDark: "#1B1716",
    headLight: "#F6D3A0",
    earInner: "#D98B80",
    ink: "#120B18",
    blush: "#D8948C",
    nose: "#5A3828",
    white: "#FFFFFF",
    mark: "#F0C341",
  },
  markings: {
    7: "..........MMMMMMMMMM............",
    8: "........MMMMMMMMMMMMMM..........",
    9: ".......MM.M.MMMMM.MMMM..........",
    10: "......MM...MMMMM...MMM..........",
    11: "...........MMMM.................",
    12: "...........MMM..................",
    24: "........DDDDDDDDDDDDDDDD........",
    25: ".......DDDDDDDDDDDDDDDDDD.......",
    26: "......DDDDDDDDDDDDDDDDDDDD......",
  },
  accessories: ["sunglasses", "gold-chain"],
  bodyFill: "#1B1716",
  bodyInk: "#120B18",
};
