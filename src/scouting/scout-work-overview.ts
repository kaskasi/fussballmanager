import type { BoardTarget } from "./scout-board.ts";
import type { ScoutAssignment } from "./scout-assignments.ts";
import type { ActiveClubScout, ActiveRegionScout } from "./scout-discovery.ts";
import { listMapScoutJobs, type MapScoutJobRow } from "./scout-map-jobs.ts";
import { SCOUT_MAP_ZONES } from "./scout-region-map.ts";
import { scoutDisplayName } from "./scout-player-assignment.ts";
import type { ActiveOpponentScout } from "./opponent-scout-job.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import type { ScoutNetworkState } from "./scout-network.ts";
import type { ActiveScoutTrip, ScoutTripPlan } from "./scout-trip.ts";
import type { WorldClub } from "../world/world-generator.ts";
import { worldCareerClubId } from "../world/world-generator.ts";
import { formatPlayerName, formatPlayerPositionLabel } from "../types/player-display.ts";
import { REGION_SCOUT_WORKING_DAYS_PER_JOB } from "./scout-discovery.ts";
import type { ScoutCalendarDay } from "./scout-calendar-day.ts";
import {
  isScoutWorkCancelling,
  type ScoutWorkCancelTarget,
} from "./scout-work-cancel.ts";

export type ScoutWorkTileKind =
  | "map_active"
  | "map_queued"
  | "player_watch"
  | "filter_assignment"
  | "club_job"
  | "region_job"
  | "opponent_job";

export type ScoutWorkTileStatus = "active" | "queued" | "paused" | "cancelling";

export interface ScoutWorkTile {
  id: string;
  kind: ScoutWorkTileKind;
  status: ScoutWorkTileStatus;
  title: string;
  subtitle: string;
  scoutName: string | null;
  progressDone?: number;
  progressTotal?: number;
  clubCareerId?: string;
  portraitSeed?: number;
  zoneId?: string;
  assignmentId?: string;
  assignmentSweepWeeks?: number;
  cancelTarget: ScoutWorkCancelTarget;
}

function clubByCareerId(clubs: readonly WorldClub[], careerClubId: string): WorldClub | undefined {
  return clubs.find((club) => worldCareerClubId(club.id) === careerClubId);
}

function tileStatus(
  base: ScoutWorkTileStatus,
  cancellingSince: ScoutCalendarDay | undefined,
): ScoutWorkTileStatus {
  return isScoutWorkCancelling(cancellingSince) ? "cancelling" : base;
}

function mapRowToTile(
  row: MapScoutJobRow,
  cancellingSince?: ScoutCalendarDay,
): ScoutWorkTile {
  const baseStatus = row.status === "active" ? "active" : "queued";
  const cancelling = isScoutWorkCancelling(cancellingSince);
  return {
    id: `map-${row.id}`,
    kind: row.status === "active" ? "map_active" : "map_queued",
    status: tileStatus(baseStatus, cancellingSince),
    title: row.zoneLabel,
    subtitle: row.targetClubName,
    scoutName: cancelling ? null : row.assignedScoutName,
    progressDone: cancelling ? undefined : row.workingDaysDone,
    progressTotal: cancelling ? undefined : row.workingDaysTotal,
    clubCareerId: row.targetClubId,
    zoneId: row.zoneId,
    cancelTarget: { type: "map", tripId: row.id },
  };
}

