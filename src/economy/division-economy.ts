export const DIVISION_ECONOMY = {
  "regionalliga-nord": {
    tier: 3,
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
} as const;

export type DivisionEconomyId = keyof typeof DIVISION_ECONOMY;
