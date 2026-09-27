import type { Player as EnginePlayer } from "@fussballmanager/shared";
import type { Player } from "../types/player.ts";

function shirtFromRivalId(id: string): number | null {
  const match = id.match(/_(\d+)$/);
  const shirt = match?.[1];
  if (!shirt) return null;
  return Number.parseInt(shirt, 10);
}

export function indexRivalRoster(roster: readonly Player[]) {
  const byId = new Map<string, Player>();
  const byShirt = new Map<number, Player>();
  for (const player of roster) {
    byId.set(player.id, player);
    const shirt = shirtFromRivalId(player.id);
    if (shirt !== null) byShirt.set(shirt, player);
  }
  return { byId, byShirt };
}

export function resolveCareerPlayer(
  enginePlayer: EnginePlayer,
  index: ReturnType<typeof indexRivalRoster>,
): Player | undefined {
  return (
    index.byId.get(enginePlayer.id) ??
    index.byShirt.get(enginePlayer.shirt) ??
    index.byId.get(`rp_${enginePlayer.teamId}_${enginePlayer.shirt}`)
  );
}
