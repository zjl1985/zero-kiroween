export type CanvasSurface = HTMLCanvasElement | OffscreenCanvas;
export type CanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** A scratch surface for the same procedural painters on the page and in a worker. */
export function surface(width: number, height: number): CanvasSurface {
  if (typeof document === "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
