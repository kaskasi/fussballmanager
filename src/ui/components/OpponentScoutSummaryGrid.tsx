/** WIREFRAME: PRD 22 — compact sim overview (token strip + W/D/L bar) */
import type { OpponentScoutBundleSummary } from "../../scouting/opponent-scout-bundle-summary.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";

export function OpponentScoutSummaryGrid({
  summary,
  compact = false,
}: {
  summary: OpponentScoutBundleSummary;
  compact?: boolean;
}) {
  useT();
  const goalsLine = t("postfach.opponentScout.overview.goalsLine", {
    for: summary.avgGoalsFor.toFixed(1),
    against: summary.avgGoalsAgainst.toFixed(1),
  });
  const diffPrefix = summary.avgGoalDiff > 0 ? "+" : "";
  const wdlLabel = t("postfach.opponentScout.grid.wdl");

  return (
    <div className="opponent-scout-overview" aria-label={t("postfach.opponentScout.grid.aria")}>
      <div className="opponent-scout-wdl" role="group" aria-label={wdlLabel}>
        <div className="opponent-scout-wdl-bar" aria-hidden>
          <span
            className="opponent-scout-wdl-seg is-win"
            style={{ flexGrow: Math.max(summary.winPct, 1) }}
          />
          <span
            className="opponent-scout-wdl-seg is-draw"
            style={{ flexGrow: Math.max(summary.drawPct, 1) }}
          />
          <span
            className="opponent-scout-wdl-seg is-loss"
            style={{ flexGrow: Math.max(summary.lossPct, 1) }}
          />
        </div>
        <ul className="opponent-scout-wdl-nums">
          <li>
            <span className="opponent-scout-wdl-key">{t("postfach.opponentScout.overview.win")}</span>
            <span className="opponent-scout-wdl-val">{summary.winPct}%</span>
          </li>
          <li>
            <span className="opponent-scout-wdl-key">{t("postfach.opponentScout.overview.draw")}</span>
            <span className="opponent-scout-wdl-val">{summary.drawPct}%</span>
          </li>
          <li>
            <span className="opponent-scout-wdl-key">{t("postfach.opponentScout.overview.loss")}</span>
            <span className="opponent-scout-wdl-val">{summary.lossPct}%</span>
          </li>
        </ul>
      </div>

      <dl className="opponent-scout-stat-strip">
        <div className="opponent-scout-stat-token">
          <dt>{t("postfach.opponentScout.grid.modeScore")}</dt>
          <dd>{summary.modeScoreline}</dd>
        </div>
        <div className="opponent-scout-stat-token">
          <dt>{t("postfach.opponentScout.grid.goalDiff")}</dt>
          <dd>
            {diffPrefix}
            {summary.avgGoalDiff.toFixed(1)}
          </dd>
        </div>
        <div className="opponent-scout-stat-token">
          <dt>{t("postfach.opponentScout.overview.avgScore")}</dt>
          <dd>{goalsLine}</dd>
        </div>
      </dl>

      {!compact ? (
        <p className="opponent-scout-overview-note">{t("postfach.opponentScout.overview.modeNote")}</p>
      ) : null}
    </div>
  );
}
