/**
 * PRD 36 — one season of both domestic cups: entrants, draws, rounds played
 * week by week with the quick strength model, and the archive rows.
 * Pure and deterministic: every draw and tie is seeded from `master_seed`.
 */
import type { TeamId } from "@fussballmanager/shared";
import type { WorldClub } from "../world/world-generator.ts";
import { seededRoll, teamStrength } from "../sim/division-matchday.ts";
import { worldClubForTeam } from "../sim/league-divisions.ts";
import { divisionOfClub, pyramidDivision, PYRAMID, type DivisionId } from "../sim/league-pyramid.ts";
import type { Player } from "../types/player.ts";
import {
  CUPS,
  NATIONAL_CUP_SIZE,
  NATIONAL_CUP_TIERS,
  NATIONAL_FILL_TIER,
  REGIONAL_CUP_TIERS,
  REGIONAL_PRELIM_CLUBS,
  REGIONAL_PRELIM_TIER,
  cupDefinition,
  cupRoundCount,
  cupRoundKey,
  cupRoundWeek,
  type CupId,
  type CupRoundKey,
} from "./cup-definition.ts";
import { simulateCupTie, type CupTieResult, type StrengthOf } from "./cup-tie.ts";

export interface CupTie {
  home: TeamId;
  away: TeamId;
  /** The final: no home advantage. */
  neutral?: boolean;
  result?: CupTieResult;
}

export interface CupRound {
  round: number;
  key: CupRoundKey;
  week: number;
  ties: CupTie[];
}

export interface CupCompetition {
  id: CupId;
  entrants: TeamId[];
  /** Rounds drawn so far, in order. */
  rounds: CupRound[];
  winner: TeamId | null;
  runnerUp: TeamId | null;
}

export interface CupSeason {
  season: number;
  cups: CupCompetition[];
}

/** `[round, home, away, homeGoals, awayGoals, winner]`, plus `penHome, penAway` after a shootout. */
export type ArchiveCupTie =
  | [number, TeamId, TeamId, number, number, TeamId]
  | [number, TeamId, TeamId, number, number, TeamId, number, number];

export interface ArchiveCup {
  id: CupId;
  winner: TeamId | null;
  runnerUp: TeamId | null;
  ties: ArchiveCupTie[];
}

export interface PlayedCupTie {
  cup: CupId;
  round: number;
  key: CupRoundKey;
  tie: CupTie & { result: CupTieResult };
}

export type Pools = Partial<Record<DivisionId, readonly TeamId[]>>;

export interface CupSeasonContext {
  season: number;
  masterSeed: number;
  pools: Pools;
  worldClubs?: readonly WorldClub[];
  /** Last season's Nordpokal winner and runner-up (qualify for the Meisterpokal). */
  regionalFinalists?: readonly TeamId[];
}

export interface CupWeekContext {
  masterSeed: number;
  pools: Pools;
  strengthOf: StrengthOf;
}

function mix(...parts: number[]): number {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    hash = Math.imul(hash ^ (part | 0), 0x01000193);
    hash ^= hash >>> 15;
  }
  return hash >>> 0;
}

function drawSeed(masterSeed: number, season: number, id: CupId, round: number): number {
  return mix(masterSeed, season, cupDefinition(id).salt, round, 0x64726177);
}

function tieSeed(masterSeed: number, season: number, id: CupId, round: number, index: number): number {
  return mix(masterSeed, season, cupDefinition(id).salt, round, index, 0x74696521);
}

function tierOf(pools: Pools, teamId: TeamId): number {
  const division = divisionOfClub(pools, teamId);
  // A club outside the pyramid is treated as the lowest tier (it plays at home).
  return division ? pyramidDivision(division).tier : PYRAMID.length + 1;
}

function clubsOfTier(pools: Pools, tier: number): TeamId[] {
  const division = PYRAMID.find((entry) => entry.tier === tier);
  return division ? [...(pools[division.id] ?? [])] : [];
}

function reputation(teamId: TeamId, worldClubs?: readonly WorldClub[]): number {
  return worldClubForTeam(teamId, worldClubs)?.reputation ?? 0;
}

function byReputation(worldClubs: readonly WorldClub[] | undefined, direction: 1 | -1) {
  return (left: TeamId, right: TeamId) =>
    direction * (reputation(left, worldClubs) - reputation(right, worldClubs)) ||
    String(left).localeCompare(String(right));
}

function shuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  for (let index = out.length - 1; index > 0; index--) {
    const pick = Math.floor(seededRoll(seed, 500 + index) * (index + 1));
    [out[index], out[pick]] = [out[pick]!, out[index]!];
  }
  return out;
}

/**
 * PRD 36 §4 — pair the clubs in draw order. The lower-tier club is at home;
 * same tier: the first drawn. An odd club out gets a bye (never happens with
 * full pools, but a short pool must not break the season).
 */
