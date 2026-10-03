export type PrecinctBuilding = "kiosk" | "fanshop" | "parking" | "transit";

export interface PrecinctState {
  width: number;
  height: number;
  /** Key `${x},${y}` → building. Each building type at most once. */
  cells: Record<string, PrecinctBuilding>;
}

export const PRECINCT_WIDTH = 8;
export const PRECINCT_HEIGHT = 6;

/** Stadium footprint in the centre of the 8×6 grid — not a placeable building. */
export const PRECINCT_STADIUM = { x: 2, y: 2, w: 4, h: 2 } as const;

export const PRECINCT_BUILDING_COST: Record<PrecinctBuilding, number> = {
  kiosk: 95_000,
  fanshop: 220_000,
  parking: 280_000,
  transit: 620_000,
};

export const PRECINCT_BUILDINGS: readonly {
  id: PrecinctBuilding;
  icon: string;
  label: string;
  cost: number;
}[] = [
  { id: "kiosk", icon: "🌭", label: "Würstchenbude", cost: PRECINCT_BUILDING_COST.kiosk },
  { id: "fanshop", icon: "👕", label: "Fanshop", cost: PRECINCT_BUILDING_COST.fanshop },
  { id: "parking", icon: "🅿️", label: "Parkplatz", cost: PRECINCT_BUILDING_COST.parking },
  { id: "transit", icon: "🚇", label: "S/U-Bahn", cost: PRECINCT_BUILDING_COST.transit },
];

export function emptyPrecinct(): PrecinctState {
  return { width: PRECINCT_WIDTH, height: PRECINCT_HEIGHT, cells: {} };
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

export function buildingAt(state: PrecinctState, x: number, y: number): PrecinctBuilding | undefined {
  return state.cells[precinctCellKey(x, y)];
}

export function findBuildingCell(
  state: PrecinctState,
  building: PrecinctBuilding,
): { x: number; y: number } | null {
  for (const [key, value] of Object.entries(state.cells)) {
    if (value !== building) continue;
    const [x, y] = key.split(",").map(Number);
    if (x == null || y == null || Number.isNaN(x) || Number.isNaN(y)) continue;
    return { x, y };
  }
  return null;
}

export function precinctBuildingCost(building: PrecinctBuilding): number {
  return PRECINCT_BUILDING_COST[building];
}

/** First placement costs; moving an owned building is free. */
export function precinctPlacementCost(state: PrecinctState, building: PrecinctBuilding): number {
  return findBuildingCell(state, building) ? 0 : precinctBuildingCost(building);
}

/** Place or move a unique building onto a free cell. Stadium cells are reserved. */
export function placePrecinctBuilding(
  state: PrecinctState,
  x: number,
  y: number,
  building: PrecinctBuilding,
): PrecinctState {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return state;
  if (isPrecinctStadiumCell(x, y)) return state;
  const occupant = buildingAt(state, x, y);
  if (occupant && occupant !== building) return state;
  const cells = { ...state.cells };
  const previous = findBuildingCell(state, building);
  if (previous) {
    delete cells[precinctCellKey(previous.x, previous.y)];
  }
  cells[precinctCellKey(x, y)] = building;
  return { ...state, cells };
}

export function clearPrecinctCell(state: PrecinctState, x: number, y: number): PrecinctState {
  if (isPrecinctStadiumCell(x, y)) return state;
  const cells = { ...state.cells };
  delete cells[precinctCellKey(x, y)];
  return { ...state, cells };
}

export function normalizePrecinct(state?: PrecinctState): PrecinctState {
  const next = emptyPrecinct();
  if (!state?.cells) return next;
  const cells: Record<string, PrecinctBuilding> = {};
  for (const [key, building] of Object.entries(state.cells)) {
    const [x, y] = key.split(",").map(Number);
    if (x == null || y == null || Number.isNaN(x) || Number.isNaN(y)) continue;
    if (isPrecinctStadiumCell(x, y)) continue;
    cells[precinctCellKey(x, y)] = building;
  }
  return { ...next, cells };
}
