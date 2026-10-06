import type { Player, PositionPrimary } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import type { WorldClub } from "../world/world-generator.ts";
import { worldCareerClubId } from "../world/world-generator.ts";
import type { ScoutBoard, ScoutKnowledgeTarget } from "./scout-board.ts";
import { listActiveScoutTrips } from "./scout-trip-queue.ts";
import type { ActiveScoutTrip } from "./scout-trip.ts";
import {
  clubsInZone,
  isClubDirectoryVisible,
  normalizeDiscovery,
  regionScoutTier,
  REGION_SCOUT_TIER_MAX,
  type ScoutDiscoveryState,
} from "./scout-discovery.ts";
import type { WorldDivisionId } from "../world/world-generator.ts";
import {
  scoutJobClubPostfachItemId,
  scoutJobRegionPostfachItemId,
} from "../inbox/postfach-scout-job.ts";
import { SCOUT_MAP_ZONES } from "./scout-region-map.ts";
import { initialEstimateForPlayer } from "./market-list.ts";

export type ScoutJobCompleteKind = "region_complete" | "club_complete";

export interface ScoutJobHighlight {
  playerId: string;
  playerName: string;
  position: PositionPrimary;
  estimatedCa: number;
}

export interface ScoutJobCompleteNotice {
  id: string;
  kind: ScoutJobCompleteKind;
  season: number;
  week: number;
  consumed: boolean;
  zoneId?: string;
  zoneLabel?: string;
  regionTier?: number;
  regionTierMax?: number;
  clubsInDirectory?: number;
  careerClubId?: string;
  clubName?: string;
  playersAdded?: number;
  highlights?: ScoutJobHighlight[];
}

const MAX_QUEUE = 24;

export function unconsumedScoutJobNotices(board: ScoutBoard): ScoutJobCompleteNotice[] {
  return (board.discovery_postfach_queue ?? []).filter((entry) => !entry.consumed);
}

export function consumeScoutJobNotice(board: ScoutBoard, itemId: string): ScoutBoard {
  const queue = board.discovery_postfach_queue ?? [];
  const next = queue.map((entry) =>
    entry.id === itemId ? { ...entry, consumed: true } : entry,
  );
  return { ...board, discovery_postfach_queue: next };
}

function zoneLabel(zoneId: string): string {
  return SCOUT_MAP_ZONES.find((zone) => zone.id === zoneId)?.label ?? zoneId;
}

function clubDisplayName(careerClubId: string, clubs: readonly WorldClub[]): string {
  const club = clubs.find((entry) => worldCareerClubId(entry.id) === careerClubId);
  if (!club) return careerClubId;
  return club.place ? `${club.name} (${club.place})` : club.name;
}

function poolDelta(before: ScoutDiscoveryState, after: ScoutDiscoveryState): string[] {
  const prev = new Set(before.scout_pool);
  return after.scout_pool.filter((id) => !prev.has(id));
}

function buildHighlights(
  newPlayerIds: readonly string[],
  rivalPlayers: readonly Player[],
  targets: Record<string, ScoutKnowledgeTarget>,
): ScoutJobHighlight[] {
  const byId = new Map(rivalPlayers.map((player) => [player.id, player] as const));
  const ranked = newPlayerIds
    .map((playerId, index) => {
      const player = byId.get(playerId);
      if (!player) return null;
      const estimate =
        targets[playerId]?.estimate ??
        initialEstimateForPlayer(player, index);
      return {
        playerId,
        playerName: formatPlayerName(player),
        position: player.position,
        estimatedCa: Math.round(estimate.estimatedAbilityMean),
      };
    })
    .filter((entry): entry is ScoutJobHighlight => entry != null)
    .sort((left, right) => right.estimatedCa - left.estimatedCa)
    .slice(0, 3);
  return ranked;
}

