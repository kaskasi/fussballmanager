export type SponsorStand = "north" | "west" | "east" | "south" | "pitch";
export type SponsorSlotKind = "board" | "shirt";

export interface SponsorSlot {
  id: string;
  kind: SponsorSlotKind;
  stand: SponsorStand;
  label: string;
}

export interface SponsorDeal {
  slotId: string;
  brand: string;
  brandId?: string;
  seasons: number;
  weeklyAmount: number;
  bonusTopScorer: boolean;
  bonusLeagueTitle: boolean;
  signedSeason: number;
}

export interface SponsorOffer {
  brandId: string;
  seasons: number;
  weeklyAmount: number;
  bonusTopScorer: boolean;
  bonusLeagueTitle: boolean;
}

export type SponsorBonusStance = "want" | "ok" | "hate";

export interface SponsorBrand {
  id: string;
  name: string;
  icon: string;
  /** Weekly multiplier vs slot base. */
  generosity: number;
  preferSeasons: number;
  bonusStance: SponsorBonusStance;
  hint: string;
}

export const SPONSOR_BONUS_PAYOUT = 1_000_000;
export const SPONSOR_SEASON_MIN = 1;
export const SPONSOR_SEASON_MAX = 4;

export const BASE_SPONSOR_SLOTS: readonly SponsorSlot[] = [
  { id: "board_north_a", kind: "board", stand: "north", label: "Nordkurve A" },
  { id: "board_north_b", kind: "board", stand: "north", label: "Nordkurve B" },
  { id: "board_west", kind: "board", stand: "west", label: "Westtribüne" },
  { id: "board_east", kind: "board", stand: "east", label: "Osttribüne" },
  { id: "board_south_a", kind: "board", stand: "south", label: "Südkurve A" },
  { id: "board_south_b", kind: "board", stand: "south", label: "Südkurve B" },
  { id: "shirt", kind: "shirt", stand: "pitch", label: "Brustlogo" },
];

/** Extra boards unlocked by F7.2 standing/seating expansion. */
export const EXPANSION_BOARD_SLOTS: readonly {
  upgradeId: string;
  minLevel: number;
  slot: SponsorSlot;
}[] = [
  { upgradeId: "standing_expansion", minLevel: 1, slot: { id: "board_north_c", kind: "board", stand: "north", label: "Nordkurve C" } },
  { upgradeId: "standing_expansion", minLevel: 1, slot: { id: "board_south_c", kind: "board", stand: "south", label: "Südkurve C" } },
  { upgradeId: "standing_expansion", minLevel: 2, slot: { id: "board_north_d", kind: "board", stand: "north", label: "Nordkurve D" } },
  { upgradeId: "standing_expansion", minLevel: 2, slot: { id: "board_south_d", kind: "board", stand: "south", label: "Südkurve D" } },
  { upgradeId: "seating_expansion", minLevel: 1, slot: { id: "board_west_b", kind: "board", stand: "west", label: "Westtribüne B" } },
  { upgradeId: "seating_expansion", minLevel: 1, slot: { id: "board_east_b", kind: "board", stand: "east", label: "Osttribüne B" } },
];

/** All known slots (for lookups). UI uses `unlockedSponsorSlots`. */
export const SPONSOR_SLOTS: readonly SponsorSlot[] = [
  ...BASE_SPONSOR_SLOTS,
  ...EXPANSION_BOARD_SLOTS.map((entry) => entry.slot),
];

export function unlockedSponsorSlots(
  upgradeLevels?: Record<string, number>,
): SponsorSlot[] {
  const extra = EXPANSION_BOARD_SLOTS.filter(
    (entry) => (upgradeLevels?.[entry.upgradeId] ?? 0) >= entry.minLevel,
  ).map((entry) => entry.slot);
  return [...BASE_SPONSOR_SLOTS, ...extra];
}

export function sponsorSlotsForStand(
  stand: SponsorStand,
  upgradeLevels?: Record<string, number>,
): SponsorSlot[] {
  return unlockedSponsorSlots(upgradeLevels).filter(
    (slot) => slot.kind === "board" && slot.stand === stand,
  );
}

const SLOT_WEEKLY_BASE: Record<string, number> = {
  board_north_a: 9_000,
  board_north_b: 9_000,
  board_north_c: 8_000,
  board_north_d: 7_500,
  board_west: 7_000,
  board_west_b: 6_200,
  board_east: 7_000,
  board_east_b: 6_200,
  board_south_a: 8_000,
  board_south_b: 8_000,
  board_south_c: 7_200,
  board_south_d: 6_800,
  shirt: 22_000,
};

