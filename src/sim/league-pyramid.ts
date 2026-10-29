/**
 * PRD 32 §4 — the league pyramid, top tier first. Every "which divisions are
 * there" and "who goes up or down" question reads this registry; nothing else
 * names a division id. A leaf module: no imports, so the world generator,
 * economy and persistence can all use it.
 */

/**
 * Rules between a division and the one below. The playoff, when there is one,
 * pairs the first place above the upper division's direct-relegation places
 * (home) with the first place below the lower division's direct-promotion
 * places: 17th vs 2nd for one direct place, 16th vs 3rd for two.
 */
export interface PyramidBoundary {
  /** Clubs that go straight down from the upper division (and up from the lower one). */
  direct: number;
  playoff: boolean;
  /** Seed salt of the playoff match (`masterSeed ^ season ^ salt`). */
  playoffSalt: number;
  /** No movement across this boundary yet (PRD 32: Nationalliga ↔ Regionalliga opens in slice 3). */
  closed?: boolean;
}

export interface PyramidDivision {
  id: string;
  /** 1 = top flight. */
  tier: number;
  clubCount: number;
  /** Salt for the season-end batch sim of this division (`masterSeed ^ season ^ salt`). */
  simSalt: number;
  /** Salt for the Leagues-screen table of a division the player is not in. */
  tableSalt: number;
  /** Starting division for a new career (club pick, PRD 24). */
  careerStart: boolean;
  /** Its players are on the AI transfer market (PRD 32: tiers 1–3 join in slice 4). */
  transferMarket: boolean;
  /** Rules to the division directly below; absent on the bottom tier. */
  boundaryBelow?: PyramidBoundary;
}

const PYRAMID_DEFINITION = [
  {
    id: "meisterliga",
    tier: 1,
    clubCount: 18,
    simSalt: 0x3b1,
    tableSalt: 0x51c3_77a1,
    careerStart: false,
    transferMarket: false,
    boundaryBelow: { direct: 2, playoff: true, playoffSalt: 0x3c5 },
  },
  {
    id: "meisterliga-2",
    tier: 2,
    clubCount: 18,
    simSalt: 0x3b2,
    tableSalt: 0x62d4_88b2,
    careerStart: false,
    transferMarket: false,
    boundaryBelow: { direct: 2, playoff: true, playoffSalt: 0x3c6 },
  },
  {
    id: "nationalliga",
    tier: 3,
    clubCount: 18,
    simSalt: 0x3b3,
    tableSalt: 0x73e5_99c3,
    careerStart: false,
    transferMarket: false,
    boundaryBelow: { direct: 2, playoff: true, playoffSalt: 0x3c7, closed: true },
  },
  {
    id: "regionalliga-nord",
    tier: 4,
    clubCount: 18,
    simSalt: 11,
    tableSalt: 0,
    careerStart: true,
    transferMarket: true,
    boundaryBelow: { direct: 1, playoff: true, playoffSalt: 71 },
  },
  {
    id: "oberliga-nord",
    tier: 5,
    clubCount: 18,
    simSalt: 29,
    tableSalt: 0x29a2_4f11,
    careerStart: true,
    transferMarket: true,
  },
] as const satisfies readonly PyramidDivision[];

export type DivisionId = (typeof PYRAMID_DEFINITION)[number]["id"];

/** Top tier first. */
export const PYRAMID: readonly (PyramidDivision & { id: DivisionId })[] = PYRAMID_DEFINITION;

/** New careers and saves without a stored division start here. */
export const DEFAULT_DIVISION_ID: DivisionId = "regionalliga-nord";

/** Top tier first. */
export function pyramidDivisionIds(): DivisionId[] {
  return PYRAMID.map((division) => division.id);
}

export function isDivisionId(value: unknown): value is DivisionId {
  return typeof value === "string" && PYRAMID.some((division) => division.id === value);
}

export function pyramidDivision(id: DivisionId): PyramidDivision {
  const division = PYRAMID.find((entry) => entry.id === id);
  if (!division) throw new Error(`unknown division ${id}`);
  return division;
}

export function tierOf(id: DivisionId): number {
  return pyramidDivision(id).tier;
}

export function divisionAbove(id: DivisionId): DivisionId | undefined {
  const index = PYRAMID.findIndex((division) => division.id === id);
  return index > 0 ? PYRAMID[index - 1]!.id : undefined;
}

export function divisionBelow(id: DivisionId): DivisionId | undefined {
  const index = PYRAMID.findIndex((division) => division.id === id);
  return index >= 0 && index < PYRAMID.length - 1 ? PYRAMID[index + 1]!.id : undefined;
}

export function careerStartDivisionIds(): DivisionId[] {
  return PYRAMID.filter((division) => division.careerStart).map((division) => division.id);
}

export function bottomDivisionId(): DivisionId {
  return PYRAMID[PYRAMID.length - 1]!.id;
}

/** Empty pool per division, in pyramid order. */
export function emptyDivisionPools<T>(): Record<DivisionId, T[]> {
  return Object.fromEntries(PYRAMID.map((division) => [division.id, [] as T[]])) as Record<
    DivisionId,
    T[]
  >;
}

/** Division whose pool holds `clubId`, or undefined. */
export function divisionOfClub<T>(
  pools: Partial<Record<DivisionId, readonly T[]>>,
  clubId: T,
): DivisionId | undefined {
  return pyramidDivisionIds().find((id) => pools[id]?.includes(clubId));
}

function openBoundary(boundary: PyramidBoundary | undefined): PyramidBoundary | undefined {
  return boundary && !boundary.closed ? boundary : undefined;
}

export type TableZone = "promoted" | "playoff" | "safe" | "relegated";

/**
 * Zone of a 0-based table index in `divisionId`: promotion and playoff places
 * come from the boundary above, relegation and playoff places from the one below.
 */
export function tableZone(divisionId: DivisionId, index: number, teamCount: number): TableZone {
  const place = index + 1;
  const above = divisionAbove(divisionId);
  const up = openBoundary(above ? pyramidDivision(above).boundaryBelow : undefined);
  const down = openBoundary(pyramidDivision(divisionId).boundaryBelow);
  if (up && place <= up.direct) return "promoted";
  if (up?.playoff && place === up.direct + 1) return "playoff";
  if (down && place > teamCount - down.direct) return "relegated";
  if (down?.playoff && place === teamCount - down.direct) return "playoff";
  return "safe";
}
