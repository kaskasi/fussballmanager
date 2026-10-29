import type { DivisionId } from "../sim/league-pyramid.ts";

export interface DivisionEconomy {
  label: string;
  sponsorship_weekly: number;
  tv_weekly: number;
  staff_wages_weekly: number;
  maintenance_weekly: number;
  stadium_defaults: { capacity: number; fill_rate: number; avg_ticket_eur: number };
  prize_by_place: readonly number[];
  tv_season_bonus: readonly number[];
}

/** Per-division money (PRD 11). The tier number lives in the pyramid registry (PRD 32). */
export const DIVISION_ECONOMY: Record<DivisionId, DivisionEconomy> = {
  "regionalliga-nord": {
    label: "Regionalliga Nord",
    sponsorship_weekly: 55_000,
    tv_weekly: 12_000,
    staff_wages_weekly: 18_000,
    maintenance_weekly: 9_000,
    stadium_defaults: {
      capacity: 8_000,
      fill_rate: 0.72,
      avg_ticket_eur: 18,
    },
    prize_by_place: [0, 180_000, 120_000, 80_000, 50_000, 30_000, 15_000],
    tv_season_bonus: [0, 250_000, 180_000, 120_000, 80_000, 50_000, 25_000],
  },
  "oberliga-nord": {
    label: "Oberliga Nord",
    sponsorship_weekly: 28_000,
    tv_weekly: 4_500,
    staff_wages_weekly: 11_000,
    maintenance_weekly: 6_000,
    stadium_defaults: {
      capacity: 4_500,
      fill_rate: 0.62,
      avg_ticket_eur: 12,
    },
    prize_by_place: [0, 45_000, 32_000, 22_000, 14_000, 9_000, 5_000],
    tv_season_bonus: [0, 55_000, 38_000, 24_000, 15_000, 10_000, 5_000],
  },
};

/** Alias kept for existing imports; the registry owns the union (PRD 32 §4). */
export type DivisionEconomyId = DivisionId;
