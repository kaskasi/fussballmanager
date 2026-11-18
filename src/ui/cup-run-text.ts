import type { TeamId } from "@fussballmanager/shared";
import { t } from "../i18n/index.ts";
import type { CupRun } from "../competitions/cup-run.ts";
import { formatCalendarWeek } from "../sim/game-calendar.ts";

/** One line on the manager's cup run (Leagues cup tab, hub). */
export function cupRunText(run: CupRun, label: (teamId: TeamId) => string): string {
  switch (run.status) {
    case "not_entered":
      return t("cup.run.notEntered");
    case "winner":
      return t("cup.run.winner");
    case "out":
      return t("cup.run.out", { round: t(`cup.round.${run.key}`), score: run.score, opponent: label(run.opponent) });
    case "drawn":
      return t("cup.run.nextOpponent", {
        round: t(`cup.round.${run.key}`),
        opponent: label(run.opponent),
        week: formatCalendarWeek(run.week),
        venue: t(run.neutral ? "cup.run.venue.neutral" : run.home ? "cup.run.venue.home" : "cup.run.venue.away"),
      });
    case "waiting":
      return t("cup.run.next", { round: t(`cup.round.${run.key}`), week: formatCalendarWeek(run.week) });
  }
}
