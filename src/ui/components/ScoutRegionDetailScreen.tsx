/** WIREFRAME: PRD 09 Screen 3a-detail — relief map + club route (PRD 21) */
import { useMemo, useState } from "react";
import { MapPin, Route } from "lucide-react";
import {
  buildZoneMapNodes,
  lastScoutableClubOnPath,
  layoutForZone,
  SCOUT_RELIEF_HEIGHT,
  SCOUT_RELIEF_MAP_ASSET,
  SCOUT_RELIEF_WIDTH,
} from "../../scouting/scout-map-layout.ts";
import {
  citySvgViewBoxForZoneClubs,
  parseSvgViewBox,
  reliefViewBoxForZoneClubs,
} from "../../scouting/scout-map-geo.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import {
  autopilotNodePath,
  buildSegmentEdgesForPath,
  pathEdgeIdsFromNodePath,
  scoreScoutRouteFromPath,
  type ScoutRouteScore,
} from "../../scouting/scout-route-puzzle.ts";
import { scoutTripDuration } from "../../scouting/scout-trip-duration.ts";
import { formatTripDurationDe } from "../../scouting/scout-trip.ts";
import type { ActiveScoutTrip } from "../../scouting/scout-trip.ts";
import type { ScoutDiscoveryZoneModel } from "../../scouting/scout-region-map.ts";
import { useT } from "../../i18n/react.ts";
import { clubLogoUrlForId } from "../assets/club-logo.ts";

function stopNumberOnPath(pathNodeIds: readonly string[], nodeId: string): number | null {
  for (let index = pathNodeIds.length - 1; index >= 0; index -= 1) {
    if (pathNodeIds[index] === nodeId) return index + 1;
  }
  return null;
}

