export type PrecinctBuilding =
  | "kiosk"
  | "fanshop"
  | "parking"
  | "transit"
  | "bus"
  | "training_ground"
  | "training_pitch"
  | "youth_pitch"
  | "beer_tent"
  | "fan_services"
  | "clubhouse"
  | "hotel"
  | "restaurant";

export type PrecinctCap = "unique" | "many";

export interface PrecinctBuildingDef {
  id: PrecinctBuilding;
  icon: string;
  label: string;
  cost: number;
  cap: PrecinctCap;
  minW: number;
  minH: number;
  maxLevel: number;
  upgradeCost: number;
  hint: string;
}

export interface PrecinctPatch {
  id: string;
  building: PrecinctBuilding;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PrecinctState {
  width: number;
  height: number;
  patches: PrecinctPatch[];
  /** Owned (playable) cells. Missing key = locked parcel. */
  owned: Record<string, true>;
  streets: Record<string, true>;
  levels: Partial<Record<PrecinctBuilding, number>>;
}

export const PRECINCT_WIDTH = 14;
export const PRECINCT_HEIGHT = 10;

/** Starting farm: 10×10 owned. Side expansions add 2×5 tiles. */
export const PRECINCT_CORE = { x: 2, y: 0, w: 10, h: 10 } as const;

/** Stadium footprint — not a placeable building. Centered in the starting farm. */
export const PRECINCT_STADIUM = { x: 5, y: 4, w: 4, h: 2 } as const;

/**
 * Off-grid city highway, Sim City-style: sits on the north rim (y = -1)
 * so the bus stop docks to the city, not to a gifted inner street.
 */
export const PRECINCT_CITY_LINK = { x: 6, y: -1, w: 2, h: 1 } as const;

/**
 * 1×1 decorative tiles (tree/bench/statue, zero buffs) — not land expansion.
 * Expansion uses 2×5 Rosenberg plates (`PRECINCT_EXPANSION_COST`).
 */
export const PRECINCT_PARCEL_COST = 90_000;
/** Land expansion is free — layout only (PRD 14.7 v2). */
export const PRECINCT_EXPANSION_COST = 0;
export const PRECINCT_STREET_COST = 15_000;

export type PrecinctExpansionSide = "left" | "right";

export interface PrecinctExpansion {
  id: "left_north" | "right_north" | "left_south" | "right_south";
  side: PrecinctExpansionSide;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Rosenberg tiles: alternate left/right. Four buys → 2 extra columns × 10 rows per side. */
export const PRECINCT_EXPANSIONS: readonly PrecinctExpansion[] = [
  { id: "left_north", side: "left", label: "links oben", x: 0, y: 0, w: 2, h: 5 },
  { id: "right_north", side: "right", label: "rechts oben", x: 12, y: 0, w: 2, h: 5 },
  { id: "left_south", side: "left", label: "links unten", x: 0, y: 5, w: 2, h: 5 },
  { id: "right_south", side: "right", label: "rechts unten", x: 12, y: 5, w: 2, h: 5 },
];

export const PRECINCT_BUILDINGS: readonly PrecinctBuildingDef[] = [
  {
    id: "kiosk",
    icon: "🌭",
    label: "Würstchenbude",
    cost: 95_000,
    cap: "many",
    minW: 1,
    minH: 1,
    maxLevel: 2,
    upgradeCost: 45_000,
    hint: "Mehrere Buden · 1×1 · Ausbau: mehr Durchsatz",
  },
  {
    id: "beer_tent",
    icon: "🍺",
    label: "Bierzelt",
    cost: 85_000,
    cap: "unique",
    minW: 2,
    minH: 2,
    maxLevel: 2,
    upgradeCost: 70_000,
    hint: "Nur eines · 2×2 · Ausbau: mehr Bier-Umsatz",
  },
  {
    id: "fanshop",
    icon: "👕",
    label: "Fanshop",
    cost: 220_000,
    cap: "unique",
    minW: 2,
    minH: 2,
    maxLevel: 5,
    upgradeCost: 160_000,
    hint: "Nur einer · 2×2 · Ausbau: Merch + Fans",
  },
  {
    id: "parking",
    icon: "🅿️",
    label: "Parkplatz",
    cost: 280_000,
    cap: "many",
    minW: 2,
    minH: 2,
    maxLevel: 1,
    upgradeCost: 0,
    hint: "Mehrere · min. 2×2",
  },
  {
    id: "bus",
    icon: "🚌",
    label: "Bushaltestelle",
    cost: 280_000,
    cap: "unique",
    minW: 1,
    minH: 2,
    maxLevel: 1,
    upgradeCost: 0,
    hint: "Nur eine · Zuschauer, dockt ans Netz",
  },
  {
    id: "transit",
    icon: "🚇",
    label: "S/U-Bahn",
    cost: 620_000,
    cap: "unique",
    minW: 2,
    minH: 3,
    maxLevel: 1,
    upgradeCost: 0,
    hint: "Nur eine · 2×3 · Zuschauer, dockt ans Netz",
  },
  {
    id: "training_ground",
    icon: "🏃",
    label: "Trainingszentrum",
    cost: 450_000,
    cap: "unique",
    minW: 3,
    minH: 3,
    maxLevel: 5,
    upgradeCost: 720_000,
    hint: "Gebäude · Halle, Fitness, Pool, Physio · Training + Erholung",
  },
  {
    id: "training_pitch",
    icon: "🟩",
    label: "Trainingsplatz",
    cost: 180_000,
    cap: "unique",
    minW: 2,
    minH: 3,
    maxLevel: 3,
    upgradeCost: 120_000,
    hint: "Nur einer · min. 2×3 · Ausbau: Outdoor-Einheiten",
  },
  {
    id: "youth_pitch",
    icon: "🌱",
    label: "Jugendplatz",
    cost: 160_000,
    cap: "unique",
    minW: 2,
    minH: 2,
    maxLevel: 2,
    upgradeCost: 90_000,
    hint: "Nur einer · min. 2×2 · extra Jugend-Training",
  },
  {
    id: "fan_services",
    icon: "♿",
    label: "Fan-Service",
    cost: 140_000,
    cap: "unique",
    minW: 1,
    minH: 2,
    maxLevel: 1,
    upgradeCost: 0,
    hint: "Nur einer · 1×2 · Fan-Service + Auswärtsfahrten mit Bus",
  },
  {
    id: "clubhouse",
    icon: "🏠",
    label: "Vereinsgebäude",
    cost: 320_000,
    cap: "unique",
    minW: 2,
    minH: 2,
    maxLevel: 1,
    upgradeCost: 0,
    hint: "Nur eines · 2×2",
  },
  {
    id: "hotel",
    icon: "🏨",
    label: "Hotel",
    cost: 1_400_000,
    cap: "unique",
    minW: 3,
    minH: 2,
    maxLevel: 1,
    upgradeCost: 0,
    hint: "Nur eines · 3×2 · Auslastung, Heimspiel-Gäste",
  },
  {
    id: "restaurant",
    icon: "🍽️",
    label: "Restaurant",
    cost: 620_000,
    cap: "unique",
    minW: 2,
    minH: 2,
    maxLevel: 1,
    upgradeCost: 0,
    hint: "Nur eines · 2×2 · Auslastung + Story",
  },
];

const BUILDING_BY_ID = new Map(PRECINCT_BUILDINGS.map((entry) => [entry.id, entry]));

export function precinctBuildingDef(id: PrecinctBuilding): PrecinctBuildingDef {
  return BUILDING_BY_ID.get(id) ?? PRECINCT_BUILDINGS[0]!;
}

export function precinctCellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function isPrecinctStadiumCell(x: number, y: number): boolean {
  return (
    x >= PRECINCT_STADIUM.x &&
    x < PRECINCT_STADIUM.x + PRECINCT_STADIUM.w &&
    y >= PRECINCT_STADIUM.y &&
    y < PRECINCT_STADIUM.y + PRECINCT_STADIUM.h
  );
}

export function isPrecinctCoreCell(x: number, y: number): boolean {
  return (
    x >= PRECINCT_CORE.x &&
    x < PRECINCT_CORE.x + PRECINCT_CORE.w &&
    y >= PRECINCT_CORE.y &&
    y < PRECINCT_CORE.y + PRECINCT_CORE.h
  );
}

export function isCityLinkCell(x: number, y: number): boolean {
  return (
    x >= PRECINCT_CITY_LINK.x &&
    x < PRECINCT_CITY_LINK.x + PRECINCT_CITY_LINK.w &&
    y >= PRECINCT_CITY_LINK.y &&
    y < PRECINCT_CITY_LINK.y + PRECINCT_CITY_LINK.h
  );
}

/** Grid cells on the north rim that share an edge with the off-grid highway. */
export function isCityRampCell(x: number, y: number): boolean {
  return y === 0 && x >= PRECINCT_CITY_LINK.x && x < PRECINCT_CITY_LINK.x + PRECINCT_CITY_LINK.w;
}

/** All playable cells on the 14×10 board except the arena footprint. */
export function defaultOwnedCells(): Record<string, true> {
  const owned: Record<string, true> = {};
  for (let y = 0; y < PRECINCT_HEIGHT; y += 1) {
    for (let x = 0; x < PRECINCT_WIDTH; x += 1) {
      if (isPrecinctStadiumCell(x, y)) continue;
      owned[precinctCellKey(x, y)] = true;
    }
  }
  return owned;
}

export function ensureFullPrecinctOwned(owned: Record<string, true>): Record<string, true> {
  return { ...defaultOwnedCells(), ...owned };
}

/** One road from the highway down to the arena's north edge. */
export function precinctSpineCells(): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < PRECINCT_STADIUM.y; y += 1) {
    cells.push({ x: PRECINCT_CITY_LINK.x, y });
  }
  return cells;
}

