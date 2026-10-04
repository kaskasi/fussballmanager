import {
  PRECINCT_BUILDINGS,
  arenaDocksStreetNetwork,
  buildingDocksStreetNetwork,
  dockedOccupiedCells,
  occupiedCells,
  precinctBuildingLevel,
  precinctHasTrainingHall,
  type PrecinctBuilding,
  type PrecinctState,
} from "./precinct.ts";

function fillParts(state: PrecinctState) {
  const parking = dockedOccupiedCells(state, "parking");
  const kiosk = dockedOccupiedCells(state, "kiosk");
  const beer = dockedOccupiedCells(state, "beer_tent");
  const bus = dockedOccupiedCells(state, "bus") > 0 ? 0.018 : 0;
  const transit = dockedOccupiedCells(state, "transit") > 0 ? 0.032 : 0;
  const shopLevel = dockedOccupiedCells(state, "fanshop") > 0 ? precinctBuildingLevel(state, "fanshop") : 0;
  const fanshop = shopLevel * 0.006;
  const shopArea = Math.max(0, dockedOccupiedCells(state, "fanshop") - 4) * 0.002;
  const services = dockedOccupiedCells(state, "fan_services") > 0 ? 0.012 : 0;
  const clubhouse = dockedOccupiedCells(state, "clubhouse") > 0 ? 0.01 : 0;
  return {
    parking: parking * 0.004,
    kiosk: kiosk * 0.004,
    beer: beer * 0.003,
    bus,
    transit,
    fanshop: fanshop + shopArea,
    services,
    clubhouse,
  };
}

function trainingParts(state: PrecinctState) {
  const dockedGround = dockedOccupiedCells(state, "training_ground") > 0;
  const ground = dockedGround ? precinctBuildingLevel(state, "training_ground") : 0;
  const hall = dockedGround && precinctHasTrainingHall(state) ? 0.12 : ground > 0 ? 0.05 : 0;
  const extraPitches = dockedOccupiedCells(state, "training_pitch") * 0.008;
  const youth = dockedOccupiedCells(state, "youth_pitch") * 0.008;
  return { hall, extraPitches, youth };
}

function fanbaseParts(state: PrecinctState) {
  const shop = dockedOccupiedCells(state, "fanshop") > 0 ? precinctBuildingLevel(state, "fanshop") : 0;
  const shopArea = Math.max(0, dockedOccupiedCells(state, "fanshop") - 4) * 0.02;
  const clubhouse = dockedOccupiedCells(state, "clubhouse") > 0 ? 0.06 : 0;
  const beer = dockedOccupiedCells(state, "beer_tent") * 0.015;
  return {
    fanshop: shop > 0 ? shop * 0.12 + shopArea : 0,
    clubhouse,
    beer,
    services: dockedOccupiedCells(state, "fan_services") > 0 ? 0.04 : 0,
  };
}

/** Additive fill-rate bonus from Gelände buildings (PRD 14.7). */
export function precinctFillRateBonus(state: PrecinctState | undefined): number {
  if (!state) return 0;
  return Object.values(fillParts(state)).reduce((sum, value) => sum + value, 0);
}

/** Extra weekly fanbase from merch / clubhouse (PRD F7.5, light campus). */
export function precinctWeeklyFanbaseBonus(state: PrecinctState | undefined): number {
  if (!state) return 0;
  const parts = fanbaseParts(state);
  return parts.fanshop + parts.clubhouse + parts.beer + parts.services;
}

/**
 * Training environment multiplier from campus (on top of coaching staff).
 * Hall is the big step; extra pitches add a small bump.
 */
export function precinctTrainingEnvironment(state: PrecinctState | undefined): number {
  if (!state) return 1;
  const parts = trainingParts(state);
  const extra = parts.hall + parts.extraPitches + parts.youth;
  if (extra <= 0) return 1;
  return 1 + extra;
}

