import type { TownsfolkDef } from "../../types.js";

/** A frog who poles across the river and pond; knows about water and dry crossings. */
export const FERRY_FROG: TownsfolkDef = {
  id: "ferry-frog",
  homes: ["stone-bridge", "wishing-well"],
  wander: { radius: 56, speed: 18, pause: 3 },
  talkRadius: 78,
  tips: 3,
};
