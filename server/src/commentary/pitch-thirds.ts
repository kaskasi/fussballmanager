import type { TeamId } from "@fussballmanager/shared";

export function attackingThird(x: number, teamId: TeamId, homeTeamId: TeamId): boolean {
  return teamId === homeTeamId ? x > 66.67 : x < 33.34;
}

export function defensiveThird(x: number, teamId: TeamId, homeTeamId: TeamId): boolean {
  return teamId === homeTeamId ? x < 33.34 : x > 66.67;
}
