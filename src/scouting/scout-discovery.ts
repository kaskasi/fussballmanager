import type { Player } from "../types/player.ts";
import {
  worldCareerClubId,
  type WorldClub,
  type WorldDivisionId,
} from "../world/world-generator.ts";
import { SCOUT_MAP_ZONES, zoneIdForWorldRegion } from "./scout-region-map.ts";
import type { ScoutKnowledgeTarget } from "./scout-board.ts";
import { initialEstimateForPlayer } from "./market-list.ts";

export const CLUB_SCOUT_PROGRESS_PER_WEEK = 34;
export const REGION_SCOUT_PROGRESS_PER_WEEK = 25;
export const DISCOVERY_COMPLETE = 100;
export const REGION_SCOUT_TIER_MAX = 3;

export interface ScoutDiscoveryState {
  discovered_region_ids: string[];
  discovered_club_ids: string[];
  scout_pool: string[];
  /** Per map zone: 0–3 completed region scout jobs (3 = full foreign directory). */
  region_scout_tier?: Record<string, number>;
}

export interface ActiveClubScout {
  club_id: string;
  progress: number;
}

export interface ActiveRegionScout {
  zone_id: string;
  progress: number;
}

export function emptyDiscovery(): ScoutDiscoveryState {
  return {
    discovered_region_ids: [],
    discovered_club_ids: [],
    scout_pool: [],
    region_scout_tier: {},
  };
}

function clampTier(value: number): number {
  return Math.max(0, Math.min(REGION_SCOUT_TIER_MAX, Math.floor(value)));
}

export function normalizeDiscovery(state: ScoutDiscoveryState | undefined): ScoutDiscoveryState {
  const base = state ?? emptyDiscovery();
  const tierRaw = base.region_scout_tier ?? {};
  const region_scout_tier: Record<string, number> = {};
  for (const zone of SCOUT_MAP_ZONES) {
    let tier = clampTier(tierRaw[zone.id] ?? 0);
    if (tier === 0 && (base.discovered_region_ids ?? []).includes(zone.id)) {
      tier = REGION_SCOUT_TIER_MAX;
    }
    if (tier > 0) region_scout_tier[zone.id] = tier;
  }
  for (const [zoneId, tier] of Object.entries(tierRaw)) {
    if (!region_scout_tier[zoneId] && tier > 0) {
      region_scout_tier[zoneId] = clampTier(tier);
    }
  }
  const discovered_region_ids = [
    ...new Set([
      ...(base.discovered_region_ids ?? []),
      ...Object.entries(region_scout_tier)
        .filter(([, tier]) => tier >= REGION_SCOUT_TIER_MAX)
        .map(([zoneId]) => zoneId),
    ]),
  ];
  return {
    discovered_region_ids,
    discovered_club_ids: [...new Set(base.discovered_club_ids ?? [])],
    scout_pool: [...new Set(base.scout_pool ?? [])],
    region_scout_tier,
  };
}

export function regionScoutTier(discovery: ScoutDiscoveryState, zoneId: string): number {
  const normalized = normalizeDiscovery(discovery);
  return clampTier(normalized.region_scout_tier?.[zoneId] ?? 0);
}

export function foreignClubsInZone(
  clubs: readonly WorldClub[],
  zoneId: string,
  playerDivisionId: WorldDivisionId,
): WorldClub[] {
  return clubsInZone(clubs, zoneId)
    .filter((club) => club.division_id !== playerDivisionId)
    .sort((left, right) =>
      worldCareerClubId(left.id).localeCompare(worldCareerClubId(right.id)),
    );
}

/** How many foreign clubs become directory-visible at this tier (1..3). */
export function foreignClubVisibilityCount(foreignCount: number, tier: number): number {
  if (foreignCount <= 0 || tier <= 0) return 0;
  if (tier >= REGION_SCOUT_TIER_MAX) return foreignCount;
  return Math.min(foreignCount, Math.ceil((foreignCount * tier) / REGION_SCOUT_TIER_MAX));
}

