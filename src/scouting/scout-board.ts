import type { Player, PositionPrimary } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import {
  worldCareerClubId,
  type WorldClub,
  type WorldDivisionId,
} from "../world/world-generator.ts";
import {
  applyQuietWeek,
  confidenceLabel,
  type AbilityEstimate,
  type PlayerKnowledge,
} from "./estimate-model.ts";
import { initialEstimateForPlayer, type ScoutedTarget } from "./market-list.ts";
import {
  DEFAULT_SCOUT_CAPACITY,
  discoveryHeadline,
  targetsForAssignment,
  type ScoutAssignment,
  type ScoutDiscoveryAlert,
} from "./scout-assignments.ts";
import {
  advanceDiscoveryWeek,
  advanceRegionScoutOnWorkingDay,
  emptyDiscovery,
  ensureTargetsForPool,
  isInScoutPool,
  normalizeDiscovery,
  type ActiveClubScout,
  type ActiveRegionScout,
  type ScoutDiscoveryState,
} from "./scout-discovery.ts";
import { applyHomeZoneBootstrap } from "./scout-region-unlock.ts";
import {
  appendScoutJobNotices,
  noticesFromDiscoveryJobAdvance,
  type ScoutJobCompleteNotice,
} from "./scout-job-postfach.ts";
import { isScoutWorkingWeekday } from "./scout-trip-duration.ts";
import {
  advanceScoutTripWeek,
  advanceScoutTripsOnWorkingDay,
  listActiveScoutTrips,
} from "./scout-trip-queue.ts";
import {
  advanceOpponentScoutOnWorkingDay,
  type ActiveOpponentScout,
  type OpponentScoutWorkingDayContext,
} from "./opponent-scout-job.ts";
import type { ActiveScoutTrip, ScoutTripPlan } from "./scout-trip.ts";
import {
  applyObservationWithAccuracy,
  scoutNetworkAccuracyModifier,
  scoutNetworkCapacity,
  type ScoutNetworkState,
} from "./scout-network.ts";
import { pickScoutForPlayerAssignment } from "./scout-player-assignment.ts";
import {
  applyFilterSweepToEstimate,
  filterSweepReductionPerPlayer,
} from "./scout-filter-sweep.ts";
import type { ScoutCalendarDay } from "./scout-calendar-day.ts";
import { finalizeScoutWorkCancellations } from "./scout-work-cancel.ts";

export interface BoardTarget extends ScoutedTarget {
  assigned: boolean;
  assigned_scout_id?: string | null;
  assigned_cancelling_since?: ScoutCalendarDay;
}

export interface ScoutKnowledgeTarget {
  playerId: string;
  estimate: AbilityEstimate;
  assigned: boolean;
  assigned_scout_id?: string | null;
  assigned_cancelling_since?: ScoutCalendarDay;
}

export interface ScoutReport {
  id: string;
  playerId: string;
  playerName: string;
  position: PositionPrimary;
  week: number;
  estimatedCa: number;
  uncertaintyRange: number;
  uncertaintyDelta: number;
  confidence: string;
}

export interface ScoutBoard {
  targets: Record<string, ScoutKnowledgeTarget>;
  recentReports?: ScoutReport[];
  assignments?: ScoutAssignment[];
  discoveryAlerts?: ScoutDiscoveryAlert[];
  discovery?: ScoutDiscoveryState;
  active_club_scout?: ActiveClubScout | null;
  active_region_scout?: ActiveRegionScout | null;
  scout_trip_queue?: ScoutTripPlan[];
  active_scout_trip?: ActiveScoutTrip | null;
  active_scout_trips?: ActiveScoutTrip[];
  discovery_postfach_queue?: ScoutJobCompleteNotice[];
  active_opponent_scout?: ActiveOpponentScout | null;
}

export function normalizeScoutBoard(board: ScoutBoard): ScoutBoard {
  const targets = Object.fromEntries(
    Object.entries(board.targets ?? {}).map(([playerId, target]) => [
      playerId,
      {
        playerId,
        estimate: target.estimate,
        assigned: target.assigned ?? false,
        assigned_scout_id: target.assigned_scout_id ?? null,
        assigned_cancelling_since: target.assigned_cancelling_since,
      },
    ]),
  );
  return {
    targets,
    recentReports: board.recentReports ?? [],
    assignments: board.assignments ?? [],
    discoveryAlerts: board.discoveryAlerts ?? [],
    discovery: normalizeDiscovery(board.discovery),
    active_club_scout: board.active_club_scout ?? null,
    active_region_scout: board.active_region_scout ?? null,
    scout_trip_queue: board.scout_trip_queue ?? [],
    active_scout_trips: listActiveScoutTrips(board),
    active_scout_trip: listActiveScoutTrips(board)[0] ?? null,
    discovery_postfach_queue: board.discovery_postfach_queue ?? [],
    active_opponent_scout: board.active_opponent_scout ?? null,
  };
}

