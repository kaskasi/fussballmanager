import { spendClubCash, type ClubFinances } from "../economy/club-finances.ts";
import type { ClubStadium, StadiumBlock, StadiumTier } from "./club-stadium.ts";

const TICKET_PRICE_MAX = 95;

/** Mirrored from `/data/infrastructure/stadium_block_upgrades.json` for the client bundle. */
export interface StadiumUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  max_level: number;
  tier?: StadiumTier;
  block?: string;
  capacity_bonus?: number;
  ticket_price_bonus?: number;
  fill_rate_bonus?: number;
  fanbase_multiplier?: number;
}

const UPGRADE_CATALOG: StadiumUpgradeDef[] = [
  {
    id: "standing_expansion",
    name: "Stehplatz-Erweiterung",
    description: "+800 Plätze in beiden Kurven · extra Werbebanden",
    cost: 650_000,
    icon: "🧍",
    max_level: 2,
    tier: "standing",
    capacity_bonus: 800,
  },
  {
    id: "seating_expansion",
    name: "Sitzplatz-Tribüne",
    description: "+600 Sitzplätze West & Ost · extra Werbebanden",
    cost: 980_000,
    icon: "💺",
    max_level: 1,
    tier: "seating",
    capacity_bonus: 600,
  },
  {
    id: "vip_expansion",
    name: "VIP-Lounge",
    description: "+75 Logenplätze, höhere Ticketpreise",
    cost: 1_450_000,
    icon: "🥂",
    max_level: 2,
    block: "vip",
    capacity_bonus: 75,
    ticket_price_bonus: 12,
  },
  {
    id: "pitch_heating",
    name: "Rasenheizung",
    description: "+5 % Auslastung, Fanbase wirkt stärker",
    cost: 420_000,
    icon: "🔥",
    max_level: 1,
    fill_rate_bonus: 0.05,
    fanbase_multiplier: 1.04,
  },
];

export function stadiumUpgradeCatalog(): readonly StadiumUpgradeDef[] {
  return UPGRADE_CATALOG;
}

export function stadiumUpgradeLevel(stadium: ClubStadium, upgradeId: string): number {
  return stadium.upgrade_levels?.[upgradeId] ?? 0;
}

export function stadiumUpgradeCost(def: StadiumUpgradeDef, nextLevel: number): number {
  return Math.round(def.cost * (1 + (nextLevel - 1) * 0.35));
}

export function canPurchaseStadiumUpgrade(
  stadium: ClubStadium,
  finances: ClubFinances,
  upgradeId: string,
): { allowed: boolean; reason?: string; cost?: number } {
  const def = UPGRADE_CATALOG.find((entry) => entry.id === upgradeId);
  if (!def) return { allowed: false, reason: "Upgrade unbekannt." };
  const level = stadiumUpgradeLevel(stadium, upgradeId);
  if (level >= def.max_level) return { allowed: false, reason: "Maximalstufe erreicht." };
  const cost = stadiumUpgradeCost(def, level + 1);
  if (finances.cash < cost) return { allowed: false, reason: "Nicht genug Cash.", cost };
  return { allowed: true, cost };
}

function applyUpgradeToBlocks(
  blocks: StadiumBlock[],
  def: StadiumUpgradeDef,
  level: number,
): StadiumBlock[] {
  if (level <= 0) return blocks;
  const capacityBonus = (def.capacity_bonus ?? 0) * level;
  const ticketBonus = (def.ticket_price_bonus ?? 0) * level;
  return blocks.map((block) => {
    if (def.block && block.id !== def.block) return block;
    if (def.tier && block.tier !== def.tier) return block;
    if (!def.block && !def.tier) return block;
    return {
      ...block,
      capacity: block.capacity + capacityBonus,
      ticket_price_eur: def.ticket_price_bonus
        ? Math.min(TICKET_PRICE_MAX, block.ticket_price_eur + ticketBonus)
        : block.ticket_price_eur,
    };
  });
}

export function rebuildStadiumFromUpgrades(stadium: ClubStadium, baseBlocks: StadiumBlock[]): StadiumBlock[] {
  let blocks = baseBlocks.map((block) => ({ ...block }));
  for (const def of UPGRADE_CATALOG) {
    const level = stadiumUpgradeLevel(stadium, def.id);
    blocks = applyUpgradeToBlocks(blocks, def, level);
  }
  return blocks;
}

export function stadiumFillRateBonus(stadium: ClubStadium): number {
  const heating = UPGRADE_CATALOG.find((entry) => entry.id === "pitch_heating");
  if (!heating) return 0;
  const level = stadiumUpgradeLevel(stadium, heating.id);
  return (heating.fill_rate_bonus ?? 0) * level;
}

export function stadiumFanbaseMultiplier(stadium: ClubStadium): number {
  const heating = UPGRADE_CATALOG.find((entry) => entry.id === "pitch_heating");
  if (!heating) return 1;
  const level = stadiumUpgradeLevel(stadium, heating.id);
  if (level <= 0) return 1;
  return heating.fanbase_multiplier ?? 1;
}

export function rebuildStadiumWithUpgrades(
  stadium: ClubStadium,
  baseBlocks: StadiumBlock[],
): ClubStadium {
  const upgrade_levels = stadium.upgrade_levels ?? {};
  return {
    ...stadium,
    upgrade_levels,
    blocks: rebuildStadiumFromUpgrades({ ...stadium, upgrade_levels }, baseBlocks),
  };
}

export function purchaseStadiumUpgrade(
  stadium: ClubStadium,
  finances: ClubFinances,
  upgradeId: string,
  baseBlocks: StadiumBlock[],
  week = 1,
): { stadium: ClubStadium; finances: ClubFinances; ok: boolean; reason?: string } {
  const check = canPurchaseStadiumUpgrade(stadium, finances, upgradeId);
  if (!check.allowed || check.cost === undefined) {
    return { stadium, finances, ok: false, reason: check.reason };
  }
  const nextLevels = {
    ...(stadium.upgrade_levels ?? {}),
    [upgradeId]: stadiumUpgradeLevel(stadium, upgradeId) + 1,
  };
  const upgraded = rebuildStadiumWithUpgrades(
    { ...stadium, upgrade_levels: nextLevels },
    baseBlocks,
  );
  return {
    stadium: upgraded,
    finances: spendClubCash(finances, check.cost, week),
    ok: true,
  };
}
