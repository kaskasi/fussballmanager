import type { FormationId } from "./formations.ts";
import type { TeamId } from "./ids.ts";

/** Zonal: occupy passing lanes. Man: stay with a designated attacker. */
export type MarkingStyle = "zonal" | "man";

/** Stay in the box vs Neuer-style libero who hunts through-balls in his own half. */
export type KeeperDuty = "stay" | "sweeper";

/** Same LB/RB slot: Guardiola inverted full-back vs Brehme overlapping banana. */
export type FullbackDuty = "inside" | "overlap";

/** Makelele shield vs Pirlo who collects from the centre-backs. */
export type HoldingDuty = "hold" | "regista";

/** Shuttle vs metronome vs half-space runner. */
export type CentreMidDuty = "box_to_box" | "playmaker" | "mezzala";

/** Hug the touchline vs cut inside (Robben / inverted winger). */
export type WideDuty = "wide" | "invert";

/** Box hunter vs hold-up vs dropping false nine. */
export type StrikerDuty = "poacher" | "target" | "false_nine";

export type LineDuties = {
  keeperDuty: KeeperDuty;
  fullbackDuty: { LB: FullbackDuty; RB: FullbackDuty };
  dmDuty: HoldingDuty;
  cmDuty: { LCM: CentreMidDuty; RCM: CentreMidDuty };
  wideDuty: { left: WideDuty; right: WideDuty };
  strikerDuty: { ST: StrikerDuty; LST: StrikerDuty; RST: StrikerDuty };
};

export type TeamTactics = {
  teamId: TeamId;
  formation: FormationId;
  mentality: number;
  pressing: number;
  width: number;
  tempo: number;
  marking: MarkingStyle;
  /** 25–90. How high the outfield line sits (50 = standard). */
  lineHeight: number;
  /** 80–130. 100 = match pace; 120 burns legs, especially after the 60th minute. */
  intensity: number;
  /** 0–100. How far outfield players may leave their slot. 0 sits on the dot. */
  fluidity: number;
} & LineDuties;

/** Possession 4-3-3: inverted full-backs, inverted wingers, false nine. */
export const POSSESSION_LINE_DUTIES: LineDuties = {
  keeperDuty: "sweeper",
  fullbackDuty: { LB: "inside", RB: "inside" },
  dmDuty: "hold",
  cmDuty: { LCM: "playmaker", RCM: "mezzala" },
  wideDuty: { left: "invert", right: "invert" },
  strikerDuty: { ST: "false_nine", LST: "false_nine", RST: "poacher" },
};

/** Direct 4-4-2: overlapping full-backs, wide mids, target + poacher. */
export const DIRECT_LINE_DUTIES: LineDuties = {
  keeperDuty: "stay",
  fullbackDuty: { LB: "overlap", RB: "overlap" },
  dmDuty: "hold",
  cmDuty: { LCM: "box_to_box", RCM: "box_to_box" },
  wideDuty: { left: "wide", right: "wide" },
  strikerDuty: { ST: "poacher", LST: "target", RST: "poacher" },
};

/** 1930s 2-3-5 pyramid: two backs, half-backs, five forwards. */
export const PYRAMID_LINE_DUTIES: LineDuties = {
  keeperDuty: "stay",
  fullbackDuty: { LB: "inside", RB: "inside" },
  dmDuty: "hold",
  cmDuty: { LCM: "box_to_box", RCM: "box_to_box" },
  wideDuty: { left: "wide", right: "wide" },
  strikerDuty: { ST: "poacher", LST: "poacher", RST: "poacher" },
};

export const DEFAULT_LINE_CONTROL = {
  lineHeight: 50,
  intensity: 100,
  fluidity: 30,
} as const;

export type FormationPreset = LineDuties & {
  lineHeight: number;
  intensity: number;
  pressing: number;
  fluidity: number;
};

/** Fixed selectable shapes. Line/press/intensity are starting points, not hard-coded match rules. */
export const FORMATION_PRESETS: Record<FormationId, FormationPreset> = {
  "4-3-3": {
    ...POSSESSION_LINE_DUTIES,
    lineHeight: 56,
    intensity: 105,
    pressing: 64,
    fluidity: 42,
  },
  "4-4-2": {
    ...DIRECT_LINE_DUTIES,
    lineHeight: 48,
    intensity: 95,
    pressing: 44,
    fluidity: 22,
  },
  "2-3-5": {
    ...PYRAMID_LINE_DUTIES,
    lineHeight: 74,
    intensity: 115,
    pressing: 76,
    fluidity: 34,
  },
};
