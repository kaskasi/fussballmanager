import type { PlayerId, TeamId } from "./ids.ts";

export type PlayerRole = "GK" | "FB" | "CB" | "DM" | "CM" | "AM" | "W" | "ST";

/** 0–100 ratings used as explicit engine inputs. */
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
