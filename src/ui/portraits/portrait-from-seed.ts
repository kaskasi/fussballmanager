/** Open Peeps bust templates baked under public/assets/portraits/bust/ (see scripts/bake-open-peeps-busts.mjs). */
export const PORTRAIT_BUST_COUNT = 105;

export function bustIdFromPortraitSeed(portraitSeed: number): number {
  const u = portraitSeed >>> 0;
  return (u % PORTRAIT_BUST_COUNT) + 1;
}

export function portraitBustUrl(bustId: number): string {
  const id = Math.min(PORTRAIT_BUST_COUNT, Math.max(1, Math.floor(bustId)));
  return `/assets/portraits/bust/peep-${id}.svg`;
}

export const PORTRAIT_SILHOUETTE_URL = "/assets/portraits/silhouette.svg";

export function portraitUrlFromSeed(portraitSeed: number): string {
  return portraitBustUrl(bustIdFromPortraitSeed(portraitSeed));
}
