/** WIREFRAME: PRD 22 — compact sim overview (research-style headline stats) */
import { Trophy, TrendingDown, TrendingUp } from "lucide-react";
import type { OpponentScoutBundleSummary } from "../../scouting/opponent-scout-bundle-summary.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";

function OutcomePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="opponent-scout-outcome-pill">
      <span className="opponent-scout-outcome-label">{label}</span>
      <span className="opponent-scout-outcome-value">{value}%</span>
    </div>
  );
}

export function OpponentScoutSummaryGrid({ summary }: { summary: OpponentScoutBundleSummary }) {
  useT();
  const goalsLine = t("postfach.opponentScout.overview.goalsLine", {
    for: summary.avgGoalsFor.toFixed(1),
    against: summary.avgGoalsAgainst.toFixed(1),
  });
  const diffPrefix = summary.avgGoalDiff > 0 ? "+" : "";

  return (
    <div className="opponent-scout-overview" aria-label={t("postfach.opponentScout.grid.aria")}>
      <div className="opponent-scout-outcomes" role="group" aria-label={t("postfach.opponentScout.grid.wdl")}>
        <OutcomePill label={t("postfach.opponentScout.overview.win")} value={summary.winPct} />
        <OutcomePill label={t("postfach.opponentScout.overview.draw")} value={summary.drawPct} />
        <OutcomePill label={t("postfach.opponentScout.overview.loss")} value={summary.lossPct} />
      </div>
      <ul className="opponent-scout-overview-facts">
        <li>
          <Trophy size={14} aria-hidden />
          <span className="opponent-scout-overview-fact-label">
            {t("postfach.opponentScout.grid.modeScore")}
          </span>
          <span className="opponent-scout-overview-fact-value">{summary.modeScoreline}</span>
        </li>
        <li>
          <TrendingUp size={14} aria-hidden />
          <span className="opponent-scout-overview-fact-label">
            {t("postfach.opponentScout.grid.goalDiff")}
          </span>
          <span className="opponent-scout-overview-fact-value">
            {diffPrefix}
            {summary.avgGoalDiff.toFixed(1)}
          </span>
        </li>
        <li>
          <TrendingDown size={14} aria-hidden />
          <span className="opponent-scout-overview-fact-label">
            {t("postfach.opponentScout.overview.avgScore")}
          </span>
          <span className="opponent-scout-overview-fact-value">{goalsLine}</span>
        </li>
      </ul>
      <p className="opponent-scout-overview-note">{t("postfach.opponentScout.overview.modeNote")}</p>
    </div>
  );
}
