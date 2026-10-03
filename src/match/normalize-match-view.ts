import type { MatchReport, MatchView } from "@fussballmanager/shared";
import { asTeamId, buildMatchConditions, formatMatchMinuteLabel } from "@fussballmanager/shared";

/** Older API responses may omit `report` until dev:server is restarted. */
export function fallbackMatchReport(view: MatchView): MatchReport {
  const goals: MatchReport["goals"] = [];
  let prevHome = 0;
  let prevAway = 0;
  for (const frame of view.frames) {
    if (frame.score.home > prevHome || frame.score.away > prevAway) {
      const teamId = asTeamId(
        frame.score.home > prevHome ? view.home.id : view.away.id,
      );
      goals.push({
        minuteLabel: formatMatchMinuteLabel(frame.clock),
        scorerName: frame.cueDetail?.label ?? "Unbekannt",
        teamId,
      });
      prevHome = frame.score.home;
      prevAway = frame.score.away;
    }
  }
  return {
    conditions: buildMatchConditions(view.seed),
    goals,
    cards: [],
    playerStats: [],
  };
}

export function normalizeMatchView(view: MatchView): MatchView {
  if (view.report?.conditions) {
    return view;
  }
  return {
    ...view,
    report: fallbackMatchReport(view),
  };
}
