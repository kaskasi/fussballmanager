/** WIREFRAME: PRD 09 Screen 3a-detail — region map + route (PRD 21) */
import { useMemo, useState } from "react";
import { ArrowLeft, Radar } from "lucide-react";
import {
  edgeBetween,
  layoutForZone,
} from "../../scouting/scout-map-layout.ts";
import {
  defaultAutopilotRoute,
  scoreScoutRoute,
  type ScoutRouteScore,
} from "../../scouting/scout-route-puzzle.ts";
import type { ScoutDiscoveryZoneModel } from "../../scouting/scout-region-map.ts";
import { useT } from "../../i18n/react.ts";

export function ScoutRegionDetailScreen({
  zone,
  zoneLabel,
  canStartRegionJob,
  activeRegionScout,
  onBack,
  onStartRegionJob,
}: {
  zone: ScoutDiscoveryZoneModel;
  zoneLabel: string;
  canStartRegionJob: boolean;
  activeRegionScout?: { zone_id: string; progress: number } | null;
  onBack: () => void;
  onStartRegionJob: (score: ScoutRouteScore, pathEdgeIds: readonly string[]) => void;
}) {
  const t = useT();
  const layout = layoutForZone(zone.id);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [pathEdgeIds, setPathEdgeIds] = useState<string[]>([]);

  const score = useMemo(
    () => (layout ? scoreScoutRoute(pathEdgeIds, layout.edges) : null),
    [layout, pathEdgeIds],
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
    if (!selectedNode) {
      setSelectedNode(nodeId);
      return;
    }
    if (selectedNode === nodeId) {
      setSelectedNode(null);
      return;
    }
    const edge = edgeBetween(layout, selectedNode, nodeId);
    if (edge) {
      setPathEdgeIds((prev) => [...prev, edge.id]);
    }
    setSelectedNode(nodeId);
  };

  const handleAutopilot = () => {
    const path = defaultAutopilotRoute(layout.edges);
    setPathEdgeIds(path);
    const autopilotScore = scoreScoutRoute(path, layout.edges);
    onStartRegionJob(autopilotScore, path);
  };

  const handleStart = () => {
    if (!score) return;
    onStartRegionJob(score, pathEdgeIds);
  };

  const jobActiveHere = activeRegionScout?.zone_id === zone.id;

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
        <img
          className="scout-region-detail-flavor"
          src={layout.flavorAsset}
          alt=""
          decoding="async"
        />
        <svg
          className="scout-region-detail-graph"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label={t("scouting.map.routeGraphAria")}
        >
          {layout.edges.map((edge) => {
            const a = layout.nodes.find((n) => n.id === edge.a);
            const b = layout.nodes.find((n) => n.id === edge.b);
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
          {layout.nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={4.2}
                className={
                  selectedNode === node.id ? "scout-route-node is-selected" : "scout-route-node"
                }
                onClick={() => handleNodeClick(node.id)}
              />
              <text x={node.x + 5} y={node.y + 1} className="scout-route-label">
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <footer className="scout-region-detail-actions">
        <button type="button" onClick={() => setPathEdgeIds([])}>
          {t("scouting.map.routeClear")}
        </button>
        {canStartRegionJob && !jobActiveHere ? (
          <>
            <button type="button" onClick={handleAutopilot}>
              {t("scouting.map.routeAutopilot")}
            </button>
            <button type="button" className="scout-discovery-region-btn" onClick={handleStart}>
              <Radar size={14} aria-hidden />
              {t("scouting.map.routeStartJob")}
            </button>
          </>
        ) : jobActiveHere ? (
          <span>
            {t("scouting.map.regionProgress", { pct: activeRegionScout?.progress ?? 0 })}
          </span>
        ) : null}
      </footer>
    </section>
  );
}
