/** design.md §9.15 — live Ereignisse tab: goals and cards up to the current frame, timeline notation. */
import type { MatchClock, MatchReport } from "@fussballmanager/shared";

export type LiveMatchLogEntry = {
  kind: "goal" | "yellow" | "red";
  minuteLabel: string;
  side: "home" | "away";
  name: string;
  assistName?: string;
};

/** "45+2'" → 4502, "67'" → 6700; stoppage time sorts before the next half's first minute. */
export function minuteLabelOrder(label: string): number {
  const match = /^(\d+)(?:\+(\d+))?/.exec(label);
  if (!match) return 0;
  return Number(match[1]) * 100 + Number(match[2] ?? 0);
}

function clockOrder(clock: MatchClock): number {
  if (clock.period === "full_time") return Number.POSITIVE_INFINITY;
  return clock.minute * 100 + clock.stoppageMinute;
}

/**
 * Goals come from the running score (exact even within one minute); cards from their minute.
 * Report entries are chronological, so the first n goals per side are the ones already scored.
 */
export function liveMatchLog(
  report: Pick<MatchReport, "goals" | "cards">,
  homeTeamId: string,
  clock: MatchClock,
  score: { home: number; away: number },
): LiveMatchLogEntry[] {
  return buildMatchLog(report, homeTeamId, clockOrder(clock), score);
}

/** Every goal and card of a finished match (report screen). */
export function fullMatchLog(
  report: Pick<MatchReport, "goals" | "cards">,
  homeTeamId: string,
): LiveMatchLogEntry[] {
  return buildMatchLog(report, homeTeamId, Number.POSITIVE_INFINITY, {
    home: Number.POSITIVE_INFINITY,
    away: Number.POSITIVE_INFINITY,
  });
}

function buildMatchLog(
  report: Pick<MatchReport, "goals" | "cards">,
  homeTeamId: string,
  now: number,
  score: { home: number; away: number },
): LiveMatchLogEntry[] {
  const seen = { home: 0, away: 0 };
  const entries: LiveMatchLogEntry[] = [];
  for (const goal of report.goals) {
    const side = goal.teamId === homeTeamId ? "home" : "away";
    if (seen[side] >= score[side]) continue;
    seen[side] += 1;
    entries.push({
      kind: "goal",
      minuteLabel: goal.minuteLabel,
      side,
      name: goal.scorerName,
      assistName: goal.assistName,
    });
  }
  for (const card of report.cards) {
    if (minuteLabelOrder(card.minuteLabel) > now) continue;
    entries.push({
      kind: card.color,
      minuteLabel: card.minuteLabel,
      side: card.teamId === homeTeamId ? "home" : "away",
      name: card.playerName,
    });
  }
  return entries.sort((a, b) => minuteLabelOrder(a.minuteLabel) - minuteLabelOrder(b.minuteLabel));
}