/** Fitness/Pool/Physio recovery on the Trainingszentrum (docked). Halle stays growth. */
export function precinctFitnessRegen(state: PrecinctState | undefined): number {
  if (!state) return 1;
  if (dockedOccupiedCells(state, "training_ground") <= 0) return 1;
  const level = precinctBuildingLevel(state, "training_ground");
  if (level >= 5) return 1.18;
  if (level >= 4) return 1.14;
  if (level >= 3) return 1.08;
  return 1;
}

/** Physio slightly cuts injury risk. */
export function precinctInjuryRiskFactor(state: PrecinctState | undefined): number {
  if (!state) return 1;
  if (dockedOccupiedCells(state, "training_ground") <= 0) return 1;
  return precinctBuildingLevel(state, "training_ground") >= 5 ? 0.88 : 1;
}

/** Merch COGS multiplier: fanshop upgrade buys cheaper. */
export function precinctMerchCogsMultiplier(state: PrecinctState | undefined): number {
  if (!state) return 1;
  const shop = precinctBuildingLevel(state, "fanshop");
  if (shop <= 0) return 1;
  return Math.max(0.82, 1 - shop * 0.06);
}

const KIOSK_WEEKLY_PER_CELL = 500;
const BEER_WEEKLY_PER_CELL = 450;

function formatCash(amount: number): string {
  if (amount >= 1000) return `€ ${Math.round(amount / 1000)}k`;
  return `€ ${amount}`;
}

/** Weekly sausage-stall margin. Scales with docked kiosk cells. */
export function weeklyKioskIncome(state: PrecinctState | undefined): number {
  if (!state) return 0;
  const cells = dockedOccupiedCells(state, "kiosk");
  if (cells <= 0) return 0;
  return Math.round(cells * KIOSK_WEEKLY_PER_CELL);
}

/** Weekly beer-tent margin. Scales with docked tent area. */
export function weeklyBeerIncome(state: PrecinctState | undefined): number {
  if (!state) return 0;
  const cells = dockedOccupiedCells(state, "beer_tent");
  if (cells <= 0) return 0;
  return Math.round(cells * BEER_WEEKLY_PER_CELL);
}

/** Weekly merch margin after wholesale (fanshop upgrade = cheaper buying). */
export function weeklyFanshopIncome(state: PrecinctState | undefined): number {
  if (!state) return 0;
  const shop = dockedOccupiedCells(state, "fanshop") > 0 ? precinctBuildingLevel(state, "fanshop") : 0;
  if (shop <= 0) return 0;
  const cogs = precinctMerchCogsMultiplier(state);
  return Math.round(4_000 * shop * (1.15 - cogs) * (1 + Math.max(0, dockedOccupiedCells(state, "fanshop") - 4) * 0.08));
}

/** Wurst + Bier + Shop, paid weekly. */
export function weeklyPrecinctCash(state: PrecinctState | undefined): number {
  return weeklyKioskIncome(state) + weeklyBeerIncome(state) + weeklyFanshopIncome(state);
}

export type PrecinctStatusTone = "buff" | "hunger" | "warn";
export type PrecinctStatusGroup = "crowd" | "city" | "training" | "fans" | "cash";

export interface PrecinctStatusEffect {
  id: PrecinctBuilding | "arena";
  group: PrecinctStatusGroup;
  icon: string;
  label: string;
  magnitude: string | null;
  detail: string;
  tone: PrecinctStatusTone;
}

export const PRECINCT_STATUS_GROUPS: readonly {
  id: PrecinctStatusGroup;
  icon: string;
  label: string;
}[] = [
  { id: "crowd", icon: "👁", label: "Zuschauer" },
  { id: "city", icon: "🛣️", label: "Stadt" },
  { id: "fans", icon: "📣", label: "Fans" },
  { id: "training", icon: "🏃", label: "Training" },
  { id: "cash", icon: "💰", label: "Kasse" },
];

