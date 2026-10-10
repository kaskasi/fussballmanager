import { compactSaveForCloudBlob } from "./save-compact.ts";
import type { SaveGame } from "./savegame-model.ts";
import { serializeSaveForExport } from "./save-transfer.ts";

const GZIP_MAGIC = 0x1f8b;

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

function hasCompressionStream(): boolean {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}

export async function gzipUtf8(text: string): Promise<Uint8Array> {
  const input = new TextEncoder().encode(text);
  if (!hasCompressionStream()) {
    return input;
  }
  const stream = new Blob([toArrayBuffer(input)]).stream().pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

export async function gunzipUtf8(bytes: Uint8Array): Promise<string> {
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (!isGzip || !hasCompressionStream()) {
    return new TextDecoder().decode(bytes);
  }
  const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buffer);
}

export async function encodeSaveGameBlob(save: SaveGame): Promise<Uint8Array> {
  const compact = compactSaveForCloudBlob(save);
  const json = serializeSaveForExport(compact);
  return gzipUtf8(json);
}

export async function decodeSaveGameBlob(bytes: Uint8Array): Promise<string> {
  return gunzipUtf8(bytes);
}

export function isLikelyGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === (GZIP_MAGIC & 0xff) && bytes[1] === (GZIP_MAGIC >> 8);
}
