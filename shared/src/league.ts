import type { TeamId } from "./ids.ts";

export type ScheduledFixture = {
  id: string;
  matchday: number;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
};

export type FixtureResult = {
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  homeGoals: number;
  awayGoals: number;
};

export type TableRow = {
  teamId: TeamId;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

/** Circle method. `matchday` is 1-based. Needs an even number of clubs. */
export function matchdayFixtures(
  clubIds: readonly TeamId[],
  matchday: number,
): ScheduledFixture[] {
  if (clubIds.length < 2 || clubIds.length % 2 !== 0) {
    throw new Error("Division needs an even number of clubs");
  }
  const round = matchday - 1;
  if (round < 0) {
    throw new Error("matchday must be >= 1");
  }
  const n = clubIds.length;
  const rot = [...clubIds];
  for (let step = 0; step < round % (n - 1); step += 1) {
    const last = rot.pop();
    if (last === undefined) {
      break;
    }
    rot.splice(1, 0, last);
  }
  const fixtures: ScheduledFixture[] = [];
  for (let i = 0; i < n / 2; i += 1) {
    const left = rot[i];
    const right = rot[n - 1 - i];
    if (!left || !right) {
      continue;
    }
    const homeFirst = (round + i) % 2 === 0;
    const homeTeamId = homeFirst ? left : right;
    const awayTeamId = homeFirst ? right : left;
    fixtures.push({
      id: `md-${matchday}-${i}`,
      matchday,
      homeTeamId,
      awayTeamId,
    });
  }
  return fixtures;
}

export function standings(
  clubIds: readonly TeamId[],
  results: readonly FixtureResult[],
): TableRow[] {
  const rows = new Map<TeamId, TableRow>();
  for (const teamId of clubIds) {
    rows.set(teamId, {
      teamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }
  for (const result of results) {
    applyResult(rows, result.homeTeamId, result.homeGoals, result.awayGoals);
    applyResult(rows, result.awayTeamId, result.awayGoals, result.homeGoals);
  }
  return [...rows.values()].sort(compareTableRows);
}

function applyResult(
  rows: Map<TeamId, TableRow>,
  teamId: TeamId,
  scored: number,
  conceded: number,
): void {
  const row = rows.get(teamId);
  if (!row) {
    return;
  }
  row.played += 1;
  row.goalsFor += scored;
  row.goalsAgainst += conceded;
  row.goalDifference = row.goalsFor - row.goalsAgainst;
  if (scored > conceded) {
    row.won += 1;
    row.points += 3;
  } else if (scored === conceded) {
    row.drawn += 1;
    row.points += 1;
  } else {
    row.lost += 1;
  }
}

function compareTableRows(a: TableRow, b: TableRow): number {
  if (b.points !== a.points) {
    return b.points - a.points;
  }
  if (b.goalDifference !== a.goalDifference) {
    return b.goalDifference - a.goalDifference;
  }
  if (b.goalsFor !== a.goalsFor) {
    return b.goalsFor - a.goalsFor;
  }
  return String(a.teamId).localeCompare(String(b.teamId));
}
