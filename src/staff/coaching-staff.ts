/**
 * F8.1 — Coaching staff drives `environment()` in the growth engine (PRD 02.1, 10 F8.1).
 */

export type CoachRole = "attack" | "defense" | "fitness";

export interface Coach {
  id: string;
  name: string;
  role: CoachRole;
  /** 35–92 — maps to environment bonus via coachEnvironmentFactor. */
  quality: number;
  wage_weekly: number;
  contract_until_season: number;
}

export interface CoachingStaff {
  attack: Coach | null;
  defense: Coach | null;
  fitness: Coach | null;
}

export const COACH_ROLES: readonly CoachRole[] = ["attack", "defense", "fitness"];

export const COACH_ROLE_LABELS: Record<CoachRole, string> = {
  attack: "Angriff",
  defense: "Verteidigung",
  fitness: "Fitness",
};

export const COACH_ROLE_ICONS: Record<CoachRole, string> = {
  attack: "⚔️",
  defense: "🛡️",
  fitness: "💪",
};

/** Scouts, medical, admin overhead until F8.2. */
export const STAFF_OVERHEAD_WEEKLY = 6_000;

const FIRST_NAMES = [
  "Markus",
  "Thomas",
  "Patrick",
  "Lars",
  "Stefan",
  "Henning",
  "Oliver",
  "Matthias",
  "Frank",
  "Jörg",
  "Rainer",
  "Uwe",
];

const LAST_NAMES = [
  "Lehmann",
  "Engel",
  "Grabow",
  "Evers",
  "Cohrs",
  "Buchholz",
  "Voß",
  "Hartmann",
  "Klug",
  "Prinz",
  "Behrens",
  "Dose",
];

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(parts: readonly (string | number)[]): number {
  let hash = 0;
  for (const part of parts) {
    const text = String(part);
    for (let index = 0; index < text.length; index++) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 0x9e3779b1);
    }
  }
  return hash >>> 0;
}

export function coachWeeklyWage(quality: number): number {
  return Math.round(1_800 + quality * 95);
}

export function coachEnvironmentFactor(quality: number): number {
  const clamped = Math.min(92, Math.max(35, quality));
  return 0.9 + (clamped / 100) * 0.2;
}

/** Average environment bonus across the three coach groups; vacant slots stay at 1.0. */
export function environmentFromCoachingStaff(staff: CoachingStaff): number {
  const factors = COACH_ROLES.map((role) => {
    const coach = staff[role];
    return coach ? coachEnvironmentFactor(coach.quality) : 1;
  });
  return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
}

export function weeklyCoachWageBill(staff: CoachingStaff): number {
  return COACH_ROLES.reduce((sum, role) => sum + (staff[role]?.wage_weekly ?? 0), 0);
}

export function weeklyStaffWageBill(staff: CoachingStaff): number {
  return STAFF_OVERHEAD_WEEKLY + weeklyCoachWageBill(staff);
}

function makeCoach(
  role: CoachRole,
  quality: number,
  season: number,
  rng: () => number,
  salt: number,
): Coach {
  const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)] ?? "Coach";
  const last = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)] ?? "Team";
  const contractLength = 2 + Math.floor(rng() * 2);
  return {
    id: `coach_${role}_${season}_${salt}`,
    name: `${first} ${last}`,
    role,
    quality,
    wage_weekly: coachWeeklyWage(quality),
    contract_until_season: season + contractLength,
  };
}

export function defaultCoachingStaff(season: number): CoachingStaff {
  const rng = mulberry32(hashSeed([season, "default-staff"]));
  return {
    attack: makeCoach("attack", 58, season, rng, 1),
    defense: makeCoach("defense", 56, season, rng, 2),
    fitness: makeCoach("fitness", 60, season, rng, 3),
  };
}

export function normalizeCoachingStaff(
  staff: CoachingStaff | undefined,
  season: number,
): CoachingStaff {
  if (!staff) return defaultCoachingStaff(season);
  return {
    attack: staff.attack ?? null,
    defense: staff.defense ?? null,
    fitness: staff.fitness ?? null,
  };
}

export function coachCandidates(
  role: CoachRole,
  season: number,
  week: number,
  masterSeed: number,
): Coach[] {
  const rng = mulberry32(hashSeed([masterSeed, season, week, role, "market"]));
  const qualities = [
    Math.round(58 + rng() * 14),
    Math.round(66 + rng() * 16),
    Math.round(74 + rng() * 14),
  ];
  return qualities.map((quality, index) => makeCoach(role, quality, season, rng, index + 1));
}

export function hireCoach(staff: CoachingStaff, candidate: Coach): CoachingStaff {
  return {
    ...staff,
    [candidate.role]: { ...candidate },
  };
}

export function staffEnvironmentLabel(factor: number): string {
  const pct = Math.round((factor - 1) * 100);
  if (pct >= 8) return "Stark";
  if (pct >= 4) return "Gut";
  if (pct >= 1) return "Solide";
  return "Basis";
}
