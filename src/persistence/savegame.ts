import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Player } from "../types/player.ts";
import { applyMigrations, MIGRATIONS, SaveReadOnlyError, type SaveMigration } from "./migrations/index.ts";

/**
 * Multi-file save (PRD 08).
 * Local files keep `hidden`. Export stripping lives in `sanitizer.ts`.
 * There is no calendar PRD, so the caller says whether this moment is a
 * weekend after the sim. Saving mid-sim or off the weekend throws.
 */

export const SAVE_VERSION = 1;
export const GAME_VERSION = "0.1.0";

export const SAVE_FILES = [
  "manifest.json",
  "state.json",
  "players.json",
  "retired.json",
  "history.jsonl",
  "chronicle.json",
  "rng_state.json",
] as const;

export class SaveRefusedError extends Error {
  constructor(reason: "simulating" | "not_weekend") {
    super(reason === "simulating" ? "Save runs after the sim, not during it" : "Save runs on the weekend");
    this.name = "SaveRefusedError";
  }
}

export class SaveIncompleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveIncompleteError";
  }
}

export interface SaveManifest {
  save_version: number;
  created: string;
  last_played: string;
  game_version: string;
  player_club_id: string;
  manager_name: string;
  current_week: { season: number; week: number };
  migrations_applied: string[];
  sanitized?: boolean;
}

/** Live week. Kept equal to `manifest.current_week`. */
export interface SaveState {
  season: number;
  week: number;
}

export interface RngState {
  master_seed: number;
  weekly_seed_chain: {
    algorithm: "hash(master_seed, season, week)";
    purpose: "Match-Engine-Wrapper, Intake, Zufalls-Events";
  };
  companion_note: string;
  /** Local only. The export sanitizer removes this. */
  chain_details?: unknown;
}

export interface SaveGame {
  manifest: SaveManifest;
  state: SaveState;
  players: Player[];
  /** Retirement records. PRD 08 names the file and does not list fields. */
  retired: unknown[];
  history: unknown[];
  /** Club chronicle (F11.4). That PRD is not written, so this stays an empty list. */
  chronicle: unknown[];
  rng_state: RngState;
}

export interface NewSaveInput {
  nowIso: string;
  playerClubId: string;
  managerName: string;
  season: number;
  week: number;
  masterSeed: number;
  players?: Player[];
}

export function saveFolderName(name: string, slot: number): string {
  if (!/^[A-Za-z0-9_-]+$/.test(name)) {
    throw new Error("Save name must be letters, numbers, '_' or '-'");
  }
  if (!Number.isInteger(slot) || slot < 1) {
    throw new Error("Save slot must be a positive integer");
  }
  return `savegame_${name}_${slot}`;
}

export function newRngState(masterSeed: number): RngState {
  return {
    master_seed: masterSeed,
    weekly_seed_chain: {
      algorithm: "hash(master_seed, season, week)",
      purpose: "Match-Engine-Wrapper, Intake, Zufalls-Events",
    },
    companion_note: "Spieler-individuelles Gaussian Noise nutzt hash(seed, player_id, week, attr)",
  };
}

export function createSave(input: NewSaveInput): SaveGame {
  return {
    manifest: {
      save_version: SAVE_VERSION,
      created: input.nowIso,
      last_played: input.nowIso,
      game_version: GAME_VERSION,
      player_club_id: input.playerClubId,
      manager_name: input.managerName,
      current_week: { season: input.season, week: input.week },
      migrations_applied: [],
    },
    state: { season: input.season, week: input.week },
    players: input.players ?? [],
    retired: [],
    history: [],
    chronicle: [],
    rng_state: newRngState(input.masterSeed),
  };
}

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
  assertCoherent(save);
  await mkdir(dir, { recursive: true });
  const files: Record<(typeof SAVE_FILES)[number], string> = {
    "state.json": json(save.state),
    "players.json": json(save.players),
    "retired.json": json(save.retired),
    "history.jsonl": save.history.map((event) => JSON.stringify(event)).join("\n") + (save.history.length > 0 ? "\n" : ""),
    "chronicle.json": json(save.chronicle),
    "rng_state.json": json(save.rng_state),
    "manifest.json": json(save.manifest),
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
    players: JSON.parse(bodies["players.json"] ?? "") as Player[],
    retired: JSON.parse(bodies["retired.json"] ?? "") as unknown[],
    chronicle: JSON.parse(bodies["chronicle.json"] ?? "") as unknown[],
    rng_state: JSON.parse(bodies["rng_state.json"] ?? "") as RngState,
    history: (bodies["history.jsonl"] ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as unknown),
  };
  assertCoherent(save);
  return save;
}

function assertCoherent(save: SaveGame): void {
  if (!Array.isArray(save.players) || !Array.isArray(save.history) || !Array.isArray(save.retired)) {
    throw new SaveIncompleteError("Save files are not lists");
  }
  if (
    save.state.season !== save.manifest.current_week.season ||
    save.state.week !== save.manifest.current_week.week
  ) {
    throw new SaveIncompleteError("state.json does not match manifest.current_week");
  }
  if (save.manifest.save_version < 1) {
    throw new SaveIncompleteError(`Save version ${save.manifest.save_version} is not loadable`);
  }
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function removeSave(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
