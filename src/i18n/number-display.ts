import { getLocale } from "./index.ts";
import { localeBcp47 } from "./locale-id.ts";

/** Whole number with the active language's grouping (3.125 · 3,125). */
export function formatWholeNumber(value: number): string {
  return new Intl.NumberFormat(localeBcp47(getLocale()), { maximumFractionDigits: 0 }).format(value);
}

/** Exact euro amount, e.g. a weekly wage: "€ 3.125" (de) · "€ 3,125" (en). */
export function formatEuroWhole(value: number): string {
  return `€ ${formatWholeNumber(value)}`;
}
