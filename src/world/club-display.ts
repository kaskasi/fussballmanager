import type { TeamId } from "@fussballmanager/shared";
import { extractPlaceFromClubName } from "../scouting/scout-map-geo.ts";
import type { WorldClub } from "./world-generator.ts";

export function resolveWorldClub(
  teamId: TeamId,
  worldClubs?: readonly WorldClub[],
): WorldClub | undefined {
  return worldClubs?.find((club) => club.id === teamId);
}

/** Real city (WGS84 catalog) for tables, fixtures, and scout map. */
export function clubPlaceName(teamId: TeamId, worldClubs?: readonly WorldClub[]): string {
  const worldClub = resolveWorldClub(teamId, worldClubs);
  if (worldClub?.place) return worldClub.place;
  if (worldClub?.name) {
    const parsed = extractPlaceFromClubName(worldClub.name);
    if (parsed) return parsed;
  }
  return "";
}

/** Full fictional club name from the generated world. */
export function clubNameFromWorld(teamId: TeamId, worldClubs?: readonly WorldClub[]): string | null {
  return resolveWorldClub(teamId, worldClubs)?.name ?? null;
}

export function clubShortNameFromWorld(
  teamId: TeamId,
  worldClubs?: readonly WorldClub[],
): string | null {
  return resolveWorldClub(teamId, worldClubs)?.short_name ?? null;
}
