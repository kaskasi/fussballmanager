import { realCityByName } from "../world/real-cities.ts";

export const SCOUT_RELIEF_WIDTH = 1073.381;
export const SCOUT_RELIEF_HEIGHT = 1271.953;

export interface ScoutMapGeoLayout {
  mapMode?: "relief" | "city";
  cityMapBounds?: GeoBounds;
}

/** Affine WGS84 → `scout-germany-relief.svg` user space (calibrated to shipped asset). */
const RELIEF_AFFINE_X = {
  lon: 74.22872028865814,
  lat: -51.854285594355744,
  c: 2692.430011287098,
} as const;

const RELIEF_AFFINE_Y = {
  lon: -1.1497609034208978,
  lat: -226.50959516447904,
  c: 12547.542995425112,
} as const;

export interface GeoBounds {
  west: number;
  east: number;
  south: number;
  north: number;
}

/** Urban minigame canvas for Hansestadt (Bremen–Hamburg corridor). */
export const HANSE_CITY_MAP_BOUNDS: GeoBounds = {
  west: 8.45,
  east: 10.25,
  south: 53.02,
  north: 53.72,
};

export function geoToReliefSvg(lat: number, lon: number): { x: number; y: number } {
  return {
    x: RELIEF_AFFINE_X.lon * lon + RELIEF_AFFINE_X.lat * lat + RELIEF_AFFINE_X.c,
    y: RELIEF_AFFINE_Y.lon * lon + RELIEF_AFFINE_Y.lat * lat + RELIEF_AFFINE_Y.c,
  };
}

/** Local 0–100 coordinates inside a city / corridor map. */
export function geoToLocalMap(
  lat: number,
  lon: number,
  bounds: GeoBounds,
  size = 100,
): { x: number; y: number } {
  const x = ((lon - bounds.west) / (bounds.east - bounds.west)) * size;
  const y = ((bounds.north - lat) / (bounds.north - bounds.south)) * size;
  return { x, y };
}

export function reliefViewBoxAroundPoints(
  points: readonly { x: number; y: number }[],
  padding: number,
): string {
  if (points.length === 0) {
    return `0 0 ${SCOUT_RELIEF_WIDTH} ${SCOUT_RELIEF_HEIGHT}`;
  }
  let minX = points[0]!.x;
  let maxX = points[0]!.x;
  let minY = points[0]!.y;
  let maxY = points[0]!.y;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const x = Math.max(0, minX - padding);
  const y = Math.max(0, minY - padding);
  const w = Math.min(SCOUT_RELIEF_WIDTH - x, maxX - minX + padding * 2);
  const h = Math.min(SCOUT_RELIEF_HEIGHT - y, maxY - minY + padding * 2);
  return `${x} ${y} ${w} ${h}`;
}

export function mapCoordsForPlace(
  place: string,
  layout: ScoutMapGeoLayout,
): { x: number; y: number } | null {
  const city = realCityByName(place);
  if (!city) return null;
  if (layout.mapMode === "city" && layout.cityMapBounds) {
    return geoToLocalMap(city.lat, city.lon, layout.cityMapBounds);
  }
  return geoToReliefSvg(city.lat, city.lon);
}

export function extractPlaceFromClubName(clubName: string): string | null {
  for (const token of clubName.split(/\s+/)) {
    const cleaned = token.replace(/[^a-zA-ZäöüÄÖÜß-]/g, "");
    if (cleaned.length < 3) continue;
    if (realCityByName(cleaned)) return cleaned;
  }
  return null;
}
