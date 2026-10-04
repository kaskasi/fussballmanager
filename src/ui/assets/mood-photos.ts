/** Shipped mood photos — sources in pd_images/ + public/assets/photos (see docs/ATTRIBUTION.md). */

import type { FanbaseMood } from "../../stadium/fanbase.ts";

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

/** Fanbase / form mood swaps (rain, crowd bokeh, empty stand). */
export const MOOD_VARIANT_PHOTOS = {
  rain: "/assets/photos/mood-rain.jpg",
  crowd: "/assets/photos/mood-crowd-bokeh.jpg",
  emptyStand: "/assets/photos/mood-empty-stand.jpg",
} as const;

export const PRECINCT_HEADER_PHOTO = "/assets/photos/precinct-header.jpg";

export function teamPoorRecentForm(recentResults: readonly ("W" | "D" | "L")[]): boolean {
  if (recentResults.length < 2) return false;
  const tail = recentResults.slice(-2);
  return tail.every((r) => r === "L");
}

/** Pre-match + live chrome: tier base, overridden by poor form (rain) or fanbase mood. */
export function matchAmbiencePhotoUrl(input: {
  isHome: boolean;
  homeCapacity: number;
  fanbaseMood: FanbaseMood;
  poorForm?: boolean;
}): string {
  if (input.poorForm) return MOOD_VARIANT_PHOTOS.rain;
  switch (input.fanbaseMood) {
    case "weak":
      return MOOD_VARIANT_PHOTOS.emptyStand;
    case "strong":
      return MOOD_VARIANT_PHOTOS.crowd;
    default:
      return matchdayMoodPhotoUrl(input.isHome, input.homeCapacity);
  }
}

/** ambientCG Paper003 — CC0 tile for future scout/hub chrome */
export const UI_TEXTURE_PAPER = "/assets/textures/paper003-color.jpg";
