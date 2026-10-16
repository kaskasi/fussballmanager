import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MemoryBrowserSaveBackend,
  setBrowserSaveBackendForTests,
} from "./browser-save-adapter.ts";
import { newGameSession, saveFromSession } from "./game-session.ts";
import {
  clearLocalSaveCacheForTests,
  resolveSlotSave,
  writeLocalSaveAsync,
} from "./local-save.ts";
import { parseSaveJson, serializeSaveForExport } from "./save-transfer.ts";

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

describe("resolveSlotSave", () => {
  it("keeps an existing backend save instead of starting a new career", async () => {
    const existing = saveFromSession(newGameSession(new Date("2026-01-01T00:00:00Z")));
    existing.manifest.manager_name = "Bleibt";
    await writeLocalSaveAsync(1, existing);
    clearLocalSaveCacheForTests();

    const resolved = await resolveSlotSave(1);
    expect(resolved.created).toBe(false);
    expect(resolved.save.manifest.manager_name).toBe("Bleibt");
    expect(resolved.save.state.week).toBe(existing.state.week);

    const again = await resolveSlotSave(1);
    expect(again.save.manifest.manager_name).toBe("Bleibt");
  });

  it("creates one career only when the slot is empty", async () => {
    const created = await resolveSlotSave(3);
    expect(created.created).toBe(true);
    clearLocalSaveCacheForTests();
    const loaded = await resolveSlotSave(3);
    expect(loaded.created).toBe(false);
    expect(loaded.save.manifest.manager_name).toBe(created.save.manifest.manager_name);
  });

  it("keeps an imported save across a later resolve", async () => {
    const imported = saveFromSession(newGameSession());
    imported.manifest.manager_name = "Import";
    imported.state.season = 2;
    imported.manifest.current_week = { season: 2, week: imported.state.week };
    const raw = serializeSaveForExport(imported);
    const parsed = parseSaveJson(raw);
    await writeLocalSaveAsync(1, parsed);
    clearLocalSaveCacheForTests();
    const resolved = await resolveSlotSave(1);
    expect(resolved.created).toBe(false);
    expect(resolved.save.manifest.manager_name).toBe("Import");
    expect(resolved.save.state.season).toBe(2);
  });
});
