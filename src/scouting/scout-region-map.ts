import type { BoardTarget } from "./scout-board.ts";
import { confidenceBucket } from "./market-list.ts";
import type { Player } from "../types/player.ts";
import {
  REGION_SCOUT_TIER_MAX,
  isClubDirectoryVisible,
  isClubFullyDiscovered,
  isInScoutPool,
  isRegionDiscovered,
  normalizeDiscovery,
  regionScoutTier,
  type ScoutDiscoveryState,
} from "./scout-discovery.ts";
import {
  worldCareerClubId,
  type WorldClub,
  type WorldDivisionId,
} from "../world/world-generator.ts";

export type ScoutRegionTone = "strong" | "mixed" | "weak" | "empty";

export interface ScoutMapZoneDef {
  id: string;
  label: string;
  worldRegions: readonly string[];
}

/** UI map quadrants (PRD 09 filter labels) → fictional world birth regions. */
export function zoneIdForWorldRegion(worldRegion: string): string | null {
  for (const zone of SCOUT_MAP_ZONES) {
    if (zone.worldRegions.includes(worldRegion)) return zone.id;
  }
  return null;
}

export const SCOUT_MAP_ZONES: readonly ScoutMapZoneDef[] = [
  { id: "sh", label: "Schleswig-Holstein", worldRegions: ["Nordküste", "Elbmarsch"] },
  { id: "foerde", label: "Fördeküste", worldRegions: ["Fördeküste"] },
  { id: "hanse", label: "Hansestadt", worldRegions: ["Hansebogen"] },
  { id: "nordfries", label: "Nordfriesland", worldRegions: ["Moorland", "Heideland"] },
] as const;

export interface ScoutRegionZoneModel {
  id: string;
  label: string;
  tone: ScoutRegionTone;
  playerCount: number;
  known: number;
  unclear: number;
  unknown: number;
  avgUncertainty: number | null;
}

export interface ScoutRegionMapModel {
  zones: ScoutRegionZoneModel[];
}

function zoneForBirthRegion(birthRegion: string): ScoutMapZoneDef | null {
  for (const zone of SCOUT_MAP_ZONES) {
    if (zone.worldRegions.includes(birthRegion)) return zone;
  }
  return null;
}

export function toneFromZoneStats(input: {
  playerCount: number;
  avgUncertainty: number | null;
  known: number;
  unknown: number;
}): ScoutRegionTone {
  if (input.playerCount === 0 || input.avgUncertainty === null) return "empty";
  const knownShare = input.known / input.playerCount;
  const unknownShare = input.unknown / input.playerCount;
  if (input.avgUncertainty < 20 || knownShare >= 0.5) return "strong";
  if (input.avgUncertainty >= 40 || unknownShare >= 0.5) return "weak";
  return "mixed";
}

export function buildScoutRegionMapModel(targets: readonly BoardTarget[]): ScoutRegionMapModel {
  const buckets = new Map<string, BoardTarget[]>();
  for (const zone of SCOUT_MAP_ZONES) {
    buckets.set(zone.id, []);
  }

  for (const target of targets) {
    const zone = zoneForBirthRegion(target.player.birth.region);
    if (!zone) continue;
    buckets.get(zone.id)?.push(target);
  }

  const zones: ScoutRegionZoneModel[] = SCOUT_MAP_ZONES.map((zone) => {
    const inZone = buckets.get(zone.id) ?? [];
    let known = 0;
    let unclear = 0;
    let unknown = 0;
    let uncertaintySum = 0;
    for (const target of inZone) {
      const bucket = confidenceBucket(target.estimate.uncertaintyRange);
      if (bucket === "known") known += 1;
      else if (bucket === "unclear") unclear += 1;
      else unknown += 1;
      uncertaintySum += target.estimate.uncertaintyRange;
    }
    const playerCount = inZone.length;
    const avgUncertainty = playerCount > 0 ? uncertaintySum / playerCount : null;
    const tone = toneFromZoneStats({ playerCount, avgUncertainty, known, unknown });
    return {
      id: zone.id,
      label: zone.label,
      tone,
      playerCount,
      known,
      unclear,
      unknown,
      avgUncertainty,
    };
  });

  return { zones };
}

export function proSquadCountsByCareerClubId(
  rivalPlayers: readonly Player[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const player of rivalPlayers) {
    if (player.squad_status !== "pro" || !player.club_id) continue;
    counts.set(player.club_id, (counts.get(player.club_id) ?? 0) + 1);
  }
  return counts;
}

export interface ScoutMapClubPin {
  careerClubId: string;
  name: string;
  place: string;
  shortName: string;
  directoryVisible: boolean;
  discovered: boolean;
  poolCount: number;
  poolExpected: number;
  poolPct: number;
  scoutProgress: number | null;
}

