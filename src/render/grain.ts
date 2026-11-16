import { visHash } from "./hash.js";

let paper: HTMLCanvasElement | null = null;
let pixel: HTMLCanvasElement | null = null;

function makeNoise(
  width: number,
  height: number,
  seed: number,
  color: [number, number, number],
  alphaMin: number,
  alphaMax: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const image = ctx.createImageData(width, height);
  const data = image.data;
  for (let i = 0, p = 0; i < width * height; i += 1, p += 4) {
    const n = visHash(seed + i * 97);
    const m = visHash(seed + i * 193 + 17);
    const a = alphaMin + (alphaMax - alphaMin) * n;
    data[p] = color[0] + Math.floor((m - 0.5) * 18);
    data[p + 1] = color[1] + Math.floor((m - 0.4) * 14);
    data[p + 2] = color[2] + Math.floor((n - 0.5) * 10);
    data[p + 3] = Math.max(0, Math.min(255, Math.round(a * 255)));
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export function paperGrain(): HTMLCanvasElement {
  if (!paper) paper = makeNoise(256, 256, 2026, [120, 108, 90], 0.015, 0.045);
  return paper;
}

export function pixelGrain(): HTMLCanvasElement {
  if (!pixel) pixel = makeNoise(128, 128, 77, [70, 62, 54], 0.03, 0.08);
  return pixel;
}

/** SVG crayon-tooth filter, reimplemented from the Meow Wall softness idea. */
export function ensureCrayonFilter(): void {
  if (document.getElementById("mm-crayon")) return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.style.left = "-999px";
  svg.innerHTML = `
    <defs>
      <filter id="mm-crayon" x="-3%" y="-3%" width="106%" height="106%">
        <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="1" seed="11" result="rough"/>
        <feDisplacementMap in="SourceGraphic" in2="rough" scale="0.8"
          xChannelSelector="R" yChannelSelector="B"/>
      </filter>
    </defs>`;
  document.body.appendChild(svg);
}
