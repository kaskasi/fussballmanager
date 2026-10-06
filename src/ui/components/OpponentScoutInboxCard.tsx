/** WIREFRAME: PRD 22 + design.md §9.4 — Gegner-Scout Report */
import { Calendar, Shield, Swords } from "lucide-react";
import type { ScoutJobCompleteNotice } from "../../scouting/scout-job-postfach.ts";
import type { OpponentScoutRiskTag } from "../../scouting/opponent-scout-sims.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";

function RiskIcon({ risk }: { risk: OpponentScoutRiskTag }) {
  if (risk === "high_line") return <Swords size={14} aria-hidden />;
  if (risk === "low_block") return <Shield size={14} aria-hidden />;
  return <Shield size={14} aria-hidden className="opponent-scout-risk-balanced" />;
}

export function OpponentScoutInboxCard({
  notice,
  postIndex,
  postTotal,
  onDismiss,
  onOpenTactics,
  onOpenCalendar,
}: {
  notice: ScoutJobCompleteNotice;
  postIndex: number;
  postTotal: number;
  onDismiss: () => void;
  onOpenTactics?: () => void;
  onOpenCalendar?: () => void;
}) {
  useT();
  const report = notice.report;
  const rows = report?.recommendations ?? [];

  return (
    <section className="inbox-card inbox-card-scout-job inbox-card-opponent-scout">
      <div className="inbox-story">
        <p className="inbox-post-count">
          {t("postfach.scoutJob.postCount", { index: postIndex, total: postTotal })}
        </p>
        <p className="inbox-scout-job-head">
          <Swords size={18} aria-hidden />
          <strong>
            {t("postfach.opponentScout.title", {
              opponent: notice.opponentShortName ?? "",
            })}
          </strong>
        </p>
        {report?.modeScoreline ? (
          <p className="inbox-scout-job-lead">
            {t("postfach.opponentScout.modeScore", { score: report.modeScoreline })}
            {notice.assignedScoutName
              ? ` · ${t("postfach.opponentScout.scout", { name: notice.assignedScoutName })}`
              : null}
          </p>
        ) : null}
        {rows.length > 0 ? (
          <ul className="opponent-scout-reco-list">
            {rows.map((row) => (
              <li key={row.formationLabel}>
                <RiskIcon risk={row.risk} />
                <span className="opponent-scout-reco-formation">{row.formationLabel}</span>
                <span className="opponent-scout-reco-band">
                  {t("postfach.opponentScout.scoreBand", {
                    forLow: row.goalsForBand[0],
                    forHigh: row.goalsForBand[1],
                    againstLow: row.goalsAgainstBand[0],
                    againstHigh: row.goalsAgainstBand[1],
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="inbox-actions inbox-scout-job-actions">
        {onOpenTactics ? (
          <button type="button" className="inbox-action" onClick={onOpenTactics}>
            {t("postfach.opponentScout.ctaTactics")}
          </button>
        ) : null}
        {onOpenCalendar ? (
          <button type="button" className="inbox-action" onClick={onOpenCalendar}>
            <Calendar size={14} aria-hidden />
            {t("postfach.opponentScout.ctaCalendar")}
          </button>
        ) : null}
        <button type="button" className="inbox-action is-primary" onClick={onDismiss}>
          {t("postfach.scoutJob.dismiss")}
        </button>
      </div>
    </section>
  );
}