function defaultSpineStreets(): Record<string, true> {
  const streets: Record<string, true> = {};
  for (const cell of precinctSpineCells()) {
    if (isPrecinctStadiumCell(cell.x, cell.y)) continue;
    streets[precinctCellKey(cell.x, cell.y)] = true;
  }
  return streets;
}

export function emptyPrecinct(): PrecinctState {
  return {
    width: PRECINCT_WIDTH,
    height: PRECINCT_HEIGHT,
    patches: [],
    owned: defaultOwnedCells(),
    streets: defaultSpineStreets(),
    levels: {},
  };
}

export function precinctExpansionAt(x: number, y: number): PrecinctExpansion | undefined {
  return PRECINCT_EXPANSIONS.find(
    (tile) => x >= tile.x && x < tile.x + tile.w && y >= tile.y && y < tile.y + tile.h,
  );
}

export function precinctExpansionOwned(state: PrecinctState, tile: PrecinctExpansion): boolean {
  return rectangleCells(tile.x, tile.y, tile.w, tile.h).every(
    (cell) => isOwnedCell(state, cell.x, cell.y),
  );
}

export function nextPrecinctExpansion(state: PrecinctState): PrecinctExpansion | null {
  return PRECINCT_EXPANSIONS.find((tile) => !precinctExpansionOwned(state, tile)) ?? null;
}

