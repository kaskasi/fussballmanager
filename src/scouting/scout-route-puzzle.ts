/** PRD 21 — route efficiency scoring (soft speed, no hard fail). */

export interface ScoutMapEdge {
  id: string;
  a: string;
  b: string;
  length: number;
}

export interface ScoutRouteScore {
  totalLength: number;
  edgeSteps: number;
  duplicateEdgeCount: number;
  allEdgesUnique: boolean;
  progressMultiplier: number;
  noDuplicateBonus: boolean;
}

/** Path is ordered edge ids from the zone layout. */
export function scoreScoutRoute(pathEdgeIds: readonly string[], edges: readonly ScoutMapEdge[]): ScoutRouteScore {
  const byId = new Map(edges.map((edge) => [edge.id, edge] as const));
  let totalLength = 0;
  const seen = new Map<string, number>();
  for (const id of pathEdgeIds) {
    const edge = byId.get(id);
    if (!edge) continue;
    totalLength += edge.length;
    seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  let duplicateEdgeCount = 0;
  for (const count of seen.values()) {
    if (count > 1) duplicateEdgeCount += count - 1;
  }
  const allEdgesUnique = pathEdgeIds.length > 0 && duplicateEdgeCount === 0;
  const progressMultiplier = Math.max(0.35, 1 / (1 + duplicateEdgeCount * 0.22));
  return {
    totalLength,
    edgeSteps: pathEdgeIds.length,
    duplicateEdgeCount,
    allEdgesUnique,
    progressMultiplier,
    noDuplicateBonus: allEdgesUnique && pathEdgeIds.length >= 2,
  };
}

export function defaultAutopilotRoute(edges: readonly ScoutMapEdge[]): string[] {
  return edges.slice(0, Math.min(3, edges.length)).map((edge) => edge.id);
}

export function pathSegmentEdgeId(nodeA: string, nodeB: string): string {
  return `seg-${[nodeA, nodeB].sort().join("--")}`;
}

export function pathEdgeIdsFromNodePath(pathNodeIds: readonly string[]): string[] {
  const edgeIds: string[] = [];
  for (let index = 1; index < pathNodeIds.length; index += 1) {
    edgeIds.push(pathSegmentEdgeId(pathNodeIds[index - 1]!, pathNodeIds[index]!));
  }
  return edgeIds;
}

export function buildSegmentEdgesForPath(
  pathNodeIds: readonly string[],
  nodes: readonly { id: string; x: number; y: number }[],
): ScoutMapEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node] as const));
  const edges: ScoutMapEdge[] = [];
  for (let index = 1; index < pathNodeIds.length; index += 1) {
    const a = pathNodeIds[index - 1]!;
    const b = pathNodeIds[index]!;
    const left = byId.get(a);
    const right = byId.get(b);
    if (!left || !right) continue;
    const dist = Math.hypot(left.x - right.x, left.y - right.y);
    edges.push({
      id: pathSegmentEdgeId(a, b),
      a,
      b,
      length: Math.max(8, Math.round(dist / 8)),
    });
  }
  return edges;
}

export function scoreScoutRouteFromPath(
  pathNodeIds: readonly string[],
  nodes: readonly { id: string; x: number; y: number }[],
): ScoutRouteScore {
  const edgeIds = pathEdgeIdsFromNodePath(pathNodeIds);
  const edges = buildSegmentEdgesForPath(pathNodeIds, nodes);
  return scoreScoutRoute(edgeIds, edges);
}

/** Visit scoutable clubs in a greedy nearest-neighbor order (autopilot). */
export function autopilotNodePath(
  nodes: readonly { id: string; x: number; y: number; scoutable?: boolean }[],
): string[] {
  const scoutable = nodes.filter((node) => node.scoutable);
  if (scoutable.length === 0) return [];
  const path: string[] = [scoutable[0]!.id];
  const remaining = scoutable.slice(1);
  let current = scoutable[0]!;
  while (remaining.length > 0) {
    remaining.sort((left, right) => {
      const dl = Math.hypot(left.x - current.x, left.y - current.y);
      const dr = Math.hypot(right.x - current.x, right.y - current.y);
      return dl - dr;
    });
    current = remaining.shift()!;
    path.push(current.id);
  }
  return path;
}
