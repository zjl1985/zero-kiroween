// Worker entry point. Art registration is local to this thread.
import "./art-index.js";
import { buildChunk, type TerrainReply, type TerrainRequest } from "./craft-world.js";
import { buildIsoBlock, type IsoBlockReply, type IsoBlockRequest } from "./iso/terrain-bake.js";

interface TerrainWorkerScope {
  onmessage: ((event: MessageEvent<TerrainRequest | IsoBlockRequest>) => void) | null;
  postMessage(reply: TerrainReply | IsoBlockReply, transfer?: Transferable[]): void;
}
const scope = self as unknown as TerrainWorkerScope;

function toBitmap(canvas: unknown): ImageBitmap {
  if (!(canvas instanceof OffscreenCanvas)) throw new Error("Expected a worker canvas");
  return canvas.transferToImageBitmap();
}

scope.onmessage = ({ data }) => {
  const made: ImageBitmap[] = [];
  try {
    if ("kind" in data && data.kind === "iso-block") {
      // An isometric ground block (terrain field bake) plus its ripple overlay frames.
      const { ground, ripples, box } = buildIsoBlock(data.seed, data.col, data.row);
      const bitmap = toBitmap(ground);
      made.push(bitmap);
      const frames = ripples.map((r) => { const b = toBitmap(r); made.push(b); return b; });
      scope.postMessage({ id: data.id, bitmap, ripples: frames, ...(box ? { box } : {}) }, made);
    } else {
      // A legacy top-down chunk.
      const request = data as TerrainRequest, bitmap = toBitmap(buildChunk(request.seed, request.cx, request.cy, request.layer));
      made.push(bitmap);
      scope.postMessage({ id: request.id, bitmap }, made);
    }
  } catch {
    made.forEach((b) => b.close());
    scope.postMessage({ id: data.id, bitmap: null });
  }
};