export function drawTies(
  teams: readonly TeamId[],
  seed: number,
  pools: Pools,
  final = false,
): CupTie[] {
  const order = shuffle(teams, seed);
  const ties: CupTie[] = [];
  for (let index = 0; index + 1 < order.length; index += 2) {
    const first = order[index]!;
    const second = order[index + 1]!;
    if (final) {
      ties.push({ home: first, away: second, neutral: true });
    } else if (tierOf(pools, second) > tierOf(pools, first)) {
      ties.push({ home: second, away: first });
    } else {
      ties.push({ home: first, away: second });
    }
  }
  return ties;
}

export function regionalCupEntrants(pools: Pools): TeamId[] {
  return REGIONAL_CUP_TIERS.flatMap((tier) => clubsOfTier(pools, tier));
}

/** The 8 lowest-reputation Oberliga clubs play the Nordpokal preliminary round. */
export function regionalPrelimClubs(pools: Pools, worldClubs?: readonly WorldClub[]): TeamId[] {
  return clubsOfTier(pools, REGIONAL_PRELIM_TIER).sort(byReputation(worldClubs, 1)).slice(0, REGIONAL_PRELIM_CLUBS);
}

export function nationalCupEntrants(
  pools: Pools,
  worldClubs?: readonly WorldClub[],
  regionalFinalists: readonly TeamId[] = [],
): TeamId[] {
  const entrants = NATIONAL_CUP_TIERS.flatMap((tier) => clubsOfTier(pools, tier));
  const add = (teamId: TeamId) => {
    if (entrants.length < NATIONAL_CUP_SIZE && !entrants.includes(teamId) && divisionOfClub(pools, teamId)) {
      entrants.push(teamId);
    }
  };
  regionalFinalists.forEach(add);
  for (let tier = NATIONAL_FILL_TIER; tier <= PYRAMID.length && entrants.length < NATIONAL_CUP_SIZE; tier++) {
    clubsOfTier(pools, tier).sort(byReputation(worldClubs, -1)).forEach(add);
  }
  return entrants;
}

function newRound(id: CupId, round: number, ties: CupTie[]): CupRound {
  return { round, key: cupRoundKey(id, round), week: cupRoundWeek(id, round), ties };
}

/** A season's cups with round 1 of each drawn. */
export function createCupSeason(ctx: CupSeasonContext): CupSeason {
  const regionalEntrants = regionalCupEntrants(ctx.pools);
  const prelim = regionalPrelimClubs(ctx.pools, ctx.worldClubs);
  const nationalEntrants = nationalCupEntrants(ctx.pools, ctx.worldClubs, ctx.regionalFinalists);
  const first: Record<CupId, readonly TeamId[]> = { regional: prelim, national: nationalEntrants };
  const entrants: Record<CupId, TeamId[]> = { regional: regionalEntrants, national: nationalEntrants };
  return {
    season: ctx.season,
    cups: CUPS.map((cup) => ({
      id: cup.id,
      entrants: entrants[cup.id],
      rounds: [
        newRound(
          cup.id,
          1,
          drawTies(first[cup.id], drawSeed(ctx.masterSeed, ctx.season, cup.id, 1), ctx.pools, cupRoundCount(cup.id) === 1),
        ),
      ],
      winner: null,
      runnerUp: null,
    })),
  };
}

function losers(cup: CupCompetition): Set<TeamId> {
  const out = new Set<TeamId>();
  for (const round of cup.rounds) {
    for (const tie of round.ties) {
      if (tie.result) out.add(tie.result.winner === tie.home ? tie.away : tie.home);
    }
  }
  return out;
}

/** Clubs still in the cup: entrants that have not lost a tie. */
export function cupSurvivors(cup: CupCompetition): TeamId[] {
  const out = losers(cup);
  return cup.entrants.filter((teamId) => !out.has(teamId));
}

function playRound(
  season: number,
  cup: CupCompetition,
  roundIndex: number,
  ctx: CupWeekContext,
): { cup: CupCompetition; played: PlayedCupTie[] } {
  const round = cup.rounds[roundIndex]!;
  const played: PlayedCupTie[] = [];
  const ties = round.ties.map((tie, index) => {
    if (tie.result) return tie;
    const result = simulateCupTie(
      tie.home,
      tie.away,
      tieSeed(ctx.masterSeed, season, cup.id, round.round, index),
      ctx.strengthOf,
      tie.neutral ?? false,
    );
    const done = { ...tie, result };
    played.push({ cup: cup.id, round: round.round, key: round.key, tie: done });
    return done;
  });
  const rounds = cup.rounds.map((entry, index) => (index === roundIndex ? { ...round, ties } : entry));
  let next: CupCompetition = { ...cup, rounds };

  const survivors = cupSurvivors(next);
  if (survivors.length <= 1 || round.round >= cupRoundCount(cup.id)) {
    const final = ties[ties.length - 1];
    next = {
      ...next,
      winner: survivors.length === 1 ? survivors[0]! : (final?.result?.winner ?? null),
      runnerUp: final?.result ? (final.result.winner === final.home ? final.away : final.home) : null,
    };
  } else {
    const nextRound = round.round + 1;
    const draw = drawTies(
      survivors,
      drawSeed(ctx.masterSeed, season, cup.id, nextRound),
      ctx.pools,
      nextRound === cupRoundCount(cup.id),
    );
    next = { ...next, rounds: [...rounds, newRound(cup.id, nextRound, draw)] };
  }
  return { cup: next, played };
}

