/** Shipped mood photos — sources in pd_images/ + public/assets/photos (see docs/ATTRIBUTION.md). */

export type StadiumPhotoTier = "s" | "m" | "l";

const TIER_SMALL_MAX = 12_000;
const TIER_MEDIUM_MAX = 35_000;

export function stadiumPhotoTierFromCapacity(capacity: number): StadiumPhotoTier {
  if (capacity >= TIER_MEDIUM_MAX) return "l";
  if (capacity >= TIER_SMALL_MAX) return "m";
  return "s";
}

export const STADIUM_MOOD_PHOTOS: Record<StadiumPhotoTier, string> = {
  s: "/assets/photos/stad-tier-s.jpg",
  m: "/assets/photos/stad-tier-m.jpg",
  l: "/assets/photos/stad-tier-l.jpg",
};

export const AWAY_MOOD_PHOTO = "/assets/photos/stad-away.jpg";

export function matchdayMoodPhotoUrl(isHome: boolean, homeCapacity: number): string {
  if (!isHome) return AWAY_MOOD_PHOTO;
  return STADIUM_MOOD_PHOTOS[stadiumPhotoTierFromCapacity(homeCapacity)];
}

/** ambientCG Paper003 — CC0 tile for future scout/hub chrome */
export const UI_TEXTURE_PAPER = "/assets/textures/paper003-color.jpg";