export const SPONSOR_BRANDS: readonly SponsorBrand[] = [
  {
    id: "kuestenbraeu",
    name: "Küstenbräu",
    icon: "🍺",
    generosity: 1.12,
    preferSeasons: 2,
    bonusStance: "hate",
    hint: "Zahlt gut — keine Extra-Millionen.",
  },
  {
    id: "nordlicht",
    name: "Nordlicht",
    icon: "⚡",
    generosity: 1.0,
    preferSeasons: 2,
    bonusStance: "ok",
    hint: "Solide, unkompliziert.",
  },
  {
    id: "heidewerk",
    name: "Heidewerk",
    icon: "🪵",
    generosity: 0.86,
    preferSeasons: 4,
    bonusStance: "want",
    hint: "Lange Bindung, will Erfolg auf der Bande.",
  },
  {
    id: "ostsee-kaffee",
    name: "Ostsee-Kaffee",
    icon: "☕",
    generosity: 0.94,
    preferSeasons: 3,
    bonusStance: "want",
    hint: "Will gesehen werden, wenn's läuft.",
  },
  {
    id: "hanse-reifen",
    name: "Hanse-Reifen",
    icon: "🛞",
    generosity: 1.22,
    preferSeasons: 3,
    bonusStance: "hate",
    hint: "Dickes Wochenhonorar, null Staffel.",
  },
  {
    id: "elb-stahl",
    name: "Elb-Stahl",
    icon: "⚙️",
    generosity: 1.08,
    preferSeasons: 4,
    bonusStance: "want",
    hint: "Vier Jahre, mit Pokal-Bonus.",
  },
  {
    id: "frischwerk",
    name: "Frischwerk",
    icon: "🥬",
    generosity: 0.72,
    preferSeasons: 1,
    bonusStance: "ok",
    hint: "Kurz und günstig.",
  },
];

export function sponsorBrandById(brandId: string | undefined): SponsorBrand | undefined {
  if (!brandId) return undefined;
  return SPONSOR_BRANDS.find((brand) => brand.id === brandId || brand.name === brandId);
}

export function sponsorBrandKey(deal: Pick<SponsorDeal, "brand" | "brandId">): string {
  return deal.brandId ?? deal.brand;
}

export function takenSponsorBrandKeys(
  deals: readonly SponsorDeal[] | undefined,
  season: number,
  exceptSlotId?: string,
): Set<string> {
  const keys = new Set<string>();
  for (const deal of activeSponsorDeals(deals, season)) {
    if (exceptSlotId && deal.slotId === exceptSlotId) continue;
    keys.add(sponsorBrandKey(deal));
  }
  return keys;
}

export function dealForSlot(
  deals: readonly SponsorDeal[] | undefined,
  slotId: string,
  season: number,
): SponsorDeal | undefined {
  return (deals ?? []).find(
    (deal) => deal.slotId === slotId && deal.signedSeason + deal.seasons > season,
  );
}

export function activeSponsorDeals(
  deals: readonly SponsorDeal[] | undefined,
  season: number,
): SponsorDeal[] {
  return (deals ?? []).filter((deal) => deal.signedSeason + deal.seasons > season);
}

export function sponsorWeeklyCap(slotId: string, offer: SponsorOffer): number {
  const base = SLOT_WEEKLY_BASE[slotId] ?? 7_000;
  const generosity = sponsorBrandById(offer.brandId)?.generosity ?? 1;
  const duration = 1 + 0.12 * (offer.seasons - 1);
  const bonuses = Number(offer.bonusTopScorer) + Number(offer.bonusLeagueTitle);
  const bonusFactor = 1 - 0.12 * bonuses;
  return Math.round(base * generosity * duration * bonusFactor);
}

/** Upper slider bound — above every brand cap, so over-asking is possible. */
export function sponsorAskMax(slotId: string, seasons: number): number {
  const base = SLOT_WEEKLY_BASE[slotId] ?? 7_000;
  return Math.round(base * 1.55 * (1 + 0.12 * (seasons - 1)));
}

export function firstOpenSponsorBrand(
  deals: readonly SponsorDeal[] | undefined,
  season: number,
  exceptSlotId?: string,
): SponsorBrand {
  const taken = takenSponsorBrandKeys(deals, season, exceptSlotId);
  return (
    SPONSOR_BRANDS.find((brand) => !taken.has(brand.id) && !taken.has(brand.name)) ??
    SPONSOR_BRANDS[0] ?? {
      id: "nordlicht",
      name: "Nordlicht",
      icon: "⚡",
      generosity: 1,
      preferSeasons: 2,
      bonusStance: "ok",
      hint: "",
    }
  );
}

