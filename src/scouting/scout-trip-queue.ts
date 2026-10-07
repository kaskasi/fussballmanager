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
import type { ScoutBoard, ScoutKnowledgeTarget } from "./scout-board.ts";
import { busyScoutIds } from "./scout-busy.ts";
import { isClubDirectoryVisible } from "./scout-discovery.ts";
import type { WorldClub, WorldDivisionId } from "../world/world-generator.ts";

export interface ScoutTripBoardSlice {
  discovery?: ScoutDiscoveryState;
  scout_trip_queue?: ScoutTripPlan[];
  active_scout_trip?: ActiveScoutTrip | null;
  active_scout_trips?: ActiveScoutTrip[];
  targets: Record<string, ScoutKnowledgeTarget>;
}

export function listActiveScoutTrips(board: ScoutTripBoardSlice): ActiveScoutTrip[] {
  if (board.active_scout_trips && board.active_scout_trips.length > 0) {
    return [...board.active_scout_trips];
  }
  if (board.active_scout_trip) return [board.active_scout_trip];
  return [];
}

export function normalizeScoutTrips(board: ScoutTripBoardSlice): {
  scout_trip_queue: ScoutTripPlan[];
  active_scout_trips: ActiveScoutTrip[];
} {
  return {
    scout_trip_queue: [...(board.scout_trip_queue ?? [])],
    active_scout_trips: listActiveScoutTrips(board),
  };
}

function withTripState<T extends ScoutTripBoardSlice>(
  board: T,
  scout_trip_queue: ScoutTripPlan[],
  active_scout_trips: ActiveScoutTrip[],
): T {
  return {
    ...board,
    scout_trip_queue,
    active_scout_trips,
    active_scout_trip: active_scout_trips[0] ?? null,
  };
}

/** Assign queued trips to any scout not already on an active map trip. */
export function dispatchQueuedScoutTrips<T extends ScoutTripBoardSlice>(
  board: T,
  network: ScoutNetworkState,
): T {
  const { scout_trip_queue } = normalizeScoutTrips(board);
  let queue = scout_trip_queue;
  let active = listActiveScoutTrips(board);

  while (queue.length > 0) {
    const busyIds = busyScoutIds(board as ScoutBoard);
    const scoutId = pickAvailableScoutId(network.scouts, busyIds);
    if (!scoutId) break;

    const [next, ...rest] = queue;
    if (!next) break;

    queue = rest;
    active = [
      ...active,
      {
        ...next,
        assigned_scout_id: scoutId,
        working_days_done: 0,
      },
    ];
  }

  return withTripState(board, queue, active);
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

  const { scout_trip_queue, active_scout_trips } = normalizeScoutTrips(board);
  scout_trip_queue.push(plan);
  const withQueue = withTripState(board, scout_trip_queue, active_scout_trips);
  return dispatchQueuedScoutTrips(withQueue, input.scouts);
}

/** @deprecated Use dispatchQueuedScoutTrips */
export function tryDispatchNextScoutTrip<T extends ScoutTripBoardSlice>(
  board: T,
  network: ScoutNetworkState,
): T {
  return dispatchQueuedScoutTrips(board, network);
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

/** Mo–Fr calendar tick: +1 working day on each active trip, then dispatch queue if scouts free. */
export function advanceScoutTripsOnWorkingDay<T extends ScoutTripBoardSlice>(
  board: T,
  rivalPlayers: readonly Player[],
  network: ScoutNetworkState,
): T {
  let next = board;
  let discovery = normalizeDiscovery(board.discovery);
  let targets = board.targets;
  const stillActive: ActiveScoutTrip[] = [];

  for (const trip of listActiveScoutTrips(board)) {
    if (trip.cancelling_since) continue;
    const advanced = advanceActiveScoutTrip(trip, discovery, rivalPlayers, targets, 1);
    discovery = advanced.discovery;
    targets = ensureTargetsForPool(advanced.targets, discovery, rivalPlayers);
    if (advanced.trip) stillActive.push(advanced.trip);
  }

  next = {
    ...next,
    discovery,
    targets,
  };
  next = withTripState(next, normalizeScoutTrips(board).scout_trip_queue, stillActive);
  return dispatchQueuedScoutTrips(next, network);
}

/** Week sim: dispatch queued trips only (progress is daily via advanceScoutTripsOnWorkingDay). */
export function advanceScoutTripWeek<T extends ScoutTripBoardSlice>(
  board: T,
  _rivalPlayers: readonly Player[],
  network: ScoutNetworkState,
): T {
  return dispatchQueuedScoutTrips(board, network);
}
