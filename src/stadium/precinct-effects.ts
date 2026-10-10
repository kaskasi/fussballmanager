import {
  PRECINCT_BUILDINGS,
  arenaDocksStreetNetwork,
  buildingDocksStreetNetwork,
  dockedOccupiedCells,
  occupiedCells,
  precinctBuildingLevel,
  precinctBuildingStageLabel,
  precinctHasTrainingHall,
  type PrecinctBuilding,
  type PrecinctState,
} from "./precinct.ts";
import {
  applyConcessionPriceToIncome,
  DEFAULT_BEER_UNIT_PRICE_EUR,
  DEFAULT_KIOSK_UNIT_PRICE_EUR,
  type ConcessionUnitPrices,
} from "./concession-prices.ts";
import { DEFAULT_FANBASE } from "./club-stadium.ts";
import { formatClubCash } from "../economy/club-finances.ts";
import type { HospitalityPreview } from "./hospitality.ts";

/** Reference fanbase — commerce scale 1.0 at this value. */
const NEUTRAL_FANBASE = 60;
const VISIT_FILL_MIN = 0.04;
const VISIT_FILL_MAX = 0.18;
const AWAY_VISIT_CAP = 0.22;

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
  const hall = dockedGround && precinctHasTrainingHall(state) ? 1 : 0;
  const extraPitches =
    dockedOccupiedCells(state, "training_pitch") > 0
      ? precinctBuildingLevel(state, "training_pitch")
      : 0;
  const youth =
    dockedOccupiedCells(state, "youth_pitch") > 0 ? precinctBuildingLevel(state, "youth_pitch") : 0;
  return { hall, extraPitches, youth };
}

function fanbaseParts(state: PrecinctState) {
  const shop = dockedOccupiedCells(state, "fanshop") > 0 ? precinctBuildingLevel(state, "fanshop") : 0;
  const shopArea = Math.max(0, dockedOccupiedCells(state, "fanshop") - 4) * 0.02;
  const clubhouse = dockedOccupiedCells(state, "clubhouse") > 0 ? 0.08 : 0;
  const beer = dockedOccupiedCells(state, "beer_tent") * 0.018;
  const away = precinctAwayFanOrganizerBonus(state) * 0.45;
  return {
    fanshop: shop > 0 ? shop * 0.14 + shopArea : 0,
    clubhouse,
    beer,
    services: dockedOccupiedCells(state, "fan_services") > 0 ? 0.07 : 0,
    away,
  };
}

export function precinctAwayFanOrganizerBonus(state: PrecinctState | undefined): number {
  if (!state) return 0;
  const bus = dockedOccupiedCells(state, "bus") > 0;
  const services = dockedOccupiedCells(state, "fan_services") > 0;
  const transit = dockedOccupiedCells(state, "transit") > 0;
  if (transit && services) return 0.1;
  if (bus && services) return 0.08;
  if (bus) return 0.03;
  if (services) return 0.025;
  return 0;
}

function normalizeFanbase(fanbase?: number): number {
  return Math.min(95, Math.max(25, fanbase ?? NEUTRAL_FANBASE));
}

/** Fan pull + Fan-Service buildings; away weeks add organized travel boost. */
export function fanbaseCommerceScale(
  fanbase: number,
  state: PrecinctState | undefined,
  isHomeMatchWeek: boolean,
): number {
  const norm = (normalizeFanbase(fanbase) - 25) / 70;
  let scale = 0.72 + norm * 0.56;
  if (state) {
    if (dockedOccupiedCells(state, "fan_services") > 0) scale += 0.05;
    if (dockedOccupiedCells(state, "clubhouse") > 0) scale += 0.04;
    const shop = dockedOccupiedCells(state, "fanshop") > 0 ? precinctBuildingLevel(state, "fanshop") : 0;
    if (shop > 0) scale += shop * 0.012;
  }
  if (!isHomeMatchWeek) {
    scale += precinctAwayFanOrganizerBonus(state) * (0.75 + norm * 0.35);
  }
  return scale;
}

/** Additive fill-rate bonus from Gelände buildings (PRD 14.7). */
export function precinctFillRateBonus(state: PrecinctState | undefined): number {
  if (!state) return 0;
  return Object.values(fillParts(state)).reduce((sum, value) => sum + value, 0);
}

/** Extra weekly fanbase from merch / clubhouse (PRD F7.5). Scales with occupancy. */
export function precinctWeeklyFanbaseBonus(state: PrecinctState | undefined, occupancy = 1): number {
  if (!state) return 0;
  const parts = fanbaseParts(state);
  const full = parts.fanshop + parts.clubhouse + parts.beer + parts.services + parts.away;
  return full * clampOccupancy(occupancy);
}

