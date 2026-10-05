/** Open Peeps bust templates under public/assets/portraits/bust/ (+ charge2/); see scripts/bake-open-peeps-bust*.mjs. */
import catalog from "./portrait-bust-catalog.json";
import {
  DEFAULT_PLAYER_PORTRAIT_POOL,
  PORTRAIT_BUST_COUNT,
  portraitPoolIds,
  type PortraitPool,
} from "./portrait-pools.ts";

export { PORTRAIT_BUST_COUNT, DEFAULT_PLAYER_PORTRAIT_POOL, type PortraitPool };

const bustFileById = new Map(catalog.busts.map((b) => [b.id, b.file]));

export function bustIdFromPortraitSeed(
  portraitSeed: number,
  pool: PortraitPool = DEFAULT_PLAYER_PORTRAIT_POOL,
): number {
  const ids = portraitPoolIds(pool);
  const u = portraitSeed >>> 0;
  return ids[u % ids.length] ?? 1;
}

export function portraitBustUrl(bustId: number): string {
  const id = Math.min(PORTRAIT_BUST_COUNT, Math.max(1, Math.floor(bustId)));
  const file = bustFileById.get(id);
  if (file) {
    return `/assets/portraits/bust/${file}`;
  }
  return `/assets/portraits/bust/peep-${id}.svg`;
}

export const PORTRAIT_SILHOUETTE_URL = "/assets/portraits/silhouette.svg";

export function portraitUrlFromSeed(
  portraitSeed: number,
  pool: PortraitPool = DEFAULT_PLAYER_PORTRAIT_POOL,
): string {
  return portraitBustUrl(bustIdFromPortraitSeed(portraitSeed, pool));
}
