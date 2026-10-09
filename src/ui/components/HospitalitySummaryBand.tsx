/** WIREFRAME: PRD 14.7 — Hotel/Restaurant Auslastung (F7.3) */
import { Clock, Flame } from "lucide-react";
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
