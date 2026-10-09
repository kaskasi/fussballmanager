import type { Attributes, Player, PlayerName, PositionPrimary } from "../types/player.ts";
import { generatePlayerName } from "../types/player-display.ts";
import { ensureYouthContract } from "../player/youth-contract.ts";
import { SEASON_END_WEEK } from "../sim/game-calendar.ts";
import { estimateCa, marketValue } from "../transfers/market-value.ts";
import { seedPhaseStamps } from "../development/ability-stamps.ts";
import { YOUTH_SITE_HQ } from "./youth-site.ts";

/**
 * Yearly academy intake (PRD 03.1, defaults from PRD 07.2).
 * File is kebab-case per the project naming rule.
 *
 * Not in this module: campus view (F3.2), youth match sim (F3.3), inbox (F3.4).
 * Position skill weights (PRD 07.2): ±~10% of the mixture mean so a CF’s
 * shooting is not the same draw as a CB’s. Camp intakes shuffle the position
 * list before slicing 2/4 so they are not GK/CB-only.
 * Anlage is an independent uniform per key (PRD 07.2). The ±0.10 position
 * band in PRD 03.1 has no tabulated position means to vary around.
 */

export type AcademyFacility = "academy_basic" | "academy_performance" | "academy_elite";

export const INTAKE_COUNT = 24;
export const HQ_INTAKE_BY_FACILITY: Record<AcademyFacility, number> = {
  academy_basic: 24,
  academy_performance: 28,
  academy_elite: 32,
};

export function hqIntakeCount(facility: AcademyFacility): number {
  return HQ_INTAKE_BY_FACILITY[facility];
}
/** Re-export for callers that already import from this module. */
export { SEASON_END_WEEK } from "../sim/game-calendar.ts";

const PRODIGY_FLAG = "prodigy_foundation";
const ANLAGE_MIN = 0.85;
const ANLAGE_MAX = 1.5;
const ANLAGE_CENTER = (ANLAGE_MIN + ANLAGE_MAX) / 2;
const DRIVE_CORRELATION = -0.15;

export class IntakeOutOfSeasonError extends Error {
  constructor(week: number) {
    super(`Youth intake runs at season end (week ${SEASON_END_WEEK}), not week ${week}`);
    this.name = "IntakeOutOfSeasonError";
  }
}

interface MixtureComponent {
  weight: number;
  mean: number;
  stddev: number;
  prodigy: boolean;
}

const BASE_COMPONENTS: MixtureComponent[] = [
  { weight: 0.85, mean: 65, stddev: 10, prodigy: false },
  { weight: 0.12, mean: 85, stddev: 8, prodigy: false },
  { weight: 0.025, mean: 105, stddev: 6, prodigy: false },
  { weight: 0.005, mean: 120, stddev: 5, prodigy: true },
];

const SKILLS = [
  "shooting",
  "passing",
  "dribbling",
  "technique",
  "pace",
  "strength",
  "stamina",
  "composure",
  "leadership",
  "positioning",
  "vision",
  "concentration",
  "teamwork",
  "gk_handling",
] as const satisfies readonly (keyof Attributes)[];

/** Fixed shape for one intake. PRD 03.1 does not specify the mix. */
export const INTAKE_POSITIONS: readonly PositionPrimary[] = [
  "GK",
  "GK",
  "CB",
  "CB",
  "CB",
  "CB",
  "LB",
  "RB",
  "LB",
  "RB",
  "DM",
  "DM",
  "CM",
  "CM",
  "CM",
  "CM",
  "AM",
  "LM",
  "RM",
  "LW",
  "RW",
  "LW",
  "RW",
  "CF",
  "CB",
  "CM",
  "AM",
  "CF",
  "LB",
  "RB",
  "LW",
  "RW",
];