export interface ScoutDiscoveryZoneModel {
  id: string;
  label: string;
  tone: ScoutRegionTone;
  regionTier: number;
  regionTierMax: number;
  regionDirectoryOpen: boolean;
  regionProgress: number | null;
  poolPlayers: number;
  poolExpected: number;
  poolCoveragePct: number;
  clubs: ScoutMapClubPin[];
}

export interface ScoutDiscoveryMapModel {
  zones: ScoutDiscoveryZoneModel[];
}

export function buildScoutDiscoveryMapModel(input: {
  clubs: readonly WorldClub[];
  targets: readonly BoardTarget[];
  rivalPlayers: readonly Player[];
  discovery: ScoutDiscoveryState | undefined;
  playerDivisionId: WorldDivisionId;
  activeClubScout?: { club_id: string; progress: number } | null;
  activeRegionScout?: { zone_id: string; progress: number } | null;
}): ScoutDiscoveryMapModel {
  const discovery = normalizeDiscovery(input.discovery);
  const proCounts = proSquadCountsByCareerClubId(input.rivalPlayers);
  const poolByClub = new Map<string, number>();
  for (const target of input.targets) {
    if (!isInScoutPool(discovery, target.player.id)) continue;
    const clubId = target.player.club_id;
    if (!clubId) continue;
    poolByClub.set(clubId, (poolByClub.get(clubId) ?? 0) + 1);
  }

  const zones: ScoutDiscoveryZoneModel[] = SCOUT_MAP_ZONES.map((zone) => {
    const zoneClubs = input.clubs.filter((club) => zone.worldRegions.includes(club.region));
    const regionTier = regionScoutTier(discovery, zone.id);
    const regionProgress =
      input.activeRegionScout?.zone_id === zone.id ? input.activeRegionScout.progress : null;

    const pins: ScoutMapClubPin[] = zoneClubs.map((club) => {
      const careerClubId = worldCareerClubId(club.id);
      const directoryVisible = isClubDirectoryVisible(
        club,
        input.playerDivisionId,
        discovery,
        input.clubs,
      );
      const discovered = isClubFullyDiscovered(discovery, careerClubId);
      const scoutProgress =
        input.activeClubScout?.club_id === careerClubId ? input.activeClubScout.progress : null;
      const poolCount = poolByClub.get(careerClubId) ?? 0;
      const poolExpected = proCounts.get(careerClubId) ?? 0;
      const poolPct =
        poolExpected > 0 ? Math.min(100, Math.round((poolCount / poolExpected) * 100)) : 0;
      return {
        careerClubId,
        name: club.name,
        place: club.place,
        shortName: club.short_name,
        directoryVisible,
        discovered,
        poolCount,
        poolExpected,
        poolPct,
        scoutProgress,
      };
    });

    const visiblePins = pins.filter((pin) => pin.directoryVisible);
    const regionDirectoryOpen =
      visiblePins.length > 0 ||
      zoneClubs.some((club) => club.division_id === input.playerDivisionId);
    let known = 0;
    let unclear = 0;
    let unknown = 0;
    let uncertaintySum = 0;
    let poolPlayers = 0;
    for (const target of input.targets) {
      const clubId = target.player.club_id;
      if (!clubId) continue;
      const club = zoneClubs.find((entry) => worldCareerClubId(entry.id) === clubId);
      if (!club) continue;
      if (!isInScoutPool(discovery, target.player.id)) continue;
      poolPlayers += 1;
      const bucket = confidenceBucket(target.estimate.uncertaintyRange);
      if (bucket === "known") known += 1;
      else if (bucket === "unclear") unclear += 1;
      else unknown += 1;
      uncertaintySum += target.estimate.uncertaintyRange;
    }
    const playerCount = poolPlayers;
    const avgUncertainty = playerCount > 0 ? uncertaintySum / playerCount : null;
    const tone =
      visiblePins.length > 0 || regionTier > 0
        ? toneFromZoneStats({ playerCount, avgUncertainty, known, unknown })
        : "empty";

    let poolExpected = 0;
    for (const pin of visiblePins) {
      poolExpected += pin.poolExpected;
    }
    const poolCoveragePct =
      poolExpected > 0 ? Math.min(100, Math.round((poolPlayers / poolExpected) * 100)) : 0;

    return {
      id: zone.id,
      label: zone.label,
      tone,
      regionTier,
      regionTierMax: REGION_SCOUT_TIER_MAX,
      regionDirectoryOpen,
      regionProgress,
      poolPlayers,
      poolExpected,
      poolCoveragePct,
      clubs:
        regionDirectoryOpen
          ? pins.map((pin) => ({
              ...pin,
              name: pin.directoryVisible ? pin.name : "???",
              shortName: pin.directoryVisible ? pin.shortName : "???",
            }))
          : [],
    };
  });

  return { zones };
}
