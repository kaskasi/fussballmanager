import { clubsInZone } from "./scout-discovery.ts";
import { realCityByName } from "../world/real-cities.ts";
import type { WorldClub } from "../world/world-generator.ts";

export const SCOUT_RELIEF_WIDTH = 1073.381;
export const SCOUT_RELIEF_HEIGHT = 1271.953;

/** Wikimedia “Relief map of Germany” geographic bounds (plate carrée). */
export const RELIEF_GEO_BOUNDS = {
  west: 5.866_315_3,
  east: 15.041_931_9,
  south: 47.270_111_4,
  north: 55.058_563_6,
} as const;

export interface ScoutMapGeoLayout {
  mapMode?: "relief" | "city";
  cityMapBounds?: GeoBounds;
  /** When set, city pins use this SVG user box (not 0–100). */
  citySvgViewBox?: string;
}

export interface GeoBounds {
  west: number;
  east: number;
  south: number;
  north: number;
}

export function geoToReliefSvg(lat: number, lon: number): { x: number; y: number } {
  const { west, east, south, north } = RELIEF_GEO_BOUNDS;
  return {
    x: ((lon - west) / (east - west)) * SCOUT_RELIEF_WIDTH,
    y: ((north - lat) / (north - south)) * SCOUT_RELIEF_HEIGHT,
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

export function parseSvgViewBox(viewBox: string): { x: number; y: number; w: number; h: number } {
  const [x, y, w, h] = viewBox.split(/\s+/).map(Number);
  return { x: x ?? 0, y: y ?? 0, w: w ?? 100, h: h ?? 100 };
}

/** WGS84 point projected into an SVG viewBox that matches geographic bounds. */
export function geoToBoundedSvg(
  lat: number,
  lon: number,
  bounds: GeoBounds,
  svgViewBox: string,
): { x: number; y: number } {
  const { x: vx, y: vy, w: vw, h: vh } = parseSvgViewBox(svgViewBox);
  return {
    x: vx + ((lon - bounds.west) / (bounds.east - bounds.west)) * vw,
    y: vy + ((bounds.north - lat) / (bounds.north - bounds.south)) * vh,
  };
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

/** Fit relief clip to all club cities in a scout zone. */
export function reliefViewBoxForZoneClubs(
  zoneId: string,
  worldClubs: readonly WorldClub[],
  padding = 36,
): string {
  const clubs = clubsInZone(worldClubs, zoneId);
  const points: { x: number; y: number }[] = [];
  for (const club of clubs) {
    if (!club.place) continue;
    const city = realCityByName(club.place);
    if (!city) continue;
    points.push(geoToReliefSvg(city.lat, city.lon));
  }
  return reliefViewBoxAroundPoints(points, padding);
}

/** Fit city-map clip to club cities (Bremen SVG space or 0–100). */
export function citySvgViewBoxForZoneClubs(
  zoneId: string,
  worldClubs: readonly WorldClub[],
  layout: ScoutMapGeoLayout,
  padding = 36,
): string {
  if (layout.mapMode !== "city" || !layout.cityMapBounds) {
    return "0 0 100 100";
  }
  const fullBox = layout.citySvgViewBox ?? "0 0 100 100";
  const clubs = clubsInZone(worldClubs, zoneId);
  const points: { x: number; y: number }[] = [];
  for (const club of clubs) {
    if (!club.place) continue;
    const city = realCityByName(club.place);
    if (!city) continue;
    points.push(
      layout.citySvgViewBox
        ? geoToBoundedSvg(city.lat, city.lon, layout.cityMapBounds, layout.citySvgViewBox)
        : geoToLocalMap(city.lat, city.lon, layout.cityMapBounds),
    );
  }
  if (points.length === 0) return fullBox;
  const clip = reliefViewBoxAroundPoints(points, padding);
  if (!layout.citySvgViewBox) return clip;
  const { x: fx, y: fy, w: fw, h: fh } = parseSvgViewBox(fullBox);
  const clipBox = parseSvgViewBox(clip);
  const x = Math.max(fx, clipBox.x);
  const y = Math.max(fy, clipBox.y);
  const x2 = Math.min(fx + fw, clipBox.x + clipBox.w);
  const y2 = Math.min(fy + fh, clipBox.y + clipBox.h);
  return `${x} ${y} ${Math.max(1, x2 - x)} ${Math.max(1, y2 - y)}`;
}

export function mapCoordsForPlace(
  place: string,
  layout: ScoutMapGeoLayout,
): { x: number; y: number } | null {
  const city = realCityByName(place);
  if (!city) return null;
  if (layout.mapMode === "city" && layout.cityMapBounds) {
    if (layout.citySvgViewBox) {
      return geoToBoundedSvg(city.lat, city.lon, layout.cityMapBounds, layout.citySvgViewBox);
    }
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
