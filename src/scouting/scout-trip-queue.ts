import type { ScoutNetworkState } from "./scout-network.ts";
import {
  type ActiveScoutTrip,
  advanceActiveScoutTrip,
  buildScoutTripPlan,
  pickAvailableScoutId,
  type ScoutTripPlan,
} from "./scout-trip.ts";
import type { ScoutMapNode } from "./scout-map-layout.ts";
import type { ScoutRouteScore } from "./scout-route-puzzle.ts";
import {
  ensureTargetsForPool,
  normalizeDiscovery,
  type ScoutDiscoveryState,
} from "./scout-discovery.ts";
import type { Player } from "../types/player.ts";
import type { ScoutKnowledgeTarget } from "./scout-board.ts";
import { isClubDirectoryVisible } from "./scout-discovery.ts";
import type { WorldClub, WorldDivisionId } from "../world/world-generator.ts";
import { worldCareerClubId } from "../world/world-generator.ts";

export interface ScoutTripBoardSlice {
  discovery?: ScoutDiscoveryState;
  scout_trip_queue?: ScoutTripPlan[];
  active_scout_trip?: ActiveScoutTrip | null;
  targets: Record<string, ScoutKnowledgeTarget>;
}

export function normalizeScoutTrips(board: ScoutTripBoardSlice): {
  scout_trip_queue: ScoutTripPlan[];
  active_scout_trip: ActiveScoutTrip | null;
} {
  return {
    scout_trip_queue: [...(board.scout_trip_queue ?? [])],
    active_scout_trip: board.active_scout_trip ?? null,
  };
}

export function enqueueScoutTrip<T extends ScoutTripBoardSlice>(
  board: T,
  input: {
    zoneId: string;
    pathNodeIds: readonly string[];
    mapNodes: readonly ScoutMapNode[];
    targetClubId: string;
    routeScore: ScoutRouteScore;
    week: number;
    scouts: ScoutNetworkState;
  },
): T {
  const plan = buildScoutTripPlan({
    zoneId: input.zoneId,
    pathNodeIds: input.pathNodeIds,
    mapNodes: input.mapNodes,
    targetClubId: input.targetClubId,
    routeScore: input.routeScore,
    week: input.week,
  });
  if (!plan) return board;

  const { scout_trip_queue, active_scout_trip } = normalizeScoutTrips(board);
  scout_trip_queue.push(plan);
  const withQueue = { ...board, scout_trip_queue, active_scout_trip };
  return tryDispatchNextScoutTrip(withQueue, input.scouts);
}

export function tryDispatchNextScoutTrip<T extends ScoutTripBoardSlice>(
  board: T,
  network: ScoutNetworkState,
): T {
  const { scout_trip_queue, active_scout_trip } = normalizeScoutTrips(board);
  if (active_scout_trip || scout_trip_queue.length === 0) return board;

  const scoutId = pickAvailableScoutId(network.scouts, []);
  if (!scoutId) return board;

  const [next, ...rest] = scout_trip_queue;
  if (!next) return board;

  const active: ActiveScoutTrip = {
    ...next,
    assigned_scout_id: scoutId,
    working_days_done: 0,
  };
  return {
    ...board,
    scout_trip_queue: rest,
    active_scout_trip: active,
  };
}

export function canEnqueueScoutTrip(
  club: WorldClub,
  playerDivisionId: WorldDivisionId,
  discovery: ScoutDiscoveryState,
  worldClubs: readonly WorldClub[],
): boolean {
  if (!isClubDirectoryVisible(club, playerDivisionId, discovery, worldClubs)) return false;
  return true;
}

export function advanceScoutTripWeek<T extends ScoutTripBoardSlice>(
  board: T,
  rivalPlayers: readonly Player[],
  network: ScoutNetworkState,
): T {
  let next = board;
  const { active_scout_trip } = normalizeScoutTrips(board);
  if (active_scout_trip) {
    const discovery = normalizeDiscovery(board.discovery);
    const { trip, discovery: updatedDiscovery, targets: visitedTargets } = advanceActiveScoutTrip(
      active_scout_trip,
      discovery,
      rivalPlayers,
      board.targets,
    );
    next = {
      ...next,
      discovery: updatedDiscovery,
      active_scout_trip: trip,
      targets: ensureTargetsForPool(visitedTargets, updatedDiscovery, rivalPlayers),
    };
  }
  return tryDispatchNextScoutTrip(next, network);
}
