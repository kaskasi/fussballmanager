import { fairInitialProContract } from "../transfers/fair-initial-contract.ts";
import { refreshPlayerMarketValue } from "../transfers/refresh-market-values.ts";
import type { Player, PositionPrimary } from "../types/player.ts";
import { buildAcademyCohort } from "../youth/intake-generator.ts";
import { SEASON_END_WEEK } from "./game-calendar.ts";
import { seasonCalendarYear } from "./season-label.ts";
import {
  deriveWorldSeed,
  generateJourneyman,
  laterPlayerId,
  startingClubStrength,
  worldCareerClubId,
  type WorldClub,
} from "../world/world-generator.ts";

/**
 * PRD 31 §5 — AI clubs at season end, after retirement: a small youth intake,
 * then a refill with journeymen to {@link AI_ROSTER_TARGET} players and the
 * positional minimums. Seeds derive from the master seed, season and club index.
 */

export const AI_ROSTER_TARGET = 22;
/** Youth come in only while the roster has room below this size. */
export const AI_ROSTER_YOUTH_CAP = 24;
export const AI_YOUTH_MIN = 2;
export const AI_YOUTH_MAX = 4;
/** Youth skill mean sits this far below the club's strength; growth closes the gap. */
export const AI_YOUTH_STRENGTH_GAP = 12;
/** Refill players are a little below the club's level. */
export const AI_JOURNEYMAN_STRENGTH_GAP = 3;
const YOUTH_SKILL_BASE = 65;

type PositionGroup = "GK" | "DEF" | "MID" | "ATT";

export const AI_POSITION_MINIMUMS: Record<PositionGroup, number> = { GK: 2, DEF: 6, MID: 6, ATT: 4 };
/** Generated-roster shape (22 players); refill fills the biggest gap to it. */
const GROUP_SHAPE: Record<PositionGroup, number> = { GK: 2, DEF: 8, MID: 7, ATT: 5 };
const GROUP_ORDER: readonly PositionGroup[] = ["GK", "DEF", "MID", "ATT"];
const GROUP_POSITIONS: Record<PositionGroup, readonly PositionPrimary[]> = {
  GK: ["GK"],
  DEF: ["CB", "LB", "CB", "RB"],
  MID: ["CM", "DM", "AM", "CM", "LM", "RM"],
  ATT: ["CF", "LW", "RW", "CF"],
};

export function positionGroup(position: PositionPrimary): PositionGroup {
  switch (position) {
    case "GK":
      return "GK";
    case "CB":
    case "LB":
    case "RB":
      return "DEF";
    case "LW":
    case "RW":
    case "CF":
      return "ATT";
    default:
      return "MID";
  }
}

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Positions for the next `count` arrivals: below-minimum groups first, then the
 * group furthest under the generated shape.
 */
export function neededPositions(roster: readonly Player[], count: number): PositionPrimary[] {
  const counts: Record<PositionGroup, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  for (const player of roster) counts[positionGroup(player.position)] += 1;
  const picks: PositionPrimary[] = [];
  for (let index = 0; index < count; index++) {
    const below = GROUP_ORDER.find((group) => counts[group] < AI_POSITION_MINIMUMS[group]);
    const group =
      below ??
      GROUP_ORDER.reduce((best, candidate) =>
        GROUP_SHAPE[candidate] - counts[candidate] > GROUP_SHAPE[best] - counts[best] ? candidate : best,
      );
    const options = GROUP_POSITIONS[group];
    picks.push(options[counts[group] % options.length] ?? options[0]!);
    counts[group] += 1;
  }
  return picks;
}

function refillCount(roster: readonly Player[], youth: number): number {
  const counts: Record<PositionGroup, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  for (const player of roster) counts[positionGroup(player.position)] += 1;
  const minimumGap = GROUP_ORDER.reduce(
    (sum, group) => sum + Math.max(0, AI_POSITION_MINIMUMS[group] - counts[group]),
    0,
  );
  const sizeGap = AI_ROSTER_TARGET - roster.length - youth;
  return Math.max(minimumGap - youth, sizeGap, 0);
}

interface ClubUpkeepInput {
  club: WorldClub;
  clubIndex: number;
  /** Recruiting level on the generator's club-strength scale ({@link recruitingStrengths}). */
  strength: number;
  roster: readonly Player[];
  endingSeason: number;
  masterSeed: number;
}

