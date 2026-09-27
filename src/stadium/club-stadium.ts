import { DIVISION_ECONOMY, type DivisionEconomyId } from "../economy/division-economy.ts";

export type StadiumTier = "standing" | "seating" | "vip";

export interface StadiumBlock {
  id: string;
  name: string;
  tier: StadiumTier;
  capacity: number;
  ticket_price_eur: number;
  fill_rate: number;
}

export interface ClubStadium {
  name: string;
  blocks: StadiumBlock[];
}

export const TICKET_PRICE_MIN = 8;
export const TICKET_PRICE_MAX = 95;
export const TICKET_PRICE_STEP = 2;

const TIER_LABEL: Record<StadiumTier, string> = {
  standing: "Stehplatz",
  seating: "Sitzplatz",
  vip: "VIP",
};

const TIER_ICON: Record<StadiumTier, string> = {
  standing: "🧍",
  seating: "💺",
  vip: "🥂",
};

export function tierLabel(tier: StadiumTier): string {
  return TIER_LABEL[tier];
}

export function tierIcon(tier: StadiumTier): string {
  return TIER_ICON[tier];
}

/** Default layout — totals ~8k seats and matches division economy ticket yield. */
export function defaultClubStadium(): ClubStadium {
  return {
    name: "Nordstern Arena",
    blocks: [
      {
        id: "north",
        name: "Nordkurve",
        tier: "standing",
        capacity: 2_400,
        ticket_price_eur: 12,
        fill_rate: 0.85,
      },
      {
        id: "south",
        name: "Südkurve",
        tier: "standing",
        capacity: 2_200,
        ticket_price_eur: 12,
        fill_rate: 0.82,
      },
      {
        id: "west",
        name: "Westtribüne",
        tier: "seating",
        capacity: 2_200,
        ticket_price_eur: 22,
        fill_rate: 0.68,
      },
      {
        id: "east",
        name: "Osttribüne",
        tier: "seating",
        capacity: 800,
        ticket_price_eur: 28,
        fill_rate: 0.55,
      },
      {
        id: "vip",
        name: "Business-Loge",
        tier: "vip",
        capacity: 400,
        ticket_price_eur: 65,
        fill_rate: 0.72,
      },
    ],
  };
}

export function stadiumFromDivisionDefaults(divisionId: DivisionEconomyId): ClubStadium {
  const defaults = DIVISION_ECONOMY[divisionId].stadium_defaults;
  const stadium = defaultClubStadium();
  const scale = defaults.capacity / stadiumTotalCapacity(stadium);
  return {
    ...stadium,
    blocks: stadium.blocks.map((block) => ({
      ...block,
      capacity: Math.round(block.capacity * scale),
      ticket_price_eur: defaults.avg_ticket_eur,
      fill_rate: defaults.fill_rate,
    })),
  };
}

export function stadiumTotalCapacity(stadium: ClubStadium): number {
  return stadium.blocks.reduce((sum, block) => sum + block.capacity, 0);
}

export function stadiumBlockIncome(block: StadiumBlock): number {
  return block.capacity * block.fill_rate * block.ticket_price_eur;
}

export function stadiumMatchdayIncome(stadium: ClubStadium): number {
  return Math.round(stadium.blocks.reduce((sum, block) => sum + stadiumBlockIncome(block), 0));
}

export function stadiumAverageTicket(stadium: ClubStadium): number {
  const sold = stadium.blocks.reduce((sum, block) => sum + block.capacity * block.fill_rate, 0);
  if (sold <= 0) return 0;
  return stadiumMatchdayIncome(stadium) / sold;
}

export function adjustBlockTicketPrice(
  stadium: ClubStadium,
  blockId: string,
  delta: number,
): ClubStadium {
  return {
    ...stadium,
    blocks: stadium.blocks.map((block) => {
      if (block.id !== blockId) return block;
      const next = Math.min(
        TICKET_PRICE_MAX,
        Math.max(TICKET_PRICE_MIN, block.ticket_price_eur + delta),
      );
      return { ...block, ticket_price_eur: next };
    }),
  };
}
