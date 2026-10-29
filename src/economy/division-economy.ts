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
  // PRD 32 §6 — tiers 1–3: starting values, checked against the club-economy tests.
  "meisterliga": {
    label: "Meisterliga",
    sponsorship_weekly: 1_400_000,
    tv_weekly: 1_600_000,
    staff_wages_weekly: 220_000,
    maintenance_weekly: 110_000,
    stadium_defaults: {
      capacity: 50_000,
      fill_rate: 0.88,
      avg_ticket_eur: 38,
    },
    prize_by_place: [0, 4_000_000, 2_800_000, 2_000_000, 1_300_000, 800_000, 400_000],
    tv_season_bonus: [0, 6_000_000, 4_200_000, 3_000_000, 2_000_000, 1_200_000, 600_000],
  },
  "meisterliga-2": {
    label: "Meisterliga 2",
    sponsorship_weekly: 450_000,
    tv_weekly: 380_000,
    staff_wages_weekly: 90_000,
    maintenance_weekly: 45_000,
    stadium_defaults: {
      capacity: 28_000,
      fill_rate: 0.75,
      avg_ticket_eur: 28,
    },
    prize_by_place: [0, 1_500_000, 1_050_000, 750_000, 500_000, 300_000, 150_000],
    tv_season_bonus: [0, 2_000_000, 1_400_000, 1_000_000, 650_000, 400_000, 200_000],
  },
  "nationalliga": {
    label: "Nationalliga",
    sponsorship_weekly: 160_000,
    tv_weekly: 60_000,
    staff_wages_weekly: 35_000,
    maintenance_weekly: 18_000,
    stadium_defaults: {
      capacity: 15_000,
      fill_rate: 0.7,
      avg_ticket_eur: 22,
    },
    prize_by_place: [0, 600_000, 420_000, 300_000, 200_000, 120_000, 60_000],
    tv_season_bonus: [0, 700_000, 500_000, 350_000, 230_000, 140_000, 70_000],
  },
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
