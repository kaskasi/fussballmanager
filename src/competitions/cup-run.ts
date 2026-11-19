/**
 * PRD 36 slice 3 — the manager's run in one cup, for the Leagues cup tab, the
 * hub snippet and the calendar. Pure lookup on the cup state.
 */
import type { TeamId } from "@fussballmanager/shared";
import { cupRoundCount, cupRoundKey, cupRoundWeek, type CupId, type CupRoundKey } from "./cup-definition.ts";
import { cupSurvivors } from "./cup-lookup.ts";
import type { CupCompetition, CupSeason } from "./cup-season.ts";

export type CupRun =
  | { status: "not_entered"; roundsWon: 0 }
  | { status: "winner"; roundsWon: number }
  | { status: "out"; roundsWon: number; key: CupRoundKey; score: string; opponent: TeamId }
  | {
      status: "drawn";
      roundsWon: number;
      round: number;
      key: CupRoundKey;
      week: number;
      opponent: TeamId;
      home: boolean;
      neutral: boolean;
    }
  | { status: "waiting"; roundsWon: number; round: number; key: CupRoundKey; week: number };

export function cupRunSummary(cup: CupCompetition, teamId: TeamId): CupRun {
  if (!cup.entrants.includes(teamId)) return { status: "not_entered", roundsWon: 0 };
  let roundsWon = 0;
  for (const round of cup.rounds) {
    const tie = round.ties.find((entry) => entry.home === teamId || entry.away === teamId);
    if (!tie) continue;
    const opponent = tie.home === teamId ? tie.away : tie.home;
    if (!tie.result) {
      return {
        status: "drawn",
        roundsWon,
        round: round.round,
        key: round.key,
        week: round.week,
        opponent,
        home: tie.home === teamId,
        neutral: tie.neutral ?? false,
      };
    }
    if (tie.result.winner !== teamId) {
      const own = tie.home === teamId;
      const goals = own ? [tie.result.homeGoals, tie.result.awayGoals] : [tie.result.awayGoals, tie.result.homeGoals];
      const pens = tie.result.penalties
        ? own
          ? tie.result.penalties
          : [tie.result.penalties[1], tie.result.penalties[0]]
        : null;
      return {
        status: "out",
        roundsWon,
        key: round.key,
        score: `${goals[0]}:${goals[1]}${pens ? ` (${pens[0]}:${pens[1]})` : ""}`,
        opponent,
      };
    }
    roundsWon += 1;
  }
  if (cup.winner === teamId) return { status: "winner", roundsWon };
  const next = cup.rounds.length + 1;
  if (next > cupRoundCount(cup.id) || !cupSurvivors(cup).includes(teamId)) {
    return { status: "winner", roundsWon };
  }
  return { status: "waiting", roundsWon, round: next, key: cupRoundKey(cup.id, next), week: cupRoundWeek(cup.id, next) };
}

/** The manager's next cup fixture across both cups (drawn first, then waiting), soonest week first. */
export function nextCupFixture(
  state: CupSeason | undefined,
  teamId: TeamId,
): (CupRun & { status: "drawn" | "waiting"; cup: CupId }) | null {
  const runs = (state?.cups ?? [])
    .map((cup) => ({ ...cupRunSummary(cup, teamId), cup: cup.id }))
    .filter((run): run is CupRun & { status: "drawn" | "waiting"; cup: CupId } =>
      run.status === "drawn" || run.status === "waiting",
    );
  return runs.sort((left, right) => left.week - right.week)[0] ?? null;
}

/**
 * Furthest round the club reached in a cup: n = it has (or had) a tie in
 * round n, count + 1 = winner, 0 = not entered or no tie drawn yet (a bye in
 * the preliminary round counts once the next round is drawn).
 */
export function cupRoundReached(state: CupSeason | undefined, id: CupId, teamId: TeamId): number {
  const cup = state?.cups.find((entry) => entry.id === id);
  if (!cup || !cup.entrants.includes(teamId)) return 0;
  if (cup.winner === teamId) return cupRoundCount(id) + 1;
  let reached = 0;
  for (const round of cup.rounds) {
    const tie = round.ties.find((entry) => entry.home === teamId || entry.away === teamId);
    if (!tie) continue;
    reached = round.round;
    if (tie.result && tie.result.winner !== teamId) return reached;
  }
  return reached;
}
