const PREFIX = "scout-job:";

export function scoutJobRegionPostfachItemId(
  zoneId: string,
  season: number,
  week: number,
): string {
  return `${PREFIX}region:${zoneId}:${season}:${week}`;
}

export function scoutJobClubPostfachItemId(
  careerClubId: string,
  season: number,
  week: number,
): string {
  return `${PREFIX}club:${careerClubId}:${season}:${week}`;
}

export function scoutJobOpponentPostfachItemId(
  matchId: string,
  season: number,
  week: number,
): string {
  return `${PREFIX}opponent:${matchId}:${season}:${week}`;
}

export function isScoutJobPostfachItemId(itemId: string): boolean {
  return itemId.startsWith(PREFIX);
}

export function parseScoutJobPostfachItemId(itemId: string): {
  kind: "region" | "club";
  key: string;
  season: number;
  week: number;
} | null {
  if (!itemId.startsWith(PREFIX)) return null;
  const rest = itemId.slice(PREFIX.length);
  const match = /^(region|club):([^:]+):(\d+):(\d+)$/.exec(rest);
  if (!match) return null;
  return {
    kind: match[1] as "region" | "club",
    key: match[2]!,
    season: Number(match[3]),
    week: Number(match[4]),
  };
}
