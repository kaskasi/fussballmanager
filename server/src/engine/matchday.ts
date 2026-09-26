import type { Squad, TeamId } from "@fussballmanager/shared";
import {
  aggregatePlayerMatchStats,
  matchdayFixtures,
  mergePlayerSeasonStats,
  standings,
  type FixtureResult,
  type PlayerSeasonStat,
  type ScheduledFixture,
  type TableRow,
} from "@fussballmanager/shared";
import { createInitialState } from "./initial-state.ts";
import { simulate } from "./step.ts";

export type PlayedMatchdayFixture = ScheduledFixture &
  FixtureResult & {
    seed: number;
    eventCount: number;
  };

export type PlayedMatchday = {
  matchday: number;
  fixtures: PlayedMatchdayFixture[];
  table: TableRow[];
  playerStats: PlayerSeasonStat[];
};

export function playMatchday(input: {
  squads: readonly Squad[];
  matchday?: number;
  baseSeed: number;
}): PlayedMatchday {
  const matchday = input.matchday ?? 1;
  const byId = new Map(input.squads.map((squad) => [squad.team.id, squad]));
  const clubIds = input.squads.map((squad) => squad.team.id);
  const scheduled = matchdayFixtures(clubIds, matchday);
  let playerStats: PlayerSeasonStat[] = [];
  const fixtures: PlayedMatchdayFixture[] = scheduled.map((fixture, index) => {
    const home = byId.get(fixture.homeTeamId);
    const away = byId.get(fixture.awayTeamId);
    if (!home || !away) {
      throw new Error(`Unknown club in ${fixture.id}`);
    }
    const seed = input.baseSeed + index * 19;
    const state = createInitialState({ home, away, seed });
    const { events, finalState } = simulate({
      state,
      homeTactics: state.homeTactics,
      awayTactics: state.awayTactics,
    });
    playerStats = mergePlayerSeasonStats(
      playerStats,
      aggregatePlayerMatchStats(events, home, away),
    );
    return {
      ...fixture,
      seed,
      homeGoals: finalState.score.home,
      awayGoals: finalState.score.away,
      eventCount: events.length,
    };
  });
  const results: FixtureResult[] = fixtures.map((fixture) => ({
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    homeGoals: fixture.homeGoals,
    awayGoals: fixture.awayGoals,
  }));
  return {
    matchday,
    fixtures,
    table: standings(clubIds, results),
    playerStats,
  };
}

export function clubName(
  squads: readonly Squad[],
  teamId: TeamId,
): string {
  return squads.find((squad) => squad.team.id === teamId)?.team.name ?? teamId;
}