/** Signed weights in [-1, 1]; applied as ±10% of the mixture mean (PRD 07.2). */
const YOUTH_POSITION_WEIGHTS: Record<PositionPrimary, Partial<Record<keyof Attributes, number>>> = {
  GK: { gk_handling: 1, concentration: 0.6, positioning: 0.6, shooting: -1, dribbling: -0.7 },
  CB: { positioning: 0.8, strength: 0.8, concentration: 0.6, shooting: -0.8, dribbling: -0.5, pace: -0.3 },
  LB: { pace: 0.8, stamina: 0.7, passing: 0.4, positioning: 0.3, shooting: -0.5 },
  RB: { pace: 0.8, stamina: 0.7, passing: 0.4, positioning: 0.3, shooting: -0.5 },
  DM: { positioning: 0.7, passing: 0.6, teamwork: 0.6, strength: 0.4, shooting: -0.4 },
  CM: { passing: 0.8, vision: 0.7, stamina: 0.5, teamwork: 0.5 },
  AM: { vision: 0.8, technique: 0.7, passing: 0.6, dribbling: 0.5, positioning: -0.3 },
  LM: { pace: 0.7, dribbling: 0.6, passing: 0.4, stamina: 0.4 },
  RM: { pace: 0.7, dribbling: 0.6, passing: 0.4, stamina: 0.4 },
  LW: { pace: 0.9, dribbling: 0.8, technique: 0.5, strength: -0.5 },
  RW: { pace: 0.9, dribbling: 0.8, technique: 0.5, strength: -0.5 },
  CF: { shooting: 1, composure: 0.7, positioning: 0.6, strength: 0.4, passing: -0.5 },
};

export interface GenerateIntakeInput {
  season: number;
  week: number;
  /** Calendar year of 31 May, used so every birth date is age 15 that day. */
  seasonYear: number;
  clubId: string;
  nationality: string;
  region: string;
  facility: AcademyFacility;
  /** First numeric id. `1` yields `pl_00001`. */
  idStart: number;
  random: () => number;
  count?: number;
  youthSite?: string;
  meanShift?: number;
  /** When set, overrides shuffled intake positions (length must cover `count`). */
  fixedPositions?: readonly PositionPrimary[];
  nameFor?: (seed: number, index: number) => PlayerName;
  /** Weak CA today, ceiling via growth — camp purchase “diamond in the rough”. */
  hiddenProfile?: "max_development";
}

/**
 * Facility shifts replace each other (PRD 03.1). Elite also boosts the
 * mean-120 weight by 1.5 and renormalises the rest so the weights still sum to 1.
 */
export function academyMixture(facility: AcademyFacility, meanShift = 0): MixtureComponent[] {
  const shift =
    (facility === "academy_elite" ? 25 : facility === "academy_performance" ? 10 : 0) + meanShift;
  const weights = BASE_COMPONENTS.map((component) => component.weight);
  if (facility === "academy_elite") {
    const eliteIndex = BASE_COMPONENTS.findIndex((component) => component.prodigy);
    const baseElite = weights[eliteIndex] ?? 0;
    const boosted = baseElite * 1.5;
    const scale = (1 - boosted) / (1 - baseElite);
    for (let i = 0; i < weights.length; i++) {
      weights[i] = i === eliteIndex ? boosted : (weights[i] ?? 0) * scale;
    }
  }
  return BASE_COMPONENTS.map((component, index) => ({
    ...component,
    weight: weights[index] ?? component.weight,
    mean: component.mean + shift,
  }));
}

/**
 * Triangular draw, then a counter-move against mean Anlage (PRD 07.2),
 * then the 15% elite cut when the realised skill mean is above 95.
 */
export function adjustDrive(
  triangular: number,
  meanAnlage: number,
  skillMean: number,
  eliteRoll: number,
): number {
  let drive = triangular + DRIVE_CORRELATION * (meanAnlage - ANLAGE_CENTER);
  if (skillMean > 95 && eliteRoll < 0.15) drive *= 0.85;
  return Math.min(1.6, Math.max(0.4, drive));
}

