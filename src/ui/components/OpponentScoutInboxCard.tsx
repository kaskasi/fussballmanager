/** WIREFRAME: PRD 22 + design.md §9.4 — Gegner-Scout Report */
import { Shield, Swords } from "lucide-react";
import type { SandboxPlan } from "@fussballmanager/shared";
import type { ScoutJobCompleteNotice } from "../../scouting/scout-job-postfach.ts";
import type { OpponentScoutRecommendation } from "../../scouting/opponent-scout-bundle.ts";
import type { OpponentScoutRiskTag } from "../../scouting/opponent-scout-sims.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { OpponentScoutSummaryGrid } from "./OpponentScoutSummaryGrid.tsx";

function RiskIcon({ risk }: { risk: OpponentScoutRiskTag }) {
  if (risk === "high_line") return <Swords size={14} aria-hidden />;
  return <Shield size={14} aria-hidden className={risk === "balanced" ? "opponent-scout-risk-balanced" : undefined} />;
}

function formatGoalDiff(value: number): string {
  const rounded = value.toFixed(1);
  if (value > 0) return `+${rounded}`;
  return rounded;
}

function TacticResultsTable({
  rows,
  onApplyPlan,
}: {
  rows: readonly OpponentScoutRecommendation[];
  onApplyPlan?: (plan: SandboxPlan) => void;
}) {
  return (
    <div className="opponent-scout-tactic-table-wrap">
      <p className="opponent-scout-tactic-table-title">{t("postfach.opponentScout.table.title")}</p>
      <table className="opponent-scout-tactic-table">
        <thead>
          <tr>
            <th scope="col">{t("postfach.opponentScout.table.tactic")}</th>
            <th scope="col">{t("postfach.opponentScout.table.winPct")}</th>
            <th scope="col">{t("postfach.opponentScout.table.goalDiff")}</th>
            <th scope="col">{t("postfach.opponentScout.table.goals")}</th>
            {onApplyPlan ? (
              <th scope="col" className="opponent-scout-tactic-action">
                {t("postfach.opponentScout.table.apply")}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.formationLabel}>
              <td>
                <span className="opponent-scout-tactic-name">
                  <RiskIcon risk={row.risk} />
                  {row.formationLabel}
                </span>
              </td>
              <td className="opponent-scout-tactic-num">{row.winPct}%</td>
              <td className="opponent-scout-tactic-num">{formatGoalDiff(row.avgGoalDiff)}</td>
              <td className="opponent-scout-tactic-num">
                {row.avgGoalsFor.toFixed(1)}–{row.avgGoalsAgainst.toFixed(1)}
              </td>
              {onApplyPlan ? (
                <td className="opponent-scout-tactic-apply">
                  {row.applyPlan ? (
                    <button
                      type="button"
                      className="inbox-action opponent-scout-apply-btn"
                      onClick={() => onApplyPlan(row.applyPlan!)}
                    >
                      {t("postfach.opponentScout.apply")}
                    </button>
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OpponentScoutInboxCard({
  notice,
  postIndex,
  postTotal,
  onDismiss,
  onApplyPlan,
  embedded = false,
  readOnly = false,
}: {
  notice: ScoutJobCompleteNotice;
  postIndex: number;
  postTotal: number;
  onDismiss: () => void;
  onApplyPlan?: (plan: SandboxPlan) => void;
  embedded?: boolean;
  readOnly?: boolean;
}) {
  useT();
  const report = notice.report;
  const rows = report?.recommendations ?? [];

  return (
    <section
      className={
        embedded
          ? "inbox-card-opponent-scout is-embedded"
          : "inbox-card inbox-card-scout-job inbox-card-opponent-scout"
      }
    >
      <div className="inbox-story">
        {embedded ? (
          <p className="inbox-scout-job-lead inbox-scout-job-lead--compact">
            {t("postfach.scoutJob.postCount", { index: postIndex, total: postTotal })}
            {" · "}
            {report?.bundleSummary
              ? t("postfach.opponentScout.simRuns", { count: report.bundleSummary.simCount })
              : null}
            {notice.assignedScoutName
              ? ` · ${t("postfach.opponentScout.scout", { name: notice.assignedScoutName })}`
              : null}
          </p>
        ) : (
          <>
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
          </>
        )}
        {report?.bundleSummary ? (
          <>
            {!embedded ? (
              <p className="inbox-scout-job-lead">
                {t("postfach.opponentScout.simRuns", { count: report.bundleSummary.simCount })}
                {notice.assignedScoutName
                  ? ` · ${t("postfach.opponentScout.scout", { name: notice.assignedScoutName })}`
                  : null}
              </p>
            ) : null}
            <OpponentScoutSummaryGrid summary={report.bundleSummary} compact={embedded} />
          </>
        ) : report?.modeScoreline ? (
          <p className="inbox-scout-job-lead">
            {t("postfach.opponentScout.modeScore", { score: report.modeScoreline })}
          </p>
        ) : null}
        {rows.length > 0 ? <TacticResultsTable rows={rows} onApplyPlan={onApplyPlan} /> : null}
      </div>
      {!readOnly ? (
        <div className="inbox-actions inbox-scout-job-actions">
          <button type="button" className="inbox-action is-primary" onClick={onDismiss}>
            {t("postfach.opponentScout.dismissReport")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
