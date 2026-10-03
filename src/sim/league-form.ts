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

export type FormSlot = FormResult | null;

/** Last `limit` results, oldest→newest; leading slots null until five games exist. */
export function teamFormSlots(
  league: Pick<LeagueState, "results">,
  teamId: TeamId,
  limit = 5,
): FormSlot[] {
  const outcomes = teamForm(league, teamId, limit);
  const slots: FormSlot[] = Array.from({ length: limit }, () => null);
  const offset = limit - outcomes.length;
  for (let index = 0; index < outcomes.length; index += 1) {
    slots[offset + index] = outcomes[index]!;
  }
  return slots;
}

/** League points (0 / 1 / 3) for the same window as {@link teamFormSlots}. */
export function teamFormPoints(
  league: Pick<LeagueState, "results">,
  teamId: TeamId,
  limit = 5,
): (number | null)[] {
  const results = teamMatchResults(league, teamId).slice(-limit);
  const slots: (number | null)[] = Array.from({ length: limit }, () => null);
  const offset = limit - results.length;
  for (let index = 0; index < results.length; index += 1) {
    const outcome = resultOutcome(results[index]!, teamId);
    slots[offset + index] = outcome === "W" ? 3 : outcome === "D" ? 1 : 0;
  }
  return slots;
}

export function formSparkline(form: readonly FormResult[]): string {
  return form
    .map((entry) => (entry === "W" ? "▲" : entry === "D" ? "■" : "▼"))
    .join("");
}

export function formSlotsAriaLabel(slots: readonly FormSlot[]): string {
  const played = slots.filter((entry): entry is FormResult => entry !== null);
  if (played.length === 0) return "Noch keine Form";
  const words = played.map((entry) => (entry === "W" ? "Sieg" : entry === "D" ? "Remis" : "Niederlage"));
  return `Form letzte ${played.length} Spiele: ${words.join(", ")}`;
}
