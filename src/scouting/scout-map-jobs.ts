import type { ScoutNetworkState } from "./scout-network.ts";
import { SCOUT_MAP_ZONES } from "./scout-region-map.ts";
import type { ActiveScoutTrip, ScoutTripPlan } from "./scout-trip.ts";
import { formatTripDurationDe } from "./scout-trip.ts";
import type { WorldClub } from "../world/world-generator.ts";
import { worldCareerClubId } from "../world/world-generator.ts";

export type MapScoutJobStatus = "active" | "queued";

export interface MapScoutJobRow {
  id: string;
  status: MapScoutJobStatus;
  zoneId: string;
  zoneLabel: string;
  targetClubId: string;
  targetClubName: string;
  stopCount: number;
  durationLabel: string;
  assignedScoutId: string | null;
  assignedScoutName: string | null;
  workingDaysDone: number;
  workingDaysTotal: number;
}

function zoneLabel(zoneId: string): string {
  return SCOUT_MAP_ZONES.find((zone) => zone.id === zoneId)?.label ?? zoneId;
}

function clubName(careerClubId: string, worldClubs: readonly WorldClub[]): string {
  const club = worldClubs.find((entry) => worldCareerClubId(entry.id) === careerClubId);
  return club?.name ?? careerClubId;
}

function scoutName(network: ScoutNetworkState, scoutId: string | null | undefined): string | null {
  if (!scoutId) return null;
  return network.scouts.find((scout) => scout.id === scoutId)?.name ?? null;
}

function planToRow(
  plan: ScoutTripPlan,
  status: MapScoutJobStatus,
  network: ScoutNetworkState,
  worldClubs: readonly WorldClub[],
  workingDaysDone = 0,
  assignedScoutId: string | null = null,
): MapScoutJobRow {
  return {
    id: plan.id,
    status,
    zoneId: plan.zone_id,
    zoneLabel: zoneLabel(plan.zone_id),
    targetClubId: plan.target_club_id,
    targetClubName: clubName(plan.target_club_id, worldClubs),
    stopCount: plan.path_node_ids.length,
    durationLabel: formatTripDurationDe(plan.duration),
    assignedScoutId,
    assignedScoutName: scoutName(network, assignedScoutId),
    workingDaysDone,
    workingDaysTotal: plan.duration.totalWorkingDays,
  };
}

/** Treffer tab: active map trip + queued scout jobs (internal job queue). */
export function listMapScoutJobs(input: {
  activeTrip: ActiveScoutTrip | null | undefined;
  queue: readonly ScoutTripPlan[] | undefined;
  network: ScoutNetworkState;
  worldClubs: readonly WorldClub[];
}): MapScoutJobRow[] {
  const rows: MapScoutJobRow[] = [];
  if (input.activeTrip) {
    rows.push(
      planToRow(
        input.activeTrip,
        "active",
        input.network,
        input.worldClubs,
        input.activeTrip.working_days_done,
        input.activeTrip.assigned_scout_id,
      ),
    );
  }
  for (const plan of input.queue ?? []) {
    rows.push(planToRow(plan, "queued", input.network, input.worldClubs, 0, null));
  }
  return rows;
}
