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
    /** F5.4 — Dirichlet weights at generation (PRD 05.4). */
    contract_weights?: import("../transfers/contract-priorities.ts").ContractWeights;
  };

  state: {
    fitness: number;
    injury: Injury | null;
    form: number;
    morale: number;
    weekly_minutes: number;
    season_minutes: number;
    season_apps: number;
    season_goals: number;
    season_assists: number;
    season_yellow_cards: number;
    season_tackles: number;
    season_headers: number;
    /** Rolling sum of attribute growth over the last 26 weeks (PRD 06.3). */
    recent_growth_26w: number;
    /** CA at end of previous simulated week — for weekly Δ display. */
    last_week_ca?: number;
    /** Net attribute growth from the last simulated week (PRD 02.1 / F2.7). */
    last_week_growth?: number;
    /** Skill snapshot at calendar week start — training heatmap “this week so far”. */
    week_start_attributes?: Attributes;
    week_start_key?: { season: number; week: number };
    /** Last four weekly minute totals, oldest first (PRD 03.5). */
    recent_weekly_minutes: number[];
    /** F3.5 — trains with pros for `ends_week` inclusive, then auto-promotion check. */
    pro_trial?: ProTrialState;
    /** F2.4 — assigned veteran mentor for breakout eligibility (PRD 06.2). */
    mentorship?: MentorshipState;
    /** F5.4 — consecutive rejected contract offers. */
    contract_failed_offers?: number;
    /** F5.4 — set after three failed talks (PRD 05.4). */
    desire_to_leave?: boolean;
    /** F5.4 — calendar day index; no new talks until this day. */
    contract_talks_locked_until_day?: number;
    /** Story-only — allows wage below current contract (PRD 05.4). */
    contract_wage_cut_allowed?: boolean;
    /** F5.4 — calendar day when underpaid unrest started. */
    contract_underpaid_since_day?: number;
    /** F5.4 — renegotiation prompts sent (3 / 9 / 12 months). */
    contract_renegotiation_prompts?: number;
    /** F5.4 — permanent demoralization after failed underpaid arc. */
    contract_demoralized?: boolean;
    /** F5.6 — seasons in club youth/pro pipeline for talent watch. */
    academy_tenure_seasons?: number;
    /** Manager praise / encourage — last use (4-week cooldown). */
    last_praise_season?: number;
    last_praise_week?: number;
    /** F2.8 — consecutive appearances with ≥1 goal (Chancentod clear). */
    scoring_streak?: number;
    /** F2.8 — goals in the last appearance (hat-trick clear). */
    last_match_goals?: number;
    /** F3.9 — HQ vs satellite camp id. Missing means HQ. */
    youth_site?: "hq" | string;
    /** F3.9 — face of the camp purchase reveal (max hidden profile). */
    camp_opening_headline?: boolean;
    /** Index into `youth.camp.debut.hook.{nation}.{index}` copy. */
    camp_debut_hook_index?: number;
    /** F2.3 — failed position-retrain completions per target (PRD 07.7). */
    retrain_failures?: Partial<Record<PositionPrimary, number>>;
    modifiers: TemporaryModifier[];
  };

  history: {
    growth: GrowthSnapshot[];
    clubs: ClubHistoryEntry[];
    achievements: string[];
    milestones: MilestoneEvent[];
    /** Pre-F2.8 flavor labels only (veteran wallpaper). Not mechanical. */
    career_stamps?: string[];
  };

  /** F2.8 — earned named bonuses. Effects baked into `attributes` on award. */
  stamps: AbilityStamp[];

  portrait_seed: number;
}

/** F2.8 — named bonus identity (PRD 07.5). Hybrid = unlock, then F2.3 seal. */
export type StampPath = "train" | "event" | "hybrid";

export interface AbilityStamp {
  id: string;
  earned_season: number;
  earned_week: number;
  path: StampPath;
  /** Deltas already applied to `attributes` when the stamp was awarded. */
  applied: Partial<Record<keyof Attributes, number>>;
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

export interface ProTrialState {
  season: number;
  started_week: number;
  /** Inclusive last week training with the pro squad. */
  ends_week: number;
}

export interface MentorshipState {
  mentor_player_id: string;
  since_season: number;
  since_week: number;
}

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
  season_apps?: number;
  season_goals?: number;
  season_assists?: number;
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