export function createScoutBoard(
  _players: readonly Player[] = [],
  playerClub?: WorldClub | null,
): ScoutBoard {
  return {
    targets: {},
    recentReports: [],
    assignments: [],
    discoveryAlerts: [],
    discovery: applyHomeZoneBootstrap(emptyDiscovery(), playerClub),
    active_club_scout: null,
    active_region_scout: null,
    scout_trip_queue: [],
    active_scout_trips: [],
    active_scout_trip: null,
    discovery_postfach_queue: [],
    active_opponent_scout: null,
  };
}

/** Keep knowledge while replacing snapshots with the authoritative rival roster. */
export function reconcileScoutBoard(
  board: ScoutBoard,
  rivalPlayers: readonly Player[],
): ScoutBoard {
  const normalized = normalizeScoutBoard(board);
  const discovery = normalizeDiscovery(normalized.discovery);
  const targets = ensureTargetsForPool(normalized.targets, discovery, rivalPlayers);
  return { ...normalized, discovery, targets };
}

export function scoutReportsForWeek(board: ScoutBoard, week: number): ScoutReport[] {
  return (board.recentReports ?? []).filter((report) => report.week === week);
}

export function listBoardTargets(
  board: ScoutBoard,
  rivalPlayers: readonly Player[],
  clubs: readonly WorldClub[] = [],
): BoardTarget[] {
  const byId = new Map(rivalPlayers.map((player) => [player.id, player] as const));
  const clubNames = new Map(
    clubs.map((club) => [worldCareerClubId(club.id), club.name] as const),
  );
  const discovery = normalizeDiscovery(board.discovery);
  return Object.values(board.targets).flatMap((target) => {
    if (!isInScoutPool(discovery, target.playerId)) return [];
    const player = byId.get(target.playerId);
    return player
      ? [{
          player,
          estimate: target.estimate,
        assigned: target.assigned,
        assigned_scout_id: target.assigned_scout_id ?? null,
        assigned_cancelling_since: target.assigned_cancelling_since,
        clubName: player.club_id ? clubNames.get(player.club_id) : undefined,
        }]
      : [];
  });
}

export function getBoardTarget(
  board: ScoutBoard,
  playerId: string,
  rivalPlayers: readonly Player[],
): BoardTarget | null {
  const discovery = normalizeDiscovery(board.discovery);
  if (!isInScoutPool(discovery, playerId)) return null;
  const target = board.targets[playerId];
  const player = rivalPlayers.find((entry) => entry.id === playerId);
  return target && player
    ? {
        player,
        estimate: target.estimate,
        assigned: target.assigned,
        assigned_scout_id: target.assigned_scout_id ?? null,
      }
    : null;
}

export function assignScout(
  board: ScoutBoard,
  playerId: string,
  network: ScoutNetworkState,
  capacity = scoutNetworkCapacity(network),
): ScoutBoard {
  const normalized = normalizeScoutBoard(board);
  const target = normalized.targets[playerId];
  if (!target || target.assigned) return normalized;
  if (activeScoutCount(normalized) >= capacity) return normalized;
  const assigned_scout_id = pickScoutForPlayerAssignment(normalized, network);
  return {
    ...normalized,
    targets: {
      ...normalized.targets,
      [playerId]: { ...target, assigned: true, assigned_scout_id },
    },
  };
}

export function addScoutAssignment(
  board: ScoutBoard,
  assignment: ScoutAssignment,
): ScoutBoard {
  const normalized = normalizeScoutBoard(board);
  return {
    ...normalized,
    assignments: [...(normalized.assignments ?? []), assignment],
  };
}

export function removeScoutAssignment(board: ScoutBoard, assignmentId: string): ScoutBoard {
  const normalized = normalizeScoutBoard(board);
  return {
    ...normalized,
    assignments: (normalized.assignments ?? []).filter(
      (assignment) => assignment.id !== assignmentId,
    ),
  };
}