function pushTripCompleteNotices(
  trip: ActiveScoutTrip,
  input: {
    rivalPlayers: readonly Player[];
    worldClubs: readonly WorldClub[];
    season: number;
    week: number;
    after: Pick<ScoutBoard, "targets">;
  },
  beforeDiscovery: ScoutDiscoveryState,
  afterDiscovery: ScoutDiscoveryState,
  notices: ScoutJobCompleteNotice[],
): void {
  const clubIds =
    trip.career_club_ids_on_path.length > 0
      ? trip.career_club_ids_on_path
      : [trip.target_club_id];
  for (const careerClubId of clubIds) {
    if (beforeDiscovery.discovered_club_ids.includes(careerClubId)) continue;
    if (!afterDiscovery.discovered_club_ids.includes(careerClubId)) continue;
    const newIds = poolDelta(beforeDiscovery, afterDiscovery).filter((playerId) => {
      const player = input.rivalPlayers.find((entry) => entry.id === playerId);
      return player?.club_id === careerClubId;
    });
    notices.push({
      id: scoutJobClubPostfachItemId(careerClubId, input.season, input.week),
      kind: "club_complete",
      season: input.season,
      week: input.week,
      consumed: false,
      careerClubId,
      clubName: clubDisplayName(careerClubId, input.worldClubs),
      playersAdded: newIds.length,
      highlights: buildHighlights(newIds, input.rivalPlayers, input.after.targets),
    });
  }
}

/** Detect jobs that finished during advanceDiscoveryWeek and build Postfach notices. */
export function noticesFromDiscoveryJobAdvance(input: {
  before: Pick<
    ScoutBoard,
    "discovery" | "active_club_scout" | "active_region_scout" | "active_scout_trip" | "targets"
  >;
  after: Pick<
    ScoutBoard,
    "discovery" | "active_club_scout" | "active_region_scout" | "active_scout_trip" | "targets"
  >;
  rivalPlayers: readonly Player[];
  worldClubs: readonly WorldClub[];
  playerDivisionId?: WorldDivisionId;
  season: number;
  week: number;
}): ScoutJobCompleteNotice[] {
  const notices: ScoutJobCompleteNotice[] = [];
  const beforeDiscovery = normalizeDiscovery(input.before.discovery);
  const afterDiscovery = normalizeDiscovery(input.after.discovery);

  if (input.before.active_region_scout && !input.after.active_region_scout) {
    const zoneId = input.before.active_region_scout.zone_id;
    const tier = regionScoutTier(afterDiscovery, zoneId);
    const division = input.playerDivisionId ?? "regionalliga-nord";
    const visibleCount = clubsInZone(input.worldClubs, zoneId).filter((club) =>
      isClubDirectoryVisible(club, division, afterDiscovery, input.worldClubs),
    ).length;
    notices.push({
      id: scoutJobRegionPostfachItemId(zoneId, input.season, input.week),
      kind: "region_complete",
      season: input.season,
      week: input.week,
      consumed: false,
      zoneId,
      zoneLabel: zoneLabel(zoneId),
      regionTier: tier,
      regionTierMax: REGION_SCOUT_TIER_MAX,
      clubsInDirectory: visibleCount,
    });
  }

  if (input.before.active_club_scout && !input.after.active_club_scout) {
    const careerClubId = input.before.active_club_scout.club_id;
    const newIds = poolDelta(beforeDiscovery, afterDiscovery).filter((playerId) => {
      const player = input.rivalPlayers.find((entry) => entry.id === playerId);
      return player?.club_id === careerClubId;
    });
    notices.push({
      id: scoutJobClubPostfachItemId(careerClubId, input.season, input.week),
      kind: "club_complete",
      season: input.season,
      week: input.week,
      consumed: false,
      careerClubId,
      clubName: clubDisplayName(careerClubId, input.worldClubs),
      playersAdded: newIds.length,
      highlights: buildHighlights(newIds, input.rivalPlayers, input.after.targets),
    });
  }

  const afterTripIds = new Set(listActiveScoutTrips(input.after).map((trip) => trip.id));
  const completedTrips = listActiveScoutTrips(input.before).filter((trip) => !afterTripIds.has(trip.id));
  for (const trip of completedTrips) {
    pushTripCompleteNotices(trip, input, beforeDiscovery, afterDiscovery, notices);
  }

  return notices;
}

export function appendScoutJobNotices(
  board: ScoutBoard,
  notices: readonly ScoutJobCompleteNotice[],
): ScoutBoard {
  if (notices.length === 0) return board;
  const existing = new Set((board.discovery_postfach_queue ?? []).map((entry) => entry.id));
  const merged = [
    ...(board.discovery_postfach_queue ?? []),
    ...notices.filter((notice) => !existing.has(notice.id)),
  ].slice(-MAX_QUEUE);
  return { ...board, discovery_postfach_queue: merged };
}

export function scoutJobNoticeById(
  board: ScoutBoard,
  itemId: string,
): ScoutJobCompleteNotice | undefined {
  return (board.discovery_postfach_queue ?? []).find(
    (entry) => entry.id === itemId && !entry.consumed,
  );
}
