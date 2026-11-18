/**
 * PRD 36 — read-only lookups on a season's cups. Kept free of the simulation
 * imports (squads, divisions) so calendar and navigation modules can use it
 * without import cycles.
 */
import type { TeamId } from "@fussballmanager/shared";
import { cupRoundCount, cupRoundWeek, type CupId, type CupRoundKey } from "./cup-definition.ts";
import type { CupCompetition, CupSeason, CupTie } from "./cup-season.ts";

function losers(cup: CupCompetition): Set<TeamId> {
  const out = new Set<TeamId>();
  for (const round of cup.rounds) {
    for (const tie of round.ties) {
      if (tie.result) out.add(tie.result.winner === tie.home ? tie.away : tie.home);
    }
  }
  return out;
}

/** Clubs still in the cup: entrants that have not lost a tie. */
export function cupSurvivors(cup: CupCompetition): TeamId[] {
  const out = losers(cup);
  return cup.entrants.filter((teamId) => !out.has(teamId));
}

export function cupCompetition(state: CupSeason | undefined, id: CupId): CupCompetition | undefined {
  return state?.cups.find((cup) => cup.id === id);
}

/** Nordpokal winner and runner-up of a finished season (empty while it runs). */
export function regionalFinalists(state: CupSeason | undefined): TeamId[] {
  const regional = cupCompetition(state, "regional");
  return [regional?.winner, regional?.runnerUp].filter((teamId): teamId is TeamId => Boolean(teamId));
}

/** True when a cup round of `state` is scheduled in `week` and not played yet. */
export function hasCupRoundInWeek(state: CupSeason | undefined, week: number): boolean {
  return (state?.cups ?? []).some((cup) =>
    cup.rounds.some((round) => round.week === week && round.ties.some((tie) => !tie.result)),
  );
}

export interface ManagerCupTie {
  cup: CupId;
  round: number;
  key: CupRoundKey;
  week: number;
  /** Index of the tie in its round (seed component). */
  index: number;
  tie: CupTie;
}

/** The manager's unplayed cup tie in `week`, if any. */
export function managerCupTie(
  state: CupSeason | undefined,
  week: number,
  teamId: TeamId,
): ManagerCupTie | null {
  for (const cup of state?.cups ?? []) {
    for (const round of cup.rounds) {
      if (round.week !== week) continue;
      const index = round.ties.findIndex((tie) => !tie.result && (tie.home === teamId || tie.away === teamId));
      if (index >= 0) {
        return { cup: cup.id, round: round.round, key: round.key, week, index, tie: round.ties[index]! };
      }
    }
  }
  return null;
}

/**
 * Weeks still ahead in which the manager may play a cup tie: drawn rounds
 * with a tie of the club, and undrawn rounds of cups the club is still in.
 */
export function managerCupWeeks(state: CupSeason | undefined, teamId: TeamId): Set<number> {
  const weeks = new Set<number>();
  for (const cup of state?.cups ?? []) {
    if (cup.winner || !cupSurvivors(cup).includes(teamId)) continue;
    for (const round of cup.rounds) {
      if (round.ties.some((tie) => !tie.result && (tie.home === teamId || tie.away === teamId))) {
        weeks.add(round.week);
      }
    }
    for (let round = cup.rounds.length + 1; round <= cupRoundCount(cup.id); round++) {
      weeks.add(cupRoundWeek(cup.id, round));
    }
  }
  return weeks;
}
