import { dealForSlot, SPONSOR_SLOTS, type SponsorDeal } from "./sponsor-deals.ts";
import { findBuildingCell, type PrecinctState } from "./precinct.ts";

export function stadiumInventoryCaption(
  deals: readonly SponsorDeal[] | undefined,
  season: number,
  precinct?: PrecinctState,
): string {
  const boardsFree = SPONSOR_SLOTS.filter(
    (slot) => slot.kind === "board" && !dealForSlot(deals, slot.id, season),
  ).length;
  const shirtEmpty = !dealForSlot(deals, "shirt", season);
  const kioskEmpty = !precinct || !findBuildingCell(precinct, "kiosk");
  return [
    `noch ${boardsFree} Banden frei`,
    shirtEmpty ? "Trikot ohne Brustlogo" : "Trikot mit Brustlogo",
    kioskEmpty ? "Wurstbude unbesetzt" : "Wurstbude offen",
  ].join(" · ");
}