export function canBuyPrecinctExpansion(
  state: PrecinctState,
  cash: number,
): { allowed: boolean; cost: number; tile: PrecinctExpansion | null; reason?: string } {
  const tile = nextPrecinctExpansion(state);
  if (!tile) {
    return { allowed: false, cost: 0, tile: null, reason: "Gelände ist voll." };
  }
  if (PRECINCT_EXPANSION_COST > 0 && cash < PRECINCT_EXPANSION_COST) {
    return {
      allowed: false,
      cost: PRECINCT_EXPANSION_COST,
      tile,
      reason: "Nicht genug Cash.",
    };
  }
  return { allowed: true, cost: PRECINCT_EXPANSION_COST, tile };
}

export function buyPrecinctExpansion(state: PrecinctState): PrecinctState {
  const tile = nextPrecinctExpansion(state);
  if (!tile) return state;
  const owned = { ...state.owned };
  for (const cell of rectangleCells(tile.x, tile.y, tile.w, tile.h)) {
    if (!isPrecinctStadiumCell(cell.x, cell.y)) {
      owned[precinctCellKey(cell.x, cell.y)] = true;
    }
  }
  return { ...state, owned };
}

export function isOwnedCell(state: PrecinctState, x: number, y: number): boolean {
  return state.owned[precinctCellKey(x, y)] === true;
}

export function isStreetCell(state: PrecinctState, x: number, y: number): boolean {
  return state.streets[precinctCellKey(x, y)] === true;
}

export function patchCovers(patch: PrecinctPatch, x: number, y: number): boolean {
  return x >= patch.x && x < patch.x + patch.w && y >= patch.y && y < patch.y + patch.h;
}

export function patchAt(state: PrecinctState, x: number, y: number): PrecinctPatch | undefined {
  return state.patches.find((patch) => patchCovers(patch, x, y));
}

export function buildingAt(state: PrecinctState, x: number, y: number): PrecinctBuilding | undefined {
  return patchAt(state, x, y)?.building;
}

export function countBuilding(state: PrecinctState, building: PrecinctBuilding): number {
  return state.patches.filter((patch) => patch.building === building).length;
}

export function occupiedCells(state: PrecinctState, building: PrecinctBuilding): number {
  return state.patches
    .filter((patch) => patch.building === building)
    .reduce((sum, patch) => sum + patch.w * patch.h, 0);
}

export function findBuildingCell(
  state: PrecinctState,
  building: PrecinctBuilding,
): { x: number; y: number } | null {
  const patch = state.patches.find((entry) => entry.building === building);
  return patch ? { x: patch.x, y: patch.y } : null;
}

export function precinctBuildingCost(building: PrecinctBuilding): number {
  return precinctBuildingDef(building).cost;
}

export function precinctBuildingLevel(state: PrecinctState, building: PrecinctBuilding): number {
  if (countBuilding(state, building) <= 0) return 0;
  return state.levels[building] ?? 1;
}

export function precinctHasTrainingHall(state: PrecinctState | undefined): boolean {
  if (!state) return false;
  return precinctBuildingLevel(state, "training_ground") >= 2;
}

export function precinctTrainingPitchLevel(state: PrecinctState | undefined): number {
  if (!state || dockedOccupiedCells(state, "training_pitch") <= 0) return 0;
  return precinctBuildingLevel(state, "training_pitch");
}

export function precinctYouthPitchLevel(state: PrecinctState | undefined): number {
  if (!state || dockedOccupiedCells(state, "youth_pitch") <= 0) return 0;
  return precinctBuildingLevel(state, "youth_pitch");
}

/** Current upgrade stage name (Lv1 = placed baseline). */
export function precinctBuildingStageLabel(building: PrecinctBuilding, level: number): string {
  if (level <= 0) return "";
  switch (building) {
    case "training_ground":
      if (level === 1) return "Basis";
      if (level === 2) return "Halle";
      if (level === 3) return "Fitness";
      if (level === 4) return "Pool";
      if (level === 5) return "Physio";
      break;
    case "fanshop":
      return ["", "Shop", "Erweiterung", "Flagship", "Online", "Erlebnis"][level] ?? `Stufe ${level}`;
    case "training_pitch":
      return ["", "Rasen", "Kunstrasen", "Hybrid"][level] ?? `Stufe ${level}`;
    case "youth_pitch":
      return ["", "Kleinfeld", "Akademie-Rasen"][level] ?? `Stufe ${level}`;
    case "kiosk":
      return level >= 2 ? "Doppelstand" : "Bude";
    case "beer_tent":
      return level >= 2 ? "Festzelt" : "Zelt";
    default:
      break;
  }
  return level > 1 ? `Stufe ${level}` : "Basis";
}

export function precinctNextUpgradeLabel(building: PrecinctBuilding, currentLevel: number): string {
  const next = currentLevel + 1;
  if (building === "training_ground") {
    return precinctBuildingStageLabel(building, next);
  }
  const stage = precinctBuildingStageLabel(building, next);
  return stage || `Lv${next}`;
}

export function precinctPlacementCost(
  state: PrecinctState,
  building: PrecinctBuilding,
  from?: { x: number; y: number },
): number {
  if (from) return 0;
  const def = precinctBuildingDef(building);
  if (def.cap === "unique" && countBuilding(state, building) > 0) return 0;
  return precinctBuildingCost(building);
}

function inBounds(state: PrecinctState, x: number, y: number, w: number, h: number): boolean {
  return x >= 0 && y >= 0 && x + w <= state.width && y + h <= state.height;
}

function rectangleCells(x: number, y: number, w: number, h: number): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      cells.push({ x: xx, y: yy });
    }
  }
  return cells;
}