/** Campus no longer caps growth — hall unlock lives in `precinctHasTrainingHall`. */
export function precinctTrainingEnvironment(_state: PrecinctState | undefined): number {
  return 1;
}

/** Pool (Stufe 4+) — Erholung zwischen den Spielen. Fitness (3) leicht, Halle (2) nicht. */
export function precinctFitnessRegen(state: PrecinctState | undefined): number {
  if (!state) return 1;
  if (dockedOccupiedCells(state, "training_ground") <= 0) return 1;
  const level = precinctBuildingLevel(state, "training_ground");
  if (level >= 4) return 1.16;
  if (level >= 3) return 1.05;
  return 1;
}

/** Physio (Stufe 5) am TZ + Kunstrasen/Hybrid auf dem Platz. */
export function precinctInjuryRiskFactor(state: PrecinctState | undefined): number {
  if (!state) return 1;
  let factor = 1;
  if (dockedOccupiedCells(state, "training_ground") > 0) {
    if (precinctBuildingLevel(state, "training_ground") >= 5) factor *= 0.86;
  }
  if (dockedOccupiedCells(state, "training_pitch") > 0) {
    const pitch = precinctBuildingLevel(state, "training_pitch");
    if (pitch >= 3) factor *= 0.9;
    else if (pitch >= 2) factor *= 0.94;
    else if (pitch >= 1) factor *= 0.97;
  }
  return factor;
}

/** Merch COGS multiplier: fanshop upgrade buys cheaper. */
export function precinctMerchCogsMultiplier(state: PrecinctState | undefined): number {
  if (!state) return 1;
  const shop = precinctBuildingLevel(state, "fanshop");
  if (shop <= 0) return 1;
  return Math.max(0.82, 1 - shop * 0.06);
}

