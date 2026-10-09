import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialEstimateForPlayer } from "../scouting/market-list.ts";
import { newGameSession, saveFromSession } from "./game-session.ts";
import { loadLocalSave } from "./local-save.ts";
import {
  importSaveJson,
  parseSaveJson,
  saveExportFilename,
  serializeSaveForExport,
} from "./save-transfer.ts";
import { SAVE_VERSION } from "./savegame-model.ts";
import { APPLIED_MIGRATION_IDS } from "./migrations/ids.ts";

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

  it("migrates an older save on import", () => {
    const save = saveFromSession(newGameSession());
    save.manifest.save_version = 1;
    save.manifest.migrations_applied = [];
    const imported = parseSaveJson(serializeSaveForExport(save));
    expect(imported.manifest.save_version).toBe(SAVE_VERSION);
    expect(imported.state.pipeline?.training_plan.length).toBeGreaterThan(0);
  });

  it("migrates scout snapshots to knowledge-only targets", () => {
    const session = newGameSession();
    const save = saveFromSession(session);
    const player = session.rivalPlayers.find((entry) => entry.squad_status === "pro")!;
    expect(player).toBeTruthy();
    const legacyTarget = {
      playerId: player.id,
      estimate: initialEstimateForPlayer(player, 0),
      assigned: false,
      player,
    };
    save.state.pipeline!.scout_board.targets[player.id] = legacyTarget as typeof legacyTarget & {
      playerId: string;
      estimate: (typeof legacyTarget)["estimate"];
      assigned: boolean;
    };
    save.manifest.save_version = 35;
    save.manifest.migrations_applied = APPLIED_MIGRATION_IDS.filter(
      (id) => id !== "migration_036_scout_knowledge",
    );

    const imported = parseSaveJson(serializeSaveForExport(save));
    const migrated = imported.state.pipeline!.scout_board.targets[player.id]!;
    expect(migrated.playerId).toBe(player.id);
    expect("player" in migrated).toBe(false);
  });

  it("builds a stable export filename", () => {
    const save = saveFromSession(newGameSession());
    expect(saveExportFilename(save)).toMatch(/^fussballmanager_Jan_s\d+_w-?\d+\.json$/);
  });
});
