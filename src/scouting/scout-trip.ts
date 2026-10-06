import type { Player } from "../types/player.ts";
import {
  ensureTargetsForPool,
  recordMapClubVisit,
  type ScoutDiscoveryState,
} from "./scout-discovery.ts";
import { applyMapClubVisitToBoardTargetsForClubs } from "./scout-map-visit.ts";
import type { ScoutKnowledgeTarget } from "./scout-board.ts";
import { careerClubsOnPath, type ScoutMapNode } from "./scout-map-layout.ts";
import { scoutTripDuration, type ScoutTripDurationBreakdown } from "./scout-trip-duration.ts";
import type { ScoutRouteScore } from "./scout-route-puzzle.ts";

export interface ScoutTripPlan {
  id: string;
  zone_id: string;
  path_node_ids: readonly string[];
  career_club_ids_on_path: readonly string[];
  target_club_id: string;
  progress_multiplier: number;
  duration: ScoutTripDurationBreakdown;
  queued_at_week: number;
}

export interface ActiveScoutTrip extends ScoutTripPlan {
  assigned_scout_id: string;
  working_days_done: number;
}

let tripCounter = 0;

function tripId(zoneId: string, week: number): string {
  tripCounter += 1;
  return `trip_${zoneId}_w${week}_${tripCounter}`;
}

export function buildScoutTripPlan(input: {
  zoneId: string;
  pathNodeIds: readonly string[];
  mapNodes: readonly ScoutMapNode[];
  targetClubId: string;
  routeScore: ScoutRouteScore;
  week: number;
}): ScoutTripPlan | null {
  if (input.pathNodeIds.length === 0 || !input.targetClubId) return null;
  const duration = scoutTripDuration(input.zoneId, input.pathNodeIds.length);
  if (duration.totalWorkingDays <= 0) return null;
  const career_club_ids_on_path = careerClubsOnPath(input.pathNodeIds, input.mapNodes);
  return {
    id: tripId(input.zoneId, input.week),
    zone_id: input.zoneId,
    path_node_ids: [...input.pathNodeIds],
    career_club_ids_on_path,
    target_club_id: input.targetClubId,
    progress_multiplier: input.routeScore.progressMultiplier,
    duration,
    queued_at_week: input.week,
  };
}

export function pickAvailableScoutId(
  scouts: readonly { id: string }[],
  activeTripScoutIds: readonly string[],
): string | null {
  const busy = new Set(activeTripScoutIds);
  const free = scouts.find((scout) => !busy.has(scout.id));
  return free?.id ?? scouts[0]?.id ?? null;
}

export function advanceActiveScoutTrip(
  trip: ActiveScoutTrip,
  discovery: ScoutDiscoveryState,
  rivalPlayers: readonly Player[],
  targets: Record<string, ScoutKnowledgeTarget> = {},
  deltaWorkingDays = 1,
): {
  trip: ActiveScoutTrip | null;
  discovery: ScoutDiscoveryState;
  targets: Record<string, ScoutKnowledgeTarget>;
} {
  const working_days_done = trip.working_days_done + Math.max(0, deltaWorkingDays);
  if (working_days_done < trip.duration.totalWorkingDays) {
    return {
      trip: { ...trip, working_days_done },
      discovery,
      targets,
    };
  }

  let nextDiscovery = discovery;
  const careerIds =
    trip.career_club_ids_on_path.length > 0
      ? trip.career_club_ids_on_path
      : [trip.target_club_id];
  for (const careerClubId of careerIds) {
    nextDiscovery = recordMapClubVisit(nextDiscovery, careerClubId, rivalPlayers);
  }
  const pooledTargets = ensureTargetsForPool(targets, nextDiscovery, rivalPlayers);
  const nextTargets = applyMapClubVisitToBoardTargetsForClubs(
    pooledTargets,
    careerIds,
    rivalPlayers,
  );
  return { trip: null, discovery: nextDiscovery, targets: nextTargets };
}

export function formatTripDurationDe(duration: ScoutTripDurationBreakdown): string {
  if (duration.totalWorkingDays <= 0) return "";
  const speed = Math.round(duration.speedPct * 100);
  return `${duration.totalWorkingDays} Arbeitstage (Mo–Fr, ${speed}% Tempo) · ${duration.setupWorkingDays} Vorbereitung · ${duration.scoutingWorkingDays} unterwegs · ${duration.teardownWorkingDays} Abschluss`;
}
