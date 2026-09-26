/** Career player contract from PRD 07.1. Not the match-engine attribute set. */

export interface Player {
  id: string;
  name: PlayerName;
  birth: { date: string; place: string; region: string };
  nationality: string;
  age: number;

  club_id: string | null;
  squad_status: "pro" | "u17" | "u19" | "loaned_out";
  position: PositionPrimary;
  flexibility: PositionFlexibility[];
  contract: Contract | null;
  market_value: number;
  current_loan?: LoanRecord;

  attributes: Attributes;

  hidden: {
    anlage: Anlage;
    drive: number;
    maturity_offset: number;
    breakout_flags: string[];
  };

  state: {
    fitness: number;
    injury: Injury | null;
    form: number;
    morale: number;
    weekly_minutes: number;
    season_minutes: number;
    modifiers: TemporaryModifier[];
  };

  history: {
    growth: GrowthSnapshot[];
    clubs: ClubHistoryEntry[];
    achievements: string[];
    milestones: MilestoneEvent[];
  };

  portrait_seed: number;
}

export type PositionPrimary =
  | "GK"
  | "CB"
  | "LB"
  | "RB"
  | "DM"
  | "CM"
  | "AM"
  | "LM"
  | "RM"
  | "LW"
  | "RW"
  | "CF";

export interface PositionFlexibility {
  trained_as: PositionPrimary;
  proficiency: number;
  weeks_trained: number;
}

export interface Attributes {
  shooting: number;
  passing: number;
  dribbling: number;
  technique: number;
  pace: number;
  strength: number;
  stamina: number;
  composure: number;
  leadership: number;
  positioning: number;
  vision: number;
  concentration: number;
  teamwork: number;
  weak_foot: number;
  gk_handling: number;
}

/** Same keys as Attributes. Multipliers, not the 0–199 skill scale. */
export type Anlage = Record<keyof Attributes, number>;

export interface TemporaryModifier {
  source_event_id: string;
  attribute?: keyof Attributes;
  delta?: number;
  fitness_regen_multiplier?: number;
  until_week?: number;
  until_injury_end?: boolean;
}

export interface Contract {
  wage_weekly: number;
  bonus_goal: number;
  bonus_appearance: number;
  until_season: number;
  buyout_clause?: number;
  sell_on_percentage?: number;
  guaranteed_minutes_promise?: "none" | "rotation" | "starter";
}

export interface Injury {
  type_id: string;
  weeks_remaining: number;
  severity: "minor" | "moderate" | "severe";
  sustained_week: number;
}

export interface GrowthSnapshot {
  season: number;
  age: number;
  attributes_snapshot: Attributes;
  minutes_played: number;
  drive_at_snapshot: number;
}

export interface LoanRecord {
  from_club: string;
  to_club: string;
  until_season: number;
  has_option: boolean;
  option_fee?: number;
  minute_guarantee?: number;
}

/**
 * Named by PRD 07.1 and used on Player. The PRD lists no properties.
 * Left empty so this task does not invent a name, club, or milestone shape.
 */
export interface PlayerName {
  first?: string;
  last?: string;
}

export interface ClubHistoryEntry {}

export interface MilestoneEvent {}
