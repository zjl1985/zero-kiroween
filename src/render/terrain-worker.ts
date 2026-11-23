// Worker entry point. Art registration is local to this thread.
import "./art-index.js";
import { buildChunk, type TerrainReply, type TerrainRequest } from "./craft-world.js";
import { buildIsoBlock, type IsoBlockRequest } from "./iso/terrain-bake.js";

interface TerrainWorkerScope {
  onmessage: ((event: MessageEvent<TerrainRequest | IsoBlockRequest>) => void) | null;
  postMessage(reply: TerrainReply, transfer?: Transferable[]): void;
}
const scope = self as unknown as TerrainWorkerScope;

scope.onmessage = ({ data }) => {
  let bitmap: ImageBitmap | undefined;
  try {
    // An isometric ground block (terrain field bake) or a legacy top-down chunk.
    const canvas = "kind" in data && data.kind === "iso-block"
      ? buildIsoBlock(data.seed, data.col, data.row)
      : buildChunk(data.seed, (data as TerrainRequest).cx, (data as TerrainRequest).cy, (data as TerrainRequest).layer);
    if (!(canvas instanceof OffscreenCanvas)) throw new Error("Expected a worker canvas");
    bitmap = canvas.transferToImageBitmap();
    scope.postMessage({ id: data.id, bitmap }, [bitmap]);
  } catch {
    bitmap?.close();
    scope.postMessage({ id: data.id, bitmap: null });
  }
};
