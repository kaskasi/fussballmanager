import type { Player } from "../types/player.ts";

export const YOUTH_SITE_HQ = "hq";

export function youthSite(player: Player): string {
  return player.state?.youth_site ?? YOUTH_SITE_HQ;
}

export function isHqYouth(player: Player): boolean {
  return youthSite(player) === YOUTH_SITE_HQ;
}

export function withYouthSite(player: Player, site: string): Player {
  return {
    ...player,
    state: {
      ...player.state,
      youth_site: site,
    },
  };
}
