/** WIREFRAME: PRD 14.7 — Hotel/Restaurant Auslastung (F7.3) */
import { Clock, Flame, Hotel, UtensilsCrossed } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import type { HospitalityPreview } from "../../stadium/hospitality.ts";
import type { PrecinctBuilding } from "../../stadium/precinct.ts";
import { useT } from "../../i18n/react.ts";

/** Compact live stats for the Gelände selection / CTA row. */
export function HospitalityBuildingLiveStat({
  building,
  preview,
  isHomeMatchWeek,
}: {
  building: PrecinctBuilding;
  preview: HospitalityPreview;
  isHomeMatchWeek: boolean;
}) {
  const t = useT();
  if (building === "hotel" && preview.hotel) {
    const hotel = preview.hotel;
    return (
      <span className="stadium-precinct-detail-live">
        {t("precinct.hospitality.occupancy", { pct: hotel.occupancyPct })}
        {" · "}
        {t("precinct.hospitality.weeklyIncome", {
          amount: formatClubCash(hotel.weeklyIncome),
        })}
        {!hotel.docked ? ` · ${t("precinct.hospitality.notDocked")}` : null}
        {hotel.docked && isHomeMatchWeek ? ` · ${t("precinct.hospitality.homeBoost")}` : null}
      </span>
    );
  }
  if (building === "restaurant" && preview.restaurant) {
    const restaurant = preview.restaurant;
    return (
      <span className="stadium-precinct-detail-live">
        {restaurant.viral ? (
          <>
            <Flame size={12} strokeWidth={2.5} aria-hidden /> {t("precinct.hospitality.viral")}{" "}
          </>
        ) : null}
        {t("precinct.hospitality.occupancy", { pct: restaurant.occupancyPct })}
        {" · "}
        {t("precinct.hospitality.weeklyIncome", {
          amount: formatClubCash(restaurant.weeklyIncome),
        })}
        {!restaurant.docked ? ` · ${t("precinct.hospitality.notDocked")}` : null}
        {restaurant.overtimeDueThisWeek ? (
          <>
            {" · "}
            <Clock size={12} strokeWidth={2.5} aria-hidden /> {t("precinct.hospitality.overtime")}
          </>
        ) : null}
      </span>
    );
  }
  return null;
}

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