export function isForeignClubUnlockedByTier(
  club: WorldClub,
  zoneId: string,
  playerDivisionId: WorldDivisionId,
  discovery: ScoutDiscoveryState,
  worldClubs: readonly WorldClub[],
): boolean {
  const tier = regionScoutTier(discovery, zoneId);
  if (tier <= 0) return false;
  const foreign = foreignClubsInZone(worldClubs, zoneId, playerDivisionId);
  const limit = foreignClubVisibilityCount(foreign.length, tier);
  const careerId = worldCareerClubId(club.id);
  const visibleSet = new Set(foreign.slice(0, limit).map((entry) => worldCareerClubId(entry.id)));
  return visibleSet.has(careerId);
}

export function isInScoutPool(discovery: ScoutDiscoveryState, playerId: string): boolean {
  return discovery.scout_pool.includes(playerId);
}

export function isClubFullyDiscovered(discovery: ScoutDiscoveryState, careerClubId: string): boolean {
  return discovery.discovered_club_ids.includes(careerClubId);
}

export function isRegionDiscovered(discovery: ScoutDiscoveryState, zoneId: string): boolean {
  return regionScoutTier(discovery, zoneId) >= REGION_SCOUT_TIER_MAX;
}

/** Division mates are always visible; foreign clubs unlock in thirds via region tier. */
export function isClubDirectoryVisible(
  club: WorldClub,
  playerDivisionId: WorldDivisionId,
  discovery: ScoutDiscoveryState,
  worldClubs: readonly WorldClub[] = [],
): boolean {
  if (club.division_id === playerDivisionId) return true;
  const zoneId = zoneIdForWorldRegion(club.region);
  if (!zoneId) return false;
  if (worldClubs.length === 0) {
    return isRegionDiscovered(discovery, zoneId);
  }
  return isForeignClubUnlockedByTier(club, zoneId, playerDivisionId, discovery, worldClubs);
}

export function clubsInZone(clubs: readonly WorldClub[], zoneId: string): WorldClub[] {
  const zone = SCOUT_MAP_ZONES.find((entry) => entry.id === zoneId);
  if (!zone) return [];
  return clubs.filter((club) => zone.worldRegions.includes(club.region));
}

export function canStartClubScout(
  club: WorldClub,
  playerDivisionId: WorldDivisionId,
  discovery: ScoutDiscoveryState,
  activeClubScout: ActiveClubScout | null | undefined,
  worldClubs: readonly WorldClub[] = [],
): boolean {
  const careerId = worldCareerClubId(club.id);
  if (isClubFullyDiscovered(discovery, careerId)) return false;
  if (!isClubDirectoryVisible(club, playerDivisionId, discovery, worldClubs)) return false;
  if (activeClubScout != null) return false;
  return true;
}

export function canStartRegionScout(
  zoneId: string,
  discovery: ScoutDiscoveryState,
  activeRegionScout: ActiveRegionScout | null | undefined,
): boolean {
  if (regionScoutTier(discovery, zoneId) >= REGION_SCOUT_TIER_MAX) return false;
  if (activeRegionScout != null) return false;
  return SCOUT_MAP_ZONES.some((zone) => zone.id === zoneId);
}

export function addPlayersToPool(
  discovery: ScoutDiscoveryState,
  playerIds: readonly string[],
): ScoutDiscoveryState {
  const pool = new Set(discovery.scout_pool);
  for (const id of playerIds) pool.add(id);
  return { ...discovery, scout_pool: [...pool] };
}

export function completeClubDiscovery(
  discovery: ScoutDiscoveryState,
  careerClubId: string,
  rivalPlayers: readonly Player[],
): ScoutDiscoveryState {
  const playerIds = rivalPlayers
    .filter((player) => player.club_id === careerClubId && player.squad_status === "pro")
    .map((player) => player.id);
  return {
    ...addPlayersToPool(discovery, playerIds),
    discovered_club_ids: [...new Set([...discovery.discovered_club_ids, careerClubId])],
  };
}

export function completeRegionDiscovery(
  discovery: ScoutDiscoveryState,
  zoneId: string,
): ScoutDiscoveryState {
  const normalized = normalizeDiscovery(discovery);
  const nextTier = clampTier(regionScoutTier(normalized, zoneId) + 1);
  const region_scout_tier = {
    ...normalized.region_scout_tier,
    [zoneId]: nextTier,
  };
  const discovered_region_ids =
    nextTier >= REGION_SCOUT_TIER_MAX
      ? [...new Set([...normalized.discovered_region_ids, zoneId])]
      : normalized.discovered_region_ids;
  return {
    ...normalized,
    region_scout_tier,
    discovered_region_ids,
  };
}

