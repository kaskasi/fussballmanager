import type { FixtureResult, TeamId } from "@fussballmanager/shared";
import type { CareerLeagueStat } from "../persistence/league-state.ts";
import { t } from "../i18n/index.ts";
import { formatFixtureResult } from "../sim/league-week.ts";
import type { ClubEvent } from "../inbox/club-events.ts";
import { withClubEvent } from "../inbox/club-events.ts";
import type { DisciplineNotice } from "../sim/career-match-sync.ts";

/** PRD 34 — club-event line for a new ban or a four-yellow warning. */
export function disciplineNoticeMessage(notice: DisciplineNotice): string {
  if (notice.banMatches <= 0 || !notice.reason) {
    return t("discipline.notice.warning", { name: notice.name });
  }
  return t(notice.banMatches > 1 ? "discipline.notice.ban.many" : "discipline.notice.ban.one", {
    name: notice.name,
    count: notice.banMatches,
    reason: t(`discipline.reason.${notice.reason}`),
  });
}

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
      messages.push(t("league.result.yellow", { name: row.name }));
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
