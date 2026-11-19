import type { TownsfolkDef } from "../../types.js";

/** An owl who reads the star charts; knows the observatory and the windmill. */
export const STARGAZER_OWL: TownsfolkDef = {
  id: "stargazer-owl",
  homes: ["star-observatory", "paper-windmill", "moon-hill"],
  wander: { radius: 48, speed: 16, pause: 3.4 },
  talkRadius: 78,
  tips: 3,
};
