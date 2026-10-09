/** WIREFRAME: PRD 14.7 — Hotel/Restaurant Auslastung (F7.3) */
import { Clock, Flame, Hotel, UtensilsCrossed } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import type { HospitalityPreview } from "../../stadium/hospitality.ts";
import { useT } from "../../i18n/react.ts";

export function HospitalitySummaryBand({
  preview,
  isHomeMatchWeek,
}: {
  preview: HospitalityPreview;
  isHomeMatchWeek: boolean;
}) {
  const t = useT();
  if (!preview.hotel && !preview.restaurant) return null;

  return (
    <section className="hospitality-summary" aria-label={t("precinct.hospitality.title")}>
      {preview.hotel ? (
        <article
          className={`hospitality-summary-card${preview.hotel.docked ? "" : " is-warn"}`}
        >
          <h3>
            <Hotel size={18} strokeWidth={2.5} aria-hidden />
            {t("precinct.hospitality.hotel")}
          </h3>
          <p className="hospitality-summary-stat">
            {t("precinct.hospitality.occupancy", { pct: preview.hotel.occupancyPct })}
            {" · "}
            {t("precinct.hospitality.weeklyIncome", {
              amount: formatClubCash(preview.hotel.weeklyIncome),
            })}
          </p>
          {!preview.hotel.docked ? (
            <p className="hospitality-summary-note">{t("precinct.hospitality.notDocked")}</p>
          ) : isHomeMatchWeek ? (
            <p className="hospitality-summary-note">{t("precinct.hospitality.homeBoost")}</p>
          ) : null}
        </article>
      ) : null}
      {preview.restaurant ? (
        <article
          className={`hospitality-summary-card${preview.restaurant.docked ? "" : " is-warn"}`}
        >
          <h3>
            <UtensilsCrossed size={18} strokeWidth={2.5} aria-hidden />
            {t("precinct.hospitality.restaurant")}
            {preview.restaurant.viral ? (
              <span className="hospitality-summary-badge">
                <Flame size={14} aria-hidden /> {t("precinct.hospitality.viral")}
              </span>
            ) : null}
          </h3>
          <p className="hospitality-summary-stat">
            {t("precinct.hospitality.occupancy", { pct: preview.restaurant.occupancyPct })}
            {" · "}
            {t("precinct.hospitality.weeklyIncome", {
              amount: formatClubCash(preview.restaurant.weeklyIncome),
            })}
          </p>
          {!preview.restaurant.docked ? (
            <p className="hospitality-summary-note">{t("precinct.hospitality.notDocked")}</p>
          ) : null}
          {preview.restaurant.overtimeDueThisWeek ? (
            <p className="hospitality-summary-note">
              <Clock size={14} aria-hidden /> {t("precinct.hospitality.overtime")}
            </p>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