export function intakeBirthDate(seasonYear: number, random: () => number): string {
  const start = Date.UTC(seasonYear - 16, 5, 1);
  const day = Math.floor(random() * 365);
  const iso = new Date(start + day * 86_400_000).toISOString().slice(0, 10);
  const seasonEnd = `${seasonYear}-05-31`;
  return iso > seasonEnd ? seasonEnd : iso;
}

/** Build intake players without the season-end week gate (demo roster seeding). */
export function buildAcademyCohort(input: GenerateIntakeInput): Player[] {
  const count = input.count ?? hqIntakeCount(input.facility);
  if (INTAKE_POSITIONS.length < count) {
    throw new Error(`Intake position list must cover ${count} slots`);
  }
  const lastId = input.idStart + count - 1;
  if (input.idStart < 0 || lastId > 99_999) {
    throw new Error(`Intake ids must stay inside pl_00000–pl_99999 (start ${input.idStart})`);
  }

  const mixture = academyMixture(input.facility, input.meanShift ?? 0);
  const positions =
    input.fixedPositions && input.fixedPositions.length >= count
      ? input.fixedPositions.slice(0, count)
      : intakePositionsForCount(count, input.random);
  const players: Player[] = [];
  for (let index = 0; index < count; index++) {
    players.push(generateOne(input, mixture, index, positions[index] ?? "CM"));
  }
  return players;
}

export function generateYouthIntake(input: GenerateIntakeInput): Player[] {
  if (input.week !== SEASON_END_WEEK) {
    throw new IntakeOutOfSeasonError(input.week);
  }
  return buildAcademyCohort(input);
}

function intakePositionsForCount(count: number, random: () => number): PositionPrimary[] {
  if (count < INTAKE_COUNT) {
    return shuffleCopy(INTAKE_POSITIONS, random).slice(0, count);
  }
  return INTAKE_POSITIONS.slice(0, count);
}

function shuffleCopy<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target]!, result[index]!];
  }
  return result;
}

function generateOne(
  input: GenerateIntakeInput,
  mixture: MixtureComponent[],
  index: number,
  position: PositionPrimary,
): Player {
  const component = mixture[pickIndex(mixture, input.random)] ?? mixture[0]!;
  const attributes = drawAttributes(component, position, input.random);
  const anlage = input.hiddenProfile === "max_development" ? maxAnlageProfile() : drawAnlage(input.random);
  const skillMean = average(SKILLS.map((key) => attributes[key]));
  const meanAnlage = average(Object.values(anlage));
  const drive =
    input.hiddenProfile === "max_development"
      ? 1.6
      : adjustDrive(
          sampleTriangular(0.6, 1, 1.5, input.random),
          meanAnlage,
          skillMean,
          input.random(),
        );

  const idNumber = input.idStart + index;
  const portraitSeed = Math.floor(input.random() * 1_000_000_000);
  const player: Player = {
    id: `pl_${String(idNumber).padStart(5, "0")}`,
    name: input.nameFor?.(portraitSeed, index) ?? generatePlayerName(portraitSeed),
    birth: {
      date: intakeBirthDate(input.seasonYear, input.random),
      place: input.region,
      region: input.region,
    },
    nationality: input.nationality,
    age: 15,
    club_id: input.clubId,
    squad_status: "u17",
    position,
    flexibility: [],
    contract: null,
    market_value: marketValue({
      ca: estimateCa(attributes, position),
      age: 15,
      monthsRemaining: 0,
      wage: 0,
      marketWage: 0,
      demandFactor: 1,
      reputationFactor: 1,
    }),
    attributes,
    hidden: {
      anlage,
      drive,
      maturity_offset: maturityOffset(input.random()),
      breakout_flags: component.prodigy ? [PRODIGY_FLAG] : [],
    },
    state: {
      fitness: 100,
      injury: null,
      form: 0,
      morale: 70,
      weekly_minutes: 0,
      season_minutes: 0,
      season_apps: 0,
      season_goals: 0,
      season_assists: 0,
      season_yellow_cards: 0,
      season_tackles: 0,
      season_headers: 0,
      recent_growth_26w: 0,
      recent_weekly_minutes: [],
      last_match_goals: 0,
      youth_site: input.youthSite ?? YOUTH_SITE_HQ,
      modifiers: [],
    },
    history: {
      growth: [],
      clubs: [],
      achievements: [],
      milestones: [],
    },
    stamps: [],
    portrait_seed: portraitSeed,
  };
  return seedPhaseStamps(ensureYouthContract(player, input.season), input.season, 1, input.random);
}

