import catalog from "./portrait-bust-catalog.json";

export type PortraitPool = "mens_squad" | "mixed" | "womens_squad";

/** Open Peeps vendor id range (stable portrait_seed → bust id). */
export const PORTRAIT_BUST_COUNT =
  "vendor_max" in catalog && typeof catalog.vendor_max === "number"
    ? catalog.vendor_max
    : catalog.busts.length;

const poolIds: Record<PortraitPool, readonly number[]> = {
  mens_squad: catalog.busts.filter((b) => b.pools.includes("mens_squad")).map((b) => b.id),
  mixed: catalog.busts.map((b) => b.id),
  womens_squad: catalog.busts.filter((b) => b.pools.includes("womens_squad")).map((b) => b.id),
};

/** Default for on-pitch players in men's competition. */
export const DEFAULT_PLAYER_PORTRAIT_POOL: PortraitPool = "mens_squad";

export function portraitPoolIds(pool: PortraitPool): readonly number[] {
  const ids = poolIds[pool];
  if (ids.length === 0) {
    return poolIds.mixed;
  }
  return ids;
}
