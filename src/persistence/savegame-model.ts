import type { Player } from "../types/player.ts";
import { defaultLeagueState, type LeagueState } from "./league-state.ts";
import { APPLIED_MIGRATION_IDS } from "./migrations/ids.ts";
import { defaultPipelineState, type PipelineState } from "./pipeline-state.ts";

/**
 * Browser-safe save types and factories (PRD 08).
 * Folder I/O lives in `savegame-io.ts`.
 */

export const SAVE_VERSION = 29;
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

export interface SaveState {
  season: number;
  week: number;
  /** 1 = Monday … 7 = Sunday */
  weekday?: number;
  match_played_this_week?: boolean;
  pipeline?: PipelineState;
  league?: LeagueState;
}

export interface RngState {
  master_seed: number;
  weekly_seed_chain: {
    algorithm: "hash(master_seed, season, week)";
    purpose: "Match-Engine-Wrapper, Intake, Zufalls-Events";
  };
  companion_note: string;
  chain_details?: unknown;
}

export interface SaveGame {
  manifest: SaveManifest;
  state: SaveState;
  players: Player[];
  retired: unknown[];
  history: unknown[];
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
      migrations_applied: [...APPLIED_MIGRATION_IDS],
    },
    state: {
      season: input.season,
      week: input.week,
      weekday: 1,
      match_played_this_week: false,
      pipeline: defaultPipelineState(input.week),
      league: defaultLeagueState(),
    },
    players: input.players ?? [],
    retired: [],
    history: [],
    chronicle: [],
    rng_state: newRngState(input.masterSeed),
  };
}

export function assertSaveCoherent(save: SaveGame): void {
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

export function jsonSave(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
