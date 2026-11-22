/** Occupied native-pixel bounds, including contact shadows, at world scale 1.
 * Shared by cache allocation, view culling, actor occlusion and coverage tests.
 * Transparent cache padding is not a substitute for fitting these bounds.
 */
export const PIXEL_DECOR_BOUNDS = {
  tree: { l: -82, r: 82, t: -158, b: 16 },
  cottage: { l: -120, r: 145, t: -150, b: 52 },
  bush: { l: -52, r: 52, t: -44, b: 12 },
  fence: { l: -48, r: 48, t: -54, b: 12 },
  stone: { l: -32, r: 38, t: -46, b: 12 },
  candles: { l: -32, r: 38, t: -40, b: 12 },
  pumpkin: { l: -32, r: 38, t: -40, b: 12 },
  lamp: { l: -32, r: 38, t: -72, b: 10 },
} as const;