function rectangleIsFree(
  state: PrecinctState,
  x: number,
  y: number,
  w: number,
  h: number,
  ignorePatchId?: string,
): boolean {
  if (!inBounds(state, x, y, w, h)) return false;
  for (const cell of rectangleCells(x, y, w, h)) {
    if (isPrecinctStadiumCell(cell.x, cell.y)) return false;
    if (!isOwnedCell(state, cell.x, cell.y)) return false;
    if (isStreetCell(state, cell.x, cell.y)) return false;
    const occupant = patchAt(state, cell.x, cell.y);
    if (occupant && occupant.id !== ignorePatchId) return false;
  }
  return true;
}

export function findFreeRectangle(
  state: PrecinctState,
  w: number,
  h: number,
  preferX?: number,
  preferY?: number,
  ignorePatchId?: string,
): { x: number; y: number } | null {
  if (
    preferX != null &&
    preferY != null &&
    rectangleIsFree(state, preferX, preferY, w, h, ignorePatchId)
  ) {
    return { x: preferX, y: preferY };
  }
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      if (rectangleIsFree(state, x, y, w, h, ignorePatchId)) return { x, y };
    }
  }
  return null;
}

function shiftTrueMap(
  map: Record<string, true> | undefined,
  offsetX: number,
  offsetY: number,
): Record<string, true> {
  const shifted: Record<string, true> = {};
  if (!map) return shifted;
  for (const [key, value] of Object.entries(map)) {
    if (!value) continue;
    const [rawX, rawY] = key.split(",").map(Number);
    if (rawX == null || rawY == null || Number.isNaN(rawX) || Number.isNaN(rawY)) continue;
    shifted[precinctCellKey(rawX + offsetX, rawY + offsetY)] = true;
  }
  return shifted;
}

function grantTouchedExpansions(owned: Record<string, true>): void {
  for (const tile of PRECINCT_EXPANSIONS) {
    const touched = rectangleCells(tile.x, tile.y, tile.w, tile.h).some(
      (cell) => owned[precinctCellKey(cell.x, cell.y)],
    );
    if (!touched) continue;
    for (const cell of rectangleCells(tile.x, tile.y, tile.w, tile.h)) {
      owned[precinctCellKey(cell.x, cell.y)] = true;
    }
  }
}

export function canPlacePrecinctBuilding(
  state: PrecinctState,
  x: number,
  y: number,
  building: PrecinctBuilding,
  from?: { x: number; y: number },
): boolean {
  const def = precinctBuildingDef(building);
  const moving = from ? patchAt(state, from.x, from.y) : undefined;
  const ignoreId =
    moving?.building === building
      ? moving.id
      : def.cap === "unique"
        ? state.patches.find((patch) => patch.building === building)?.id
        : undefined;
  const w = moving && moving.building === building ? moving.w : def.minW;
  const h = moving && moving.building === building ? moving.h : def.minH;
  return rectangleIsFree(state, x, y, w, h, ignoreId);
}

function newPatchId(building: PrecinctBuilding, x: number, y: number): string {
  return `pt_${building}_${x}_${y}`;
}

/** Place a new min-size copy, or move `from` / the unique instance. */
export function placePrecinctBuilding(
  state: PrecinctState,
  x: number,
  y: number,
  building: PrecinctBuilding,
  from?: { x: number; y: number },
): PrecinctState {
  if (!canPlacePrecinctBuilding(state, x, y, building, from)) return state;
  const def = precinctBuildingDef(building);
  const moving = from ? patchAt(state, from.x, from.y) : undefined;
  const unique = state.patches.find((patch) => patch.building === building);
  const source =
    moving?.building === building ? moving : def.cap === "unique" && unique ? unique : undefined;
  const w = source?.w ?? def.minW;
  const h = source?.h ?? def.minH;
  const patches = source
    ? state.patches.filter((patch) => patch.id !== source.id)
    : [...state.patches];
  patches.push({
    id: source?.id ?? newPatchId(building, x, y),
    building,
    x,
    y,
    w,
    h,
  });
  const levels = { ...state.levels };
  if ((levels[building] ?? 0) < 1) levels[building] = 1;
  const streets = { ...state.streets };
  for (const cell of rectangleCells(x, y, w, h)) {
    delete streets[precinctCellKey(cell.x, cell.y)];
  }
  return { ...state, patches, levels, streets };
}

export function extraCellCost(building: PrecinctBuilding): number {
  const def = precinctBuildingDef(building);
  const area = def.minW * def.minH;
  return Math.max(8_000, Math.round(def.cost / Math.max(1, area)));
}

export function expandPrecinctPatch(
  state: PrecinctState,
  patchId: string,
  w: number,
  h: number,
): PrecinctState {
  const patch = state.patches.find((entry) => entry.id === patchId);
  if (!patch) return state;
  const def = precinctBuildingDef(patch.building);
  const nextW = Math.max(def.minW, w);
  const nextH = Math.max(def.minH, h);
  if (nextW === patch.w && nextH === patch.h) return state;
  if (!rectangleIsFree(state, patch.x, patch.y, nextW, nextH, patch.id)) return state;
  const streets = { ...state.streets };
  for (const cell of rectangleCells(patch.x, patch.y, nextW, nextH)) {
    delete streets[precinctCellKey(cell.x, cell.y)];
  }
  return {
    ...state,
    streets,
    patches: state.patches.map((entry) =>
      entry.id === patchId ? { ...entry, w: nextW, h: nextH } : entry,
    ),
  };
}

export function precinctExpandCost(patch: PrecinctPatch, w: number, h: number): number {
  const def = precinctBuildingDef(patch.building);
  const nextW = Math.max(def.minW, w);
  const nextH = Math.max(def.minH, h);
  const extra = nextW * nextH - patch.w * patch.h;
  if (extra <= 0) return 0;
  return extra * extraCellCost(patch.building);
}

export type PrecinctEdge = "n" | "e" | "s" | "w";

export function buildingNeedsCityDock(building: PrecinctBuilding): boolean {
  return building === "bus" || building === "transit";
}

