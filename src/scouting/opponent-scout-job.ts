import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import type { Player } from "../types/player.ts";
import type { MatchLineupState } from "../match/lineup-board.ts";
import type { TacticsPresetSlot } from "../match/tactics-presets.ts";
import type { ScoutBoard } from "./scout-board.ts";
import { busyScoutIds } from "./scout-busy.ts";
import {
  buildOpponentScoutReport,
  buildOpponentScoutVariants,
  type OpponentScoutReport,
} from "./opponent-scout-bundle.ts";
import { opponentScoutMatchIdFromSetup } from "./opponent-scout-match-id.ts";
import { OPPONENT_SCOUT_WORKING_DAYS } from "./opponent-scout-sims.ts";
import { appendScoutJobNotices } from "./scout-job-postfach.ts";
import type { ScoutNetworkState } from "./scout-network.ts";
import { scoutJobOpponentPostfachItemId } from "../inbox/postfach-scout-job.ts";
import { prepareCareerMatch } from "../sim/career-match-setup.ts";
import type { GameSession } from "../persistence/game-session.ts";
import type { ScoutCalendarDay } from "./scout-calendar-day.ts";

export interface ActiveOpponentScout {
  match_id: string;
  assigned_scout_id: string;
  working_days_done: number;
  working_days_total: number;
  season: number;
  week: number;
  cancelling_since?: ScoutCalendarDay;
}

export type OpponentScoutStartReason =
  | "ok"
  | "not_match_week"
  | "job_active"
  | "fixture_changed"
  | "no_scout";

export type OpponentScoutWorkingDayContext = {
  masterSeed: number;
  setup: CareerMatchSetup;
  players: readonly Player[];
  rivalPlayers: readonly Player[];
  matchLineup?: MatchLineupState;
  tacticsPresets: readonly TacticsPresetSlot[];
  opponentShortName: string;
  opponentCrestId?: string;
};

export function canStartOpponentScout(
  board: ScoutBoard,
  network: ScoutNetworkState,
  setup: CareerMatchSetup | null,
  season: number,
): { ok: boolean; reason: OpponentScoutStartReason } {
  if (!setup) return { ok: false, reason: "not_match_week" };
  if (board.active_opponent_scout) return { ok: false, reason: "job_active" };
  const matchId = opponentScoutMatchIdFromSetup(season, setup);
  const busy = busyScoutIds(board);
  const free = (network.scouts ?? []).filter((scout) => !busy.includes(scout.id));
  if (free.length === 0) return { ok: false, reason: "no_scout" };
  void matchId;
  return { ok: true, reason: "ok" };
}

export function startOpponentScoutJob(
  board: ScoutBoard,
  network: ScoutNetworkState,
  setup: CareerMatchSetup,
  season: number,
  week: number,
  scoutId?: string | null,
): { board: ScoutBoard; reason: OpponentScoutStartReason } {
  const gate = canStartOpponentScout(board, network, setup, season);
  if (!gate.ok) return { board, reason: gate.reason };

  const busy = busyScoutIds(board);
  const assigned =
    scoutId && !busy.includes(scoutId)
      ? scoutId
      : network.scouts
          .filter((scout) => !busy.includes(scout.id))
          .sort((a, b) => b.trust - a.trust)[0]?.id ?? null;
  if (!assigned) return { board, reason: "no_scout" };

  const match_id = opponentScoutMatchIdFromSetup(season, setup);
  return {
    board: {
      ...board,
      active_opponent_scout: {
        match_id,
        assigned_scout_id: assigned,
        working_days_done: 0,
        working_days_total: OPPONENT_SCOUT_WORKING_DAYS,
        season,
        week,
      },
    },
    reason: "ok",
  };
}

export function opponentScoutJobProgress(
  job: ActiveOpponentScout | null | undefined,
): { done: number; total: number } | null {
  if (!job) return null;
  return { done: job.working_days_done, total: job.working_days_total };
}

export function advanceOpponentScoutOnWorkingDay(
  board: ScoutBoard,
  network: ScoutNetworkState,
  context: OpponentScoutWorkingDayContext | null | undefined,
): ScoutBoard {
  const job = board.active_opponent_scout;
  if (!job) return board;
  if (job.cancelling_since) return board;

  const nextDone = job.working_days_done + 1;
  if (nextDone < job.working_days_total) {
    return {
      ...board,
      active_opponent_scout: { ...job, working_days_done: nextDone },
    };
  }

  if (!context?.setup) {
    return {
      ...board,
      active_opponent_scout: { ...job, working_days_done: nextDone },
    };
  }

  const expectedId = opponentScoutMatchIdFromSetup(job.season, context.setup);
  if (expectedId !== job.match_id) {
    return { ...board, active_opponent_scout: null };
  }

  const scout = network.scouts.find((entry) => entry.id === job.assigned_scout_id);
  const trust = scout?.trust ?? 50;

  const { variants } = buildOpponentScoutVariants({
    masterSeed: context.masterSeed,
    season: job.season,
    week: job.week,
    matchId: job.match_id,
    setup: context.setup,
    players: context.players,
    rivalPlayers: context.rivalPlayers,
    matchLineup: context.matchLineup,
    tacticsPresets: context.tacticsPresets,
  });
  const report = buildOpponentScoutReport(job.match_id, variants, trust);

  const notice = {
    id: scoutJobOpponentPostfachItemId(job.match_id, job.season, job.week),
    kind: "opponent_scout_complete" as const,
    season: job.season,
    week: job.week,
    consumed: false,
    matchId: job.match_id,
    opponentShortName: context.opponentShortName,
    opponentCrestId: context.opponentCrestId,
    assignedScoutName: scout?.name,
    report,
  };

  const cleared = { ...board, active_opponent_scout: null };
  return appendScoutJobNotices(cleared, [notice]);
}

export function buildOpponentScoutWorkingDayContext(
  session: GameSession,
  matchLineup?: MatchLineupState,
  tacticsPresets?: readonly TacticsPresetSlot[],
): OpponentScoutWorkingDayContext | null {
  const setup = prepareCareerMatch(session);
  if (!setup) return null;
  return {
    masterSeed: session.masterSeed,
    setup,
    players: session.players,
    rivalPlayers: session.rivalPlayers,
    matchLineup,
    tacticsPresets: tacticsPresets ?? session.tacticsPresets ?? [],
    opponentShortName: setup.opponentShortName,
  };
}

export type { OpponentScoutReport };
