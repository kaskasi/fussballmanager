import { realCityByName } from "../world/real-cities.ts";
import {
  BREMEN_CITY_GEO_BOUNDS,
  BREMEN_CITY_SVG_VIEWBOX,
  extractPlaceFromClubName,
  geoToLocalMap,
  geoToReliefSvg,
  mapCoordsForPlace,
  SCOUT_RELIEF_HEIGHT,
  SCOUT_RELIEF_WIDTH,
  type GeoBounds,
} from "./scout-map-geo.ts";
import type { ScoutMapClubPin } from "./scout-region-map.ts";
import type { ScoutMapEdge } from "./scout-route-puzzle.ts";

export interface ScoutMapNode {
  id: string;
  label: string;
  /** Relief map coordinates (Germany SVG user space). */
  x: number;
  y: number;
  careerClubId?: string;
  discovered?: boolean;
  scoutable?: boolean;
}

export type ScoutZoneMapMode = "relief" | "city";

export const SCOUT_BREMEN_CITY_MAP_ASSET = "/assets/scout-maps/bremen-city.svg";

export interface ScoutZoneMapLayout {
  zoneId: string;
  mapMode: ScoutZoneMapMode;
  flavorAsset: string;
  /** Detail map base layer (city SVG); flavor JPEG is grid-only. */
  cityMapAsset?: string;
  reliefViewBox: string;
  cityMapBounds?: GeoBounds;
  citySvgViewBox?: string;
  /** Road junctions / cities in relief coordinates. */
  anchorNodes: readonly Omit<ScoutMapNode, "careerClubId" | "discovered" | "scoutable">[];
  edges: readonly ScoutMapEdge[];
}

export const SCOUT_RELIEF_MAP_ASSET = "/assets/scout-maps/scout-germany-relief.svg";
export { SCOUT_RELIEF_HEIGHT, SCOUT_RELIEF_WIDTH };

function cityNodeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function anchorFromCityName(
  name: string,
  layout: Pick<ScoutZoneMapLayout, "mapMode" | "cityMapBounds">,
): Omit<ScoutMapNode, "careerClubId" | "discovered" | "scoutable"> | null {
  const city = realCityByName(name);
  if (!city) return null;
  const coords =
    layout.mapMode === "city" && layout.cityMapBounds
      ? geoToLocalMap(city.lat, city.lon, layout.cityMapBounds)
      : geoToReliefSvg(city.lat, city.lon);
  return { id: cityNodeId(name), label: name, x: coords.x, y: coords.y };
}

function buildAnchors(
  cityNames: readonly string[],
  layout: Pick<ScoutZoneMapLayout, "mapMode" | "cityMapBounds">,
): Omit<ScoutMapNode, "careerClubId" | "discovered" | "scoutable">[] {
  const nodes: Omit<ScoutMapNode, "careerClubId" | "discovered" | "scoutable">[] = [];
  for (const name of cityNames) {
    const node = anchorFromCityName(name, layout);
    if (node) nodes.push(node);
  }
  return nodes;
}

function parseViewBox(viewBox: string): { x: number; y: number; w: number; h: number } {
  const [x, y, w, h] = viewBox.split(/\s+/).map(Number);
  return { x: x ?? 0, y: y ?? 0, w: w ?? SCOUT_RELIEF_WIDTH, h: h ?? SCOUT_RELIEF_HEIGHT };
}

