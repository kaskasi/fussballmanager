import { DIVISION_ECONOMY, type DivisionEconomyId } from "../economy/division-economy.ts";
import { precinctFillRateBonus } from "./precinct-effects.ts";
import { normalizePrecinct, type PrecinctState } from "./precinct.ts";
import type { SponsorDeal } from "./sponsor-deals.ts";
import {
  rebuildStadiumWithUpgrades,
  stadiumFanbaseMultiplier,
  stadiumFillRateBonus,
} from "./stadium-upgrades.ts";

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
  /** F7.5 — 25–95, drives baseline attendance before ticket pricing. */
  fanbase?: number;
  fanbase_last_delta?: number;
  /** F7.2 — purchased upgrade levels keyed by upgrade id. */
  upgrade_levels?: Record<string, number>;
  /** F6.5 — board and shirt contracts. */
  sponsor_deals?: SponsorDeal[];
  /** Gelände-Raster (F7.3 furniture). */
  precinct?: PrecinctState;
}

export const DEFAULT_FANBASE = 52;

export const TICKET_PRICE_MIN = 8;
export const TICKET_PRICE_MAX = 95;
export const TICKET_PRICE_STEP = 2;
export const FILL_RATE_MIN = 0.35;
export const FILL_RATE_MAX = 0.95;
/** Price sensitivity — prep for F7.5 fanbase curve. */
export const PRICE_ELASTICITY = 0.42;

export const STADIUM_BASE_BLOCKS: StadiumBlock[] = [
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
];

const DEFAULT_REFERENCE = Object.fromEntries(
  STADIUM_BASE_BLOCKS.map((block) => [
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
  return normalizeClubStadium({
    name: "Nordstern Arena",
    fanbase: DEFAULT_FANBASE,
    upgrade_levels: {},
    blocks: STADIUM_BASE_BLOCKS.map((block) => ({ ...block })),
  });
}

/** Default layout — totals ~8k seats and matches division economy ticket yield. */
export function defaultClubStadium(): ClubStadium {
  return defaultClubStadiumSeed();
}

export function normalizeClubStadium(stadium: ClubStadium): ClubStadium {
  const fanbase = stadium.fanbase ?? DEFAULT_FANBASE;
  return applyStadiumFillRates(
    rebuildStadiumWithUpgrades(
      {
        ...stadium,
        fanbase,
        upgrade_levels: stadium.upgrade_levels ?? {},
        sponsor_deals: stadium.sponsor_deals ?? [],
        precinct: normalizePrecinct(stadium.precinct),
      },
      STADIUM_BASE_BLOCKS,
    ),
  );
}

export function referenceFillRate(blockId: string): number {
  return DEFAULT_REFERENCE[blockId]?.fill_rate ?? 0.72;
}

export function referenceTicketPrice(blockId: string): number {
  return DEFAULT_REFERENCE[blockId]?.ticket_price_eur ?? 18;
}

export function fillRateForTicketPrice(
  blockId: string,
  ticketPrice: number,
  fanbase: number = DEFAULT_FANBASE,
  options?: { fillBonus?: number; fanbaseMultiplier?: number },
): number {
  const ref = DEFAULT_REFERENCE[blockId];
  if (!ref || ticketPrice <= 0) return FILL_RATE_MAX;
  const fanbaseScale = options?.fanbaseMultiplier ?? 1;
  const fanbaseMultiplier =
    (1 + (normalizeFanbaseIndex(fanbase) - DEFAULT_FANBASE) * 0.004) * fanbaseScale;
  const adjustedRef = ref.fill_rate * fanbaseMultiplier;
  const ratio = ticketPrice / ref.ticket_price_eur;
  const raw = adjustedRef / Math.pow(ratio, PRICE_ELASTICITY) + (options?.fillBonus ?? 0);
  return Math.max(FILL_RATE_MIN, raw);
}

function normalizeFanbaseIndex(value: number): number {
  return Math.min(95, Math.max(25, value));
}

export function applyStadiumFillRates(stadium: ClubStadium): ClubStadium {
  const fanbase = stadium.fanbase ?? DEFAULT_FANBASE;
  const fillBonus = stadiumFillRateBonus(stadium) + precinctFillRateBonus(stadium.precinct);
  const fanbaseMultiplier = stadiumFanbaseMultiplier(stadium);
  return {
    ...stadium,
    fanbase,
    blocks: stadium.blocks.map((block) => ({
      ...block,
      fill_rate: fillRateForTicketPrice(block.id, block.ticket_price_eur, fanbase, {
        fillBonus,
        fanbaseMultiplier,
      }),
    })),
  };
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
        fill_rate: fillRateForTicketPrice(block.id, ticket_price_eur, DEFAULT_FANBASE),
      };
    }),
    fanbase: DEFAULT_FANBASE,
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
  return applyStadiumFillRates({
    ...stadium,
    blocks: stadium.blocks.map((block) => {
      if (block.id !== blockId) return block;
      const ticket_price_eur = Math.min(
        TICKET_PRICE_MAX,
        Math.max(TICKET_PRICE_MIN, block.ticket_price_eur + delta),
      );
      return { ...block, ticket_price_eur };
    }),
  });
}
