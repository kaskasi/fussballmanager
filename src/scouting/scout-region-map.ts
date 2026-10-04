import type { BoardTarget } from "./scout-board.ts";
import { confidenceBucket } from "./market-list.ts";

export type ScoutRegionTone = "strong" | "mixed" | "weak" | "empty";

export interface ScoutMapZoneDef {
  id: string;
  label: string;
  worldRegions: readonly string[];
}

/** UI map quadrants (PRD 09 filter labels) → fictional world birth regions. */
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
