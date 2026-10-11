import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newGameSession, saveFromSession } from "./game-session.ts";
import { loadLocalSave } from "./local-save.ts";
import {
  importSaveJson,
  parseSaveJson,
  saveExportFilename,
  serializeSaveForExport,
} from "./save-transfer.ts";
import { SaveVersionMismatchError, SAVE_VERSION } from "./savegame-model.ts";

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
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
  memory.delete("fm_save_slot_2");
  vi.unstubAllGlobals();
});

describe("save transfer", () => {
  it("round-trips a save through JSON export/import", () => {
    const save = saveFromSession(newGameSession(new Date("2026-09-22T14:00:00Z")));
    const raw = serializeSaveForExport(save);
    const imported = importSaveJson(raw, 2);
    expect(imported.manifest.manager_name).toBe(save.manifest.manager_name);
    expect(imported.state.week).toBe(save.state.week);
    expect(imported.manifest.save_version).toBe(SAVE_VERSION);
    expect(loadLocalSave(2)?.state.season).toBe(save.state.season);
  });

  it("rejects save_version below SAVE_VERSION on import", () => {
    const save = saveFromSession(newGameSession());
    save.manifest.save_version = 1;
    save.manifest.migrations_applied = [];
    const raw = serializeSaveForExport(save);
    expect(() => parseSaveJson(raw)).toThrow(SaveVersionMismatchError);
  });

  it("rejects save_version above SAVE_VERSION on import", () => {
    const save = saveFromSession(newGameSession());
    save.manifest.save_version = SAVE_VERSION + 5;
    const raw = serializeSaveForExport(save);
    expect(() => parseSaveJson(raw)).toThrow(SaveVersionMismatchError);
  });

  it("builds a stable export filename", () => {
    const save = saveFromSession(newGameSession());
    expect(saveExportFilename(save)).toMatch(/^fussballmanager_Jan_s\d+_w-?\d+\.json$/);
  });
});
