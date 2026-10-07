import type { ScoutBoard } from "./scout-board.ts";
import { busyScoutIds } from "./scout-busy.ts";
import { SCOUT_TIERS, type ScoutNetworkState } from "./scout-network.ts";

/** Pick a hired scout with free player-watch slots (PRD 04.2 tier capacity). */
export function pickScoutForPlayerAssignment(
  board: ScoutBoard,
  network: ScoutNetworkState,
): string | null {
  if (network.scouts.length === 0) return null;
  const usage = new Map<string, number>();
  for (const scout of network.scouts) usage.set(scout.id, 0);
  for (const target of Object.values(board.targets)) {
    if (target.assigned && target.assigned_scout_id) {
      usage.set(target.assigned_scout_id, (usage.get(target.assigned_scout_id) ?? 0) + 1);
    }
  }
  const busy = new Set(busyScoutIds(board));
  let best: { id: string; load: number; busy: boolean } | null = null;
  for (const scout of network.scouts) {
    const cap = SCOUT_TIERS[scout.tier].capacity;
    const load = usage.get(scout.id) ?? 0;
    if (load >= cap) continue;
    const isBusy = busy.has(scout.id);
    if (
      !best ||
      (!best.busy && isBusy) ||
      (best.busy === isBusy && load < best.load)
    ) {
      best = { id: scout.id, load, busy: isBusy };
    }
  }
  return best?.id ?? null;
}

export function scoutDisplayName(network: ScoutNetworkState, scoutId: string | null | undefined): string | null {
  if (!scoutId) return null;
  return network.scouts.find((scout) => scout.id === scoutId)?.name ?? null;
}
