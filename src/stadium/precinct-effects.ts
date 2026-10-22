import {
  PRECINCT_BUILDINGS,
  arenaDocksStreetNetwork,
  buildingDocksStreetNetwork,
  dockedOccupiedCells,
  occupiedCells,
  precinctBuildingLabel,
  precinctBuildingLevel,
  precinctBuildingStageLabel,
  precinctHasTrainingHall,
  type PrecinctBuilding,
  type PrecinctState,
} from "./precinct.ts";
import { t } from "../i18n/index.ts";
import { formatDecimal } from "../i18n/number-display.ts";
import {
  applyConcessionPriceToIncome,
  DEFAULT_BEER_UNIT_PRICE_EUR,
  DEFAULT_KIOSK_UNIT_PRICE_EUR,
  type ConcessionUnitPrices,
} from "./concession-prices.ts";
import { DEFAULT_FANBASE } from "./club-stadium.ts";
import { formatClubCash, formatClubCashWeekly } from "../economy/club-finances.ts";
import { weeklyMuseumIncome, type HospitalityPreview } from "./hospitality.ts";

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
  const museum = dockedOccupiedCells(state, "museum") > 0 ? 0.05 : 0;
  return {
    fanshop: shop > 0 ? shop * 0.14 + shopArea : 0,
    clubhouse,
    beer,
    services: dockedOccupiedCells(state, "fan_services") > 0 ? 0.07 : 0,
    away,
    museum,
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
  const full = parts.fanshop + parts.clubhouse + parts.beer + parts.services + parts.away + parts.museum;
  return full * clampOccupancy(occupancy);
}

/** Training campus → growth `environment()` multiplier (PRD 02.1, F7 Gelände). */
export function precinctTrainingEnvironment(
  state: PrecinctState | undefined,
  _simWeek?: { season: number; week: number },
): number {
  if (!state) return 1;
  let bonus = 0;
  if (dockedOccupiedCells(state, "training_ground") > 0) {
    const level = precinctBuildingLevel(state, "training_ground");
    bonus += 0.018 + level * 0.024;
    if (precinctHasTrainingHall(state)) bonus += 0.04;
  }
  if (dockedOccupiedCells(state, "training_pitch") > 0) {
    bonus += precinctBuildingLevel(state, "training_pitch") * 0.014;
  }
  if (dockedOccupiedCells(state, "youth_pitch") > 0) {
    bonus += precinctBuildingLevel(state, "youth_pitch") * 0.01;
  }
  if (dockedOccupiedCells(state, "medical_center") > 0) {
    bonus += Math.min(3, precinctBuildingLevel(state, "medical_center")) * 0.008;
  }
  return 1 + bonus;
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

/** TZ Stufe 5 Physio — stacks ~8 % with Medical Center (PRD F7.9). */
export function precinctTzPhysioStack(state: PrecinctState | undefined): number {
  if (!state) return 1;
  if (dockedOccupiedCells(state, "training_ground") <= 0) return 1;
  if (precinctBuildingLevel(state, "training_ground") >= 5) return 0.92;
  return 1;
}

export function precinctMedicalCenterLevel(state: PrecinctState | undefined): number {
  if (!state) return 0;
  if (dockedOccupiedCells(state, "medical_center") <= 0) return 0;
  return precinctBuildingLevel(state, "medical_center");
}

export function precinctPitchInjuryFactor(state: PrecinctState | undefined): number {
  if (!state) return 1;
  let factor = 1;
  if (dockedOccupiedCells(state, "training_pitch") > 0) {
    const pitch = precinctBuildingLevel(state, "training_pitch");
    if (pitch >= 3) factor *= 0.9;
    else if (pitch >= 2) factor *= 0.94;
    else if (pitch >= 1) factor *= 0.97;
  }
  return factor;
}

/** Pitch + TZ stack only — combine with medicalModifiers for full risk. */
export function precinctInjuryRiskFactor(state: PrecinctState | undefined): number {
  return precinctPitchInjuryFactor(state) * precinctTzPhysioStack(state);
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
  label: string;
  magnitude: string | null;
  detail: string;
  tone: PrecinctStatusTone;
}

/** Effect groups in rail order; names via `precinctStatusGroupLabel`. */
export const PRECINCT_STATUS_GROUPS: readonly PrecinctStatusGroup[] = ["crowd", "city", "fans", "training", "cash"];

export function precinctStatusGroupLabel(group: PrecinctStatusGroup): string {
  return t(`precinct.group.${group}`);
}

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
  museum: "cash",
  medical_center: "training",
};

