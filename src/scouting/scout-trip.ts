import type { Player } from "../types/player.ts";
import {
  ensureTargetsForPool,
  recordMapClubVisit,
  type ScoutDiscoveryState,
} from "./scout-discovery.ts";
import { applyMapClubVisitToBoardTargetsForClubs } from "./scout-map-visit.ts";
import type { ScoutKnowledgeTarget } from "./scout-board.ts";
import { careerClubsOnPath, type ScoutMapNode } from "./scout-map-layout.ts";
import {
  scoutTripDurationFromClubStops,
  type ScoutTripDurationBreakdown,
} from "./scout-trip-duration.ts";
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

export function clubStopsForTrip(
  trip: Pick<ScoutTripPlan, "career_club_ids_on_path" | "target_club_id">,
): string[] {
  if (trip.career_club_ids_on_path.length > 0) return [...trip.career_club_ids_on_path];
  return trip.target_club_id ? [trip.target_club_id] : [];
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
  const career_club_ids_on_path = careerClubsOnPath(input.pathNodeIds, input.mapNodes);
  const clubCount = Math.max(1, career_club_ids_on_path.length);
  const duration = scoutTripDurationFromClubStops(clubCount, input.zoneId);
  if (duration.totalWorkingDays <= 0) return null;
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
  return free?.id ?? null;
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
  const clubs = clubStopsForTrip(trip);
  const total = trip.duration.totalWorkingDays;
  if (total <= 0 || clubs.length === 0) {
    return { trip: null, discovery, targets };
  }

  let nextDiscovery = discovery;
  let nextTargets = targets;
  const delta = Math.max(0, deltaWorkingDays);
  const startDay = trip.working_days_done;
  const endDay = Math.min(total, startDay + delta);

  for (let day = startDay; day < endDay; day += 1) {
    const careerClubId = clubs[day];
    if (!careerClubId) continue;
    nextDiscovery = recordMapClubVisit(nextDiscovery, careerClubId, rivalPlayers);
    nextTargets = ensureTargetsForPool(nextTargets, nextDiscovery, rivalPlayers);
    nextTargets = applyMapClubVisitToBoardTargetsForClubs(
      nextTargets,
      [careerClubId],
      rivalPlayers,
    );
  }

  if (endDay >= total) {
    return { trip: null, discovery: nextDiscovery, targets: nextTargets };
  }

  return {
    trip: { ...trip, working_days_done: endDay },
    discovery: nextDiscovery,
    targets: nextTargets,
  };
}

export function formatTripDurationDe(duration: ScoutTripDurationBreakdown): string {
  if (duration.totalWorkingDays <= 0) return "";
  const clubs = duration.clubStops || duration.cityStops;
  return `${duration.totalWorkingDays} Arbeitstage (1 Tag pro Verein, ${clubs} Stopps)`;
}
