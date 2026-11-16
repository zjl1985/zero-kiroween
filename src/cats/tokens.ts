import type { MascotPalette, PixelToken } from "./types.js";

const TOKEN_KEYS: Record<Exclude<PixelToken, "M">, Exclude<keyof MascotPalette, "mark">> = {
  K: "ink",
  D: "headDark",
  H: "head",
  L: "headLight",
  R: "earInner",
  B: "blush",
  W: "white",
  N: "nose",
};

export function tokenColor(token: PixelToken, palette: MascotPalette): string {
  if (token === "M") return palette.mark ?? palette.headDark;
  return palette[TOKEN_KEYS[token]];
}

export function isPixelToken(token: string): token is PixelToken {
  return token === "M" || token in TOKEN_KEYS;
}
