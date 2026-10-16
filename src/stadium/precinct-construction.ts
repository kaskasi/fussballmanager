import { careerWeekIndex } from "./hospitality.ts";
import {
  placePrecinctBuilding,
  precinctBuildingDef,
  type PrecinctBuilding,
  type PrecinctBuildingDef,
  type PrecinctState,
} from "./precinct.ts";

/** Footprint sets the base, each further level adds a week. Streets stay instant. */
export function precinctBuildWeeks(def: PrecinctBuildingDef, nextLevel: number): number {
  const footprint = def.minW * def.minH;
  const base = footprint <= 1 ? 2 : footprint <= 4 ? 3 : 4;
  return base + Math.max(0, nextLevel - 1);
}

export function startPrecinctConstruction(
  state: PrecinctState,
  x: number,
  y: number,
  building: PrecinctBuilding,
  season: number,
  week: number,
): PrecinctState {
  const placed = placePrecinctBuilding(state, x, y, building);
  if (placed === state) return state;
  const weeks = precinctBuildWeeks(precinctBuildingDef(building), 1);
  const readyWeekIndex = careerWeekIndex(season, week) + weeks;
  const oldIds = new Set(state.patches.map((patch) => patch.id));
  const patches = placed.patches.map((patch) =>
    oldIds.has(patch.id) ? patch : { ...patch, constructing: true, readyWeekIndex },
  );
  const levels = { ...placed.levels };
  const hadOperational = state.patches.some(
    (patch) => patch.building === building && !patch.constructing,
  );
  if (!hadOperational) delete levels[building];
  return { ...placed, patches, levels };
}

export function startPrecinctUpgrade(
  state: PrecinctState,
  building: PrecinctBuilding,
  season: number,
  week: number,
): PrecinctState {
  const level = state.levels[building] ?? 1;
  const weeks = precinctBuildWeeks(precinctBuildingDef(building), level + 1);
  return {
    ...state,
    pendingUpgrades: {
      ...(state.pendingUpgrades ?? {}),
      [building]: careerWeekIndex(season, week) + weeks,
    },
  };
}

export function advancePrecinctConstruction(state: PrecinctState, weekIndex: number): PrecinctState {
  let changed = false;
  const patches = state.patches.map((patch) => {
    if (!patch.constructing || patch.readyWeekIndex == null || weekIndex < patch.readyWeekIndex) {
      return patch;
    }
    changed = true;
    return { ...patch, constructing: false, readyWeekIndex: undefined };
  });
  const levels = { ...state.levels };
  for (const patch of patches) {
    if (!patch.constructing && (levels[patch.building] ?? 0) < 1) {
      levels[patch.building] = 1;
      changed = true;
    }
  }
  const pendingUpgrades = { ...(state.pendingUpgrades ?? {}) };
  for (const [building, ready] of Object.entries(pendingUpgrades) as Array<
    [PrecinctBuilding, number | undefined]
  >) {
    if (ready == null || weekIndex < ready) continue;
    const current = levels[building] ?? 1;
    const max = precinctBuildingDef(building).maxLevel;
    levels[building] = Math.min(max, current + 1);
    delete pendingUpgrades[building];
    changed = true;
  }
  if (!changed) return state;
  return { ...state, patches, levels, pendingUpgrades };
}