/** Place extra clubs without a city anchor inside the zone viewBox. */
export function clubPositionInZone(
  careerClubId: string,
  reliefViewBox: string,
  index: number,
  total: number,
): { x: number; y: number } {
  const vb = parseViewBox(reliefViewBox);
  let hash = 0;
  for (const char of careerClubId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  const u = ((hash >>> 0) % 997) / 997;
  const v = (((hash >>> 10) >>> 0) % 997) / 997;
  const angle = (index / Math.max(1, total)) * Math.PI * 2;
  const cx = 0.52 + Math.cos(angle) * 0.22 + (u - 0.5) * 0.18;
  const cy = 0.48 + Math.sin(angle) * 0.22 + (v - 0.5) * 0.18;
  return { x: vb.x + cx * vb.w, y: vb.y + cy * vb.h };
}

const FOERDE_LAYOUT: Omit<ScoutZoneMapLayout, "anchorNodes"> = {
  zoneId: "foerde",
  mapMode: "relief",
  flavorAsset: "/assets/scout-maps/flavor/foerde.jpg",
  reliefViewBox: "520 80 220 200",
  edges: [
    { id: "e1", a: "flensburg", b: "schleswig", length: 12 },
    { id: "e2", a: "schleswig", b: "rendsburg", length: 18 },
    { id: "e3", a: "rendsburg", b: "eckernfoerde", length: 16 },
    { id: "e4", a: "rendsburg", b: "kiel", length: 20 },
    { id: "e5", a: "kiel", b: "neumuenster", length: 14 },
    { id: "e6", a: "eckernfoerde", b: "kiel", length: 11 },
    { id: "e7", a: "flensburg", b: "rendsburg", length: 28 },
  ],
};

const SH_LAYOUT: Omit<ScoutZoneMapLayout, "anchorNodes"> = {
  zoneId: "sh",
  mapMode: "relief",
  flavorAsset: "/assets/scout-maps/flavor/sh.jpg",
  reliefViewBox: "560 320 120 80",
  edges: [
    { id: "s1", a: "elmshorn", b: "glueckstadt", length: 15 },
    { id: "s2", a: "elmshorn", b: "kaltenkirchen", length: 18 },
    { id: "s3", a: "kaltenkirchen", b: "hasloh", length: 12 },
    { id: "s4", a: "hasloh", b: "pinneberg", length: 14 },
  ],
};

const HANSE_LAYOUT: Omit<ScoutZoneMapLayout, "anchorNodes"> = {
  zoneId: "hanse",
  mapMode: "city",
  flavorAsset: "/assets/scout-maps/flavor/hanse.jpg",
  cityMapAsset: SCOUT_BREMEN_CITY_MAP_ASSET,
  reliefViewBox: BREMEN_CITY_SVG_VIEWBOX,
  cityMapBounds: BREMEN_CITY_GEO_BOUNDS,
  citySvgViewBox: BREMEN_CITY_SVG_VIEWBOX,
  edges: [
    { id: "h1", a: "bremen", b: "bremerhaven", length: 22 },
    { id: "h2", a: "bremen", b: "hamburg", length: 26 },
    { id: "h3", a: "hamburg", b: "stade", length: 18 },
  ],
};

const NORDFRIES_LAYOUT: Omit<ScoutZoneMapLayout, "anchorNodes"> = {
  zoneId: "nordfries",
  mapMode: "relief",
  flavorAsset: "/assets/scout-maps/flavor/nordfries.jpg",
  reliefViewBox: "470 60 260 180",
  edges: [
    { id: "n1", a: "westerland", b: "niebuell", length: 20 },
    { id: "n2", a: "niebuell", b: "husum", length: 16 },
    { id: "n3", a: "husum", b: "toenning", length: 16 },
    { id: "n4", a: "toenning", b: "busum", length: 14 },
  ],
};

export const SCOUT_ZONE_MAP_LAYOUTS: Record<string, ScoutZoneMapLayout> = {
  foerde: {
    ...FOERDE_LAYOUT,
    anchorNodes: buildAnchors(
      ["Flensburg", "Schleswig", "Rendsburg", "Eckernförde", "Kiel", "Neumünster"],
      FOERDE_LAYOUT,
    ),
  },
  sh: {
    ...SH_LAYOUT,
    anchorNodes: buildAnchors(
      ["Elmshorn", "Glückstadt", "Kaltenkirchen", "Hasloh", "Pinneberg"],
      SH_LAYOUT,
    ),
  },
  hanse: {
    ...HANSE_LAYOUT,
    anchorNodes: buildAnchors(["Bremen", "Bremerhaven", "Hamburg", "Stade"], HANSE_LAYOUT),
  },
  nordfries: {
    ...NORDFRIES_LAYOUT,
    anchorNodes: buildAnchors(
      ["Westerland", "Niebüll", "Husum", "Tönning", "Büsum"],
      NORDFRIES_LAYOUT,
    ),
  },
};

export function layoutForZone(zoneId: string): ScoutZoneMapLayout | undefined {
  return SCOUT_ZONE_MAP_LAYOUTS[zoneId];
}

export function edgeBetween(
  edges: readonly ScoutMapEdge[],
  nodeA: string,
  nodeB: string,
): ScoutMapEdge | undefined {
  return edges.find(
    (edge) =>
      (edge.a === nodeA && edge.b === nodeB) || (edge.a === nodeB && edge.b === nodeA),
  );
}

/** Roads between visible club pins (deterministic mesh by distance). */
export function buildClubRoutingEdges(nodes: readonly ScoutMapNode[]): ScoutMapEdge[] {
  const maxDist = nodes.every((node) => node.x <= 100 && node.y <= 100) ? 35 : 85;
  const edges: ScoutMapEdge[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const left = nodes[i]!;
      const right = nodes[j]!;
      const dist = Math.hypot(left.x - right.x, left.y - right.y);
      if (dist > maxDist) continue;
      edges.push({
        id: `r-${left.id}-${right.id}`,
        a: left.id,
        b: right.id,
        length: Math.max(8, Math.round(dist / 8)),
      });
    }
  }
  return edges;
}

