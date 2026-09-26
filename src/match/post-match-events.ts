import type { FixtureResult, TeamId } from "@fussballmanager/shared";
import type { CareerLeagueStat } from "../persistence/league-state.ts";
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
      messages.push(`${row.name}: ${row.goals} Tor${row.goals > 1 ? "e" : ""}`);
    }
    if (row.assists > 0) {
      messages.push(`${row.name}: ${row.assists} Vorlage${row.assists > 1 ? "n" : ""}`);
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