export function ensureTargetsForPool(
  targets: Record<string, ScoutKnowledgeTarget>,
  discovery: ScoutDiscoveryState,
  rivalPlayers: readonly Player[],
): Record<string, ScoutKnowledgeTarget> {
  const byId = new Map(rivalPlayers.map((player, index) => [player.id, index] as const));
  const next: Record<string, ScoutKnowledgeTarget> = {};
  for (const playerId of discovery.scout_pool) {
    const existing = targets[playerId];
    const index = byId.get(playerId) ?? 0;
    const player = rivalPlayers.find((entry) => entry.id === playerId);
    if (!player || player.squad_status !== "pro" || player.club_id === null) continue;
    next[playerId] = existing
      ? { ...existing, playerId }
      : {
          playerId,
          estimate: initialEstimateForPlayer(player, index),
          assigned: false,
        };
  }
  return next;
}

export type DiscoveryBoardSlice = {
  targets: Record<string, ScoutKnowledgeTarget>;
  discovery?: ScoutDiscoveryState;
  active_club_scout?: ActiveClubScout | null;
  active_region_scout?: ActiveRegionScout | null;
};

export function advanceDiscoveryWeek<T extends DiscoveryBoardSlice>(
  board: T,
  rivalPlayers: readonly Player[],
  scoutSlotsActive: number,
): T {
  let discovery = normalizeDiscovery(board.discovery);
  let activeClub = board.active_club_scout ?? null;
  let activeRegion = board.active_region_scout ?? null;
  const boost = 1 + Math.min(2, Math.max(0, scoutSlotsActive - 1)) * 0.15;

  if (activeClub) {
    const step = Math.round(CLUB_SCOUT_PROGRESS_PER_WEEK * boost);
    const progress = Math.min(DISCOVERY_COMPLETE, activeClub.progress + step);
    if (progress >= DISCOVERY_COMPLETE) {
      discovery = completeClubDiscovery(discovery, activeClub.club_id, rivalPlayers);
      activeClub = null;
    } else {
      activeClub = { ...activeClub, progress };
    }
  }

  if (activeRegion) {
    const step = Math.round(REGION_SCOUT_PROGRESS_PER_WEEK * boost);
    const progress = Math.min(DISCOVERY_COMPLETE, activeRegion.progress + step);
    if (progress >= DISCOVERY_COMPLETE) {
      discovery = completeRegionDiscovery(discovery, activeRegion.zone_id);
      activeRegion = null;
    } else {
      activeRegion = { ...activeRegion, progress };
    }
  }

  const targets = ensureTargetsForPool(board.targets, discovery, rivalPlayers);

  return {
    ...board,
    discovery,
    active_club_scout: activeClub,
    active_region_scout: activeRegion,
    targets,
  };
}

export function startClubScoutJob<T extends DiscoveryBoardSlice>(
  board: T,
  careerClubId: string,
): T {
  return {
    ...board,
    active_club_scout: { club_id: careerClubId, progress: 0 },
  };
}

export function startRegionScoutJob<T extends DiscoveryBoardSlice>(
  board: T,
  zoneId: string,
): T {
  return {
    ...board,
    active_region_scout: { zone_id: zoneId, progress: 0 },
  };
}

/** Migration / legacy: board targets become permanent pool members. */
export function discoveryFromLegacyTargets(
  targets: Record<string, ScoutKnowledgeTarget>,
  rivalPlayers: readonly Player[],
): ScoutDiscoveryState {
  const pool = Object.keys(targets ?? {});
  const clubIds = new Set<string>();
  for (const playerId of pool) {
    const player = rivalPlayers.find((entry) => entry.id === playerId);
    if (player?.club_id) clubIds.add(player.club_id);
  }
  const region_scout_tier = Object.fromEntries(
    SCOUT_MAP_ZONES.map((zone) => [zone.id, REGION_SCOUT_TIER_MAX]),
  );
  return {
    scout_pool: pool,
    discovered_club_ids: [...clubIds],
    discovered_region_ids: SCOUT_MAP_ZONES.map((zone) => zone.id),
    region_scout_tier,
  };
}
