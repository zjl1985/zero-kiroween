// Worker entry point. Art registration is local to this thread.
import "./art-index.js";
import { buildChunk, type TerrainReply, type TerrainRequest } from "./craft-world.js";

interface TerrainWorkerScope {
  onmessage: ((event: MessageEvent<TerrainRequest>) => void) | null;
  postMessage(reply: TerrainReply, transfer?: Transferable[]): void;
}
const scope = self as unknown as TerrainWorkerScope;

scope.onmessage = ({ data: { id, seed, cx, cy, layer } }) => {
  let bitmap: ImageBitmap | undefined;
  try {
    const canvas = buildChunk(seed, cx, cy, layer);
    if (!(canvas instanceof OffscreenCanvas)) throw new Error("Expected a worker canvas");
    bitmap = canvas.transferToImageBitmap();
    scope.postMessage({ id, bitmap }, [bitmap]);
  } catch {
    bitmap?.close();
    scope.postMessage({ id, bitmap: null });
  }
};
