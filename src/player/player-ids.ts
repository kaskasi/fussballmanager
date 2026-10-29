import type { Player } from "../types/player.ts";

/** Five-digit player ids `pl_00000`–`pl_99999` (PRD 07.3). */
export const PLAYER_ID_SPACE = 100_000;

export function numericPlayerId(value: number): string {
  return `pl_${String(value).padStart(5, "0")}`;
}

/** Highest five-digit id in `players` plus one (0 when none). */
export function nextNumericIdHint(players: readonly { id: string }[]): number {
  let max = -1;
  for (const player of players) {
    const match = /^pl_(\d{5})$/.exec(player.id);
    if (match) max = Math.max(max, Number.parseInt(match[1]!, 10));
  }
  return (max + 1) % PLAYER_ID_SPACE;
}

/**
 * PRD 31 — `count` free five-digit ids from `start` upward, wrapping at 99,999.
 * `used` holds every id in play and every retired id, so no id is ever reused.
 */
export function allocateFreePlayerIds(used: ReadonlySet<string>, count: number, start: number): string[] {
  const ids: string[] = [];
  for (let step = 0; step < PLAYER_ID_SPACE && ids.length < count; step++) {
    const id = numericPlayerId((start + step) % PLAYER_ID_SPACE);
    if (!used.has(id)) ids.push(id);
  }
  if (ids.length < count) throw new Error("Player id space exhausted");
  return ids;
}

/** Give freshly generated players free ids; `used` gains them. */
export function assignFreePlayerIds(players: readonly Player[], used: Set<string>, start: number): Player[] {
  const ids = allocateFreePlayerIds(used, players.length, start);
  return players.map((player, index) => {
    const id = ids[index]!;
    used.add(id);
    return { ...player, id };
  });
}

/** Keep each player's id unless `taken` already has it; clashes get the next free id. */
export function reassignClashingIds(players: readonly Player[], taken: Set<string>): Player[] {
  const hint = nextNumericIdHint(players);
  return players.map((player) => {
    if (!taken.has(player.id)) {
      taken.add(player.id);
      return player;
    }
    const [id] = allocateFreePlayerIds(taken, 1, hint);
    taken.add(id!);
    return { ...player, id: id! };
  });
}
