/** WIREFRAME: PRD 09 Screen 3a / design.md §9.4 — Scout-Job abgeschlossen */
import { MapPin, Radar } from "lucide-react";
import type { ScoutJobCompleteNotice } from "../../scouting/scout-job-postfach.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { ScoutConfidenceIcon } from "./ScoutConfidenceIcon.tsx";
import { confidenceBucket } from "../../scouting/market-list.ts";

export function ScoutJobInboxCard({
  notice,
  postIndex,
  postTotal,
  onDismiss,
  onOpenScoutingNetwork,
  onOpenScoutingHits,
  compact = false,
}: {
  notice: ScoutJobCompleteNotice;
  postIndex: number;
  postTotal: number;
  onDismiss: () => void;
  onOpenScoutingNetwork?: () => void;
  onOpenScoutingHits?: () => void;
  compact?: boolean;
}) {
  useT();
  const isRegion = notice.kind === "region_complete";

  return (
    <section className={compact ? "inbox-detail inbox-scout-job-inline" : "inbox-card inbox-card-scout-job"}>
      <div className="inbox-story">
        {!compact ? (
          <p className="inbox-post-count">
            {t("postfach.scoutJob.postCount", { index: postIndex, total: postTotal })}
          </p>
        ) : null}
        <p className="inbox-scout-job-head">
          {isRegion ? (
            <Radar size={18} aria-hidden />
          ) : (
            <MapPin size={18} aria-hidden />
          )}
          <strong>
            {isRegion
              ? t("postfach.scoutJob.regionTitle", { label: notice.zoneLabel ?? "" })
              : t("postfach.scoutJob.clubTitle", { club: notice.clubName ?? "" })}
          </strong>
        </p>
        <p className="inbox-scout-job-lead">
          {isRegion
            ? t("postfach.scoutJob.regionLead", {
                tier: notice.regionTier ?? 0,
                max: notice.regionTierMax ?? 3,
                count: notice.clubsInDirectory ?? 0,
              })
            : t("postfach.scoutJob.clubLead", {
                count: notice.playersAdded ?? 0,
              })}
        </p>
        {!compact && !isRegion && notice.highlights && notice.highlights.length > 0 ? (
          <ul className="inbox-scout-job-highlights">
            {notice.highlights.map((row) => (
              <li key={row.playerId}>
                <ScoutConfidenceIcon bucket={confidenceBucket(45)} size={14} />
                <span>
                  {row.playerName} · {row.position} · ~{row.estimatedCa}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="inbox-actions inbox-scout-job-actions">
        {isRegion && onOpenScoutingNetwork ? (
          <button type="button" className="inbox-action" onClick={onOpenScoutingNetwork}>
            {t("postfach.scoutJob.ctaNetwork")}
          </button>
        ) : null}
        {!isRegion && onOpenScoutingHits ? (
          <button type="button" className="inbox-action" onClick={onOpenScoutingHits}>
            {t("postfach.scoutJob.ctaHits")}
          </button>
        ) : null}
        <button type="button" className="inbox-action is-primary" onClick={onDismiss}>
          {t("postfach.scoutJob.dismiss")}
        </button>
      </div>
    </section>
  );
}