/** Play every cup round scheduled in `week` and draw the next ones. */
export function playCupWeek(
  state: CupSeason,
  week: number,
  ctx: CupWeekContext,
): { state: CupSeason; played: PlayedCupTie[] } {
  const played: PlayedCupTie[] = [];
  const cups = state.cups.map((cup) => {
    const index = cup.rounds.findIndex((round) => round.week === week && round.ties.some((tie) => !tie.result));
    if (index < 0) return cup;
    const step = playRound(state.season, cup, index, ctx);
    played.push(...step.played);
    return step.cup;
  });
  return { state: { ...state, cups }, played };
}

/** Play every round whose week lies before `week` (a save created mid-season). */
export function catchUpCupSeason(state: CupSeason, week: number, ctx: CupWeekContext): CupSeason {
  let current = state;
  for (let guard = 0; guard < 32; guard++) {
    const pending = current.cups
      .flatMap((cup) => cup.rounds)
      .filter((round) => round.week < week && round.ties.some((tie) => !tie.result))
      .map((round) => round.week);
    if (pending.length === 0) break;
    current = playCupWeek(current, Math.min(...pending), ctx).state;
  }
  return current;
}

export function cupCompetition(state: CupSeason | undefined, id: CupId): CupCompetition | undefined {
  return state?.cups.find((cup) => cup.id === id);
}

/** Nordpokal winner and runner-up of a finished season (empty while it runs). */
export function regionalFinalists(state: CupSeason | undefined): TeamId[] {
  const regional = cupCompetition(state, "regional");
  return [regional?.winner, regional?.runnerUp].filter((teamId): teamId is TeamId => Boolean(teamId));
}

export function archiveCups(state: CupSeason | undefined): ArchiveCup[] {
  return (state?.cups ?? []).map((cup) => ({
    id: cup.id,
    winner: cup.winner,
    runnerUp: cup.runnerUp,
    ties: cup.rounds.flatMap((round) =>
      round.ties.flatMap((tie): ArchiveCupTie[] => {
        const result = tie.result;
        if (!result) return [];
        const row: [number, TeamId, TeamId, number, number, TeamId] = [
          round.round,
          tie.home,
          tie.away,
          result.homeGoals,
          result.awayGoals,
          result.winner,
        ];
        return [result.penalties ? [...row, result.penalties[0], result.penalties[1]] : row];
      }),
    ),
  }));
}

/** Quick-sim strength of every club; the manager's club may use its own squad strength. */
export function cupStrengthLookup(
  rivalPlayers: readonly Player[],
  own?: { teamId: TeamId; strength: number },
): StrengthOf {
  const cache = new Map<TeamId, number>();
  return (teamId) => {
    if (own && teamId === own.teamId) return own.strength;
    let value = cache.get(teamId);
    if (value === undefined) {
      value = teamStrength(teamId, rivalPlayers);
      cache.set(teamId, value);
    }
    return value;
  };
}

/**
 * The current season's cups: kept when they belong to `season`, otherwise
 * created (round 1 drawn) and caught up to `week` (PRD 36 §5).
 */
export function ensureCupSeason(input: {
  cups: CupSeason | undefined;
  season: number;
  week: number;
  masterSeed: number;
  pools: Pools;
  worldClubs?: readonly WorldClub[];
  rivalPlayers: readonly Player[];
  regionalFinalists?: readonly TeamId[];
}): CupSeason {
  if (input.cups?.season === input.season) return input.cups;
  const created = createCupSeason({
    season: input.season,
    masterSeed: input.masterSeed,
    pools: input.pools,
    ...(input.worldClubs ? { worldClubs: input.worldClubs } : {}),
    ...(input.regionalFinalists ? { regionalFinalists: input.regionalFinalists } : {}),
  });
  return catchUpCupSeason(created, input.week, {
    masterSeed: input.masterSeed,
    pools: input.pools,
    strengthOf: cupStrengthLookup(input.rivalPlayers),
  });
}

/** True when a cup round of `state` is scheduled in `week` and not played yet. */
export function hasCupRoundInWeek(state: CupSeason | undefined, week: number): boolean {
  return (state?.cups ?? []).some((cup) =>
    cup.rounds.some((round) => round.week === week && round.ties.some((tie) => !tie.result)),
  );
}
