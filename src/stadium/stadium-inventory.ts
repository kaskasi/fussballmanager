import { dealForSlot, unlockedSponsorSlots, type SponsorDeal } from "./sponsor-deals.ts";
import { countBuilding, type PrecinctState } from "./precinct.ts";

export function stadiumInventoryCaption(
  deals: readonly SponsorDeal[] | undefined,
  season: number,
  precinct?: PrecinctState,
  upgradeLevels?: Record<string, number>,
): string {
  const boardsFree = unlockedSponsorSlots(upgradeLevels).filter(
    (slot) => slot.kind === "board" && !dealForSlot(deals, slot.id, season),
  ).length;
  const shirtEmpty = !dealForSlot(deals, "shirt", season);
  const kioskEmpty = !precinct || countBuilding(precinct, "kiosk") <= 0;
  return [
    `noch ${boardsFree} Banden frei`,
    shirtEmpty ? "Trikot ohne Brustlogo" : "Trikot mit Brustlogo",
    kioskEmpty ? "Wurstbude unbesetzt" : "Wurstbude offen",
  ].join(" · ");
}
