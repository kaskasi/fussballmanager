import type { Attributes, Player, PositionPrimary } from "../types/player.ts";
import { generatePlayerName } from "../types/player-display.ts";
import { ensureYouthContract } from "../player/youth-contract.ts";
import { SEASON_END_WEEK } from "../sim/game-calendar.ts";
import { estimateCa, marketValue } from "../transfers/market-value.ts";

/**
 * Yearly academy intake (PRD 03.1, defaults from PRD 07.2).
 * File is kebab-case per the project naming rule.
 *
 * Not in this module: campus view (F3.2), youth match sim (F3.3), inbox (F3.4).
 * Position skill weights are named in PRD 07.2 and never tabulated, so every
 * 0–199 skill is an independent draw from the player's mixture component.
 * Anlage is an independent uniform per key (PRD 07.2). The ±0.10 position
 * band in PRD 03.1 has no position means to vary around.
 */

export const INTAKE_COUNT = 24;
/** Re-export for callers that already import from this module. */
export { SEASON_END_WEEK } from "../sim/game-calendar.ts";

const PRODIGY_FLAG = "prodigy_foundation";
const ANLAGE_MIN = 0.85;
const ANLAGE_MAX = 1.5;
const ANLAGE_CENTER = (ANLAGE_MIN + ANLAGE_MAX) / 2;
const DRIVE_CORRELATION = -0.15;

export type AcademyFacility = "academy_basic" | "academy_performance" | "academy_elite";

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
];

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
}

/**
 * Facility shifts replace each other (PRD 03.1). Elite also boosts the
 * mean-120 weight by 1.5 and renormalises the rest so the weights still sum to 1.
 */
export function academyMixture(facility: AcademyFacility): MixtureComponent[] {
  const shift = facility === "academy_elite" ? 25 : facility === "academy_performance" ? 10 : 0;
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
  if (INTAKE_POSITIONS.length !== INTAKE_COUNT) {
    throw new Error(`Intake position list must contain ${INTAKE_COUNT} slots`);
  }
  const lastId = input.idStart + INTAKE_COUNT - 1;
  if (input.idStart < 0 || lastId > 99_999) {
    throw new Error(`Intake ids must stay inside pl_00000–pl_99999 (start ${input.idStart})`);
  }

  const mixture = academyMixture(input.facility);
  const players: Player[] = [];
  for (let index = 0; index < INTAKE_COUNT; index++) {
    players.push(generateOne(input, mixture, index));
  }
  return players;
}

export function generateYouthIntake(input: GenerateIntakeInput): Player[] {
  if (input.week !== SEASON_END_WEEK) {
    throw new IntakeOutOfSeasonError(input.week);
  }
  return buildAcademyCohort(input);
}

function generateOne(
  input: GenerateIntakeInput,
  mixture: MixtureComponent[],
  index: number,
): Player {
  const component = mixture[pickIndex(mixture, input.random)] ?? mixture[0]!;
  const attributes = drawAttributes(component, input.random);
  const anlage = drawAnlage(input.random);
  const skillMean = average(SKILLS.map((key) => attributes[key]));
  const meanAnlage = average(Object.values(anlage));
  const drive = adjustDrive(
    sampleTriangular(0.6, 1, 1.5, input.random),
    meanAnlage,
    skillMean,
    input.random(),
  );

  const idNumber = input.idStart + index;
  const position = INTAKE_POSITIONS[index] ?? "CM";
  const portraitSeed = Math.floor(input.random() * 1_000_000_000);
  const player: Player = {
    id: `pl_${String(idNumber).padStart(5, "0")}`,
    name: generatePlayerName(portraitSeed),
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
  return ensureYouthContract(player, input.season);
}

function drawAttributes(component: MixtureComponent, random: () => number): Attributes {
  const skill = (): number => {
    const value = Math.round(component.mean + sampleStandardNormal(random) * component.stddev);
    return Math.min(199, Math.max(0, value));
  };
  return {
    shooting: skill(),
    passing: skill(),
    dribbling: skill(),
    technique: skill(),
    pace: skill(),
    strength: skill(),
    stamina: skill(),
    composure: skill(),
    leadership: skill(),
    positioning: skill(),
    vision: skill(),
    concentration: skill(),
    teamwork: skill(),
    weak_foot: 20 + Math.floor(random() * 61),
    gk_handling: skill(),
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