/** Full-house margin per docked kiosk cell (Heimspiel, 100% fill). */
export const KIOSK_FULL_PER_CELL = 1000;
/** Full-house margin per docked beer-tent cell. */
export const BEER_FULL_PER_CELL = 900;
function clampOccupancy(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function scaleCommerceIncome(
  throughput: number,
  occupancy: number,
  fanbase: number,
  state: PrecinctState | undefined,
  isHomeMatchWeek: boolean,
): number {
  return scaleMerchFootfallIncome(
    throughput,
    occupancy,
    fanbase,
    state,
    isHomeMatchWeek,
  );
}

/** Footfall × fan pull — shared by kiosk/beer and merchandising engine. */
export function scaleMerchFootfallIncome(
  throughput: number,
  occupancy: number,
  fanbase: number,
  state: PrecinctState | undefined,
  isHomeMatchWeek: boolean,
): number {
  if (throughput <= 0) return 0;
  return Math.round(
    throughput *
      clampOccupancy(occupancy) *
      fanbaseCommerceScale(fanbase, state, isHomeMatchWeek),
  );
}

/** Sightseeing / midweek visitors — fanbase-driven, campus signage helps. */
export function precinctVisitFill(fanbase: number, state: PrecinctState | undefined): number {
  const fans = normalizeFanbase(fanbase);
  const fromFans = VISIT_FILL_MIN + ((fans - 25) / 70) * 0.08;
  const fromCampus = Math.min(0.04, precinctFillRateBonus(state) * 0.22);
  const fromSupport = state
    ? (dockedOccupiedCells(state, "fan_services") > 0 ? 0.012 : 0) +
      (dockedOccupiedCells(state, "clubhouse") > 0 ? 0.008 : 0)
    : 0;
  return Math.min(VISIT_FILL_MAX, Math.max(VISIT_FILL_MIN, fromFans + fromCampus + fromSupport));
}

/** Away / no-match weeks — organized away travel lifts Gelände footfall. */
export function precinctAwayWeekCommerceFill(
  fanbase: number,
  state: PrecinctState | undefined,
): number {
  const base = precinctVisitFill(fanbase, state);
  const norm = (normalizeFanbase(fanbase) - 25) / 70;
  const away = precinctAwayFanOrganizerBonus(state) * (0.55 + norm * 0.45);
  return Math.min(AWAY_VISIT_CAP, base + away);
}

function commerceLevelMultiplier(state: PrecinctState, building: "kiosk" | "beer_tent"): number {
  const level = precinctBuildingLevel(state, building);
  if (level <= 1) return 1;
  return building === "kiosk" ? 1.35 : 1.28;
}

export function kioskFullCapacity(state: PrecinctState | undefined): number {
  if (!state) return 0;
  const cells = dockedOccupiedCells(state, "kiosk");
  if (cells <= 0) return 0;
  return Math.round(cells * KIOSK_FULL_PER_CELL * commerceLevelMultiplier(state, "kiosk"));
}

export function beerFullCapacity(state: PrecinctState | undefined): number {
  if (!state) return 0;
  const cells = dockedOccupiedCells(state, "beer_tent");
  if (cells <= 0) return 0;
  return Math.round(cells * BEER_FULL_PER_CELL * commerceLevelMultiplier(state, "beer_tent"));
}

export function fanshopFullCapacity(state: PrecinctState | undefined): number {
  if (!state) return 0;
  const shop = dockedOccupiedCells(state, "fanshop") > 0 ? precinctBuildingLevel(state, "fanshop") : 0;
  if (shop <= 0) return 0;
  const cogs = precinctMerchCogsMultiplier(state);
  return Math.round(4_000 * shop * (1.15 - cogs) * (1 + Math.max(0, dockedOccupiedCells(state, "fanshop") - 4) * 0.08));
}

const ONLINE_MERCH_THROUGHPUT = 900;

/** Fanshop level/area throughput; small online baseline when no docked shop. */
export function fanshopMerchThroughput(state: PrecinctState | undefined): number {
  const cap = fanshopFullCapacity(state);
  return cap > 0 ? cap : ONLINE_MERCH_THROUGHPUT;
}

/** Weekly sausage-stall margin — throughput × visitors × fan pull. */
export function weeklyKioskIncome(
  state: PrecinctState | undefined,
  occupancy = 1,
  fanbase = NEUTRAL_FANBASE,
  isHomeMatchWeek = true,
  prices?: ConcessionUnitPrices,
): number {
  const base = scaleCommerceIncome(
    kioskFullCapacity(state),
    occupancy,
    fanbase,
    state,
    isHomeMatchWeek,
  );
  const unitPrice = prices?.kiosk_unit_price_eur ?? DEFAULT_KIOSK_UNIT_PRICE_EUR;
  return applyConcessionPriceToIncome(base, unitPrice, DEFAULT_KIOSK_UNIT_PRICE_EUR);
}

/** Weekly beer-tent margin. */
export function weeklyBeerIncome(
  state: PrecinctState | undefined,
  occupancy = 1,
  fanbase = NEUTRAL_FANBASE,
  isHomeMatchWeek = true,
  prices?: ConcessionUnitPrices,
): number {
  const base = scaleCommerceIncome(
    beerFullCapacity(state),
    occupancy,
    fanbase,
    state,
    isHomeMatchWeek,
  );
  const unitPrice = prices?.beer_unit_price_eur ?? DEFAULT_BEER_UNIT_PRICE_EUR;
  return applyConcessionPriceToIncome(base, unitPrice, DEFAULT_BEER_UNIT_PRICE_EUR);
}

/** Weekly merch margin — shop level = throughput, sales = footfall. */
export function weeklyFanshopIncome(
  state: PrecinctState | undefined,
  occupancy = 1,
  fanbase = NEUTRAL_FANBASE,
  isHomeMatchWeek = true,
): number {
  return scaleCommerceIncome(
    fanshopFullCapacity(state),
    occupancy,
    fanbase,
    state,
    isHomeMatchWeek,
  );
}

/** Kiosk + Bier — Fanshop revenue lives in merchandising (PRD 11). */
export function weeklyPrecinctConcessionsCash(
  state: PrecinctState | undefined,
  occupancy = 1,
  fanbase = NEUTRAL_FANBASE,
  isHomeMatchWeek = true,
  prices?: ConcessionUnitPrices,
): number {
  return (
    weeklyKioskIncome(state, occupancy, fanbase, isHomeMatchWeek, prices) +
    weeklyBeerIncome(state, occupancy, fanbase, isHomeMatchWeek, prices)
  );
}

/** @deprecated Use weeklyPrecinctConcessionsCash + merchandising ledger line. */
export function weeklyPrecinctCash(
  state: PrecinctState | undefined,
  occupancy = 1,
  fanbase = NEUTRAL_FANBASE,
  isHomeMatchWeek = true,
): number {
  return weeklyPrecinctConcessionsCash(state, occupancy, fanbase, isHomeMatchWeek);
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
  hotel: "cash",
  restaurant: "cash",
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

export function listPrecinctStatusEffects(
  state: PrecinctState | undefined,
  hospitalityPreview?: HospitalityPreview,
): PrecinctStatusEffect[] {
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
      if (def.id === "training_ground") {
        const tzLevel = precinctBuildingLevel(state, "training_ground");
        if (precinctHasTrainingHall(state)) bits.push("Halle · Technikeinheiten+");
        if (tzLevel >= 4) bits.push("Pool · Erholung");
        if (tzLevel >= 5) bits.push("Physio · Verletzung↓");
        const regen = precinctFitnessRegen(state);
        if (regen > 1) bits.push(`Erholung ×${regen.toFixed(2).replace(".", ",")}`);
        else if (dockedOccupiedCells(state, "training_ground") > 0) bits.push("Basis");
      }
      if (def.id === "training_pitch" && training.extraPitches > 0) {
        bits.push(precinctBuildingStageLabel("training_pitch", training.extraPitches));
        if (training.extraPitches >= 1) bits.push("weniger Verletzungen");
        if (training.extraPitches >= 2) bits.push("Outdoor-Einheiten");
        if (training.extraPitches >= 3) bits.push("Sprint-Platz");
      }
      if (def.id === "youth_pitch" && training.youth > 0) {
        bits.push(precinctBuildingStageLabel("youth_pitch", training.youth));
        if (training.youth >= 2) bits.push("Jugend-Campus");
      }
    }
    if (placed && def.id === "bus" && precinctAwayFanOrganizerBonus(state) > 0) {
      bits.push("Auswärtsfahrten");
    }
    if (placed && def.id === "fan_services" && precinctAwayFanOrganizerBonus(state) >= 0.08) {
      bits.push("Auswärts-Organisation");
    }
    if (placed && def.id === "kiosk" && kioskCash > 0) {
      bits.push(`Kasse ${formatClubCash(kioskCash)} bei voller Auslastung`);
    }
    if (placed && def.id === "beer_tent" && beerCash > 0) {
      bits.push(`Kasse ${formatClubCash(beerCash)} bei voller Auslastung`);
    }
    if (placed && def.id === "fanshop" && merch > 0) {
      bits.push(`Merch ${formatClubCash(merch)} bei voller Auslastung`);
    }
    if (placed && def.id === "hotel" && hospitalityPreview?.hotel) {
      const h = hospitalityPreview.hotel;
      bits.push(`${h.occupancyPct}% Auslastung`);
      if (h.docked && h.weeklyIncome > 0) {
        bits.push(`${formatClubCash(h.weeklyIncome)}/Wo`);
      }
    }
    if (placed && def.id === "restaurant" && hospitalityPreview?.restaurant) {
      const r = hospitalityPreview.restaurant;
      bits.push(r.viral ? "100% · Story-Hype" : `${r.occupancyPct}% Auslastung`);
      if (r.docked && r.weeklyIncome > 0) {
        bits.push(`${formatClubCash(r.weeklyIncome)}/Wo`);
      }
      if (r.overtimeDueThisWeek) bits.push("Überstunden diese Woche");
    }
    if (placed && (def.id === "hotel" || def.id === "restaurant") && !hospitalityPreview) {
      bits.push("Auslastung");
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
      magnitude:
        tone === "buff"
          ? compactMagnitude(
              def.id,
              fill,
              fans,
              training,
              merch,
              kioskCash,
              beerCash,
              hospitalityPreview,
            )
          : null,
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
  hospitalityPreview?: HospitalityPreview,
): string | null {
  if (id === "hotel" && hospitalityPreview?.hotel?.docked) {
    return `${hospitalityPreview.hotel.occupancyPct}%`;
  }
  if (id === "restaurant" && hospitalityPreview?.restaurant?.docked) {
    return hospitalityPreview.restaurant.viral
      ? "100%"
      : `${hospitalityPreview.restaurant.occupancyPct}%`;
  }
  if (!fill || !fans || !training) return null;
  if (id === "parking") return fill.parking > 0 ? formatPct(fill.parking) : null;
  if (id === "kiosk") return kioskCash > 0 ? formatClubCash(kioskCash) : fill.kiosk > 0 ? formatPct(fill.kiosk) : null;
  if (id === "beer_tent") return beerCash > 0 ? formatClubCash(beerCash) : fill.beer > 0 ? formatPct(fill.beer) : null;
  if (id === "fan_services") {
    if (fans.services > 0) return formatFans(fans.services);
    return fill.services > 0 ? formatPct(fill.services) : null;
  }
  if (id === "clubhouse") {
    if (fans.clubhouse > 0) return formatFans(fans.clubhouse);
    return fill.clubhouse > 0 ? formatPct(fill.clubhouse) : null;
  }
  if (id === "fanshop") {
    if (merch > 0) return formatClubCash(merch);
    return fill.fanshop > 0 ? formatPct(fill.fanshop) : null;
  }
  if (id === "bus") return fill.bus > 0 ? formatPct(fill.bus) : null;
  if (id === "transit") return fill.transit > 0 ? formatPct(fill.transit) : null;
  if (id === "training_ground") return training.hall > 0 ? "Halle" : "Basis";
  if (id === "training_pitch") {
    return training.extraPitches > 0
      ? precinctBuildingStageLabel("training_pitch", training.extraPitches)
      : null;
  }
  if (id === "youth_pitch") {
    return training.youth > 0 ? precinctBuildingStageLabel("youth_pitch", training.youth) : null;
  }
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
