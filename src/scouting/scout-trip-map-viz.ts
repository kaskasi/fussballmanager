import type { ScoutMapNode } from "./scout-map-layout.ts";
import { buildSegmentEdgesForPath } from "./scout-route-puzzle.ts";
import type { ActiveScoutTrip, ScoutTripPlan } from "./scout-trip.ts";
import { clubStopsForTrip } from "./scout-trip.ts";

export interface MapPoint {
  x: number;
  y: number;
}

export interface ZoneTripLayers {
  /** First active trip in zone (legacy). */
  active: ActiveScoutTrip | null;
  actives: ActiveScoutTrip[];
  queued: ScoutTripPlan[];
}

const MAX_QUEUED_ROUTES_ON_MAP = 3;

export function tripsForZone(
  zoneId: string,
  activeTrips: readonly ActiveScoutTrip[],
  queue: readonly ScoutTripPlan[] | undefined,
): ZoneTripLayers {
  const queued = (queue ?? []).filter((plan) => plan.zone_id === zoneId).slice(0, MAX_QUEUED_ROUTES_ON_MAP);
  const actives = activeTrips.filter((trip) => trip.zone_id === zoneId);
  return { active: actives[0] ?? null, actives, queued };
}

export function tripRouteSegments(
  pathNodeIds: readonly string[],
  mapNodes: readonly ScoutMapNode[],
): { a: MapPoint; b: MapPoint }[] {
  const edges = buildSegmentEdgesForPath(pathNodeIds, mapNodes);
  const byId = new Map(mapNodes.map((node) => [node.id, node] as const));
  const segments: { a: MapPoint; b: MapPoint }[] = [];
  for (const edge of edges) {
    const a = byId.get(edge.a);
    const b = byId.get(edge.b);
    if (a && b) segments.push({ a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } });
  }
  return segments;
}

export function scoutMarkerAtTripProgress(
  trip: ActiveScoutTrip,
  mapNodes: readonly ScoutMapNode[],
): MapPoint | null {
  const clubs = clubStopsForTrip(trip);
  if (clubs.length === 0) return null;
  const dayIndex =
    trip.working_days_done <= 0
      ? 0
      : Math.max(0, Math.min(clubs.length - 1, trip.working_days_done - 1));
  const clubId = clubs[dayIndex]!;
  const node = mapNodes.find((entry) => entry.careerClubId === clubId || entry.id === clubId);
  return node ? { x: node.x, y: node.y } : null;
}

/** Stable 0..4 for CSS var `--scout-route-{n}`. */
export function routeColorIndex(tripId: string, queueOffset = 0): number {
  let hash = queueOffset;
  for (let i = 0; i < tripId.length; i += 1) {
    hash = (hash * 31 + tripId.charCodeAt(i)) >>> 0;
  }
  return hash % 5;
}
