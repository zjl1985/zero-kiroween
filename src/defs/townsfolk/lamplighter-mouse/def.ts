import type { TownsfolkDef } from "../../types.js";

/** A mouse who tends the market lanterns; knows about fire, water and repainting colour. */
export const LAMPLIGHTER_MOUSE: TownsfolkDef = {
  id: "lamplighter-mouse",
  homes: ["lantern-market", "paper-teahouse"],
  wander: { radius: 64, speed: 22, pause: 2.6 },
  talkRadius: 78,
  tips: 3,
};