export function buildingNeedsStreetDock(building: PrecinctBuilding): boolean {
  return buildingNeedsCityDock(building);
}

export function patchRectOnEdge(
  patch: PrecinctPatch,
  edge: PrecinctEdge,
  delta: 1 | -1,
): PrecinctPatch | null {
  const def = precinctBuildingDef(patch.building);
  if (delta === 1) {
    if (edge === "e") return { ...patch, w: patch.w + 1 };
    if (edge === "s") return { ...patch, h: patch.h + 1 };
    if (edge === "w") return { ...patch, x: patch.x - 1, w: patch.w + 1 };
    return { ...patch, y: patch.y - 1, h: patch.h + 1 };
  }
  if (edge === "e" || edge === "w") {
    if (patch.w <= def.minW) return null;
    return edge === "e"
      ? { ...patch, w: patch.w - 1 }
      : { ...patch, x: patch.x + 1, w: patch.w - 1 };
  }
  if (patch.h <= def.minH) return null;
  return edge === "s"
    ? { ...patch, h: patch.h - 1 }
    : { ...patch, y: patch.y + 1, h: patch.h - 1 };
}

/** Resize / nudge footprint — layout only, no cash (PRD 14.7). */
export function precinctNudgeCost(_patch: PrecinctPatch, _edge: PrecinctEdge, _delta: 1 | -1 = 1): number {
  return 0;
}

export function canNudgePrecinctPatch(
  state: PrecinctState,
  patchId: string,
  edge: PrecinctEdge,
  _cash: number,
  delta: 1 | -1 = 1,
): { allowed: boolean; cost: number; reason?: string } {
  const patch = state.patches.find((entry) => entry.id === patchId);
  if (!patch) return { allowed: false, cost: 0, reason: "Kein Gebäude." };
  const next = patchRectOnEdge(patch, edge, delta);
  if (!next) return { allowed: false, cost: 0, reason: "Mindestgröße." };
  if (delta === 1 && !rectangleIsFree(state, next.x, next.y, next.w, next.h, patch.id)) {
    return { allowed: false, cost: 0, reason: "Kein Platz." };
  }
  const cost = precinctNudgeCost(patch, edge, delta);
  return { allowed: true, cost };
}

export function nudgePrecinctPatch(
  state: PrecinctState,
  patchId: string,
  edge: PrecinctEdge,
  delta: 1 | -1 = 1,
): PrecinctState {
  const check = canNudgePrecinctPatch(state, patchId, edge, Number.POSITIVE_INFINITY, delta);
  if (!check.allowed) return state;
  const patch = state.patches.find((entry) => entry.id === patchId);
  if (!patch) return state;
  const next = patchRectOnEdge(patch, edge, delta);
  if (!next) return state;
  const streets = { ...state.streets };
  for (const cell of rectangleCells(next.x, next.y, next.w, next.h)) {
    delete streets[precinctCellKey(cell.x, cell.y)];
  }
  return {
    ...state,
    streets,
    patches: state.patches.map((entry) => (entry.id === patchId ? { ...entry, ...next } : entry)),
  };
}

export function patchIsMinSize(patch: PrecinctPatch): boolean {
  const def = precinctBuildingDef(patch.building);
  return patch.w <= def.minW && patch.h <= def.minH;
}

function precinctUpgradeInvested(def: PrecinctBuildingDef, level: number): number {
  if (level <= 1 || def.upgradeCost <= 0) return 0;
  let sum = 0;
  for (let l = 1; l < level; l += 1) {
    sum += Math.round(def.upgradeCost * (1 + (l - 1) * 0.35));
  }
  return sum;
}

/** Base purchase + upgrades when removing the last instance of a building type. */
export function precinctPatchRefund(state: PrecinctState, patch: PrecinctPatch): number {
  const def = precinctBuildingDef(patch.building);
  let refund = def.cost;
  if (countBuilding(state, patch.building) === 1) {
    refund += precinctUpgradeInvested(def, precinctBuildingLevel(state, patch.building));
  }
  return refund;
}

export function removePrecinctPatch(
  state: PrecinctState,
  patchId: string,
): { state: PrecinctState; refund: number } {
  const patch = state.patches.find((entry) => entry.id === patchId);
  if (!patch) return { state, refund: 0 };
  const refund = precinctPatchRefund(state, patch);
  const patches = state.patches.filter((entry) => entry.id !== patchId);
  const levels = { ...state.levels };
  if (countBuilding({ ...state, patches }, patch.building) === 0) {
    delete levels[patch.building];
  }
  return { state: { ...state, patches, levels }, refund };
}

export function removeStreetCell(
  state: PrecinctState,
  x: number,
  y: number,
): { state: PrecinctState; refund: number } {
  if (!isStreetCell(state, x, y)) return { state, refund: 0 };
  const streets = { ...state.streets };
  delete streets[precinctCellKey(x, y)];
  return { state: { ...state, streets }, refund: PRECINCT_STREET_COST };
}

export function shrinkPrecinctPatchToMin(state: PrecinctState, patchId: string): PrecinctState {
  const patch = state.patches.find((entry) => entry.id === patchId);
  if (!patch || patchIsMinSize(patch)) return state;
  const def = precinctBuildingDef(patch.building);
  return {
    ...state,
    patches: state.patches.map((entry) =>
      entry.id === patchId ? { ...entry, w: def.minW, h: def.minH } : entry,
    ),
  };
}

export function edgeTowardCell(patch: PrecinctPatch, x: number, y: number): PrecinctEdge | null {
  if (x === patch.x + patch.w && y >= patch.y && y < patch.y + patch.h) return "e";
  if (x === patch.x - 1 && y >= patch.y && y < patch.y + patch.h) return "w";
  if (y === patch.y + patch.h && x >= patch.x && x < patch.x + patch.w) return "s";
  if (y === patch.y - 1 && x >= patch.x && x < patch.x + patch.w) return "n";
  return null;
}

