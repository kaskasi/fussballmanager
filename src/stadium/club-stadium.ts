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
export const FILL_RATE_MIN = 0.35;
export const FILL_RATE_MAX = 0.95;
/** Price sensitivity — prep for F7.5 fanbase curve. */
export const PRICE_ELASTICITY = 0.42;

const DEFAULT_REFERENCE = Object.fromEntries(
  defaultClubStadiumSeed().blocks.map((block) => [
    block.id,
    { ticket_price_eur: block.ticket_price_eur, fill_rate: block.fill_rate },
  ]),
) as Record<string, { ticket_price_eur: number; fill_rate: number }>;

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

function defaultClubStadiumSeed(): ClubStadium {
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

/** Default layout — totals ~8k seats and matches division economy ticket yield. */
export function defaultClubStadium(): ClubStadium {
  return defaultClubStadiumSeed();
}

export function referenceFillRate(blockId: string): number {
  return DEFAULT_REFERENCE[blockId]?.fill_rate ?? 0.72;
}

export function referenceTicketPrice(blockId: string): number {
  return DEFAULT_REFERENCE[blockId]?.ticket_price_eur ?? 18;
}

export function fillRateForTicketPrice(blockId: string, ticketPrice: number): number {
  const ref = DEFAULT_REFERENCE[blockId];
  if (!ref || ticketPrice <= 0) return FILL_RATE_MAX;
  const ratio = ticketPrice / ref.ticket_price_eur;
  const raw = ref.fill_rate / Math.pow(ratio, PRICE_ELASTICITY);
  return Math.min(FILL_RATE_MAX, Math.max(FILL_RATE_MIN, raw));
}

export function stadiumBlockAttendees(block: StadiumBlock): number {
  return Math.round(block.capacity * block.fill_rate);
}

export function fillRateDeltaFromReference(block: StadiumBlock): number {
  return block.fill_rate - referenceFillRate(block.id);
}

/** Heat color for pitch-plan zones: low fill = red, mid = amber, high = green. */
export function fillRateHeatColor(fillRate: number): string {
  const span = FILL_RATE_MAX - FILL_RATE_MIN;
  const normalized = span <= 0 ? 1 : (fillRate - FILL_RATE_MIN) / span;
  const clamped = Math.min(1, Math.max(0, normalized));
  const hue = clamped * 128;
  return `hsl(${hue.toFixed(1)} 58% 38%)`;
}

export function stadiumFromDivisionDefaults(divisionId: DivisionEconomyId): ClubStadium {
  const defaults = DIVISION_ECONOMY[divisionId].stadium_defaults;
  const stadium = defaultClubStadiumSeed();
  const scale = defaults.capacity / stadiumTotalCapacity(stadium);
  return {
    ...stadium,
    blocks: stadium.blocks.map((block) => {
      const ticket_price_eur = defaults.avg_ticket_eur;
      return {
        ...block,
        capacity: Math.round(block.capacity * scale),
        ticket_price_eur,
        fill_rate: fillRateForTicketPrice(block.id, ticket_price_eur),
      };
    }),
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
      const ticket_price_eur = Math.min(
        TICKET_PRICE_MAX,
        Math.max(TICKET_PRICE_MIN, block.ticket_price_eur + delta),
      );
      const fill_rate = fillRateForTicketPrice(block.id, ticket_price_eur);
      return { ...block, ticket_price_eur, fill_rate };
    }),
  };
}
