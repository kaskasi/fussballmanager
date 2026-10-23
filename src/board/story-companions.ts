import type { Player } from "../types/player.ts";

/** Story Mode Act 1 → 2: at most this many bonded players follow the manager. */
export const STORY_COMPANION_MAX = 2;

const YOUTH_BONUS = 30;
const CAPTAIN_BONUS = 40;
const PRAISE_BONUS = 10;
const MENTORSHIP_BONUS = 8;

function isYouth(player: Player): boolean {
  return player.squad_status === "u17" || player.squad_status === "u19";
}

/** CA gained over the last stored season of growth history. */
function recentGrowth(player: Player): number {
  const history = player.state.ca_history ?? [];
  if (history.length < 2) return 0;
  return Math.max(0, history[history.length - 1]! - history[0]!);
}

/** Bond signal: youth, growth under this manager, minutes, praise, captaincy, morale. */
export function storyCompanionScore(
  player: Player,
  captainPlayerId: string | null,
  endingSeason: number,
): number {
  return (
    (isYouth(player) ? YOUTH_BONUS : 0) +
    recentGrowth(player) * 2 +
    (player.state.season_apps ?? 0) +
    (player.state.last_praise_season === endingSeason ? PRAISE_BONUS : 0) +
    (player.state.mentorship ? MENTORSHIP_BONUS : 0) +
    (player.id === captainPlayerId ? CAPTAIN_BONUS : 0) +
    (player.state.morale ?? 50) / 10
  );
}

/** Old-club players ranked by bond, strongest first — deterministic, loanees excluded. */
export function rankStoryBonds(
  players: readonly Player[],
  careerClubId: string,
  captainPlayerId: string | null,
  endingSeason: number,
): Player[] {
  return players
    .filter((player) => player.club_id === careerClubId && player.squad_status !== "loaned_out")
    .filter((player) => !player.current_loan)
    .map((player) => ({ player, score: storyCompanionScore(player, captainPlayerId, endingSeason) }))
    .sort((left, right) => right.score - left.score || left.player.id.localeCompare(right.player.id))
    .map((entry) => entry.player);
}

/**
 * PRD 19 / ADR 0005 — deterministic followers for the Act 2 club: the best-bonded youth first,
 * then the best-bonded remaining player. Loanees and other clubs' players never follow.
 */
export function pickStoryCompanions(
  players: readonly Player[],
  careerClubId: string,
  captainPlayerId: string | null,
  endingSeason: number,
): Player[] {
  const ranked = rankStoryBonds(players, careerClubId, captainPlayerId, endingSeason);
  const firstYouth = ranked.find(isYouth);
  const picks = firstYouth ? [firstYouth] : [];
  for (const player of ranked) {
    if (picks.length >= STORY_COMPANION_MAX) break;
    if (!picks.includes(player)) picks.push(player);
  }
  return picks;
}