export function canBuyPrecinctParcel(
  state: PrecinctState,
  x: number,
  y: number,
  cash: number,
): { allowed: boolean; cost: number; reason?: string } {
  const tile = precinctExpansionAt(x, y);
  if (!tile) return { allowed: false, cost: 0, reason: "Kein Plättchen." };
  const next = nextPrecinctExpansion(state);
  if (!next || next.id !== tile.id) {
    return { allowed: false, cost: PRECINCT_EXPANSION_COST, reason: "Erst die nächste Erweiterung." };
  }
  return canBuyPrecinctExpansion(state, cash);
}

export function buyPrecinctParcel(state: PrecinctState, x: number, y: number): PrecinctState {
  const tile = precinctExpansionAt(x, y);
  const next = nextPrecinctExpansion(state);
  if (!tile || !next || tile.id !== next.id) return state;
  return buyPrecinctExpansion(state);
}

export function canPlaceStreet(
  state: PrecinctState,
  x: number,
  y: number,
  cash: number,
): { allowed: boolean; cost: number; reason?: string } {
  if (!isOwnedCell(state, x, y)) return { allowed: false, cost: 0, reason: "Erst Parzelle kaufen." };
  if (isPrecinctStadiumCell(x, y)) return { allowed: false, cost: 0, reason: "Stadion." };
  if (patchAt(state, x, y)) return { allowed: false, cost: 0, reason: "Belegt." };
  if (isStreetCell(state, x, y)) return { allowed: false, cost: 0, reason: "Schon Straße." };
  if (cash < PRECINCT_STREET_COST) {
    return { allowed: false, cost: PRECINCT_STREET_COST, reason: "Nicht genug Cash." };
  }
  return { allowed: true, cost: PRECINCT_STREET_COST };
}

export function placeStreet(state: PrecinctState, x: number, y: number): PrecinctState {
  const check = canPlaceStreet(state, x, y, Number.POSITIVE_INFINITY);
  if (!check.allowed) return state;
  return {
    ...state,
    streets: { ...state.streets, [precinctCellKey(x, y)]: true },
  };
}

export function manhattanStreetCells(
  from: { x: number; y: number },
  to: { x: number; y: number },
): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [{ x: from.x, y: from.y }];
  const stepX = Math.sign(to.x - from.x);
  const stepY = Math.sign(to.y - from.y);
  let x = from.x;
  let y = from.y;
  while (x !== to.x) {
    x += stepX;
    cells.push({ x, y });
  }
  while (y !== to.y) {
    y += stepY;
    cells.push({ x, y });
  }
  return cells;
}

function isWalkableStreetCell(state: PrecinctState, x: number, y: number): boolean {
  if (!inBounds(state, x, y, 1, 1)) return false;
  if (isPrecinctStadiumCell(x, y)) return false;
  if (!isOwnedCell(state, x, y)) return false;
  if (patchAt(state, x, y)) return false;
  return true;
}

const STREET_DIRS = [
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: 0, y: 1 },
] as const;

export function pathBuildingToCity(
  state: PrecinctState,
  building: PrecinctBuilding,
): Array<{ x: number; y: number }> | null {
  const patch = state.patches.find((entry) => entry.building === building);
  if (!patch) return null;
  return pathFootprintToCity(state, patch.x, patch.y, patch.w, patch.h);
}

export function pathFootprintToCity(
  state: PrecinctState,
  x: number,
  y: number,
  w: number,
  h: number,
): Array<{ x: number; y: number }> | null {
  if (footprintDocksStreetNetwork(state, x, y, w, h)) return [];
  const starts = rectEdgeCells(x, y, w, h).filter((cell) => isWalkableStreetCell(state, cell.x, cell.y));
  if (starts.length === 0) return null;
  const connected = streetsConnectedToCityLink(state);
  const cameFrom = new Map<string, string | null>();
  const queue: Array<{ x: number; y: number }> = [];
  for (const start of starts) {
    const key = precinctCellKey(start.x, start.y);
    if (cameFrom.has(key)) continue;
    cameFrom.set(key, null);
    queue.push(start);
  }
  let goal: { x: number; y: number } | null = null;
  while (queue.length > 0) {
    const cell = queue.shift()!;
    const key = precinctCellKey(cell.x, cell.y);
    if (isCityRampCell(cell.x, cell.y) || connected.has(key)) {
      goal = cell;
      break;
    }
    for (const dir of STREET_DIRS) {
      const next = { x: cell.x + dir.x, y: cell.y + dir.y };
      const nextKey = precinctCellKey(next.x, next.y);
      if (cameFrom.has(nextKey)) continue;
      if (!isWalkableStreetCell(state, next.x, next.y)) continue;
      cameFrom.set(nextKey, key);
      queue.push(next);
    }
  }
  if (!goal) return null;
  const path: Array<{ x: number; y: number }> = [];
  let cursor: string | null = precinctCellKey(goal.x, goal.y);
  while (cursor) {
    const [cx, cy] = cursor.split(",").map(Number);
    path.push({ x: cx!, y: cy! });
    cursor = cameFrom.get(cursor) ?? null;
  }
  return path.reverse();
}

export function pathArenaToCity(state: PrecinctState): Array<{ x: number; y: number }> | null {
  return pathFootprintToCity(
    state,
    PRECINCT_STADIUM.x,
    PRECINCT_STADIUM.y,
    PRECINCT_STADIUM.w,
    PRECINCT_STADIUM.h,
  );
}

export type StreetRunKind = "paint" | "exist" | "blocked";

