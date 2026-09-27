import type { FixtureResult, TeamId } from "@fussballmanager/shared";
import type { LeagueState } from "../persistence/league-state.ts";

export type FormResult = "W" | "D" | "L";

export function teamMatchResults(
  league: Pick<LeagueState, "results">,
  teamId: TeamId,
): FixtureResult[] {
  return league.results.filter(
    (result) => result.homeTeamId === teamId || result.awayTeamId === teamId,
  );
}

export function resultOutcome(result: FixtureResult, teamId: TeamId): FormResult {
  const isHome = result.homeTeamId === teamId;
  const scored = isHome ? result.homeGoals : result.awayGoals;
  const conceded = isHome ? result.awayGoals : result.homeGoals;
  if (scored > conceded) return "W";
  if (scored === conceded) return "D";
  return "L";
}

export function teamForm(
  league: Pick<LeagueState, "results">,
  teamId: TeamId,
  limit = 5,
): FormResult[] {
  const outcomes = teamMatchResults(league, teamId).map((result) => resultOutcome(result, teamId));
  return outcomes.slice(-limit);
}

export function formSparkline(form: readonly FormResult[]): string {
  return form
    .map((entry) => (entry === "W" ? "▲" : entry === "D" ? "■" : "▼"))
    .join("");
}
