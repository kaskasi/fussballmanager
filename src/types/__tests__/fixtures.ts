import type { Attributes, Player } from "../player.ts";

export const validAttributes: Attributes = {
  shooting: 70,
  passing: 75,
  dribbling: 68,
  technique: 72,
  pace: 80,
  strength: 65,
  stamina: 74,
  composure: 60,
  leadership: 55,
  positioning: 66,
  vision: 71,
  concentration: 63,
  teamwork: 69,
  weak_foot: 40,
  gk_handling: 8,
};

function anlageAt(value: number): Player["hidden"]["anlage"] {
  return {
    shooting: value,
    passing: value,
    dribbling: value,
    technique: value,
    pace: value,
    strength: value,
    stamina: value,
    composure: value,
    leadership: value,
    positioning: value,
    vision: value,
    concentration: value,
    teamwork: value,
    weak_foot: value,
    gk_handling: value,
  };
}

/** Valid career player. Copy before mutating in a test. */
export const validPlayer: Player = {
  id: "pl_00042",
  name: {},
  birth: { date: "2007-04-12", place: "Kiel", region: "Schleswig-Holstein" },
  nationality: "DE",
  age: 19,
  club_id: "cl_fc_nordstern",
  squad_status: "pro",
  position: "CM",
  flexibility: [{ trained_as: "AM", proficiency: 0.4, weeks_trained: 6 }],
  contract: {
    wage_weekly: 800,
    bonus_goal: 200,
    bonus_appearance: 100,
    until_season: 3,
    guaranteed_minutes_promise: "rotation",
  },
  market_value: 350_000,
  attributes: validAttributes,
  hidden: {
    anlage: anlageAt(1.1),
    drive: 1.0,
    maturity_offset: 0,
    breakout_flags: [],
  },
  state: {
    fitness: 100,
    injury: null,
    form: 0,
    morale: 70,
    weekly_minutes: 0,
    season_minutes: 0,
    modifiers: [],
  },
  history: {
    growth: [],
    clubs: [],
    achievements: [],
    milestones: [],
  },
  portrait_seed: 42,
};

export function clonePlayer(player: Player = validPlayer): Player {
  return structuredClone(player);
}
