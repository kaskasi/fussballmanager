import type { FormationSlotId } from "./formations.ts";
import { getFormation } from "./formations.ts";
import { asPlayerId, asTeamId } from "./ids.ts";
import type { Player, PlayerAttributes, PlayerRole, Team } from "./player.ts";
import type { Squad } from "./squad.ts";
import type { TeamTactics } from "./tactics.ts";
import {
  DIRECT_LINE_DUTIES,
  POSSESSION_LINE_DUTIES,
  PYRAMID_LINE_DUTIES,
} from "./tactics.ts";

const ROLE_BASE: Record<PlayerRole, PlayerAttributes> = {
  GK: {
    passing: 38,
    tackling: 20,
    shooting: 12,
    pace: 42,
    stamina: 50,
    positioning: 62,
    aerial: 64,
    dribbling: 22,
    goalkeeping: 72,
    heightCm: 190,
  },
  FB: {
    passing: 58,
    tackling: 64,
    shooting: 32,
    pace: 72,
    stamina: 74,
    positioning: 60,
    aerial: 52,
    dribbling: 58,
    goalkeeping: 8,
    heightCm: 178,
  },
  CB: {
    passing: 54,
    tackling: 72,
    shooting: 28,
    pace: 52,
    stamina: 68,
    positioning: 70,
    aerial: 74,
    dribbling: 40,
    goalkeeping: 8,
    heightCm: 188,
  },
  DM: {
    passing: 66,
    tackling: 70,
    shooting: 40,
    pace: 56,
    stamina: 76,
    positioning: 68,
    aerial: 62,
    dribbling: 52,
    goalkeeping: 8,
    heightCm: 183,
  },
  CM: {
    passing: 70,
    tackling: 58,
    shooting: 52,
    pace: 62,
    stamina: 74,
    positioning: 64,
    aerial: 54,
    dribbling: 64,
    goalkeeping: 8,
    heightCm: 178,
  },
  AM: {
    passing: 72,
    tackling: 42,
    shooting: 64,
    pace: 68,
    stamina: 66,
    positioning: 62,
    aerial: 44,
    dribbling: 72,
    goalkeeping: 8,
    heightCm: 176,
  },
  W: {
    passing: 64,
    tackling: 38,
    shooting: 62,
    pace: 78,
    stamina: 70,
    positioning: 58,
    aerial: 36,
    dribbling: 74,
    goalkeeping: 8,
    heightCm: 175,
  },
  ST: {
    passing: 58,
    tackling: 32,
    shooting: 74,
    pace: 70,
    stamina: 68,
    positioning: 66,
    aerial: 64,
    dribbling: 62,
    goalkeeping: 8,
    heightCm: 184,
  },
};

