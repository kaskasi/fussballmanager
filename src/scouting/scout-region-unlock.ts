import type { WorldClub } from "../world/world-generator.ts";
import {
  normalizeDiscovery,
  REGION_SCOUT_TIER_MAX,
  regionScoutTier,
  type ScoutDiscoveryState,
} from "./scout-discovery.ts";
import { zoneIdForWorldRegion } from "./scout-region-map.ts";

export function homeZoneIdForClub(club: WorldClub | null | undefined): string | null {
  if (!club) return null;
  return zoneIdForWorldRegion(club.region);
}

export function isRegionMapUnlocked(
  discovery: ScoutDiscoveryState | undefined,
  zoneId: string,
  homeZoneId: string | null,
): boolean {
  if (homeZoneId && zoneId === homeZoneId) return true;
  return regionScoutTier(normalizeDiscovery(discovery), zoneId) >= REGION_SCOUT_TIER_MAX;
}

/** New careers: home region gets full tier (flavor + map + foreign directory). */
export function applyHomeZoneBootstrap(
  discovery: ScoutDiscoveryState,
  playerClub: WorldClub | null | undefined,
): ScoutDiscoveryState {
  const homeZoneId = homeZoneIdForClub(playerClub);
  if (!homeZoneId) return normalizeDiscovery(discovery);
  const normalized = normalizeDiscovery(discovery);
  const tier = normalized.region_scout_tier?.[homeZoneId] ?? 0;
  if (tier >= REGION_SCOUT_TIER_MAX) return normalized;
  return normalizeDiscovery({
    ...normalized,
    region_scout_tier: { ...normalized.region_scout_tier, [homeZoneId]: REGION_SCOUT_TIER_MAX },
  });
}
