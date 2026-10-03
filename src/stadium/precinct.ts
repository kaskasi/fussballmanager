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
  | "clubhouse";

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

export const PRECINCT_WIDTH = 12;
export const PRECINCT_HEIGHT = 10;

/** Playable core around the stadium — the old 8×6 feel, offset onto 12×10. */
export const PRECINCT_CORE = { x: 1, y: 1, w: 10, h: 8 } as const;

/** Stadium footprint — not a placeable building. */
export const PRECINCT_STADIUM = { x: 4, y: 4, w: 4, h: 2 } as const;

export const PRECINCT_PARCEL_COST = 90_000;
export const PRECINCT_STREET_COST = 15_000;

export const PRECINCT_BUILDINGS: readonly PrecinctBuildingDef[] = [
  {
    id: "kiosk",
    icon: "🌭",
    label: "Würstchenbude",
    cost: 95_000,
    cap: "many",
    minW: 1,
    minH: 1,
    maxLevel: 1,
    upgradeCost: 0,
    hint: "Mehrere Buden · 1×1",
  },
  {
    id: "beer_tent",
    icon: "🍺",
    label: "Bierzelt",
    cost: 85_000,
    cap: "unique",
    minW: 2,
    minH: 2,
    maxLevel: 1,
    upgradeCost: 0,
    hint: "Nur eines · 2×2, skalierbar",
  },
  {
    id: "fanshop",
    icon: "👕",
    label: "Fanshop",
    cost: 220_000,
    cap: "unique",
    minW: 2,
    minH: 2,
    maxLevel: 3,
    upgradeCost: 160_000,
    hint: "Nur einer · 2×2 · Ausbau: Fanwachstum",
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
    hint: "Nur eine · dockt an Straße",
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
    hint: "Nur eine · 2×3 · dockt an Straße",
  },
  {
    id: "training_ground",
    icon: "🏃",
    label: "Trainingsgelände",
    cost: 450_000,
    cap: "unique",
    minW: 3,
    minH: 3,
    maxLevel: 2,
    upgradeCost: 720_000,
    hint: "Nur eines · 3×3 · Ausbau zur Halle",
  },
  {
    id: "training_pitch",
    icon: "🟩",
    label: "Trainingsplatz",
    cost: 180_000,
    cap: "unique",
    minW: 2,
    minH: 3,
    maxLevel: 1,
    upgradeCost: 0,
    hint: "Nur einer · min. 2×3",
  },
  {
    id: "youth_pitch",
    icon: "🌱",
    label: "Jugendplatz",
    cost: 160_000,
    cap: "unique",
    minW: 2,
    minH: 2,
    maxLevel: 1,
    upgradeCost: 0,
    hint: "Nur einer · min. 2×2",
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
    hint: "Nur einer · 1×2",
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

export function defaultOwnedCells(): Record<string, true> {
  const owned: Record<string, true> = {};
  for (let y = PRECINCT_CORE.y; y < PRECINCT_CORE.y + PRECINCT_CORE.h; y += 1) {
    for (let x = PRECINCT_CORE.x; x < PRECINCT_CORE.x + PRECINCT_CORE.w; x += 1) {
      if (isPrecinctStadiumCell(x, y)) continue;
      owned[precinctCellKey(x, y)] = true;
    }
  }
  return owned;
}

export function emptyPrecinct(): PrecinctState {
  return {
    width: PRECINCT_WIDTH,
    height: PRECINCT_HEIGHT,
    patches: [],
    owned: defaultOwnedCells(),
    streets: {},
    levels: {},
  };
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

function parcelTouchesOwned(state: PrecinctState, x: number, y: number): boolean {
  const neighbors = [
    { x: x - 1, y },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 },
  ];
  return neighbors.some(
    (cell) => isOwnedCell(state, cell.x, cell.y) || isPrecinctStadiumCell(cell.x, cell.y),
  );
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

export function buildingNeedsStreetDock(building: PrecinctBuilding): boolean {
  return building === "bus" || building === "transit";
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

export function precinctNudgeCost(patch: PrecinctPatch, edge: PrecinctEdge, delta: 1 | -1 = 1): number {
  const next = patchRectOnEdge(patch, edge, delta);
  if (!next) return 0;
  const extra = next.w * next.h - patch.w * patch.h;
  if (extra <= 0) return 0;
  return extra * extraCellCost(patch.building);
}

export function canNudgePrecinctPatch(
  state: PrecinctState,
  patchId: string,
  edge: PrecinctEdge,
  cash: number,
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
  if (cost > cash) return { allowed: false, cost, reason: "Nicht genug Cash." };
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
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) {
    return { allowed: false, cost: 0, reason: "Außerhalb." };
  }
  if (isPrecinctStadiumCell(x, y)) return { allowed: false, cost: 0, reason: "Stadion." };
  if (isOwnedCell(state, x, y)) return { allowed: false, cost: 0, reason: "Schon Gelände." };
  if (!parcelTouchesOwned(state, x, y)) {
    return { allowed: false, cost: PRECINCT_PARCEL_COST, reason: "Nur an eigenes Gelände." };
  }
  if (cash < PRECINCT_PARCEL_COST) {
    return { allowed: false, cost: PRECINCT_PARCEL_COST, reason: "Nicht genug Cash." };
  }
  return { allowed: true, cost: PRECINCT_PARCEL_COST };
}

export function buyPrecinctParcel(state: PrecinctState, x: number, y: number): PrecinctState {
  const check = canBuyPrecinctParcel(state, x, y, Number.POSITIVE_INFINITY);
  if (!check.allowed) return state;
  return {
    ...state,
    owned: { ...state.owned, [precinctCellKey(x, y)]: true },
  };
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

function patchEdgeCells(patch: PrecinctPatch): Array<{ x: number; y: number }> {
  const neighbors = [
    { x: patch.x - 1, y: patch.y, w: 1, h: patch.h },
    { x: patch.x + patch.w, y: patch.y, w: 1, h: patch.h },
    { x: patch.x, y: patch.y - 1, w: patch.w, h: 1 },
    { x: patch.x, y: patch.y + patch.h, w: patch.w, h: 1 },
  ];
  return neighbors.flatMap((edge) => rectangleCells(edge.x, edge.y, edge.w, edge.h));
}

export function patchTouchesStreet(state: PrecinctState, building: PrecinctBuilding): boolean {
  const patch = state.patches.find((entry) => entry.building === building);
  if (!patch) return false;
  return patchEdgeCells(patch).some((cell) => isStreetCell(state, cell.x, cell.y));
}

function findDockStreetCell(
  state: PrecinctState,
  patch: PrecinctPatch,
): { x: number; y: number } | null {
  for (const cell of patchEdgeCells(patch)) {
    if (!inBounds(state, cell.x, cell.y, 1, 1)) continue;
    if (isPrecinctStadiumCell(cell.x, cell.y)) continue;
    if (!isOwnedCell(state, cell.x, cell.y)) continue;
    if (patchAt(state, cell.x, cell.y)) continue;
    if (isStreetCell(state, cell.x, cell.y)) continue;
    return cell;
  }
  return null;
}

function ensureDockStreets(state: PrecinctState): Record<string, true> {
  const streets = { ...state.streets };
  let seeded: PrecinctState = { ...state, streets };
  for (const building of ["bus", "transit"] as const) {
    if (patchTouchesStreet(seeded, building)) continue;
    const patch = seeded.patches.find((entry) => entry.building === building);
    if (!patch) continue;
    const cell = findDockStreetCell(seeded, patch);
    if (!cell) continue;
    streets[precinctCellKey(cell.x, cell.y)] = true;
    seeded = { ...seeded, streets };
  }
  return streets;
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
  const owned = { ...next.owned };
  if (state.owned) {
    for (const [key, value] of Object.entries(state.owned)) {
      if (value) owned[key] = true;
    }
  }
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
  const streets: Record<string, true> = {};
  for (const [key, value] of Object.entries(state.streets ?? {})) {
    if (!value) continue;
    const [sx, sy] = key.split(",").map(Number);
    if (sx == null || sy == null || Number.isNaN(sx) || Number.isNaN(sy)) continue;
    if (valid.some((patch) => patchCovers(patch, sx, sy))) continue;
    streets[key] = true;
  }
  const levels: PrecinctState["levels"] = {};
  for (const def of PRECINCT_BUILDINGS) {
    if (valid.some((patch) => patch.building === def.id)) {
      const stored = state.levels?.[def.id] ?? 1;
      levels[def.id] = Math.min(def.maxLevel, Math.max(1, stored));
    }
  }
  const docked = ensureDockStreets({ ...next, patches: valid, owned, streets, levels });
  return { ...next, patches: valid, owned, streets: docked, levels };
}
