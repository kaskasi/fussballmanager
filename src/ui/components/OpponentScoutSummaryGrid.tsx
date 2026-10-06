/** WIREFRAME: PRD 22 v2 — 4×3 bundle analytics grid */
import type { ReactNode } from "react";
import {
  CornerDownRight,
  Crosshair,
  Minus,
  Shield,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import type { OpponentScoutBundleSummary } from "../../scouting/opponent-scout-bundle-summary.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";

function Cell({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="opponent-scout-summary-cell">
      <span className="opponent-scout-summary-icon" aria-hidden>{icon}</span>
      <span className="opponent-scout-summary-label">{label}</span>
      <span className="opponent-scout-summary-value">{value}</span>
    </div>
  );
}

export function OpponentScoutSummaryGrid({ summary }: { summary: OpponentScoutBundleSummary }) {
  useT();
  const pass =
    summary.avgPassCompletionPct != null
      ? `${summary.avgPassCompletionPct}%`
      : t("postfach.opponentScout.grid.na");

  return (
    <div
      className="opponent-scout-summary-grid"
      aria-label={t("postfach.opponentScout.grid.aria")}
    >
      <Cell
        icon={<Trophy size={14} />}
        label={t("postfach.opponentScout.grid.modeScore")}
        value={summary.modeScoreline}
      />
      <Cell
        icon={<TrendingUp size={14} />}
        label={t("postfach.opponentScout.grid.wdl")}
        value={`${summary.winPct}/${summary.drawPct}/${summary.lossPct}`}
      />
      <Cell
        icon={<Minus size={14} />}
        label={t("postfach.opponentScout.grid.goalDiff")}
        value={summary.avgGoalDiff.toFixed(1)}
      />
      <Cell
        icon={<Target size={14} />}
        label={t("postfach.opponentScout.grid.goalsFor")}
        value={summary.avgGoalsFor.toFixed(1)}
      />
      <Cell
        icon={<Crosshair size={14} />}
        label={t("postfach.opponentScout.grid.shotsFor")}
        value={summary.avgShotsFor.toFixed(1)}
      />
      <Cell
        icon={<Crosshair size={14} />}
        label={t("postfach.opponentScout.grid.sotFor")}
        value={summary.avgShotsOnTargetFor.toFixed(1)}
      />
      <Cell
        icon={<Shield size={14} />}
        label={t("postfach.opponentScout.grid.goalsAgainst")}
        value={summary.avgGoalsAgainst.toFixed(1)}
      />
      <Cell
        icon={<Crosshair size={14} />}
        label={t("postfach.opponentScout.grid.shotsAgainst")}
        value={summary.avgShotsAgainst.toFixed(1)}
      />
      <Cell
        icon={<Crosshair size={14} />}
        label={t("postfach.opponentScout.grid.sotAgainst")}
        value={summary.avgShotsOnTargetAgainst.toFixed(1)}
      />
      <Cell
        icon={<TrendingUp size={14} />}
        label={t("postfach.opponentScout.grid.passPct")}
        value={pass}
      />
      <Cell
        icon={<CornerDownRight size={14} />}
        label={t("postfach.opponentScout.grid.cornersFor")}
        value={summary.avgCornersFor.toFixed(1)}
      />
      <Cell
        icon={<CornerDownRight size={14} />}
        label={t("postfach.opponentScout.grid.cornersAgainst")}
        value={summary.avgCornersAgainst.toFixed(1)}
      />
    </div>
  );
}
