import {
  applyStadiumFillRates,
  type ClubStadium,
} from "./club-stadium.ts";

export const DEFAULT_KIOSK_UNIT_PRICE_EUR = 4.5;
export const DEFAULT_BEER_UNIT_PRICE_EUR = 5;
export const CONCESSION_PRICE_ELASTICITY = 0.4;
export const CONCESSION_PRICE_STEP = 0.5;
export const KIOSK_UNIT_PRICE_MIN = 2;
export const KIOSK_UNIT_PRICE_MAX = 12;
export const BEER_UNIT_PRICE_MIN = 2;
export const BEER_UNIT_PRICE_MAX = 10;

export type ConcessionPriceKind = "kiosk" | "beer";

export interface ConcessionUnitPrices {
  kiosk_unit_price_eur: number;
  beer_unit_price_eur: number;
}

export function clampConcessionUnitPrice(kind: ConcessionPriceKind, price: number): number {
  const min = kind === "kiosk" ? KIOSK_UNIT_PRICE_MIN : BEER_UNIT_PRICE_MIN;
  const max = kind === "kiosk" ? KIOSK_UNIT_PRICE_MAX : BEER_UNIT_PRICE_MAX;
  if (!Number.isFinite(price)) {
    return kind === "kiosk" ? DEFAULT_KIOSK_UNIT_PRICE_EUR : DEFAULT_BEER_UNIT_PRICE_EUR;
  }
  const stepped = Math.round(price / CONCESSION_PRICE_STEP) * CONCESSION_PRICE_STEP;
  return Math.min(max, Math.max(min, stepped));
}

export function resolveConcessionPrices(
  stadium: Pick<ClubStadium, "kiosk_unit_price_eur" | "beer_unit_price_eur"> | undefined,
): ConcessionUnitPrices {
  return {
    kiosk_unit_price_eur: clampConcessionUnitPrice(
      "kiosk",
      stadium?.kiosk_unit_price_eur ?? DEFAULT_KIOSK_UNIT_PRICE_EUR,
    ),
    beer_unit_price_eur: clampConcessionUnitPrice(
      "beer",
      stadium?.beer_unit_price_eur ?? DEFAULT_BEER_UNIT_PRICE_EUR,
    ),
  };
}

/** Demand multiplier when unit price moves away from reference (deterministic). */
export function concessionDemandMultiplier(
  unitPrice: number,
  referenceUnitPrice: number,
  elasticity = CONCESSION_PRICE_ELASTICITY,
): number {
  if (referenceUnitPrice <= 0 || unitPrice <= 0) return 1;
  const capped = Math.min(
    2.5,
    Math.max(0.35, Math.pow(referenceUnitPrice / unitPrice, elasticity)),
  );
  return capped;
}

/** Apply unit price and elasticity to throughput-based margin income. */
export function applyConcessionPriceToIncome(
  baseIncomeAtReference: number,
  unitPrice: number,
  referenceUnitPrice: number,
  elasticity = CONCESSION_PRICE_ELASTICITY,
): number {
  if (baseIncomeAtReference <= 0) return 0;
  const demand = concessionDemandMultiplier(unitPrice, referenceUnitPrice, elasticity);
  const revenueScale = unitPrice / referenceUnitPrice;
  return Math.round(baseIncomeAtReference * revenueScale * demand);
}

export function adjustConcessionPrice(
  stadium: ClubStadium,
  kind: ConcessionPriceKind,
  delta: number,
): ClubStadium {
  const prices = resolveConcessionPrices(stadium);
  const field = kind === "kiosk" ? "kiosk_unit_price_eur" : "beer_unit_price_eur";
  const current = prices[field];
  return applyStadiumFillRates({
    ...stadium,
    [field]: clampConcessionUnitPrice(kind, current + delta),
  });
}