export function defaultSponsorOffer(slotId: string, brandId?: string): SponsorOffer {
  const brand = sponsorBrandById(brandId) ?? SPONSOR_BRANDS[0]!;
  const draft: SponsorOffer = {
    brandId: brand.id,
    seasons: brand.preferSeasons,
    weeklyAmount: 0,
    bonusTopScorer: brand.bonusStance === "want",
    bonusLeagueTitle: false,
  };
  const cap = sponsorWeeklyCap(slotId, draft);
  return { ...draft, weeklyAmount: Math.round(cap * 1.12) };
}

export function evaluateSponsorOffer(
  slotId: string,
  offer: SponsorOffer,
): { accepted: boolean; reason: string } {
  const brand = sponsorBrandById(offer.brandId);
  if (!brand) return { accepted: false, reason: "Keine Marke gewählt." };
  if (Math.abs(offer.seasons - brand.preferSeasons) >= 2) {
    return {
      accepted: false,
      reason: `${brand.name} will ${brand.preferSeasons} Saisons, nicht ${offer.seasons}.`,
    };
  }
  if (brand.bonusStance === "hate" && (offer.bonusTopScorer || offer.bonusLeagueTitle)) {
    return { accepted: false, reason: `${brand.name} zahlt keine Erfolgsstaffel.` };
  }
  if (brand.bonusStance === "want" && !offer.bonusTopScorer && !offer.bonusLeagueTitle) {
    return { accepted: false, reason: `${brand.name} will Torjäger oder Meister auf der Bande.` };
  }
  const cap = sponsorWeeklyCap(slotId, offer);
  const floor = Math.max(1_000, Math.round(cap * 0.5));
  if (offer.weeklyAmount > cap) {
    return {
      accepted: false,
      reason: `Zu teuer. ${brand.name} zahlt höchstens ${formatWeeklyAsk(cap)}.`,
    };
  }
  if (offer.weeklyAmount < floor) {
    return { accepted: false, reason: `Zu knausrig — ${brand.name} fühlt sich unter Wert.` };
  }
  if (offer.weeklyAmount >= cap * 0.88) {
    return { accepted: true, reason: "Letztes Wort. Handschlag." };
  }
  if (offer.weeklyAmount <= cap * 0.58) {
    return { accepted: true, reason: "Knausrig, aber okay." };
  }
  return { accepted: true, reason: "Handschlag." };
}

export function signSponsorDeal(
  deals: readonly SponsorDeal[] | undefined,
  slotId: string,
  season: number,
  offer: SponsorOffer,
): SponsorDeal[] {
  const brand = sponsorBrandById(offer.brandId);
  const without = (deals ?? []).filter((deal) => deal.slotId !== slotId);
  return [
    ...without,
    {
      slotId,
      brand: brand?.name ?? "Nordlicht",
      brandId: brand?.id ?? offer.brandId,
      seasons: offer.seasons,
      weeklyAmount: offer.weeklyAmount,
      bonusTopScorer: offer.bonusTopScorer,
      bonusLeagueTitle: offer.bonusLeagueTitle,
      signedSeason: season,
    },
  ];
}

export function weeklySponsorInventoryIncome(
  deals: readonly SponsorDeal[] | undefined,
  season: number,
): number {
  return activeSponsorDeals(deals, season).reduce((sum, deal) => sum + deal.weeklyAmount, 0);
}

export function expireSponsorDeals(
  deals: readonly SponsorDeal[] | undefined,
  season: number,
): SponsorDeal[] {
  return activeSponsorDeals(deals, season);
}

export function dealSeasonsLeft(deal: SponsorDeal, season: number): number {
  return Math.max(0, deal.signedSeason + deal.seasons - season);
}

export function seasonSponsorBonusPayouts(
  deals: readonly SponsorDeal[] | undefined,
  season: number,
  wonTitle: boolean,
  wonTopScorer: boolean,
): { brand: string; kind: "title" | "top_scorer" }[] {
  const payouts: { brand: string; kind: "title" | "top_scorer" }[] = [];
  for (const deal of activeSponsorDeals(deals, season)) {
    if (deal.bonusLeagueTitle && wonTitle) {
      payouts.push({ brand: deal.brand, kind: "title" });
    }
    if (deal.bonusTopScorer && wonTopScorer) {
      payouts.push({ brand: deal.brand, kind: "top_scorer" });
    }
  }
  return payouts;
}

function formatWeeklyAsk(amount: number): string {
  if (amount >= 1_000) return `€ ${Math.round(amount / 1_000)}k`;
  return `€ ${amount}`;
}