export function toggleScoutAssignment(board: ScoutBoard, assignmentId: string): ScoutBoard {
  const normalized = normalizeScoutBoard(board);
  return {
    ...normalized,
    assignments: (normalized.assignments ?? []).map((assignment) =>
      assignment.id === assignmentId
        ? { ...assignment, active: !assignment.active }
        : assignment,
    ),
  };
}

/** Criteria-based assignments auto-pick unassigned targets up to scout capacity. */
export function syncAssignmentTargets(
  board: ScoutBoard,
  rivalPlayers: readonly Player[],
  clubs: readonly WorldClub[] = [],
  network?: ScoutNetworkState,
  capacity = network ? scoutNetworkCapacity(network) : DEFAULT_SCOUT_CAPACITY,
): ScoutBoard {
  const normalized = normalizeScoutBoard(board);
  const targets = listBoardTargets(normalized, rivalPlayers, clubs);
  const assignments = (normalized.assignments ?? []).filter(
    (entry) => entry.active && (entry.kind ?? "roster") !== "filter_sweep",
  );
  if (assignments.length === 0) return normalized;

  let nextTargets = { ...normalized.targets };
  let slots = capacity - activeScoutCount(normalized);
  for (const assignment of assignments) {
    const matches = targetsForAssignment(assignment, targets).filter(
      (target) => !nextTargets[target.player.id]?.assigned,
    );
    for (const target of matches) {
      if (slots <= 0) break;
      const entry = nextTargets[target.player.id];
      if (!entry) continue;
      const scoutId = network
        ? pickScoutForPlayerAssignment({ ...normalized, targets: nextTargets }, network)
        : null;
      nextTargets[target.player.id] = { ...entry, assigned: true, assigned_scout_id: scoutId };
      slots -= 1;
    }
  }
  return { ...normalized, targets: nextTargets };
}

export function activeScoutCount(board: ScoutBoard): number {
  return Object.values(board.targets).filter((target) => target.assigned).length;
}

/** Mo–Fr NEXT: region jobs + map trips (working-day calendar). */
export function advanceScoutWorkingDay(
  board: ScoutBoard,
  weekday: number,
  rivalPlayers: readonly Player[],
  network: ScoutNetworkState,
  clubs: readonly WorldClub[] = [],
  season = 1,
  week = 1,
  playerDivisionId?: WorldDivisionId,
  opponentScoutContext?: OpponentScoutWorkingDayContext | null,
): ScoutBoard {
  const before = normalizeScoutBoard(board);
  if (!isScoutWorkingWeekday(weekday)) return before;
  const now = { season, week, weekday };
  let next = finalizeScoutWorkCancellations(before, now, network);
  next = advanceRegionScoutOnWorkingDay(next, weekday, rivalPlayers);
  next = advanceScoutTripsOnWorkingDay(next, rivalPlayers, network);
  next = advanceOpponentScoutOnWorkingDay(next, network, opponentScoutContext);
  const normalized = normalizeScoutBoard(next);
  const jobNotices = noticesFromDiscoveryJobAdvance({
    before,
    after: normalized,
    rivalPlayers,
    worldClubs: clubs,
    playerDivisionId,
    season,
    week,
  });
  return appendScoutJobNotices(normalized, jobNotices);
}

