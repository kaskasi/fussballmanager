/** WIREFRAME: design.md §9 — Treffer-Grid, Filter-Auftrag wie Spielerkarte */
import { ClipboardList } from "lucide-react";
import { useT } from "../../i18n/react.ts";

export function ScoutHitFilterAssignmentCard({
  filterSummary,
  matchCount,
  onAddAssignment,
}: {
  filterSummary: string;
  matchCount: number;
  onAddAssignment: () => void;
}) {
  const t = useT();
  return (
    <article className="scout-hit-card scout-hit-card--filter-order">
      <button
        type="button"
        className="scout-hit-card-main"
        onClick={onAddAssignment}
        aria-label={t("scouting.assignments.add")}
      >
        <div className="scout-hit-card-top">
          <div className="scout-hit-card-assignment-icon" aria-hidden>
            <ClipboardList size={22} strokeWidth={2.25} />
          </div>
          <div className="scout-hit-card-head">
            <span className="scout-hit-card-name">{t("scouting.hits.filterOrderTitle")}</span>
            <span className="scout-hit-card-meta">{filterSummary}</span>
            <span className="scout-hit-card-club">
              {t("scouting.hits.filterOrderWeek", { count: matchCount })}
            </span>
          </div>
        </div>
        <div className="scout-hit-card-bottom scout-hit-card-assignment-foot">
          <span className="scout-hit-card-assignment-cta">{t("scouting.assignments.add")}</span>
        </div>
      </button>
    </article>
  );
}