function drawAttributes(
  component: MixtureComponent,
  position: PositionPrimary,
  random: () => number,
): Attributes {
  const weights = YOUTH_POSITION_WEIGHTS[position];
  const skill = (key: (typeof SKILLS)[number]): number => {
    const positional = (weights[key] ?? 0) * 0.1 * component.mean;
    const keeperDump = key === "gk_handling" && position !== "GK" ? -50 : 0;
    const value = Math.round(
      component.mean + positional + keeperDump + sampleStandardNormal(random) * component.stddev,
    );
    return Math.min(199, Math.max(0, value));
  };
  return {
    shooting: skill("shooting"),
    passing: skill("passing"),
    dribbling: skill("dribbling"),
    technique: skill("technique"),
    pace: skill("pace"),
    strength: skill("strength"),
    stamina: skill("stamina"),
    composure: skill("composure"),
    leadership: skill("leadership"),
    positioning: skill("positioning"),
    vision: skill("vision"),
    concentration: skill("concentration"),
    teamwork: skill("teamwork"),
    weak_foot: 20 + Math.floor(random() * 61),
    gk_handling: skill("gk_handling"),
  };
}

export function maxAnlageProfile(): Player["hidden"]["anlage"] {
  return {
    shooting: ANLAGE_MAX,
    passing: ANLAGE_MAX,
    dribbling: ANLAGE_MAX,
    technique: ANLAGE_MAX,
    pace: ANLAGE_MAX,
    strength: ANLAGE_MAX,
    stamina: ANLAGE_MAX,
    composure: ANLAGE_MAX,
    leadership: ANLAGE_MAX,
    positioning: ANLAGE_MAX,
    vision: ANLAGE_MAX,
    concentration: ANLAGE_MAX,
    teamwork: ANLAGE_MAX,
    weak_foot: ANLAGE_MAX,
    gk_handling: ANLAGE_MAX,
  };
}

function drawAnlage(random: () => number): Player["hidden"]["anlage"] {
  const sample = (): number => ANLAGE_MIN + random() * (ANLAGE_MAX - ANLAGE_MIN);
  return {
    shooting: sample(),
    passing: sample(),
    dribbling: sample(),
    technique: sample(),
    pace: sample(),
    strength: sample(),
    stamina: sample(),
    composure: sample(),
    leadership: sample(),
    positioning: sample(),
    vision: sample(),
    concentration: sample(),
    teamwork: sample(),
    weak_foot: sample(),
    gk_handling: sample(),
  };
}

function maturityOffset(roll: number): number {
  if (roll < 0.03) return 5;
  if (roll < 0.03 + 0.08) return -5;
  return 0;
}

function pickIndex(mixture: MixtureComponent[], random: () => number): number {
  const roll = random();
  let cursor = 0;
  for (let index = 0; index < mixture.length; index++) {
    cursor += mixture[index]?.weight ?? 0;
    if (roll < cursor) return index;
  }
  return mixture.length - 1;
}

function sampleTriangular(min: number, mode: number, max: number, random: () => number): number {
  const roll = random();
  const threshold = (mode - min) / (max - min);
  if (roll < threshold) {
    return min + Math.sqrt(roll * (max - min) * (mode - min));
  }
  return max - Math.sqrt((1 - roll) * (max - min) * (max - mode));
}

function sampleStandardNormal(random: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
