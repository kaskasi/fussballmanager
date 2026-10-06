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
