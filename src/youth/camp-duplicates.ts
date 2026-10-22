import type { SaveGame } from "../persistence/savegame-model.ts";
import type { Player } from "../types/player.ts";

/**
 * Saves from before the camp-opening fix hold the same seeded camp talents three times
 * (two construction steps generated the bundle). Copies share name, birth and nationality
 * within the club — something two real players never do.
 */
function copyKey(player: Player): string {
  return [
    player.club_id,
    player.name.first,
    player.name.last,
    player.birth.date,
    player.birth.place,
    player.nationality,
  ].join("|");
}

function idNumber(player: Player): number {
  const match = /(\d+)$/.exec(player.id);
  return match ? Number.parseInt(match[1]!, 10) : Number.MAX_SAFE_INTEGER;
}

/** Prefer a copy the manager already moved on (HQ or pro), then the oldest id. */
function keeperOf(group: readonly Player[]): Player {
  const promoted = group.filter(
    (player) => player.squad_status === "pro" || !(player.state.youth_site ?? "").startsWith("camp_"),
  );
  const pool = promoted.length > 0 ? promoted : group;
  return [...pool].sort((left, right) => idNumber(left) - idNumber(right))[0]!;
}

/** Map of removed copy id → kept id for the manager's club. Empty when the save is clean. */
export function campCopyReplacements(players: readonly Player[], clubId: string): Map<string, string> {
  const groups = new Map<string, Player[]>();
  for (const player of players) {
    if (player.club_id !== clubId) continue;
    const key = copyKey(player);
    groups.set(key, [...(groups.get(key) ?? []), player]);
  }
  const replacements = new Map<string, string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    if (!group.some((player) => (player.state.youth_site ?? "").startsWith("camp_"))) continue;
    const keeper = keeperOf(group);
    for (const player of group) {
      if (player.id !== keeper.id) replacements.set(player.id, keeper.id);
    }
  }
  return replacements;
}

/** Drop camp copies and point every reference in the saved state at the kept player. Idempotent. */
export function dedupeCampOpeningCopies(save: SaveGame): SaveGame {
  const replacements = campCopyReplacements(save.players, save.manifest.player_club_id);
  if (replacements.size === 0) return save;
  let stateJson = JSON.stringify(save.state);
  for (const [removed, kept] of replacements) {
    stateJson = stateJson.split(`"${removed}"`).join(`"${kept}"`);
  }
  return {
    ...save,
    state: JSON.parse(stateJson) as SaveGame["state"],
    players: save.players.filter((player) => !replacements.has(player.id)),
  };
}