function youthArrivals(input: ClubUpkeepInput, positions: readonly PositionPrimary[], strength: number): Player[] {
  if (positions.length === 0) return [];
  const { club, clubIndex, endingSeason, masterSeed } = input;
  const random = mulberry32(deriveWorldSeed(masterSeed, `ai-youth:${endingSeason}`, clubIndex));
  const target = strength - AI_YOUTH_STRENGTH_GAP + (club.reputation - 40) * 0.1;
  const cohort = buildAcademyCohort({
    season: endingSeason,
    week: SEASON_END_WEEK,
    seasonYear: seasonCalendarYear(endingSeason),
    clubId: worldCareerClubId(club.id),
    nationality: "DE",
    region: club.region,
    facility: "academy_basic",
    idStart: 0,
    random,
    count: positions.length,
    fixedPositions: positions,
    meanShift: target - YOUTH_SKILL_BASE,
  });
  return cohort.map((player, index) => {
    // 16 or 17 now, 17 or 18 after the season-end birthday.
    const age = 16 + Math.floor(random() * 2);
    const birthYear = 2025 + endingSeason - age;
    const pro: Player = {
      ...player,
      id: laterPlayerId(endingSeason, clubIndex, index),
      age,
      birth: { ...player.birth, date: `${birthYear}${player.birth.date.slice(4)}` },
      squad_status: "pro",
      history: {
        ...player.history,
        clubs: [
          { club_id: worldCareerClubId(club.id), from_season: endingSeason + 1, to_season: null, apps: 0, goals: 0 },
        ],
      },
    };
    const valued = refreshPlayerMarketValue(pro, endingSeason + 1);
    return { ...valued, contract: fairInitialProContract(valued, endingSeason, 3) };
  });
}

export interface ClubUpkeepResult {
  arrivals: Player[];
  youth: number;
  refill: number;
}

export function upkeepClubRoster(input: ClubUpkeepInput): ClubUpkeepResult {
  const { roster, strength } = input;
  const youthRandom = mulberry32(deriveWorldSeed(input.masterSeed, `ai-youth-count:${input.endingSeason}`, input.clubIndex));
  const rolled = AI_YOUTH_MIN + Math.floor(youthRandom() * (AI_YOUTH_MAX - AI_YOUTH_MIN + 1));
  const youthCount = Math.max(0, Math.min(rolled, AI_ROSTER_YOUTH_CAP - roster.length));
  const refill = refillCount(roster, youthCount);
  const positions = neededPositions(roster, youthCount + refill);
  const youth = youthArrivals(input, positions.slice(0, youthCount), strength);
  const ageRandom = mulberry32(deriveWorldSeed(input.masterSeed, `ai-refill-age:${input.endingSeason}`, input.clubIndex));
  const journeymen = positions.slice(youthCount).map((position, index) =>
    generateJourneyman(input.masterSeed, input.club, {
      season: input.endingSeason,
      clubIndex: input.clubIndex,
      slot: youthCount + index,
      position,
      clubStrength: strength - AI_JOURNEYMAN_STRENGTH_GAP,
      age: 22 + Math.floor(ageRandom() * 8),
    }),
  );
  return { arrivals: [...youth, ...journeymen], youth: youth.length, refill: journeymen.length };
}

export interface AiRosterUpkeepResult {
  rivalPlayers: Player[];
  youth: number;
  refill: number;
}

/**
 * Fixed recruiting level per club: the strength its roster was generated at,
 * moved by the gap between division anchors when it changed division. Fixed
 * anchors keep new players from tracking (and compounding) the roster's growth.
 */
export function recruitingStrengths(
  clubs: readonly WorldClub[],
  masterSeed: number,
  divisionOf: (clubId: string) => string | null,
): number[] {
  const generated = clubs.map((club, index) => startingClubStrength(masterSeed, club, index));
  const sums = new Map<string, { total: number; count: number }>();
  clubs.forEach((club, index) => {
    const entry = sums.get(club.division_id) ?? { total: 0, count: 0 };
    entry.total += generated[index] ?? 0;
    entry.count += 1;
    sums.set(club.division_id, entry);
  });
  const anchor = (divisionId: string) => {
    const entry = sums.get(divisionId);
    return entry && entry.count > 0 ? entry.total / entry.count : null;
  };
  return clubs.map((club, index) => {
    const base = generated[index] ?? 0;
    const current = divisionOf(worldCareerClubId(club.id)) ?? club.division_id;
    const from = anchor(club.division_id);
    const to = anchor(current);
    return from !== null && to !== null ? base + (to - from) : base;
  });
}

/** Every AI club in `clubs` (the player's club excluded) gets youth and a refill. */
export function upkeepAiRosters(input: {
  rivalPlayers: readonly Player[];
  clubs: readonly WorldClub[];
  playerClubId: string;
  endingSeason: number;
  masterSeed: number;
  divisionOf: (clubId: string) => string | null;
}): AiRosterUpkeepResult {
  const strengths = recruitingStrengths(input.clubs, input.masterSeed, input.divisionOf);
  const byClub = new Map<string, Player[]>();
  for (const player of input.rivalPlayers) {
    if (!player.club_id) continue;
    const roster = byClub.get(player.club_id) ?? [];
    roster.push(player);
    byClub.set(player.club_id, roster);
  }
  const arrivals: Player[] = [];
  let youth = 0;
  let refill = 0;
  input.clubs.forEach((club, clubIndex) => {
    const clubId = worldCareerClubId(club.id);
    if (clubId === input.playerClubId) return;
    const step = upkeepClubRoster({
      club,
      clubIndex,
      strength: strengths[clubIndex] ?? 0,
      roster: byClub.get(clubId) ?? [],
      endingSeason: input.endingSeason,
      masterSeed: input.masterSeed,
    });
    arrivals.push(...step.arrivals);
    youth += step.youth;
    refill += step.refill;
  });
  return { rivalPlayers: [...input.rivalPlayers, ...arrivals], youth, refill };
}