function formatPct(rate: number): string {
  const pct = rate * 100;
  const body =
    Math.abs(pct - Math.round(pct)) < 0.05
      ? String(Math.round(pct))
      : formatDecimal(pct, 1);
  return `+${body}%`;
}

function formatFans(delta: number): string {
  return `+${formatDecimal(delta, 2)}`;
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
    label: t("precinct.effect.arena"),
    magnitude: arenaDocked ? t("precinct.effect.network") : null,
    detail: arenaDocked ? t("precinct.effect.arenaDocked") : t("precinct.effect.arenaUndocked"),
    tone: arenaDocked ? "buff" : "warn",
  };

  return [
    arena,
    ...PRECINCT_BUILDINGS.map((def) => {
    const placed = !empty && occupiedCells(state, def.id) > 0;
    const group = BUILDING_GROUP[def.id];
    const label = precinctBuildingLabel(def.id);
    const bits: string[] = [];
    let tone: PrecinctStatusTone = placed ? "buff" : "hunger";
    let hunger = t("precinct.effect.missing", { building: label });
    const crowd = (rate: number) => t("precinct.effect.crowd", { value: formatPct(rate) });
    const fansBit = (delta: number) => t("precinct.effect.fans", { value: formatFans(delta) });

    if (placed && fill) {
      if (def.id === "parking" && fill.parking > 0) bits.push(crowd(fill.parking));
      if (def.id === "kiosk" && fill.kiosk > 0) bits.push(crowd(fill.kiosk));
      if (def.id === "beer_tent" && fill.beer > 0) bits.push(crowd(fill.beer));
      if (def.id === "fan_services" && fill.services > 0) bits.push(crowd(fill.services));
      if (def.id === "clubhouse" && fill.clubhouse > 0) bits.push(crowd(fill.clubhouse));
      if (def.id === "fanshop" && fill.fanshop > 0) bits.push(crowd(fill.fanshop));
    }
    if (placed && fans) {
      if (def.id === "beer_tent" && fans.beer > 0) bits.push(fansBit(fans.beer));
      if (def.id === "clubhouse" && fans.clubhouse > 0) bits.push(fansBit(fans.clubhouse));
      if (def.id === "clubhouse" && placed) {
        const hqLevel = precinctBuildingLevel(state, "clubhouse");
        if (hqLevel > 0) {
          bits.push(t("precinct.effect.buildSlots", { count: 2 + Math.min(2, hqLevel) }));
        }
      }
      if (def.id === "fanshop" && fans.fanshop > 0) bits.push(fansBit(fans.fanshop));
      if (def.id === "museum" && fans.museum > 0) bits.push(fansBit(fans.museum));
      if (def.id === "fan_services" && fans.services > 0) bits.push(fansBit(fans.services));
    }
    if (placed && training) {
      if (def.id === "training_ground") {
        const tzLevel = precinctBuildingLevel(state, "training_ground");
        if (precinctHasTrainingHall(state)) bits.push(t("precinct.effect.hall"));
        if (tzLevel >= 4) bits.push(t("precinct.effect.pool"));
        if (tzLevel >= 5) bits.push(t("precinct.effect.physio"));
        const regen = precinctFitnessRegen(state);
        if (regen > 1) bits.push(t("precinct.effect.recovery", { value: formatDecimal(regen, 2) }));
        else if (dockedOccupiedCells(state, "training_ground") > 0) bits.push(t("precinct.stage.base"));
      }
      if (def.id === "training_pitch" && training.extraPitches > 0) {
        bits.push(precinctBuildingStageLabel("training_pitch", training.extraPitches));
        if (training.extraPitches >= 1) bits.push(t("precinct.effect.fewerInjuries"));
        if (training.extraPitches >= 2) bits.push(t("precinct.effect.outdoor"));
        if (training.extraPitches >= 3) bits.push(t("precinct.effect.sprint"));
      }
      if (def.id === "youth_pitch" && training.youth > 0) {
        bits.push(precinctBuildingStageLabel("youth_pitch", training.youth));
        if (training.youth >= 2) bits.push(t("precinct.effect.youthCampus"));
      }
    }
    if (placed && def.id === "bus" && precinctAwayFanOrganizerBonus(state) > 0) {
      bits.push(t("precinct.effect.awayTrips"));
    }
    if (placed && def.id === "fan_services" && precinctAwayFanOrganizerBonus(state) >= 0.08) {
      bits.push(t("precinct.effect.awayOrganisation"));
    }
    if (placed && def.id === "kiosk" && kioskCash > 0) {
      bits.push(t("precinct.effect.cashFull", { amount: formatClubCash(kioskCash) }));
    }
    if (placed && def.id === "beer_tent" && beerCash > 0) {
      bits.push(t("precinct.effect.cashFull", { amount: formatClubCash(beerCash) }));
    }
    if (placed && def.id === "fanshop" && merch > 0) {
      bits.push(t("precinct.effect.merchFull", { amount: formatClubCash(merch) }));
    }
    if (placed && def.id === "hotel" && hospitalityPreview?.hotel) {
      const h = hospitalityPreview.hotel;
      bits.push(t("precinct.hospitality.occupancy", { pct: h.occupancyPct }));
      if (h.docked && h.weeklyIncome > 0) {
        bits.push(formatClubCashWeekly(h.weeklyIncome));
      }
    }
    if (placed && def.id === "museum") {
      const museumCash = weeklyMuseumIncome(state, DEFAULT_FANBASE);
      if (museumCash > 0) bits.push(t("precinct.effect.cashWeekly", { amount: formatClubCash(museumCash) }));
      if (fans?.museum) bits.push(fansBit(fans.museum));
    }
    if (placed && def.id === "restaurant" && hospitalityPreview?.restaurant) {
      const r = hospitalityPreview.restaurant;
      bits.push(r.viral ? t("precinct.effect.viral") : t("precinct.hospitality.occupancy", { pct: r.occupancyPct }));
      if (r.docked && r.weeklyIncome > 0) {
        bits.push(formatClubCashWeekly(r.weeklyIncome));
      }
      if (r.overtimeDueThisWeek) bits.push(t("precinct.effect.overtime"));
    }
    if (placed && (def.id === "hotel" || def.id === "restaurant") && !hospitalityPreview) {
      bits.push(t("precinct.effect.occupancy"));
    }
    if (placed && !buildingDocksStreetNetwork(state, def.id)) {
      tone = "warn";
      hunger = t("precinct.effect.undocked", { building: label });
    } else if (placed && (def.id === "bus" || def.id === "transit") && fill) {
      if (def.id === "bus" && fill.bus > 0) bits.push(crowd(fill.bus));
      if (def.id === "transit" && fill.transit > 0) bits.push(crowd(fill.transit));
    }

    const detail =
      tone === "hunger"
        ? hunger
        : tone === "warn"
          ? hunger
          : `${label} · ${joinBits(bits) ?? t("precinct.effect.active")}`;

    return {
      id: def.id,
      group,
      label,
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
  if (id === "training_ground") return precinctBuildingStageLabel("training_ground", training.hall > 0 ? 2 : 1);
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
