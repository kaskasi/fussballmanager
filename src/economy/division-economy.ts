export const DIVISION_ECONOMY = {
  "regionalliga-nord": {
    tier: 3,
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
    tier: 4,
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
} as const;

export type DivisionEconomyId = keyof typeof DIVISION_ECONOMY;
