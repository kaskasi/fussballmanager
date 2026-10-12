import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSave } from "./savegame-model.ts";
import {
  MemoryBrowserSaveBackend,
  parseSaveFromRecord,
  serializeSaveForStorage,
  setBrowserSaveBackendForTests,
  writeSaveRecordWithRetry,
} from "./browser-save-adapter.ts";
import {
  clearLocalSaveCacheForTests,
  hydrateLocalSaveFromBackend,
  tryWriteLocalSaveAsync,
} from "./local-save.ts";

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  clearLocalSaveCacheForTests();
  setBrowserSaveBackendForTests(new MemoryBrowserSaveBackend());
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  setBrowserSaveBackendForTests(null);
  clearLocalSaveCacheForTests();
});

describe("browser save adapter", () => {
  it("round-trips a save through the memory backend", async () => {
    const save = createSave({
      nowIso: new Date().toISOString(),
      playerClubId: "club",
      managerName: "Test",
      season: 2,
      week: 10,
      masterSeed: 42,
    });
    const backend = new MemoryBrowserSaveBackend();
    expect(await writeSaveRecordWithRetry(backend, 1, save)).toBe(true);
    const record = await backend.loadRecord(1);
    expect(record).not.toBeNull();
    const loaded = await parseSaveFromRecord(record!);
    expect(loaded.state.season).toBe(2);
    expect(loaded.manifest.manager_name).toBe("Test");
  });

  it("serializes and parses json payload", async () => {
    const save = createSave({
      nowIso: new Date().toISOString(),
      playerClubId: "club",
      managerName: "Test",
      season: 1,
      week: 1,
      masterSeed: 1,
    });
    const payload = await serializeSaveForStorage(save);
    const parsed = await parseSaveFromRecord({
      slot: 1,
      encoding: payload.encoding,
      bytes: payload.bytes,
      updatedAt: new Date().toISOString(),
    });
    expect(parsed.manifest.save_version).toBe(save.manifest.save_version);
  });

  it("migrates legacy localStorage into the backend on hydrate", async () => {
    const save = createSave({
      nowIso: new Date().toISOString(),
      playerClubId: "club",
      managerName: "Legacy",
      season: 3,
      week: 5,
      masterSeed: 9,
    });
    memory.set("fm_save_slot_2", JSON.stringify(save));
    const hydrated = await hydrateLocalSaveFromBackend(2);
    expect(hydrated?.manifest.manager_name).toBe("Legacy");
    expect(await tryWriteLocalSaveAsync(2, hydrated!)).toBe(true);
    expect(memory.has("fm_save_slot_2")).toBe(false);
  });
});