const BUILDING_GROUP: Record<PrecinctBuilding, PrecinctStatusGroup> = {
  kiosk: "cash",
  parking: "crowd",
  fan_services: "fans",
  beer_tent: "cash",
  bus: "city",
  transit: "city",
  fanshop: "cash",
  clubhouse: "fans",
  training_ground: "training",
  training_pitch: "training",
  youth_pitch: "training",
};

function formatPct(rate: number): string {
  const pct = rate * 100;
  const body =
    Math.abs(pct - Math.round(pct)) < 0.05
      ? String(Math.round(pct))
      : pct.toFixed(1).replace(".", ",");
  return `+${body}%`;
}

function formatFans(delta: number): string {
  return `+${delta.toFixed(2).replace(".", ",")}`;
}

function joinBits(bits: string[]): string | null {
  const present = bits.filter(Boolean);
  return present.length > 0 ? present.join(" · ") : null;
}

export function listPrecinctStatusEffects(state: PrecinctState | undefined): PrecinctStatusEffect[] {
  const empty = !state;
  const fill = empty ? null : fillParts(state);
  const fans = empty ? null : fanbaseParts(state);
  const training = empty ? null : trainingParts(state);
  const merch = empty ? 0 : weeklyFanshopIncome(state);
  const kioskCash = empty ? 0 : weeklyKioskIncome(state);
  const beerCash = empty ? 0 : weeklyBeerIncome(state);
  const arenaDocked = !empty && arenaDocksStreetNetwork(state);
  const arena: PrecinctStatusEffect = {
    id: "arena",
    group: "city",
    icon: "🏟️",
    label: "Arena",
    magnitude: arenaDocked ? "Netz" : null,
    detail: arenaDocked ? "Arena am Straßennetz" : "Arena dockt nicht ans Straßennetz",
    tone: arenaDocked ? "buff" : "warn",
  };

  return [
    arena,
    ...PRECINCT_BUILDINGS.map((def) => {
    const placed = !empty && occupiedCells(state, def.id) > 0;
    const group = BUILDING_GROUP[def.id];
    const bits: string[] = [];
    let tone: PrecinctStatusTone = placed ? "buff" : "hunger";
    let hunger = `Fehlt: ${def.label}`;

    if (placed && fill) {
      if (def.id === "parking" && fill.parking > 0) bits.push(`Zuschauer ${formatPct(fill.parking)}`);
      if (def.id === "kiosk" && fill.kiosk > 0) bits.push(`Zuschauer ${formatPct(fill.kiosk)}`);
      if (def.id === "beer_tent" && fill.beer > 0) bits.push(`Zuschauer ${formatPct(fill.beer)}`);
      if (def.id === "fan_services" && fill.services > 0) bits.push(`Zuschauer ${formatPct(fill.services)}`);
      if (def.id === "clubhouse" && fill.clubhouse > 0) bits.push(`Zuschauer ${formatPct(fill.clubhouse)}`);
      if (def.id === "fanshop" && fill.fanshop > 0) bits.push(`Zuschauer ${formatPct(fill.fanshop)}`);
    }
    if (placed && fans) {
      if (def.id === "beer_tent" && fans.beer > 0) bits.push(`Fans ${formatFans(fans.beer)}`);
      if (def.id === "clubhouse" && fans.clubhouse > 0) bits.push(`Fans ${formatFans(fans.clubhouse)}`);
      if (def.id === "fanshop" && fans.fanshop > 0) bits.push(`Fans ${formatFans(fans.fanshop)}`);
      if (def.id === "fan_services" && fans.services > 0) bits.push(`Fans ${formatFans(fans.services)}`);
    }
    if (placed && training) {
      if (def.id === "training_ground" && training.hall > 0) {
        bits.push(
          precinctHasTrainingHall(state)
            ? `Training ${formatPct(training.hall)} · Halle`
            : `Training ${formatPct(training.hall)}`,
        );
        const regen = precinctFitnessRegen(state);
        if (regen > 1) bits.push(`Fitness ×${regen.toFixed(2).replace(".", ",")}`);
      }
      if (def.id === "training_pitch" && training.extraPitches > 0) {
        bits.push(`Training ${formatPct(training.extraPitches)}`);
      }
      if (def.id === "youth_pitch" && training.youth > 0) {
        bits.push(`Training ${formatPct(training.youth)}`);
      }
    }
    if (placed && def.id === "kiosk" && kioskCash > 0) {
      bits.push(`Kasse ${formatCash(kioskCash)}/Wo`);
    }
    if (placed && def.id === "beer_tent" && beerCash > 0) {
      bits.push(`Kasse ${formatCash(beerCash)}/Wo`);
    }
    if (placed && def.id === "fanshop" && merch > 0) {
      bits.push(`Merch ${formatCash(merch)}/Wo`);
    }
    if (placed && !buildingDocksStreetNetwork(state, def.id)) {
      tone = "warn";
      hunger = `${def.label} dockt nicht ans Straßennetz`;
    } else if (placed && (def.id === "bus" || def.id === "transit") && fill) {
      if (def.id === "bus" && fill.bus > 0) bits.push(`Zuschauer ${formatPct(fill.bus)}`);
      if (def.id === "transit" && fill.transit > 0) bits.push(`Zuschauer ${formatPct(fill.transit)}`);
    }

    const detail =
      tone === "hunger"
        ? hunger
        : tone === "warn"
          ? hunger
          : `${def.label} · ${joinBits(bits) ?? "aktiv"}`;

    return {
      id: def.id,
      group,
      icon: def.icon,
      label: def.label,
      magnitude: tone === "buff" ? compactMagnitude(def.id, fill, fans, training, merch, kioskCash, beerCash) : null,
      detail,
      tone,
    };
    }),
  ];
}