export function classifyStreetRun(
  state: PrecinctState,
  cells: Array<{ x: number; y: number }>,
  cash: number,
): { cells: Array<{ x: number; y: number; kind: StreetRunKind }>; cost: number } {
  let remaining = cash;
  let cost = 0;
  const classified: Array<{ x: number; y: number; kind: StreetRunKind }> = [];
  for (const cell of cells) {
    if (isStreetCell(state, cell.x, cell.y)) {
      classified.push({ ...cell, kind: "exist" });
      continue;
    }
    const check = canPlaceStreet(state, cell.x, cell.y, remaining);
    if (check.allowed) {
      classified.push({ ...cell, kind: "paint" });
      remaining -= check.cost;
      cost += check.cost;
      continue;
    }
    classified.push({ ...cell, kind: "blocked" });
  }
  return { cells: classified, cost };
}

export function placeStreetRun(
  state: PrecinctState,
  cells: Array<{ x: number; y: number }>,
  cash: number,
): { state: PrecinctState; spent: number } {
  let next = state;
  let remaining = cash;
  let spent = 0;
  for (const cell of cells) {
    if (isStreetCell(next, cell.x, cell.y)) continue;
    const check = canPlaceStreet(next, cell.x, cell.y, remaining);
    if (check.reason === "Nicht genug Cash.") break;
    if (!check.allowed) continue;
    next = placeStreet(next, cell.x, cell.y);
    remaining -= check.cost;
    spent += check.cost;
  }
  return { state: next, spent };
}

export function streetLinks(
  state: PrecinctState,
  x: number,
  y: number,
): { n: boolean; e: boolean; s: boolean; w: boolean } {
  return {
    n: isStreetCell(state, x, y - 1) || isCityLinkCell(x, y - 1),
    e: isStreetCell(state, x + 1, y),
    s: isStreetCell(state, x, y + 1),
    w: isStreetCell(state, x - 1, y),
  };
}

function rectEdgeCells(
  x: number,
  y: number,
  w: number,
  h: number,
): Array<{ x: number; y: number }> {
  const neighbors = [
    { x: x - 1, y, w: 1, h },
    { x: x + w, y, w: 1, h },
    { x, y: y - 1, w, h: 1 },
    { x, y: y + h, w, h: 1 },
  ];
  return neighbors.flatMap((edge) => rectangleCells(edge.x, edge.y, edge.w, edge.h));
}

function patchEdgeCells(patch: PrecinctPatch): Array<{ x: number; y: number }> {
  return rectEdgeCells(patch.x, patch.y, patch.w, patch.h);
}

export function patchTouchesStreet(state: PrecinctState, building: PrecinctBuilding): boolean {
  const patch = state.patches.find((entry) => entry.building === building);
  if (!patch) return false;
  return patchEdgeCells(patch).some((cell) => isStreetCell(state, cell.x, cell.y));
}

export function patchTouchesCityLink(patch: PrecinctPatch): boolean {
  return patchEdgeCells(patch).some((cell) => isCityLinkCell(cell.x, cell.y));
}

