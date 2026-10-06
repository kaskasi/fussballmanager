import type { ScoutMapEdge } from "./scout-route-puzzle.ts";

export interface ScoutMapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  careerClubId?: string;
}

export interface ScoutZoneMapLayout {
  zoneId: string;
  flavorAsset: string;
  reliefViewBox: string;
  nodes: readonly ScoutMapNode[];
  edges: readonly ScoutMapEdge[];
}

export const SCOUT_RELIEF_MAP_ASSET = "/assets/scout-maps/scout-germany-relief.svg";

export const SCOUT_ZONE_MAP_LAYOUTS: Record<string, ScoutZoneMapLayout> = {
  foerde: {
    zoneId: "foerde",
    flavorAsset: "/assets/scout-maps/flavor/foerde.jpg",
    reliefViewBox: "180 40 320 280",
    nodes: [
      { id: "flensburg", label: "Flensburg", x: 22, y: 28 },
      { id: "gluecksburg", label: "Glücksburg", x: 38, y: 22 },
      { id: "kappeln", label: "Kappeln", x: 55, y: 35 },
      { id: "eckernfoerde", label: "Eckernförde", x: 72, y: 48 },
      { id: "kiel", label: "Kiel", x: 48, y: 62 },
      { id: "laboe", label: "Laboe", x: 65, y: 72 },
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
    reliefViewBox: "120 20 400 320",
    nodes: [
      { id: "husum", label: "Husum", x: 25, y: 70 },
      { id: "heide", label: "Heide", x: 42, y: 55 },
      { id: "itzehoe", label: "Itzehoe", x: 55, y: 40 },
      { id: "meldorf", label: "Meldorf", x: 38, y: 78 },
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
    reliefViewBox: "200 380 280 240",
    nodes: [
      { id: "bremen", label: "Bremen", x: 40, y: 50 },
      { id: "bremerhaven", label: "Bremerhaven", x: 28, y: 72 },
      { id: "hamburg", label: "Hamburg", x: 68, y: 35 },
    ],
    edges: [
      { id: "h1", a: "bremen", b: "bremerhaven", length: 22 },
      { id: "h2", a: "bremen", b: "hamburg", length: 26 },
    ],
  },
  nordfries: {
    zoneId: "nordfries",
    flavorAsset: "/assets/scout-maps/flavor/nordfries.jpg",
    reliefViewBox: "40 10 360 300",
    nodes: [
      { id: "sylt", label: "Sylt", x: 18, y: 30 },
      { id: "westerland", label: "Westerland", x: 22, y: 42 },
      { id: "niebuell", label: "Niebüll", x: 45, y: 38 },
      { id: "tondern", label: "Tönning", x: 62, y: 55 },
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
