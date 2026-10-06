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

export interface ScoutZoneMapLayout {
  zoneId: string;
  flavorAsset: string;
  reliefViewBox: string;
  /** Road junctions / cities in relief coordinates. */
  anchorNodes: readonly Omit<ScoutMapNode, "careerClubId" | "discovered" | "scoutable">[];
  edges: readonly ScoutMapEdge[];
}

export const SCOUT_RELIEF_MAP_ASSET = "/assets/scout-maps/scout-germany-relief.svg";
export const SCOUT_RELIEF_WIDTH = 1073.381;
export const SCOUT_RELIEF_HEIGHT = 1271.953;

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

export const SCOUT_ZONE_MAP_LAYOUTS: Record<string, ScoutZoneMapLayout> = {
  foerde: {
    zoneId: "foerde",
    flavorAsset: "/assets/scout-maps/flavor/foerde.jpg",
    reliefViewBox: "520 80 220 200",
    anchorNodes: [
      { id: "flensburg", label: "Flensburg", x: 545, y: 95 },
      { id: "gluecksburg", label: "Glücksburg", x: 560, y: 110 },
      { id: "kappeln", label: "Kappeln", x: 610, y: 130 },
      { id: "eckernfoerde", label: "Eckernförde", x: 680, y: 175 },
      { id: "kiel", label: "Kiel", x: 620, y: 210 },
      { id: "laboe", label: "Laboe", x: 665, y: 245 },
    ],
    edges: [
      { id: "e1", a: "flensburg", b: "gluecksburg", length: 12 },
      { id: "e2", a: "gluecksburg", b: "kappeln", length: 18 },
      { id: "e3", a: "kappeln", b: "eckernfoerde", length: 16 },
      { id: "e4", a: "kappeln", b: "kiel", length: 20 },
      { id: "e5", a: "kiel", b: "laboe", length: 14 },
      { id: "e6", a: "eckernfoerde", b: "laboe", length: 11 },
      { id: "e7", a: "flensburg", b: "kappeln", length: 28 },
    ],
  },
  sh: {
    zoneId: "sh",
    flavorAsset: "/assets/scout-maps/flavor/sh.jpg",
    reliefViewBox: "480 200 280 260",
    anchorNodes: [
      { id: "husum", label: "Husum", x: 500, y: 320 },
      { id: "heide", label: "Heide", x: 560, y: 280 },
      { id: "itzehoe", label: "Itzehoe", x: 620, y: 240 },
      { id: "meldorf", label: "Meldorf", x: 530, y: 350 },
    ],
    edges: [
      { id: "s1", a: "husum", b: "heide", length: 15 },
      { id: "s2", a: "heide", b: "itzehoe", length: 18 },
      { id: "s3", a: "husum", b: "meldorf", length: 12 },
      { id: "s4", a: "heide", b: "meldorf", length: 14 },
    ],
  },
  hanse: {
    zoneId: "hanse",
    flavorAsset: "/assets/scout-maps/flavor/hanse.jpg",
    reliefViewBox: "520 420 240 220",
    anchorNodes: [
      { id: "bremen", label: "Bremen", x: 580, y: 500 },
      { id: "bremerhaven", label: "Bremerhaven", x: 540, y: 560 },
      { id: "hamburg", label: "Hamburg", x: 680, y: 460 },
    ],
    edges: [
      { id: "h1", a: "bremen", b: "bremerhaven", length: 22 },
      { id: "h2", a: "bremen", b: "hamburg", length: 26 },
    ],
  },
  nordfries: {
    zoneId: "nordfries",
    flavorAsset: "/assets/scout-maps/flavor/nordfries.jpg",
    reliefViewBox: "470 60 260 180",
    anchorNodes: [
      { id: "sylt", label: "Sylt", x: 490, y: 75 },
      { id: "westerland", label: "Westerland", x: 505, y: 95 },
      { id: "niebuell", label: "Niebüll", x: 560, y: 120 },
      { id: "tondern", label: "Tönning", x: 620, y: 160 },
    ],
    edges: [
      { id: "n1", a: "sylt", b: "westerland", length: 8 },
      { id: "n2", a: "westerland", b: "niebuell", length: 20 },
      { id: "n3", a: "niebuell", b: "tondern", length: 16 },
    ],
  },
};

export function layoutForZone(zoneId: string): ScoutZoneMapLayout | undefined {
  return SCOUT_ZONE_MAP_LAYOUTS[zoneId];
}

export function edgeBetween(
  layout: ScoutZoneMapLayout,
  nodeA: string,
  nodeB: string,
): ScoutMapEdge | undefined {
  return layout.edges.find(
    (edge) =>
      (edge.a === nodeA && edge.b === nodeB) || (edge.a === nodeB && edge.b === nodeA),
  );
}

/** Visible clubs on relief map; extras get hashed positions and connect to nearest anchor. */
export function buildZoneMapNodes(
  layout: ScoutZoneMapLayout,
  clubs: readonly ScoutMapClubPin[],
  activeClubScoutId?: string | null,
): ScoutMapNode[] {
  const visible = clubs.filter((club) => club.directoryVisible);
  const sorted = [...visible].sort((left, right) =>
    left.careerClubId.localeCompare(right.careerClubId),
  );
  const nodes: ScoutMapNode[] = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const club = sorted[index]!;
    const anchor = layout.anchorNodes[index];
    const coords = anchor
      ? { x: anchor.x, y: anchor.y }
      : clubPositionInZone(club.careerClubId, layout.reliefViewBox, index, sorted.length);
    const scoutable =
      !club.discovered &&
      club.directoryVisible &&
      (activeClubScoutId == null || activeClubScoutId === club.careerClubId);
    nodes.push({
      id: anchor?.id ?? club.careerClubId,
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
    if (!node?.careerClubId || node.discovered || !node.scoutable) continue;
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