/** One hub week: assigned targets get a visit report; everyone else decays quietly. */
export function advanceScoutWeek(
  board: ScoutBoard,
  week: number,
  rivalPlayers: readonly Player[] = [],
  clubs: readonly WorldClub[] = [],
  network?: ScoutNetworkState,
  season = 1,
  playerDivisionId?: WorldDivisionId,
): ScoutBoard {
  const capacity = network ? scoutNetworkCapacity(network) : DEFAULT_SCOUT_CAPACITY;
  const accuracy = network ? scoutNetworkAccuracyModifier(network) : 1;
  const synced = syncAssignmentTargets(board, rivalPlayers, clubs, network, capacity);
  const beforeAdvance = normalizeScoutBoard(synced);
  const withDiscovery = advanceDiscoveryWeek(
    beforeAdvance,
    rivalPlayers,
    activeScoutCount(synced),
  );
  const withTrips = network
    ? advanceScoutTripWeek(withDiscovery, rivalPlayers, network)
    : withDiscovery;
  const normalized = normalizeScoutBoard(withTrips);
  const jobNotices = noticesFromDiscoveryJobAdvance({
    before: beforeAdvance,
    after: normalized,
    rivalPlayers,
    worldClubs: clubs,
    playerDivisionId,
    season,
    week,
  });
  const withNotices = appendScoutJobNotices(normalized, jobNotices);
  const targets: Record<string, ScoutKnowledgeTarget> = {};
  const reports: ScoutReport[] = [];
  const discoveries: ScoutDiscoveryAlert[] = [];
  const playersById = new Map(rivalPlayers.map((player) => [player.id, player] as const));
  const boardTargets = listBoardTargets(withNotices, rivalPlayers, clubs);
  const assignmentByPlayer = new Map<string, string>();
  const sweepReductionByPlayer = new Map<string, number>();
  for (const assignment of withNotices.assignments ?? []) {
    if (!assignment.active) continue;
    const matches = targetsForAssignment(assignment, boardTargets);
    for (const target of matches) {
      assignmentByPlayer.set(target.player.id, assignment.id);
    }
    if ((assignment.kind ?? "roster") !== "filter_sweep") continue;
    if ((assignment.weeksRemaining ?? 0) <= 0) continue;
    const perPlayer = filterSweepReductionPerPlayer(matches.length, capacity, accuracy);
    for (const target of matches) {
      const playerId = target.player.id;
      sweepReductionByPlayer.set(
        playerId,
        (sweepReductionByPlayer.get(playerId) ?? 0) + perPlayer,
      );
    }
  }

  for (const [playerId, target] of Object.entries(withNotices.targets)) {
    const knowledge: PlayerKnowledge = { status: "scouted", estimate: target.estimate };
    const beforeRange = target.estimate.uncertaintyRange;
    const sweepReduction = sweepReductionByPlayer.get(playerId) ?? 0;
    let next: PlayerKnowledge;
    if (target.assigned) {
      next = applyObservationWithAccuracy(knowledge, "scout_visit_report", accuracy);
    } else if (sweepReduction > 0) {
      next = {
        status: "scouted",
        estimate: applyFilterSweepToEstimate(knowledge.estimate, sweepReduction),
      };
    } else {
      next = applyQuietWeek(knowledge);
    }
    const estimate = next.status === "scouted" ? next.estimate : target.estimate;
    targets[playerId] = { ...target, playerId, estimate };

    if (target.assigned && next.status === "scouted") {
      const player = playersById.get(playerId);
      const estimatedCa = Math.round(estimate.estimatedAbilityMean);
      reports.push({
        id: `scout_${playerId}_${week}`,
        playerId,
        playerName: player ? formatPlayerName(player) : playerId,
        position: player?.position ?? "CM",
        week,
        estimatedCa,
        uncertaintyRange: estimate.uncertaintyRange,
        uncertaintyDelta: estimate.uncertaintyRange - beforeRange,
        confidence: confidenceLabel(next) ?? "Bericht",
      });
      const improved =
        beforeRange - estimate.uncertaintyRange >= 6 &&
        estimate.uncertaintyRange <= 20 &&
        estimatedCa >= 95;
      if (improved && player) {
        discoveries.push({
          id: `discovery_${playerId}_${week}`,
          playerId,
          playerName: formatPlayerName(player),
          position: player.position,
          week,
          estimatedCa,
          assignmentId: assignmentByPlayer.get(playerId),
          headline: discoveryHeadline(estimatedCa, player.position),
        });
      }
    }
  }

  const assignmentsAfterWeek = (withNotices.assignments ?? []).map((assignment) => {
    if ((assignment.kind ?? "roster") !== "filter_sweep" || !assignment.active) {
      return assignment;
    }
    const remaining = (assignment.weeksRemaining ?? 1) - 1;
    if (remaining <= 0) {
      return { ...assignment, weeksRemaining: 0, active: false };
    }
    return { ...assignment, weeksRemaining: remaining };
  });

  return {
    ...withNotices,
    targets,
    recentReports: [...reports, ...(withNotices.recentReports ?? [])].slice(0, 24),
    assignments: assignmentsAfterWeek,
    discoveryAlerts: [...discoveries, ...(withNotices.discoveryAlerts ?? [])].slice(0, 16),
  };
}

export function discoveryAlertsForWeek(
  board: ScoutBoard,
  week: number,
): ScoutDiscoveryAlert[] {
  return (board.discoveryAlerts ?? []).filter((alert) => alert.week === week);
}

export function boardTargetFromPlayer(player: Player, estimate: AbilityEstimate, assigned = false): BoardTarget {
  return { player, estimate, assigned };
}
