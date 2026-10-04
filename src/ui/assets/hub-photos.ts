/**
 * Hub / economy mood assets — sources in pd_images/ + public/assets/ (see docs/ATTRIBUTION.md).
 * Hub hero alternates office vs stadium dusk by season/week (stable within a week).
 */

export const HUB_OFFICE_PHOTO = "/assets/photos/hub-office.jpg";
export const HUB_STADIUM_DUSK_PHOTO = "/assets/photos/hub-stadium-dusk.jpg";
export const COMMERCE_KIOSK_PHOTO = "/assets/photos/commerce-kiosk.jpg";
export const TRANSFER_AMBIENCE_PHOTO = "/assets/photos/transfer-tunnel.jpg";
export const YOUTH_CAMPUS_HEADER_PHOTO = "/assets/photos/youth-campus-aerial.jpg";
export const BANDEN_BOARD_TEXTURE = "/assets/textures/wood066-color.jpg";

function hubHeroHash(season: number, week: number): number {
  const s = season >>> 0;
  const w = week >>> 0;
  return (s * 1_000_003 + w * 9_973) >>> 0;
}

export function hubHeroPhotoUrl(season: number, week: number): string {
  return hubHeroHash(season, week) % 2 === 0 ? HUB_OFFICE_PHOTO : HUB_STADIUM_DUSK_PHOTO;
}

export function transferAmbiencePhotoUrl(): string {
  return TRANSFER_AMBIENCE_PHOTO;
}
