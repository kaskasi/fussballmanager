import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyMigrations, MIGRATIONS, SaveReadOnlyError, type SaveMigration } from "./migrations/index.ts";
import {
  assertSaveCoherent,
  jsonSave,
  SAVE_FILES,
  SAVE_VERSION,
  SaveIncompleteError,
  SaveRefusedError,
  type SaveGame,
  type SaveManifest,
  type SaveState,
  type RngState,
} from "./savegame-model.ts";

export async function writeAtomic(finalPath: string, body: string): Promise<void> {
  const tmpPath = `${finalPath}.tmp`;
  await writeFile(tmpPath, body);
  await rename(tmpPath, finalPath);
}

export async function saveToFolder(
  dir: string,
  save: SaveGame,
  context: { weekend: boolean; simulating: boolean },
): Promise<void> {
  if (context.simulating) throw new SaveRefusedError("simulating");
  if (!context.weekend) throw new SaveRefusedError("not_weekend");
  await writeSave(dir, save);
}

export async function loadSave(dir: string, migrations: readonly SaveMigration[] = MIGRATIONS): Promise<SaveGame> {
  const loaded = await readSave(dir);
  const pending = migrations.some((migration) => !loaded.manifest.migrations_applied.includes(migration.id));
  if (!pending) {
    if (loaded.manifest.save_version !== SAVE_VERSION) {
      throw new SaveIncompleteError(`Save version ${loaded.manifest.save_version} is newer than ${SAVE_VERSION}`);
    }
    return loaded;
  }

  await writeSave(`${dir}.backup`, loaded);
  let migrated: SaveGame;
  try {
    migrated = applyMigrations(loaded, migrations);
  } catch (error) {
    if (error instanceof SaveReadOnlyError) throw error;
    throw new SaveReadOnlyError("migration");
  }
  if (migrated.manifest.save_version !== SAVE_VERSION) {
    throw new SaveIncompleteError(
      `Migrations left save_version ${migrated.manifest.save_version}, code expects ${SAVE_VERSION}`,
    );
  }
  await writeSave(dir, migrated);
  return migrated;
}

async function writeSave(dir: string, save: SaveGame): Promise<void> {
  assertSaveCoherent(save);
  await mkdir(dir, { recursive: true });
  const files: Record<(typeof SAVE_FILES)[number], string> = {
    "state.json": jsonSave(save.state),
    "players.json": jsonSave(save.players),
    "retired.json": jsonSave(save.retired),
    "history.jsonl": save.history.map((event) => JSON.stringify(event)).join("\n") + (save.history.length > 0 ? "\n" : ""),
    "chronicle.json": jsonSave(save.chronicle),
    "rng_state.json": jsonSave(save.rng_state),
    "manifest.json": jsonSave(save.manifest),
  };
  for (const file of SAVE_FILES) {
    if (file === "manifest.json") continue;
    await writeAtomic(path.join(dir, file), files[file]);
  }
  await writeAtomic(path.join(dir, "manifest.json"), files["manifest.json"]);
}

async function readSave(dir: string): Promise<SaveGame> {
  const bodies: Partial<Record<(typeof SAVE_FILES)[number], string>> = {};
  for (const file of SAVE_FILES) {
    try {
      bodies[file] = await readFile(path.join(dir, file), "utf8");
    } catch {
      throw new SaveIncompleteError(`Save is missing ${file}`);
    }
  }
  const save: SaveGame = {
    manifest: JSON.parse(bodies["manifest.json"] ?? "") as SaveManifest,
    state: JSON.parse(bodies["state.json"] ?? "") as SaveState,
    players: JSON.parse(bodies["players.json"] ?? "") as SaveGame["players"],
    retired: JSON.parse(bodies["retired.json"] ?? "") as unknown[],
    chronicle: JSON.parse(bodies["chronicle.json"] ?? "") as unknown[],
    rng_state: JSON.parse(bodies["rng_state.json"] ?? "") as RngState,
    history: (bodies["history.jsonl"] ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as unknown),
  };
  assertSaveCoherent(save);
  return save;
}

export async function removeSave(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