function placeForClubPin(club: ScoutMapClubPin): string | null {
  if (club.place) return club.place;
  return extractPlaceFromClubName(club.name);
}

/** Visible clubs on map; GPS-backed when `place` matches catalog, else hashed fallback. */
export function buildZoneMapNodes(
  layout: ScoutZoneMapLayout,
  clubs: readonly ScoutMapClubPin[],
  activeClubScoutId?: string | null,
  reliefViewBox?: string,
): ScoutMapNode[] {
  const viewBox = reliefViewBox ?? layout.reliefViewBox;
  const visible = clubs.filter((club) => club.directoryVisible);
  const sorted = [...visible].sort((left, right) =>
    left.careerClubId.localeCompare(right.careerClubId),
  );
  const nodes: ScoutMapNode[] = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const club = sorted[index]!;
    const place = placeForClubPin(club);
    const geoCoords = place ? mapCoordsForPlace(place, layout) : null;
    const coords =
      geoCoords ??
      clubPositionInZone(club.careerClubId, viewBox, index, sorted.length);
    const scoutable =
      club.directoryVisible &&
      (activeClubScoutId == null || activeClubScoutId === club.careerClubId);
    nodes.push({
      id: club.careerClubId,
      label: club.shortName,
      x: coords.x,
      y: coords.y,
      careerClubId: club.careerClubId,
      discovered: club.discovered,
      scoutable,
    });
  }
  return nodes;
}

/** Club nodes visited along a path (node ids in click order). */
export function clubsOnPath(
  pathNodeIds: readonly string[],
  nodes: readonly ScoutMapNode[],
): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node] as const));
  const out: string[] = [];
  for (const nodeId of pathNodeIds) {
    const node = byId.get(nodeId);
    if (!node?.careerClubId || !node.scoutable) continue;
    if (!out.includes(node.careerClubId)) out.push(node.careerClubId);
  }
  return out;
}

export function lastScoutableClubOnPath(
  pathNodeIds: readonly string[],
  nodes: readonly ScoutMapNode[],
): string | null {
  const list = clubsOnPath(pathNodeIds, nodes);
  return list.length > 0 ? list[list.length - 1]! : null;
}

/** Career club ids visited in path order (for trip completion). */
export function careerClubsOnPath(
  pathNodeIds: readonly string[],
  nodes: readonly ScoutMapNode[],
): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node] as const));
  const out: string[] = [];
  for (const nodeId of pathNodeIds) {
    const node = byId.get(nodeId);
    if (!node?.careerClubId || out.includes(node.careerClubId)) continue;
    out.push(node.careerClubId);
  }
  return out;
}
