import type { SaveGame } from "./savegame-model.ts";

export type SavePayloadEncoding = "json" | "gzip";

export interface SaveSlotRecord {
  slot: number;
  encoding: SavePayloadEncoding;
  /** UTF-8 JSON or gzip bytes */
  bytes: Uint8Array;
  updatedAt: string;
}

export interface BrowserSaveBackend {
  loadRecord(slot: number): Promise<SaveSlotRecord | null>;
  putRecord(record: SaveSlotRecord): Promise<void>;
  deleteRecord(slot: number): Promise<void>;
  hasRecord(slot: number): Promise<boolean>;
}

const DB_NAME = "fc_tycoon_saves";
const DB_VERSION = 1;
const STORE = "slots";

let dbPromise: Promise<IDBDatabase> | null = null;

function openIndexedDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("indexedDB_unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error ?? new Error("idb_open_failed"));
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "slot" });
        }
      };
    });
  }
  return dbPromise;
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("idb_request_failed"));
  });
}

export class IndexedDbBrowserSaveBackend implements BrowserSaveBackend {
  async loadRecord(slot: number): Promise<SaveSlotRecord | null> {
    const db = await openIndexedDb();
    const tx = db.transaction(STORE, "readonly");
    const row = await idbRequest(tx.objectStore(STORE).get(slot));
    if (!row) return null;
    return row as SaveSlotRecord;
  }

  async putRecord(record: SaveSlotRecord): Promise<void> {
    const db = await openIndexedDb();
    const tx = db.transaction(STORE, "readwrite");
    await idbRequest(tx.objectStore(STORE).put(record));
  }

  async deleteRecord(slot: number): Promise<void> {
    const db = await openIndexedDb();
    const tx = db.transaction(STORE, "readwrite");
    await idbRequest(tx.objectStore(STORE).delete(slot));
  }

  async hasRecord(slot: number): Promise<boolean> {
    const record = await this.loadRecord(slot);
    return record !== null;
  }
}

/** In-memory backend for unit tests and environments without IndexedDB. */
export class MemoryBrowserSaveBackend implements BrowserSaveBackend {
  private readonly records = new Map<number, SaveSlotRecord>();

  async loadRecord(slot: number): Promise<SaveSlotRecord | null> {
    return this.records.get(slot) ?? null;
  }

  async putRecord(record: SaveSlotRecord): Promise<void> {
    this.records.set(record.slot, {
      ...record,
      bytes: new Uint8Array(record.bytes),
    });
  }

  async deleteRecord(slot: number): Promise<void> {
    this.records.delete(slot);
  }

  async hasRecord(slot: number): Promise<boolean> {
    return this.records.has(slot);
  }
}

let backendOverride: BrowserSaveBackend | null = null;

export function setBrowserSaveBackendForTests(backend: BrowserSaveBackend | null): void {
  backendOverride = backend;
}

export function resolveBrowserSaveBackend(): BrowserSaveBackend {
  if (backendOverride) return backendOverride;
  if (typeof indexedDB !== "undefined") {
    return new IndexedDbBrowserSaveBackend();
  }
  return new MemoryBrowserSaveBackend();
}

export function supportsCompressionStream(): boolean {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}

export async function encodeSaveJson(json: string): Promise<Pick<SaveSlotRecord, "encoding" | "bytes">> {
  if (supportsCompressionStream()) {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    return { encoding: "gzip", bytes };
  }
  return { encoding: "json", bytes: new TextEncoder().encode(json) };
}

export async function decodeSavePayload(record: SaveSlotRecord): Promise<string> {
  if (record.encoding === "gzip") {
    if (!supportsCompressionStream()) {
      throw new Error("gzip_save_requires_decompression_stream");
    }
    const stream = new Blob([record.bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  }
  return new TextDecoder().decode(record.bytes);
}

export async function serializeSaveForStorage(save: SaveGame): Promise<Pick<SaveSlotRecord, "encoding" | "bytes">> {
  const json = JSON.stringify(save);
  return encodeSaveJson(json);
}

export async function parseSaveFromRecord(record: SaveSlotRecord): Promise<SaveGame> {
  const json = await decodeSavePayload(record);
  return JSON.parse(json) as SaveGame;
}

export async function writeSaveRecordWithRetry(
  backend: BrowserSaveBackend,
  slot: number,
  save: SaveGame,
): Promise<boolean> {
  const payload = await serializeSaveForStorage(save);
  const record: SaveSlotRecord = {
    slot,
    encoding: payload.encoding,
    bytes: payload.bytes,
    updatedAt: new Date().toISOString(),
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await backend.putRecord(record);
      return true;
    } catch (error) {
      console.error("Failed to write save record", { slot, attempt, error });
      if (attempt === 1) return false;
    }
  }
  return false;
}
