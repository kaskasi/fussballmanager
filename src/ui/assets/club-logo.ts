import { CLUB_LOGO_COUNT, clubLogoPublicPath } from "./club-logo-catalog.ts";
import { NORDSTERN_CLUB_ID } from "../../world/world-generator.ts";

function hashClubId(clubId: string): number {
  let hash = 0;
  for (let index = 0; index < clubId.length; index++) {
    hash = Math.imul(hash ^ clubId.charCodeAt(index), 0x9e3779b1);
  }
  return hash >>> 0;
}

/** Deterministic crest asset from club id (no save field). */
export function clubLogoUrlForId(clubId: string): string | undefined {
  if (CLUB_LOGO_COUNT <= 0) return undefined;
  const index = hashClubId(clubId) % CLUB_LOGO_COUNT;
  return clubLogoPublicPath(index);
}

/** Player club gets a stable “hero” crest when catalog is baked. */
export function clubLogoUrlForPlayerClub(clubId: string): string | undefined {
  if (clubId === NORDSTERN_CLUB_ID) {
    return clubLogoPublicPath(0);
  }
  return clubLogoUrlForId(clubId);
}