function compactMagnitude(
  id: PrecinctBuilding,
  fill: ReturnType<typeof fillParts> | null,
  fans: ReturnType<typeof fanbaseParts> | null,
  training: ReturnType<typeof trainingParts> | null,
  merch: number,
  kioskCash: number,
  beerCash: number,
): string | null {
  if (!fill || !fans || !training) return null;
  if (id === "parking") return fill.parking > 0 ? formatPct(fill.parking) : null;
  if (id === "kiosk") return kioskCash > 0 ? formatCash(kioskCash) : fill.kiosk > 0 ? formatPct(fill.kiosk) : null;
  if (id === "beer_tent") return beerCash > 0 ? formatCash(beerCash) : fill.beer > 0 ? formatPct(fill.beer) : null;
  if (id === "fan_services") {
    if (fans.services > 0) return formatFans(fans.services);
    return fill.services > 0 ? formatPct(fill.services) : null;
  }
  if (id === "clubhouse") {
    if (fans.clubhouse > 0) return formatFans(fans.clubhouse);
    return fill.clubhouse > 0 ? formatPct(fill.clubhouse) : null;
  }
  if (id === "fanshop") {
    if (merch > 0) return formatCash(merch);
    return fill.fanshop > 0 ? formatPct(fill.fanshop) : null;
  }
  if (id === "bus") return fill.bus > 0 ? formatPct(fill.bus) : null;
  if (id === "transit") return fill.transit > 0 ? formatPct(fill.transit) : null;
  if (id === "training_ground") return training.hall > 0 ? formatPct(training.hall) : null;
  if (id === "training_pitch") return training.extraPitches > 0 ? formatPct(training.extraPitches) : null;
  if (id === "youth_pitch") return training.youth > 0 ? formatPct(training.youth) : null;
  return null;
}

export function precinctStatusTotals(state: PrecinctState | undefined) {
  return {
    fill: precinctFillRateBonus(state),
    fans: precinctWeeklyFanbaseBonus(state),
    training: precinctTrainingEnvironment(state),
    merch: weeklyPrecinctCash(state),
  };
}