function saltHash(salt: string): number {
  let hash = 2166136261;
  for (let i = 0; i < salt.length; i += 1) {
    hash ^= salt.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function signedOffset(salt: string, key: string, span: number): number {
  const n = saltHash(`${salt}:${key}`);
  return (n % (span * 2 + 1)) - span;
}

function applyShift(
  base: PlayerAttributes,
  skillShift: number,
): PlayerAttributes {
  if (skillShift === 0) {
    return { ...base };
  }
  const next = { ...base };
  for (const key of Object.keys(base) as (keyof PlayerAttributes)[]) {
    if (key === "heightCm") {
      continue;
    }
    next[key] = Math.min(99, Math.max(1, base[key] + skillShift));
  }
  return next;
}

/** Deterministic per-player scatter so two CMs are not the same card. */
export function scatterAttributes(
  base: PlayerAttributes,
  salt: string,
): PlayerAttributes {
  const next = { ...base };
  const skillKeys: Exclude<keyof PlayerAttributes, "heightCm">[] = [
    "passing",
    "tackling",
    "shooting",
    "pace",
    "stamina",
    "positioning",
    "aerial",
    "dribbling",
    "goalkeeping",
  ];
  for (const key of skillKeys) {
    next[key] = Math.min(99, Math.max(1, base[key] + signedOffset(salt, key, 7)));
  }
  next.heightCm = Math.min(
    210,
    Math.max(158, base.heightCm + signedOffset(salt, "heightCm", 5)),
  );
  return next;
}

function player(
  teamId: ReturnType<typeof asTeamId>,
  prefix: string,
  shirt: number,
  name: string,
  role: PlayerRole,
  form: number,
  fatigue: number,
  overrides: Partial<PlayerAttributes> = {},
  skillShift = 0,
): Player {
  const scattered = scatterAttributes(
    applyShift(ROLE_BASE[role], skillShift),
    `${prefix}-${shirt}`,
  );
  return {
    id: asPlayerId(`${prefix}-${shirt}`),
    teamId,
    name,
    role,
    form,
    fatigue,
    shirt,
    attributes: { ...scattered, ...overrides },
  };
}

function squad(
  team: Team,
  tactics: TeamTactics,
  starters: ReadonlyArray<[Player, FormationSlotId]>,
  bench: readonly Player[],
): Squad {
  return {
    team,
    tactics,
    starters: starters.map(([p, slot]) => ({ player: p, slot })),
    bench,
  };
}

const BENCH_ROLES: readonly PlayerRole[] = [
  "GK",
  "CB",
  "FB",
  "CM",
  "AM",
  "W",
  "ST",
];

/** 11 formation slots + 7 bench names. Used for extra division clubs. */
export function fillSquad(input: {
  team: Team;
  prefix: string;
  tactics: TeamTactics;
  names: readonly string[];
  skillShift?: number;
}): Squad {
  const slots = getFormation(input.tactics.formation);
  if (input.names.length < slots.length + BENCH_ROLES.length) {
    throw new Error(`Need 18 names for ${input.team.name}`);
  }
  const shift = input.skillShift ?? 0;
  const starters = slots.map((slot, index) => {
    const shirt = index + 1;
    const name = input.names[index] ?? `Player ${shirt}`;
    return [
      player(
        input.team.id,
        input.prefix,
        shirt,
        name,
        slot.role,
        52 + (shirt % 12),
        4 + (shirt % 8),
        {},
        shift,
      ),
      slot.id,
    ] as [Player, FormationSlotId];
  });
  const bench = BENCH_ROLES.map((role, index) => {
    const shirt = 12 + index;
    const name = input.names[11 + index] ?? `Player ${shirt}`;
    return player(
      input.team.id,
      input.prefix,
      shirt,
      name,
      role,
      48 + (index % 10),
      3 + (index % 6),
      {},
      shift,
    );
  });
  return squad(input.team, input.tactics, starters, bench);
}

export const NORDSTERN_ID = asTeamId("fc-nordstern");
export const RHEINWACHT_ID = asTeamId("sv-rheinwacht");

export const nordsternTeam: Team = {
  id: NORDSTERN_ID,
  name: "FC Nordstern",
  shortName: "NOR",
};

export const rheinwachtTeam: Team = {
  id: RHEINWACHT_ID,
  name: "SV Rheinwacht",
  shortName: "RHE",
};

const nordsternTactics: TeamTactics = {
  teamId: NORDSTERN_ID,
  formation: "4-3-3",
  mentality: 58,
  pressing: 64,
  width: 62,
  tempo: 56,
  marking: "zonal",
  lineHeight: 56,
  intensity: 105,
  fluidity: 42,
  ...POSSESSION_LINE_DUTIES,
};

const rheinwachtTactics: TeamTactics = {
  teamId: RHEINWACHT_ID,
  formation: "4-4-2",
  mentality: 46,
  pressing: 44,
  width: 50,
  tempo: 42,
  marking: "man",
  lineHeight: 48,
  intensity: 95,
  fluidity: 22,
  ...DIRECT_LINE_DUTIES,
};

/** Shirt 8 / 9 match the sample MatchEvent player ids. */
export const nordsternSquad: Squad = squad(
  nordsternTeam,
  nordsternTactics,
  [
    [player(NORDSTERN_ID, "nord", 1, "Elias Kranz", "GK", 61, 4, { goalkeeping: 76 }), "GK"],
    [player(NORDSTERN_ID, "nord", 5, "Nico Bruns", "FB", 57, 12, { pace: 74 }), "LB"],
    [player(NORDSTERN_ID, "nord", 4, "Pavel Kolar", "CB", 63, 10, { aerial: 78 }), "LCB"],
    [player(NORDSTERN_ID, "nord", 3, "Jonas Hildebrandt", "CB", 59, 11), "RCB"],
    [player(NORDSTERN_ID, "nord", 2, "Malik Vogel", "FB", 60, 9, { dribbling: 64 }), "RB"],
    [player(NORDSTERN_ID, "nord", 6, "Armin Seidel", "DM", 66, 8, { tackling: 74 }), "DM"],
    [player(NORDSTERN_ID, "nord", 8, "Theo Brandt", "CM", 70, 7, { passing: 76 }), "LCM"],
    [player(NORDSTERN_ID, "nord", 7, "Luca Merz", "CM", 62, 14), "RCM"],
    [player(NORDSTERN_ID, "nord", 11, "Levin Kruse", "W", 68, 6, { pace: 82 }), "LW"],
    [player(NORDSTERN_ID, "nord", 9, "Juri Holm", "ST", 72, 5, { shooting: 80 }), "ST"],
    [player(NORDSTERN_ID, "nord", 10, "Sami Farouk", "W", 64, 13), "RW"],
  ],
  [
    player(NORDSTERN_ID, "nord", 12, "Marlon Beck", "GK", 52, 2, { goalkeeping: 64 }),
    player(NORDSTERN_ID, "nord", 13, "Henrik Vos", "CB", 54, 8),
    player(NORDSTERN_ID, "nord", 14, "Ole Jensen", "FB", 55, 10),
    player(NORDSTERN_ID, "nord", 15, "Can Yildiz", "CM", 58, 7),
    player(NORDSTERN_ID, "nord", 16, "Nils Hartwig", "AM", 61, 4, { dribbling: 76 }),
    player(NORDSTERN_ID, "nord", 17, "Bastian Orth", "W", 56, 11),
    player(NORDSTERN_ID, "nord", 18, "Miro Petrov", "ST", 59, 6),
  ],
);

/** Same Nordstern names, 1930s 2-3-5: two backs, three half-backs, five forwards. */
export const nordsternPyramidSquad: Squad = squad(
  nordsternTeam,
  {
    teamId: NORDSTERN_ID,
    formation: "2-3-5",
    mentality: 62,
    pressing: 76,
    width: 70,
    tempo: 50,
    marking: "zonal",
    lineHeight: 74,
    intensity: 115,
    fluidity: 34,
    ...PYRAMID_LINE_DUTIES,
  },
  [
    [player(NORDSTERN_ID, "nord", 1, "Elias Kranz", "GK", 61, 4, { goalkeeping: 76 }), "GK"],
    [player(NORDSTERN_ID, "nord", 5, "Nico Bruns", "FB", 57, 12, { pace: 74 }), "LB"],
    [player(NORDSTERN_ID, "nord", 2, "Malik Vogel", "FB", 60, 9, { dribbling: 64 }), "RB"],
    [player(NORDSTERN_ID, "nord", 8, "Theo Brandt", "CM", 70, 7, { passing: 76 }), "LCM"],
    [player(NORDSTERN_ID, "nord", 6, "Armin Seidel", "DM", 66, 8, { tackling: 74 }), "DM"],
    [player(NORDSTERN_ID, "nord", 7, "Luca Merz", "CM", 62, 14), "RCM"],
    [player(NORDSTERN_ID, "nord", 11, "Levin Kruse", "W", 68, 6, { pace: 82 }), "LW"],
    [player(NORDSTERN_ID, "nord", 4, "Pavel Kolar", "ST", 63, 10, { aerial: 78 }), "LST"],
    [player(NORDSTERN_ID, "nord", 9, "Juri Holm", "ST", 72, 5, { shooting: 80 }), "ST"],
    [player(NORDSTERN_ID, "nord", 3, "Jonas Hildebrandt", "ST", 59, 11), "RST"],
    [player(NORDSTERN_ID, "nord", 10, "Sami Farouk", "W", 64, 13), "RW"],
  ],
  [
    player(NORDSTERN_ID, "nord", 12, "Marlon Beck", "GK", 52, 2, { goalkeeping: 64 }),
    player(NORDSTERN_ID, "nord", 13, "Henrik Vos", "CB", 54, 8),
    player(NORDSTERN_ID, "nord", 14, "Ole Jensen", "FB", 55, 10),
    player(NORDSTERN_ID, "nord", 15, "Can Yildiz", "CM", 58, 7),
    player(NORDSTERN_ID, "nord", 16, "Nils Hartwig", "AM", 61, 4, { dribbling: 76 }),
    player(NORDSTERN_ID, "nord", 17, "Bastian Orth", "W", 56, 11),
    player(NORDSTERN_ID, "nord", 18, "Miro Petrov", "ST", 59, 6),
  ],
);

/** Shirt 1 / 5 match the sample MatchEvent player ids. */
export const rheinwachtSquad: Squad = squad(
  rheinwachtTeam,
  rheinwachtTactics,
  [
    [player(RHEINWACHT_ID, "rhein", 1, "Kasper Lindholm", "GK", 58, 3, { goalkeeping: 74 }), "GK"],
    [player(RHEINWACHT_ID, "rhein", 3, "Tim Uhl", "FB", 54, 12), "LB"],
    [player(RHEINWACHT_ID, "rhein", 5, "Bojan Ilic", "CB", 60, 9, { tackling: 76 }), "LCB"],
    [player(RHEINWACHT_ID, "rhein", 4, "Dirk Schafer", "CB", 56, 11), "RCB"],
    [player(RHEINWACHT_ID, "rhein", 2, "Florian Meis", "FB", 55, 10), "RB"],
    [player(RHEINWACHT_ID, "rhein", 11, "Jannik Roth", "W", 57, 8), "LM"],
    [player(RHEINWACHT_ID, "rhein", 8, "Emre Sahin", "CM", 62, 7, { passing: 72 }), "LCM"],
    [player(RHEINWACHT_ID, "rhein", 6, "Mats Kehl", "CM", 59, 13), "RCM"],
    [player(RHEINWACHT_ID, "rhein", 7, "Raphael Stein", "W", 53, 14), "RM"],
    [player(RHEINWACHT_ID, "rhein", 9, "Carlo Bianchi", "ST", 64, 6, { shooting: 76 }), "LST"],
    [player(RHEINWACHT_ID, "rhein", 10, "Victor Lang", "ST", 61, 8), "RST"],
  ],
  [
    player(RHEINWACHT_ID, "rhein", 12, "Ivo Kramer", "GK", 48, 1, { goalkeeping: 62 }),
    player(RHEINWACHT_ID, "rhein", 13, "Lars Bode", "CB", 50, 9),
    player(RHEINWACHT_ID, "rhein", 14, "Finn Kroger", "FB", 51, 11),
    player(RHEINWACHT_ID, "rhein", 15, "Timo Graf", "DM", 54, 8),
    player(RHEINWACHT_ID, "rhein", 16, "Kilian Vogt", "CM", 52, 10),
    player(RHEINWACHT_ID, "rhein", 17, "Arda Celik", "W", 55, 7),
    player(RHEINWACHT_ID, "rhein", 18, "Stefan Popov", "ST", 53, 5),
  ],
);

export const SEED_MATCHUP = {
  home: nordsternSquad,
  away: rheinwachtSquad,
} as const;
