import type { MatchView, PlayerSeasonStat, TeamId } from "@fussballmanager/shared";

export type MatchStarPick = {
  rank: 1 | 2 | 3;
  playerId: string;
  name: string;
  teamId: TeamId;
  teamShortName: string;
  role: string;
  shirt: number;
  goals: number;
  assists: number;
  yellowCards: number;
};

function starPoints(row: PlayerSeasonStat): number {
  return row.goals * 5 + row.assists * 3 - row.yellowCards * 2;
}

/** NHL-style top three from goal contributions (G/A), minus cards. */
export function pickMatchThreeStars(
  view: MatchView,
  playerStats: readonly PlayerSeasonStat[],
): MatchStarPick[] {
  const roster = new Map(view.roster.map((entry) => [entry.id, entry]));
  const teamShort = (teamId: TeamId) =>
    teamId === view.home.id ? view.home.shortName : view.away.shortName;

  const ranked = [...playerStats]
    .map((row) => ({ row, points: starPoints(row) }))
    .filter((entry) => entry.points > 0)
    .sort((left, right) => {
      const delta = right.points - left.points;
      if (delta !== 0) return delta;
      return left.row.name.localeCompare(right.row.name, "de");
    })
    .slice(0, 3);

  return ranked.map((entry, index) => {
    const rank = (index + 1) as 1 | 2 | 3;
    const meta = roster.get(entry.row.playerId);
    return {
      rank,
      playerId: entry.row.playerId,
      name: entry.row.name,
      teamId: entry.row.teamId,
      teamShortName: teamShort(entry.row.teamId),
      role: meta?.role ?? "—",
      shirt: meta?.shirt ?? 0,
      goals: entry.row.goals,
      assists: entry.row.assists,
      yellowCards: entry.row.yellowCards,
    };
  });
}

/** Center star first, then flanks — ★3 · ★1 · ★2 */
export function threeStarsDisplayOrder(stars: readonly MatchStarPick[]): MatchStarPick[] {
  const byRank = new Map(stars.map((star) => [star.rank, star]));
  const order: MatchStarPick[] = [];
  if (byRank.has(3)) order.push(byRank.get(3)!);
  if (byRank.has(1)) order.push(byRank.get(1)!);
  if (byRank.has(2)) order.push(byRank.get(2)!);
  if (order.length > 0) return order;
  return [...stars];
}
