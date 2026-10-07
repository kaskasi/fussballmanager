import type { ScoutBoard, ScoutKnowledgeTarget } from "./scout-board.ts";
import type { ScoutAssignment } from "./scout-assignments.ts";
import type { ActiveClubScout, ActiveRegionScout } from "./scout-discovery.ts";
import type { ActiveOpponentScout } from "./opponent-scout-job.ts";
import type { ActiveScoutTrip, ScoutTripPlan } from "./scout-trip.ts";
import { normalizeScoutTrips } from "./scout-trip-queue.ts";
import { dispatchQueuedScoutTrips } from "./scout-trip-queue.ts";
import type { ScoutNetworkState } from "./scout-network.ts";
import { isCalendarBefore, type ScoutCalendarDay } from "./scout-calendar-day.ts";

export type ScoutWorkCancelTarget =
  | { type: "map"; tripId: string }
  | { type: "player"; playerId: string }
  | { type: "assignment"; assignmentId: string }
  | { type: "region" }
  | { type: "club" }
  | { type: "opponent" };

function stampSince(
  since: ScoutCalendarDay | undefined,
  at: ScoutCalendarDay,
): ScoutCalendarDay {
  return since ?? at;
}

export function requestScoutWorkCancel(
  board: ScoutBoard,
  target: ScoutWorkCancelTarget,
  at: ScoutCalendarDay,
): ScoutBoard {
  switch (target.type) {
    case "map": {
      const { scout_trip_queue, active_scout_trips } = normalizeScoutTrips(board);
      const active = active_scout_trips.map((trip) =>
        trip.id === target.tripId
          ? { ...trip, cancelling_since: stampSince(trip.cancelling_since, at) }
          : trip,
      );
      const queue = scout_trip_queue.map((plan) =>
        plan.id === target.tripId
          ? { ...plan, cancelling_since: stampSince(plan.cancelling_since, at) }
          : plan,
      );
      return {
        ...board,
        scout_trip_queue: queue,
        active_scout_trips: active,
        active_scout_trip: active[0] ?? null,
      };
    }
    case "player": {
      const entry = board.targets[target.playerId];
      if (!entry?.assigned) return board;
      return {
        ...board,
        targets: {
          ...board.targets,
          [target.playerId]: {
            ...entry,
            assigned_cancelling_since: stampSince(entry.assigned_cancelling_since, at),
          },
        },
      };
    }
    case "assignment": {
      const assignments = (board.assignments ?? []).map((assignment) =>
        assignment.id === target.assignmentId
          ? {
              ...assignment,
              cancelling_since: stampSince(assignment.cancelling_since, at),
            }
          : assignment,
      );
      return { ...board, assignments };
    }
    case "region": {
      const job = board.active_region_scout;
      if (!job) return board;
      return {
        ...board,
        active_region_scout: {
          ...job,
          cancelling_since: stampSince(job.cancelling_since, at),
        },
      };
    }
    case "club": {
      const job = board.active_club_scout;
      if (!job) return board;
      return {
        ...board,
        active_club_scout: {
          ...job,
          cancelling_since: stampSince(job.cancelling_since, at),
        },
      };
    }
    case "opponent": {
      const job = board.active_opponent_scout;
      if (!job) return board;
      return {
        ...board,
        active_opponent_scout: {
          ...job,
          cancelling_since: stampSince(job.cancelling_since, at),
        },
      };
    }
    default:
      return board;
  }
}

function finalizeMapTrips(
  board: ScoutBoard,
  now: ScoutCalendarDay,
): { scout_trip_queue: ScoutTripPlan[]; active_scout_trips: ActiveScoutTrip[] } {
  const { scout_trip_queue, active_scout_trips } = normalizeScoutTrips(board);
  const active = active_scout_trips.filter(
    (trip) => !trip.cancelling_since || !isCalendarBefore(trip.cancelling_since, now),
  );
  const queue = scout_trip_queue.filter(
    (plan) => !plan.cancelling_since || !isCalendarBefore(plan.cancelling_since, now),
  );
  return { scout_trip_queue: queue, active_scout_trips: active };
}

function finalizeTargets(
  targets: Record<string, ScoutKnowledgeTarget>,
  now: ScoutCalendarDay,
): Record<string, ScoutKnowledgeTarget> {
  const next: Record<string, ScoutKnowledgeTarget> = {};
  for (const [playerId, target] of Object.entries(targets)) {
    if (
      target.assigned_cancelling_since &&
      isCalendarBefore(target.assigned_cancelling_since, now)
    ) {
      next[playerId] = {
        ...target,
        assigned: false,
        assigned_scout_id: null,
        assigned_cancelling_since: undefined,
      };
    } else {
      next[playerId] = target;
    }
  }
  return next;
}

function finalizeAssignments(
  assignments: readonly ScoutAssignment[],
  now: ScoutCalendarDay,
): ScoutAssignment[] {
  return assignments.filter(
    (assignment) =>
      !assignment.cancelling_since || !isCalendarBefore(assignment.cancelling_since, now),
  );
}

function finalizeRegion(
  job: ActiveRegionScout | null | undefined,
  now: ScoutCalendarDay,
): ActiveRegionScout | null {
  if (!job) return null;
  if (job.cancelling_since && isCalendarBefore(job.cancelling_since, now)) return null;
  return job;
}

function finalizeClub(
  job: ActiveClubScout | null | undefined,
  now: ScoutCalendarDay,
): ActiveClubScout | null {
  if (!job) return null;
  if (job.cancelling_since && isCalendarBefore(job.cancelling_since, now)) return null;
  return job;
}

function finalizeOpponent(
  job: ActiveOpponentScout | null | undefined,
  now: ScoutCalendarDay,
): ActiveOpponentScout | null {
  if (!job) return null;
  if (job.cancelling_since && isCalendarBefore(job.cancelling_since, now)) return null;
  return job;
}

/** Run at the start of each scout working day (after calendar advances). */
export function finalizeScoutWorkCancellations(
  board: ScoutBoard,
  now: ScoutCalendarDay,
  network: ScoutNetworkState,
): ScoutBoard {
  const trips = finalizeMapTrips(board, now);
  let next: ScoutBoard = {
    ...board,
    targets: finalizeTargets(board.targets, now),
    assignments: finalizeAssignments(board.assignments ?? [], now),
    active_region_scout: finalizeRegion(board.active_region_scout, now),
    active_club_scout: finalizeClub(board.active_club_scout, now),
    active_opponent_scout: finalizeOpponent(board.active_opponent_scout, now),
    scout_trip_queue: trips.scout_trip_queue,
    active_scout_trips: trips.active_scout_trips,
    active_scout_trip: trips.active_scout_trips[0] ?? null,
  };
  return dispatchQueuedScoutTrips(next, network);
}

export function isScoutWorkCancelling(
  since: ScoutCalendarDay | null | undefined,
): boolean {
  return since != null;
}
