import type { FixtureResult, TeamId } from "@fussballmanager/shared";
import type { CareerLeagueStat } from "../persistence/league-state.ts";
import { t } from "../i18n/index.ts";
import { formatFixtureResult } from "../sim/league-week.ts";
import type { ClubEvent } from "../inbox/club-events.ts";
import { withClubEvent } from "../inbox/club-events.ts";

export function matchdayClubEventMessages(
  fixture: FixtureResult,
  playerClubId: TeamId,
  matchdayStats: readonly CareerLeagueStat[],
): string[] {
  const messages: string[] = [`${formatFixtureResult(fixture, playerClubId)}`];

  for (const row of matchdayStats) {
    if (row.goals > 0) {
      messages.push(
        t(row.goals > 1 ? "league.result.goals.many" : "league.result.goals.one", {
          name: row.name,
          count: row.goals,
        }),
      );
    }
    if (row.assists > 0) {
      messages.push(
        t(row.assists > 1 ? "league.result.assists.many" : "league.result.assists.one", {
          name: row.name,
          count: row.assists,
        }),
      );
    }
    if (row.yellowCards > 0) {
      messages.push(`🟨 ${row.name}`);
    }
  }

  return messages;
}

export function appendMatchdayClubEvents(
  events: readonly ClubEvent[],
  season: number,
  week: number,
  fixture: FixtureResult,
  playerClubId: TeamId,
  matchdayStats: readonly CareerLeagueStat[],
): ClubEvent[] {
  let next = [...events];
  for (const message of matchdayClubEventMessages(fixture, playerClubId, matchdayStats)) {
    next = withClubEvent(next, season, week, "match", message);
  }
  return next;
}
