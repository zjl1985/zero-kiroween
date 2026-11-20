export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;

/** The portrait camera trades horizontal reach for vertical reach at the same scale on both axes. */
const PORTRAIT_HEIGHT = 720;

export function boardLayout(width: number, height: number, dpr: number, inRun: boolean) {
  if (inRun && width <= height) {
    return {
      cssX: 0, cssY: 0, cssW: width, cssH: height,
      viewWidth: PORTRAIT_HEIGHT * width / height, viewHeight: PORTRAIT_HEIGHT,
    };
  }
  const { cssX, cssY, cssW, cssH } = viewport(width, height, dpr, false);
  return { cssX, cssY, cssW, cssH, viewWidth: VIEW_WIDTH, viewHeight: VIEW_HEIGHT };
}

/** One viewport for presentation and DOM controls, measured in device pixels first. */
export function viewport(
  width: number,
  height: number,
  dpr: number,
  integerFit = true,
) {
  const ratio = Math.max(1, dpr);
  const fit = Math.max(
    0,
    Math.min(
      Math.floor(width * ratio) / VIEW_WIDTH,
      Math.floor(height * ratio) / VIEW_HEIGHT,
    ),
  );
  const whole = Math.floor(fit);
  // Snap only when it costs at most 10% of the available area on either axis.
  // Otherwise use nearest-neighbour enlargement followed by a gentle downsample.
  const scale = integerFit && whole >= 1 && whole / fit >= 0.9 ? whole : fit;
  const w = VIEW_WIDTH * scale;
  const h = VIEW_HEIGHT * scale;
  const x = Math.floor((width * ratio - w) / 2);
  const y = Math.floor((height * ratio - h) / 2);
  return {
    x,
    y,
    w,
    h,
    scale,
    cssX: x / ratio,
    cssY: y / ratio,
    cssW: w / ratio,
    cssH: h / ratio,
  };
}
