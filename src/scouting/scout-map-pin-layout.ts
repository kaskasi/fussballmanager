import type { ScoutMapNode } from "./scout-map-layout.ts";
import type { ScoutMapEdge } from "./scout-route-puzzle.ts";

export interface ClubLogoPinLayout {
  pinX: number;
  pinY: number;
  logoX: number;
  logoY: number;
  labelX: number;
  labelY: number;
  badgeX: number;
  badgeY: number;
}

const PLACEMENT_DIRS: readonly { dx: number; dy: number }[] = [
  { dx: 1.05, dy: -0.15 },
  { dx: 1.05, dy: 0.55 },
  { dx: -1.05, dy: -0.15 },
  { dx: -1.05, dy: 0.55 },
  { dx: 0.2, dy: -1.05 },
  { dx: 0.2, dy: 1.05 },
];

function distPointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

function edgePenalty(
  logoCx: number,
  logoCy: number,
  nodeId: string,
  mapNodes: readonly ScoutMapNode[],
  edges: readonly ScoutMapEdge[],
  logoSize: number,
): number {
  const byId = new Map(mapNodes.map((node) => [node.id, node] as const));
  const avoidRadius = logoSize * 0.85;
  let penalty = 0;
  for (const edge of edges) {
    if (edge.a === nodeId || edge.b === nodeId) continue;
    const a = byId.get(edge.a);
    const b = byId.get(edge.b);
    if (!a || !b) continue;
    const dist = distPointToSegment(logoCx, logoCy, a.x, a.y, b.x, b.y);
    if (dist < avoidRadius) penalty += avoidRadius - dist;
  }
  return penalty;
}

/** Pin stays on the city node; logo + label sit beside it away from route lines when possible. */
export function pickClubLogoPinLayout(
  node: Pick<ScoutMapNode, "id" | "x" | "y" | "label">,
  mapNodes: readonly ScoutMapNode[],
  edges: readonly ScoutMapEdge[],
  logoSize: number,
): ClubLogoPinLayout {
  const pinX = node.x;
  const pinY = node.y;
  const half = logoSize / 2;
  const spread = logoSize * 0.95;

  let best = {
    penalty: Number.POSITIVE_INFINITY,
    logoCx: pinX + spread,
    logoCy: pinY - half * 0.2,
  };

  for (const dir of PLACEMENT_DIRS) {
    const logoCx = pinX + dir.dx * spread;
    const logoCy = pinY + dir.dy * spread;
    const penalty = edgePenalty(logoCx, logoCy, node.id, mapNodes, edges, logoSize);
    if (penalty < best.penalty) {
      best = { penalty, logoCx, logoCy };
    }
  }

  const logoX = best.logoCx - half;
  const logoY = best.logoCy - half;
  const labelOnRight = best.logoCx >= pinX;
  const labelX = labelOnRight ? best.logoCx + half + 1.5 : best.logoCx - half - 1.5;
  const labelY = best.logoCy + 1.5;

  return {
    pinX,
    pinY,
    logoX,
    logoY,
    labelX,
    labelY: labelY,
    badgeX: logoX + logoSize - 2,
    badgeY: logoY + 2,
  };
}
