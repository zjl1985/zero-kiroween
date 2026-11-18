/** Card art for paper-armor. */
import type { PassiveArt } from "../../render/art-registry.js";
import { mix } from "../../render/paper-material.js";
import { crease, paperEmblem } from "../../render/paper-kit.js";

/** A sheet with its top-right corner folded over, as [sheet, flap]. */
function sheet(x: number, y: number, w: number, h: number, dog: number): [[number, number][], [number, number][]] {
  return [
    [[x, y], [x + w - dog, y], [x + w, y + dog], [x + w, y + h], [x, y + h]],
    [[x + w - dog, y], [x + w - dog, y + dog], [x + w, y + dog]],
  ];
}
export const PAPER_ARMOR_ART: PassiveArt = {
  id: "paper-armor",
  /** Three thick sheets stacked like armour plates; the front one is stitched with a dog-eared corner. */
  icon(ctx, ink) {
    const [front, flap] = sheet(5, 5, 17, 19, 5);
    paperEmblem(ctx, [
      { shape: sheet(11, 11, 17, 18, 0)[0], color: "#b0a387" },
      { shape: sheet(8, 8, 17, 18, 0)[0], color: "#cfc3a8" },
      { shape: front, color: "#efe6d2", stitch: "#9c8f77" },
    ]);
    ctx.save();
    ctx.fillStyle = mix("#efe6d2", "#1c142b", 0.2);
    ctx.beginPath();
    ctx.moveTo(...flap[0]!);
    ctx.lineTo(...flap[1]!);
    ctx.lineTo(...flap[2]!);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    crease(ctx, flap[0]![0], flap[0]![1], flap[2]![0], flap[2]![1], 0.8);
    crease(ctx, 9, 20, 18, 20, 0.35);
  },
};