export function buildScoutWorkTiles(input: {
  targets: readonly BoardTarget[];
  assignments: readonly ScoutAssignment[];
  activeTrips: readonly ActiveScoutTrip[];
  tripQueue: readonly ScoutTripPlan[] | undefined;
  activeClubScout?: ActiveClubScout | null;
  activeRegionScout?: ActiveRegionScout | null;
  activeOpponentScout?: ActiveOpponentScout | null;
  opponentLabel?: string;
  season?: number;
  matchSetup?: CareerMatchSetup | null;
  network: ScoutNetworkState;
  worldClubs: readonly WorldClub[];
}): ScoutWorkTile[] {
  const tiles: ScoutWorkTile[] = [];
  const tripMeta = new Map<string, { cancelling_since?: ScoutCalendarDay }>();
  for (const trip of input.activeTrips) {
    tripMeta.set(trip.id, trip);
  }
  for (const plan of input.tripQueue ?? []) {
    tripMeta.set(plan.id, plan);
  }

  for (const row of listMapScoutJobs({
    activeTrips: input.activeTrips,
    queue: input.tripQueue,
    network: input.network,
    worldClubs: input.worldClubs,
  })) {
    tiles.push(mapRowToTile(row, tripMeta.get(row.id)?.cancelling_since));
  }

  if (input.activeClubScout) {
    const club = clubByCareerId(input.worldClubs, input.activeClubScout.club_id);
    const cancelling = isScoutWorkCancelling(input.activeClubScout.cancelling_since);
    tiles.push({
      id: `club-${input.activeClubScout.club_id}`,
      kind: "club_job",
      status: tileStatus("active", input.activeClubScout.cancelling_since),
      title: club?.name ?? input.activeClubScout.club_id,
      subtitle: "Verein",
      scoutName: null,
      progressDone: cancelling ? undefined : input.activeClubScout.progress,
      progressTotal: cancelling ? undefined : 100,
      clubCareerId: input.activeClubScout.club_id,
      cancelTarget: { type: "club" },
    });
  }

  if (input.activeRegionScout) {
    const zone = SCOUT_MAP_ZONES.find((entry) => entry.id === input.activeRegionScout!.zone_id);
    const total = REGION_SCOUT_WORKING_DAYS_PER_JOB;
    const left = input.activeRegionScout.working_days_left;
    const cancelling = isScoutWorkCancelling(input.activeRegionScout.cancelling_since);
    tiles.push({
      id: `region-${input.activeRegionScout.zone_id}`,
      kind: "region_job",
      status: tileStatus("active", input.activeRegionScout.cancelling_since),
      title: zone?.label ?? input.activeRegionScout.zone_id,
      subtitle: "Region",
      scoutName: null,
      progressDone: cancelling ? undefined : Math.max(0, total - left),
      progressTotal: cancelling ? undefined : total,
      zoneId: input.activeRegionScout.zone_id,
      cancelTarget: { type: "region" },
    });
  }

  const opponentJob = input.activeOpponentScout;
  if (opponentJob) {
    const cancelling = isScoutWorkCancelling(opponentJob.cancelling_since);
    tiles.push({
      id: `opponent-${opponentJob.match_id}`,
      kind: "opponent_job",
      status: tileStatus("active", opponentJob.cancelling_since),
      title: input.opponentLabel ?? input.matchSetup?.opponentShortName ?? "Gegner",
      subtitle: "opponent",
      scoutName: cancelling
        ? null
        : scoutDisplayName(input.network, opponentJob.assigned_scout_id),
      progressDone: cancelling ? undefined : opponentJob.working_days_done,
      progressTotal: cancelling ? undefined : opponentJob.working_days_total,
      cancelTarget: { type: "opponent" },
    });
  }

  for (const target of input.targets) {
    if (!target.assigned) continue;
    const cancelling = isScoutWorkCancelling(target.assigned_cancelling_since);
    tiles.push({
      id: `player-${target.player.id}`,
      kind: "player_watch",
      status: tileStatus("active", target.assigned_cancelling_since),
      title: formatPlayerName(target.player),
      subtitle: `${target.player.age} · ${formatPlayerPositionLabel(target.player)}`,
      scoutName: cancelling
        ? null
        : scoutDisplayName(input.network, target.assigned_scout_id),
      portraitSeed: target.player.portrait_seed,
      clubCareerId: target.player.club_id ?? undefined,
      cancelTarget: { type: "player", playerId: target.player.id },
    });
  }

  for (const assignment of input.assignments) {
    const isSweep = (assignment.kind ?? "roster") === "filter_sweep";
    if (isSweep && !assignment.active && !assignment.cancelling_since) continue;
    const weeks = assignment.weeksRemaining ?? (isSweep ? 1 : 0);
    tiles.push({
      id: `assignment-${assignment.id}`,
      kind: "filter_assignment",
      status: tileStatus(assignment.active ? "active" : "paused", assignment.cancelling_since),
      title: assignment.label,
      subtitle: isSweep ? "sweep" : "roster",
      scoutName: null,
      assignmentId: assignment.id,
      assignmentSweepWeeks: isSweep ? weeks : undefined,
      cancelTarget: { type: "assignment", assignmentId: assignment.id },
    });
  }

  return tiles;
}
