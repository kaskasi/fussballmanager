import type { GrowthSnapshot, Player } from "../types/player.ts";
import type { SaveGame, SaveManifest } from "./savegame.ts";

/**
 * Export copy only (PRD 08.3). The local save keeps `hidden` and drive.
 * Does not mutate the save passed in.
 */

export interface ExportManifest extends SaveManifest {
  sanitized: true;
}

export interface ExportGrowthSnapshot extends Omit<GrowthSnapshot, "drive_at_snapshot"> {}

export interface ExportPlayer extends Omit<Player, "hidden" | "history"> {
  history: Omit<Player["history"], "growth"> & { growth: ExportGrowthSnapshot[] };
}

export interface ExportSave extends Omit<SaveGame, "manifest" | "players" | "rng_state"> {
  manifest: ExportManifest;
  players: ExportPlayer[];
  rng_state: Omit<SaveGame["rng_state"], "chain_details">;
}

export function sanitizeForExport(save: SaveGame): ExportSave {
  const copy = structuredClone(save);
  const players = copy.players.map((player) => {
    const { hidden: _hidden, history, ...rest } = player;
    const growth = history.growth.map((snapshot) => {
      const { drive_at_snapshot: _drive, ...kept } = snapshot;
      return kept;
    });
    return { ...rest, history: { ...history, growth } };
  });
  const { chain_details: _chain, ...rng } = copy.rng_state;
  return {
    ...copy,
    players,
    rng_state: rng,
    manifest: { ...copy.manifest, sanitized: true },
  };
}
