import type { PlayerId, TeamId } from "./ids.ts";

export type PlayerRole = "GK" | "FB" | "CB" | "DM" | "CM" | "AM" | "W" | "ST";

/** Match inputs. Skills are 0–100; heightCm is standing height, not a skill. */
export type PlayerAttributes = {
  passing: number;
  tackling: number;
  shooting: number;
  pace: number;
  stamina: number;
  positioning: number;
  aerial: number;
  dribbling: number;
  goalkeeping: number;
  /** Centimetres. Feeds aerial contests together with `aerial` skill. */
  heightCm: number;
};

export type Player = {
  id: PlayerId;
  teamId: TeamId;
  name: string;
  role: PlayerRole;
  attributes: PlayerAttributes;
  /** Pre-match form, 0–100. */
  form: number;
  /** Pre-match fatigue, 0–100 (0 = fresh). */
  fatigue: number;
};

export type Team = {
  id: TeamId;
  name: string;
  shortName: string;
};
