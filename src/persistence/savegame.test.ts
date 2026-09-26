import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { applyMigrations, assertMigrationOrder, type SaveMigration } from "./migrations/index.ts";
import {
  createSave,
  loadSave,
  SaveIncompleteError,
  SaveRefusedError,
  saveFolderName,
  saveToFolder,
  SAVE_VERSION,
  type SaveGame,
} from "./savegame.ts";
import { sanitizeForExport } from "./sanitizer.ts";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "fm-save-"));
  dirs.push(dir);
  return dir;
}

function sampleSave(): SaveGame {
  const player = clonePlayer();
  player.history.growth.push({
    season: 1,
    age: 19,
    attributes_snapshot: player.attributes,
    minutes_played: 900,
    drive_at_snapshot: 1,
  });
  const save = createSave({
    nowIso: "2026-09-22T14:00:00Z",
    playerClubId: "cl_fc_nordstern",
    managerName: "Max Muster",
    season: 1,
    week: 34,
    masterSeed: 1234567,
    players: [player],
  });
  save.history = [{ week: 34, player: player.id, fee: 0 }];
  save.rng_state.chain_details = { secret: true };
  return save;
}

describe("save folder", () => {
  it("names a slot and rejects a path", () => {
    expect(saveFolderName("nordstern", 1)).toBe("savegame_nordstern_1");
    expect(() => saveFolderName("../x", 1)).toThrow(/Save name/);
  });

  it("refuses to save during the sim or away from the weekend", async () => {
    const root = await tempDir();
    const dir = path.join(root, saveFolderName("nordstern", 1));
    const save = sampleSave();
    await expect(saveToFolder(dir, save, { weekend: true, simulating: true })).rejects.toBeInstanceOf(SaveRefusedError);
    await expect(saveToFolder(dir, save, { weekend: false, simulating: false })).rejects.toBeInstanceOf(SaveRefusedError);
    await expect(loadSave(dir)).rejects.toBeInstanceOf(SaveIncompleteError);
  });

  it("round-trips every file and keeps hidden values locally", async () => {
    const root = await tempDir();
    const dir = path.join(root, saveFolderName("nordstern", 1));
    const save = sampleSave();
    await saveToFolder(dir, save, { weekend: true, simulating: false });
    const loaded = await loadSave(dir);
    expect(loaded.manifest.save_version).toBe(SAVE_VERSION);
    expect(loaded.manifest.migrations_applied).toEqual([
      "migration_002_pipeline_state",
      "migration_003_youth_inbox",
    ]);
    expect(loaded.players[0]?.hidden.drive).toBe(1);
    expect(loaded.players[0]?.hidden.anlage.passing).toBe(1.1);
    expect(loaded.history).toEqual(save.history);
    expect(loaded.rng_state.chain_details).toEqual({ secret: true });
    const onDisk = await readFile(path.join(dir, "players.json"), "utf8");
    expect(onDisk).toContain("anlage");
    expect(onDisk).toContain("drive");
    const leftovers = await readFile(path.join(dir, "manifest.json"), "utf8");
    expect(leftovers).not.toContain(".tmp");
  });

  it("refuses a folder that lost a file", async () => {
    const root = await tempDir();
    const dir = path.join(root, saveFolderName("nordstern", 1));
    await saveToFolder(dir, sampleSave(), { weekend: true, simulating: false });
    await rm(path.join(dir, "players.json"));
    await expect(loadSave(dir)).rejects.toBeInstanceOf(SaveIncompleteError);
  });

  it("refuses a state week that does not match the manifest", async () => {
    const root = await tempDir();
    const dir = path.join(root, saveFolderName("nordstern", 1));
    await saveToFolder(dir, sampleSave(), { weekend: true, simulating: false });
    await writeFile(path.join(dir, "state.json"), `${JSON.stringify({ season: 1, week: 1 })}\n`);
    await expect(loadSave(dir)).rejects.toBeInstanceOf(SaveIncompleteError);
  });
});

describe("export sanitizer", () => {
  it("drops hidden values, drive snapshots, and chain details without touching the local save", () => {
    const save = sampleSave();
    const exported = sanitizeForExport(save);
    expect(exported.manifest.sanitized).toBe(true);
    expect(save.players[0]?.hidden.drive).toBe(1);
    expect(save.rng_state.chain_details).toEqual({ secret: true });
    const names = collectKeys(exported);
    expect(names).not.toContain("hidden");
    expect(names).not.toContain("anlage");
    expect(names).not.toContain("drive");
    expect(names).not.toContain("drive_at_snapshot");
    expect(names).not.toContain("chain_details");
  });
});

describe("migrations", () => {
  it("runs 001 before 002 and records each id once", () => {
    const save = sampleSave();
    const migrations: SaveMigration[] = [
      {
        id: "migration_001_note",
        apply: (current) => {
          current.history.push({ step: 1 });
          return current;
        },
      },
      {
        id: "migration_002_note",
        apply: (current) => {
          current.history.push({ step: 2 });
          return current;
        },
      },
    ];
    const once = applyMigrations(save, migrations);
    const twice = applyMigrations(once, migrations);
    expect(twice.manifest.migrations_applied).toEqual([
      "migration_002_pipeline_state",
      "migration_003_youth_inbox",
      "migration_001_note",
      "migration_002_note",
    ]);
    expect(twice.history.map((event) => (event as { step?: number }).step).filter(Boolean)).toEqual([1, 2]);
  });

  it("rejects a list that runs 002 first", () => {
    expect(() =>
      assertMigrationOrder([{ id: "migration_002_note" }, { id: "migration_001_note" }]),
    ).toThrow(/order/);
  });

  it("keeps the original save when a migration throws and leaves a backup on disk", async () => {
    const root = await tempDir();
    const dir = path.join(root, saveFolderName("nordstern", 1));
    const save = sampleSave();
    await saveToFolder(dir, save, { weekend: true, simulating: false });
    const migrations: SaveMigration[] = [
      {
        id: "migration_001_boom",
        apply: () => {
          throw new Error("disk");
        },
      },
    ];
    await expect(loadSave(dir, migrations)).rejects.toThrow(/read-only backup/);
    const original = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8")) as {
      migrations_applied: string[];
    };
    expect(original.migrations_applied).toEqual([
      "migration_002_pipeline_state",
      "migration_003_youth_inbox",
    ]);
    const backup = await loadSave(`${dir}.backup`);
    expect(backup.manifest.migrations_applied).toEqual([
      "migration_002_pipeline_state",
      "migration_003_youth_inbox",
    ]);
  });
});

function collectKeys(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, found);
    return found;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      found.push(key);
      collectKeys(child, found);
    }
  }
  return found;
}