function streetsConnectedToCityLink(state: PrecinctState): Set<string> {
  const seen = new Set<string>();
  const queue: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      if (!isStreetCell(state, x, y)) continue;
      if (!isCityRampCell(x, y)) continue;
      const key = precinctCellKey(x, y);
      seen.add(key);
      queue.push({ x, y });
    }
  }
  const dirs = [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 1 },
  ];
  while (queue.length > 0) {
    const cell = queue.pop()!;
    for (const dir of dirs) {
      const nx = cell.x + dir.x;
      const ny = cell.y + dir.y;
      const key = precinctCellKey(nx, ny);
      if (seen.has(key)) continue;
      if (!isStreetCell(state, nx, ny)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

export function footprintDocksStreetNetwork(
  state: PrecinctState,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const edges = rectEdgeCells(x, y, w, h);
  if (edges.some((cell) => isCityLinkCell(cell.x, cell.y))) return true;
  const connected = streetsConnectedToCityLink(state);
  if (connected.size === 0) return false;
  return edges.some((cell) => connected.has(precinctCellKey(cell.x, cell.y)));
}

export function patchDocksStreetNetwork(state: PrecinctState, patch: PrecinctPatch): boolean {
  return footprintDocksStreetNetwork(state, patch.x, patch.y, patch.w, patch.h);
}

export function arenaDocksStreetNetwork(state: PrecinctState): boolean {
  return footprintDocksStreetNetwork(
    state,
    PRECINCT_STADIUM.x,
    PRECINCT_STADIUM.y,
    PRECINCT_STADIUM.w,
    PRECINCT_STADIUM.h,
  );
}

export function buildingDocksStreetNetwork(
  state: PrecinctState,
  building: PrecinctBuilding,
): boolean {
  return state.patches.some(
    (patch) => patch.building === building && patchDocksStreetNetwork(state, patch),
  );
}

export function dockedOccupiedCells(state: PrecinctState, building: PrecinctBuilding): number {
  return state.patches
    .filter((patch) => patch.building === building && patchDocksStreetNetwork(state, patch))
    .reduce((sum, patch) => sum + patch.w * patch.h, 0);
}

export function patchDocksCityLink(state: PrecinctState, building: PrecinctBuilding): boolean {
  return buildingDocksStreetNetwork(state, building);
}

export function precinctUpgradeCost(state: PrecinctState, building: PrecinctBuilding): number {
  const def = precinctBuildingDef(building);
  if (def.maxLevel <= 1) return 0;
  const level = precinctBuildingLevel(state, building);
  if (level <= 0 || level >= def.maxLevel) return 0;
  return Math.round(def.upgradeCost * (1 + (level - 1) * 0.35));
}

export function canUpgradePrecinctBuilding(
  state: PrecinctState,
  building: PrecinctBuilding,
  cash: number,
): { allowed: boolean; cost: number; reason?: string } {
  const def = precinctBuildingDef(building);
  if (def.maxLevel <= 1) return { allowed: false, cost: 0, reason: "Nicht ausbaubar." };
  const level = precinctBuildingLevel(state, building);
  if (level <= 0) return { allowed: false, cost: 0, reason: "Erst platzieren." };
  if (level >= def.maxLevel) return { allowed: false, cost: 0, reason: "Maximalstufe." };
  const cost = precinctUpgradeCost(state, building);
  if (cash < cost) return { allowed: false, cost, reason: "Nicht genug Cash." };
  return { allowed: true, cost };
}

export function upgradePrecinctBuilding(state: PrecinctState, building: PrecinctBuilding): PrecinctState {
  const check = canUpgradePrecinctBuilding(state, building, Number.POSITIVE_INFINITY);
  if (!check.allowed) return state;
  const level = precinctBuildingLevel(state, building);
  return {
    ...state,
    levels: { ...state.levels, [building]: level + 1 },
  };
}

function migrateLegacyCells(
  cells: Record<string, PrecinctBuilding>,
  offsetX: number,
  offsetY: number,
): PrecinctPatch[] {
  const known = new Set(PRECINCT_BUILDINGS.map((entry) => entry.id));
  const patches: PrecinctPatch[] = [];
  const uniquePlaced = new Set<PrecinctBuilding>();
  for (const [key, building] of Object.entries(cells)) {
    if (!known.has(building)) continue;
    const [rawX, rawY] = key.split(",").map(Number);
    if (rawX == null || rawY == null || Number.isNaN(rawX) || Number.isNaN(rawY)) continue;
    const x = rawX + offsetX;
    const y = rawY + offsetY;
    if (isPrecinctStadiumCell(x, y)) continue;
    const def = precinctBuildingDef(building);
    if (def.cap === "unique") {
      if (uniquePlaced.has(building)) continue;
      uniquePlaced.add(building);
    }
    patches.push({
      id: newPatchId(building, x, y),
      building,
      x,
      y,
      w: def.minW,
      h: def.minH,
    });
  }
  return patches;
}

export function normalizePrecinct(state?: PrecinctState & { cells?: Record<string, PrecinctBuilding> }): PrecinctState {
  const next = emptyPrecinct();
  if (!state) return next;
  const legacyWidth = state.width ?? (state.cells ? 8 : PRECINCT_WIDTH);
  const legacyHeight = state.height ?? (state.cells ? 6 : PRECINCT_HEIGHT);
  const offsetX = legacyWidth < PRECINCT_WIDTH ? Math.floor((PRECINCT_WIDTH - legacyWidth) / 2) : 0;
  const offsetY = legacyHeight < PRECINCT_HEIGHT ? Math.floor((PRECINCT_HEIGHT - legacyHeight) / 2) : 0;
  let patches = Array.isArray(state.patches) ? state.patches.map((patch) => ({ ...patch })) : [];
  if (patches.length === 0 && state.cells) {
    patches = migrateLegacyCells(state.cells, offsetX, offsetY);
  } else if (offsetX || offsetY) {
    patches = patches.map((patch) => ({ ...patch, x: patch.x + offsetX, y: patch.y + offsetY }));
  }
  const owned = { ...next.owned, ...shiftTrueMap(state.owned, offsetX, offsetY) };
  if (legacyWidth === 12) grantTouchedExpansions(owned);
  const valid: PrecinctPatch[] = [];
  const uniquePlaced = new Set<PrecinctBuilding>();
  let seed: PrecinctState = { ...next, owned, patches: [] };
  for (const patch of patches) {
    if (!BUILDING_BY_ID.has(patch.building)) continue;
    const def = precinctBuildingDef(patch.building);
    if (def.cap === "unique" && uniquePlaced.has(patch.building)) continue;
    const w = Math.max(def.minW, patch.w || def.minW);
    const h = Math.max(def.minH, patch.h || def.minH);
    const fit = findFreeRectangle(seed, w, h, patch.x, patch.y);
    if (!fit) continue;
    if (def.cap === "unique") uniquePlaced.add(patch.building);
    const nextPatch = {
      ...patch,
      x: fit.x,
      y: fit.y,
      w,
      h,
      id: patch.id || newPatchId(patch.building, fit.x, fit.y),
    };
    valid.push(nextPatch);
    seed = { ...seed, owned, patches: valid };
  }
  for (const patch of valid) {
    for (const cell of rectangleCells(patch.x, patch.y, patch.w, patch.h)) {
      if (!isPrecinctStadiumCell(cell.x, cell.y)) {
        owned[precinctCellKey(cell.x, cell.y)] = true;
      }
    }
  }
  const streets = { ...next.streets, ...shiftTrueMap(state.streets, offsetX, offsetY) };
  for (const key of Object.keys(streets)) {
    const [sx, sy] = key.split(",").map(Number);
    if (sx == null || sy == null || Number.isNaN(sx) || Number.isNaN(sy)) {
      delete streets[key];
      continue;
    }
    if (isPrecinctStadiumCell(sx, sy) || valid.some((patch) => patchCovers(patch, sx, sy))) {
      delete streets[key];
    }
  }
  const levels: PrecinctState["levels"] = {};
  for (const def of PRECINCT_BUILDINGS) {
    if (valid.some((patch) => patch.building === def.id)) {
      const stored = state.levels?.[def.id] ?? 1;
      levels[def.id] = Math.min(def.maxLevel, Math.max(1, stored));
    }
  }
  return { ...next, patches: valid, owned: ensureFullPrecinctOwned(owned), streets, levels };
}