export function ScoutRegionDetailScreen({
  zone,
  zoneLabel,
  activeScoutTrip,
  tripQueueLength,
  worldClubs,
  onEnqueueTrip,
}: {
  zone: ScoutDiscoveryZoneModel;
  zoneLabel: string;
  activeScoutTrip?: ActiveScoutTrip | null;
  tripQueueLength?: number;
  worldClubs: readonly WorldClub[];
  onEnqueueTrip: (input: {
    pathNodeIds: string[];
    targetClubId: string;
    score: ScoutRouteScore;
  }) => void;
}) {
  const t = useT();
  const layout = layoutForZone(zone.id);
  const [routeMode, setRouteMode] = useState(false);
  const [pathNodeIds, setPathNodeIds] = useState<string[]>([]);

  const tripActiveHere = activeScoutTrip?.zone_id === zone.id;

  const mapViewBox = useMemo(() => {
    if (!layout) return "0 0 100 100";
    if (layout.mapMode === "city") {
      return citySvgViewBoxForZoneClubs(zone.id, worldClubs, layout, 420);
    }
    return reliefViewBoxForZoneClubs(zone.id, worldClubs);
  }, [layout, worldClubs, zone.id]);

  const cityMapImageBox = useMemo(() => {
    if (!layout?.citySvgViewBox) return null;
    return parseSvgViewBox(layout.citySvgViewBox);
  }, [layout?.citySvgViewBox]);

  const mapNodes = useMemo(
    () =>
      layout
        ? buildZoneMapNodes(
            layout,
            zone.clubs,
            tripActiveHere ? activeScoutTrip?.target_club_id : null,
            mapViewBox,
          )
        : [],
    [activeScoutTrip?.target_club_id, layout, mapViewBox, tripActiveHere, zone.clubs],
  );

  const pathEdgeIds = useMemo(() => pathEdgeIdsFromNodePath(pathNodeIds), [pathNodeIds]);

  const routeSegments = useMemo(
    () => buildSegmentEdgesForPath(pathNodeIds, mapNodes),
    [mapNodes, pathNodeIds],
  );

  const score = useMemo(
    () => (pathNodeIds.length > 0 ? scoreScoutRouteFromPath(pathNodeIds, mapNodes) : null),
    [mapNodes, pathNodeIds],
  );

  const targetClubId = useMemo(
    () => lastScoutableClubOnPath(pathNodeIds, mapNodes),
    [mapNodes, pathNodeIds],
  );

  const tripDuration = useMemo(
    () => scoutTripDuration(zone.id, pathNodeIds.length),
    [pathNodeIds.length, zone.id],
  );

  if (!layout) {
    return (
      <section className="scout-region-detail">
        <p>{t("scouting.map.detailMissingLayout")}</p>
      </section>
    );
  }

  const handleNodeClick = (nodeId: string) => {
    if (!routeMode || tripActiveHere) return;
    setPathNodeIds((prev) => [...prev, nodeId]);
  };

  const handleAutopilot = () => {
    const path = autopilotNodePath(mapNodes);
    setPathNodeIds(path);
    setRouteMode(true);
  };

  const handleStartTrip = () => {
    if (!score || !targetClubId || pathNodeIds.length === 0) return;
    onEnqueueTrip({
      pathNodeIds: [...pathNodeIds],
      targetClubId,
      score,
    });
    setPathNodeIds([]);
    setRouteMode(false);
  };

  const clearRoute = () => {
    setPathNodeIds([]);
  };

  const toggleRouteMode = () => {
    setRouteMode((active) => !active);
  };

  const isCityMap = layout.mapMode === "city";

  const durationLabel =
    pathNodeIds.length > 0 ? formatTripDurationDe(tripDuration) : null;

  return (
    <section className="scout-region-detail" aria-label={zoneLabel}>
      <header className="scout-region-detail-head">
        <h2>{zoneLabel}</h2>
        {tripActiveHere && activeScoutTrip ? (
          <p className="scout-region-detail-speed">
            {t("scouting.map.tripInProgress", {
              done: activeScoutTrip.working_days_done,
              total: activeScoutTrip.duration.totalWorkingDays,
            })}
          </p>
        ) : routeMode ? (
          <p className="scout-region-detail-speed">
            {t("scouting.map.routeBuildHint")}
            {durationLabel ? ` · ${durationLabel}` : null}
            {score && pathNodeIds.length > 1
              ? ` · ${t("scouting.map.routeSpeed", {
                  pct: Math.round(score.progressMultiplier * 100),
                })}`
              : null}
          </p>
        ) : pathNodeIds.length > 0 && durationLabel ? (
          <p className="scout-region-detail-speed">{durationLabel}</p>
        ) : (
          <p className="scout-region-detail-speed">{t("scouting.map.routeIdleHint")}</p>
        )}
        {(tripQueueLength ?? 0) > 0 && !tripActiveHere ? (
          <p className="scout-region-detail-queue">
            {t("scouting.map.tripQueue", { count: tripQueueLength ?? 0 })}
          </p>
        ) : null}
      </header>
      <div className="scout-region-detail-map-wrap">
        <svg
          className="scout-region-detail-graph"
          viewBox={mapViewBox}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={t("scouting.map.routeGraphAria")}
        >
          {isCityMap ? (
            <image
              href={layout.cityMapAsset ?? layout.flavorAsset}
              x={cityMapImageBox?.x ?? 0}
              y={cityMapImageBox?.y ?? 0}
              width={cityMapImageBox?.w ?? 100}
              height={cityMapImageBox?.h ?? 100}
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <image
              href={SCOUT_RELIEF_MAP_ASSET}
              x={0}
              y={0}
              width={SCOUT_RELIEF_WIDTH}
              height={SCOUT_RELIEF_HEIGHT}
              preserveAspectRatio="xMidYMid meet"
            />
          )}
          {pathNodeIds.length > 1
            ? routeSegments.map((edge, index) => {
                const a = mapNodes.find((node) => node.id === edge.a);
                const b = mapNodes.find((node) => node.id === edge.b);
                if (!a || !b) return null;
                const used = pathEdgeIds.filter((id) => id === edge.id).length;
                return (
                  <line
                    key={`${edge.a}-${edge.b}-${index}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className={
                      used > 1 ? "scout-route-edge is-dup" : "scout-route-edge is-active"
                    }
                  />
                );
              })
            : null}
          {mapNodes.map((node) => {
            const stop = stopNumberOnPath(pathNodeIds, node.id);
            const clickable = routeMode && !tripActiveHere;
            const visited = node.discovered && node.careerClubId;
            const crestSize = layout.mapMode === "city" ? 28 : 18;
            const crestHalf = crestSize / 2;
            const nodeClass =
              stop != null
                ? "scout-route-node is-on-route"
                : node.discovered
                  ? "scout-route-node is-done"
                  : routeMode && node.scoutable
                    ? "scout-route-node"
                    : "scout-route-node is-muted";
            return (
              <g
                key={node.id}
                className={node.discovered ? "scout-route-club is-visited" : undefined}
                onClick={() => clickable && handleNodeClick(node.id)}
                style={{ cursor: clickable ? "pointer" : undefined }}
              >
                {visited ? (
                  <image
                    className={nodeClass}
                    href={clubLogoUrlForId(node.careerClubId!)}
                    x={node.x - crestHalf}
                    y={node.y - crestHalf}
                    width={crestSize}
                    height={crestSize}
                    preserveAspectRatio="xMidYMid meet"
                  />
                ) : (
                  <circle cx={node.x} cy={node.y} r={4.5} className={nodeClass} />
                )}
                {stop != null ? (
                  <text x={node.x} y={node.y + 1} className="scout-route-stop-num" textAnchor="middle">
                    {stop}
                  </text>
                ) : null}
                <text x={node.x + 6} y={node.y + 2} className="scout-route-label">
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <footer className="scout-region-detail-actions">
        <button
          type="button"
          className={routeMode ? "scout-route-mode-btn is-active" : "scout-route-mode-btn"}
          onClick={toggleRouteMode}
          disabled={tripActiveHere}
        >
          <Route size={14} aria-hidden />
          {routeMode ? t("scouting.map.routeBuildDone") : t("scouting.map.routeBuildStart")}
        </button>
        <button type="button" onClick={clearRoute} disabled={pathNodeIds.length === 0 || tripActiveHere}>
          {t("scouting.map.routeClear")}
        </button>
        {!tripActiveHere ? (
          <>
            <button
              type="button"
              onClick={handleAutopilot}
              disabled={mapNodes.every((node) => !node.scoutable)}
            >
              {t("scouting.map.routeAutopilot")}
            </button>
            <button
              type="button"
              className="scout-discovery-region-btn"
              onClick={handleStartTrip}
              disabled={!targetClubId || !score || pathNodeIds.length < 1}
            >
              <MapPin size={14} aria-hidden />
              {targetClubId ? t("scouting.map.tripStart") : t("scouting.map.routePickClub")}
            </button>
          </>
        ) : null}
      </footer>
    </section>
  );
}
