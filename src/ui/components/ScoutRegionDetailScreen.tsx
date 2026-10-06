/** WIREFRAME: PRD 09 Screen 3a-detail — relief map + club route (PRD 21) */
import { useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import {
  buildClubRoutingEdges,
  buildZoneMapNodes,
  edgeBetween,
  lastScoutableClubOnPath,
  layoutForZone,
  SCOUT_RELIEF_HEIGHT,
  SCOUT_RELIEF_MAP_ASSET,
  SCOUT_RELIEF_WIDTH,
} from "../../scouting/scout-map-layout.ts";
import {
  defaultAutopilotRoute,
  scoreScoutRoute,
  type ScoutRouteScore,
} from "../../scouting/scout-route-puzzle.ts";
import type { ScoutDiscoveryZoneModel } from "../../scouting/scout-region-map.ts";
import { DISCOVERY_COMPLETE } from "../../scouting/scout-discovery.ts";
import { useT } from "../../i18n/react.ts";

export function ScoutRegionDetailScreen({
  zone,
  zoneLabel,
  activeClubScout,
  onBack,
  onStartClubScout,
}: {
  zone: ScoutDiscoveryZoneModel;
  zoneLabel: string;
  activeClubScout?: { club_id: string; progress: number } | null;
  onBack: () => void;
  onStartClubScout: (careerClubId: string, score: ScoutRouteScore) => void;
}) {
  const t = useT();
  const layout = layoutForZone(zone.id);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [pathEdgeIds, setPathEdgeIds] = useState<string[]>([]);
  const [pathNodeIds, setPathNodeIds] = useState<string[]>([]);

  const mapNodes = useMemo(
    () => (layout ? buildZoneMapNodes(layout, zone.clubs, activeClubScout?.club_id) : []),
    [activeClubScout?.club_id, layout, zone.clubs],
  );

  const routingEdges = useMemo(
    () => (mapNodes.length > 0 ? buildClubRoutingEdges(mapNodes) : []),
    [mapNodes],
  );

  const score = useMemo(
    () => (routingEdges.length > 0 ? scoreScoutRoute(pathEdgeIds, routingEdges) : null),
    [pathEdgeIds, routingEdges],
  );

  const targetClubId = useMemo(
    () => lastScoutableClubOnPath(pathNodeIds, mapNodes),
    [mapNodes, pathNodeIds],
  );

  if (!layout) {
    return (
      <section className="scout-region-detail">
        <button type="button" className="scout-region-detail-back" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden />
          {t("scouting.map.detailBack")}
        </button>
        <p>{t("scouting.map.detailMissingLayout")}</p>
      </section>
    );
  }

  const handleNodeClick = (nodeId: string) => {
    setPathNodeIds((prev) => [...prev, nodeId]);
    if (!selectedNode) {
      setSelectedNode(nodeId);
      return;
    }
    if (selectedNode === nodeId) {
      setSelectedNode(null);
      return;
    }
    const edge = edgeBetween(routingEdges, selectedNode, nodeId);
    if (edge) {
      setPathEdgeIds((prev) => [...prev, edge.id]);
    }
    setSelectedNode(nodeId);
  };

  const handleAutopilot = () => {
    const path = defaultAutopilotRoute(routingEdges);
    setPathEdgeIds(path);
    const autopilotScore = scoreScoutRoute(path, routingEdges);
    const clubId =
      mapNodes.find((node) => node.scoutable)?.careerClubId ?? targetClubId;
    if (clubId) onStartClubScout(clubId, autopilotScore);
  };

  const handleStart = () => {
    if (!score || !targetClubId) return;
    onStartClubScout(targetClubId, score);
  };

  const jobActiveHere =
    activeClubScout != null &&
    mapNodes.some((node) => node.careerClubId === activeClubScout.club_id);

  const [vbX, vbY, vbW, vbH] = layout.reliefViewBox.split(/\s+/).map(Number);
  const isCityMap = layout.mapMode === "city";

  return (
    <section className="scout-region-detail" aria-label={zoneLabel}>
      <header className="scout-region-detail-head">
        <button type="button" className="scout-region-detail-back" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden />
          {t("scouting.map.detailBack")}
        </button>
        <h2>{zoneLabel}</h2>
        {score ? (
          <p className="scout-region-detail-speed">
            {t("scouting.map.routeSpeed", {
              pct: Math.round(score.progressMultiplier * 100),
            })}
            {score.duplicateEdgeCount > 0
              ? ` · ${t("scouting.map.routeDuplicates", { count: score.duplicateEdgeCount })}`
              : score.noDuplicateBonus
                ? ` · ${t("scouting.map.routeBonus")}`
                : null}
          </p>
        ) : null}
      </header>
      <div className="scout-region-detail-map-wrap">
        <svg
          className="scout-region-detail-graph"
          viewBox={layout.reliefViewBox}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={t("scouting.map.routeGraphAria")}
        >
          {isCityMap ? (
            <image
              href={layout.flavorAsset}
              x={vbX}
              y={vbY}
              width={vbW}
              height={vbH}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <>
              <image
                href={SCOUT_RELIEF_MAP_ASSET}
                x={0}
                y={0}
                width={SCOUT_RELIEF_WIDTH}
                height={SCOUT_RELIEF_HEIGHT}
                preserveAspectRatio="xMidYMid meet"
              />
              <image
                href={layout.flavorAsset}
                x={vbX}
                y={vbY}
                width={vbW}
                height={vbH}
                preserveAspectRatio="xMidYMid slice"
                opacity={0.32}
              />
            </>
          )}
          {layout.edges.map((edge) => {
            const a = layout.anchorNodes.find((n) => n.id === edge.a);
            const b = layout.anchorNodes.find((n) => n.id === edge.b);
            if (!a || !b) return null;
            return (
              <line
                key={edge.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className="scout-route-edge is-infrastructure"
              />
            );
          })}
          {routingEdges.map((edge) => {
            const a = mapNodes.find((n) => n.id === edge.a);
            const b = mapNodes.find((n) => n.id === edge.b);
            if (!a || !b) return null;
            const used = pathEdgeIds.filter((id) => id === edge.id).length;
            return (
              <line
                key={edge.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={
                  used > 1
                    ? "scout-route-edge is-dup"
                    : used === 1
                      ? "scout-route-edge is-active"
                      : "scout-route-edge"
                }
              />
            );
          })}
          {mapNodes.map((node) => (
            <g key={node.id} className={node.discovered ? "scout-route-club is-done" : undefined}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.discovered ? 3.2 : 4.5}
                className={
                  selectedNode === node.id
                    ? "scout-route-node is-selected"
                    : node.discovered
                      ? "scout-route-node is-done"
                      : node.scoutable
                        ? "scout-route-node"
                        : "scout-route-node is-muted"
                }
                onClick={() => node.scoutable && handleNodeClick(node.id)}
              />
              <text x={node.x + 6} y={node.y + 2} className="scout-route-label">
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <footer className="scout-region-detail-actions">
        <button type="button" onClick={() => { setPathEdgeIds([]); setPathNodeIds([]); setSelectedNode(null); }}>
          {t("scouting.map.routeClear")}
        </button>
        {!jobActiveHere ? (
          <>
            <button type="button" onClick={handleAutopilot} disabled={mapNodes.every((n) => !n.scoutable)}>
              {t("scouting.map.routeAutopilot")}
            </button>
            <button
              type="button"
              className="scout-discovery-region-btn"
              onClick={handleStart}
              disabled={!targetClubId || !score}
            >
              <MapPin size={14} aria-hidden />
              {targetClubId
                ? t("scouting.map.routeStartClubJob")
                : t("scouting.map.routePickClub")}
            </button>
          </>
        ) : (
          <span>
            {t("scouting.map.clubProgress", { pct: activeClubScout?.progress ?? 0 })}
            <span
              className="scout-discovery-ring scout-discovery-ring-inline"
              style={
                {
                  "--scout-progress": `${((activeClubScout?.progress ?? 0) / DISCOVERY_COMPLETE) * 100}%`,
                } as CSSProperties
              }
              aria-hidden
            />
          </span>
        )}
      </footer>
    </section>
  );
}
