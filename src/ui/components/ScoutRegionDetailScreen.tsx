/** WIREFRAME: PRD 09 Screen 3a-detail — relief map + club route (PRD 21) */
import { useMemo, useRef, useState } from "react";
import { MapPin, Route } from "lucide-react";
import {
  buildZoneMapNodes,
  cityPlaceGroupsOnMap,
  clubsOnPath,
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
import { scoutTripDurationFromClubStops } from "../../scouting/scout-trip-duration.ts";
import type { ActiveScoutTrip, ScoutTripPlan } from "../../scouting/scout-trip.ts";
import { tripsForZone } from "../../scouting/scout-trip-map-viz.ts";
import { ScoutTripMapOverlay } from "./ScoutTripMapOverlay.tsx";
import type { ScoutDiscoveryZoneModel } from "../../scouting/scout-region-map.ts";
import { useT } from "../../i18n/react.ts";
import { clubLogoUrlForId } from "../assets/club-logo.ts";
import { pickClubLogoPinLayout } from "../../scouting/scout-map-pin-layout.ts";
import type { ScoutMapEdge } from "../../scouting/scout-route-puzzle.ts";
import type { ScoutCityPlaceGroup, ScoutMapNode } from "../../scouting/scout-map-layout.ts";
import { ScoutCityPlacePopover } from "./ScoutCityPlacePopover.tsx";

function stopNumberOnPath(pathNodeIds: readonly string[], nodeId: string): number | null {
  for (let index = pathNodeIds.length - 1; index >= 0; index -= 1) {
    if (pathNodeIds[index] === nodeId) return index + 1;
  }
  return null;
}

function ScoutRouteClubMarker({
  clubId,
  node,
  mapNodes,
  edges,
  size,
  nodeClass,
  stop,
}: {
  clubId: string;
  node: ScoutMapNode;
  mapNodes: readonly ScoutMapNode[];
  edges: readonly ScoutMapEdge[];
  size: number;
  nodeClass: string;
  stop: number | null;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoSrc = clubLogoUrlForId(clubId);
  const showLogo = Boolean(logoSrc) && !logoFailed;
  const placement = useMemo(
    () => pickClubLogoPinLayout(node, mapNodes, edges, size),
    [edges, mapNodes, node, size],
  );
  const logoClass = nodeClass.includes("is-on-route")
    ? "scout-route-club-logo is-on-route"
    : "scout-route-club-logo";

  return (
    <>
      {showLogo ? (
        <>
          <circle cx={placement.pinX} cy={placement.pinY} r={2.75} className="scout-route-pin" />
          <image
            className={logoClass}
            href={logoSrc}
            x={placement.logoX}
            y={placement.logoY}
            width={size}
            height={size}
            preserveAspectRatio="xMidYMid meet"
            onError={() => setLogoFailed(true)}
          />
        </>
      ) : (
        <circle cx={placement.pinX} cy={placement.pinY} r={size <= 20 ? 4.5 : 6} className={nodeClass} />
      )}
      {stop != null ? (
        <g
          className="scout-route-stop-badge"
          transform={`translate(${placement.badgeX}, ${placement.badgeY})`}
        >
          <circle r={3.25} className="scout-route-stop-badge-bg" />
          <text x={0} y={0.8} className="scout-route-stop-num" textAnchor="middle">
            {stop}
          </text>
        </g>
      ) : null}
      <text
        x={placement.labelX}
        y={placement.labelY}
        className="scout-route-label"
        textAnchor={placement.labelX >= placement.pinX ? "start" : "end"}
      >
        {node.label}
      </text>
    </>
  );
}

export function ScoutRegionDetailScreen({
  zone,
  zoneLabel,
  activeScoutTrips,
  scoutTripQueue,
  tripQueueLength,
  worldClubs,
  onEnqueueTrip,
}: {
  zone: ScoutDiscoveryZoneModel;
  zoneLabel: string;
  activeScoutTrips?: readonly ActiveScoutTrip[];
  scoutTripQueue?: readonly ScoutTripPlan[];
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
  const mapWrapRef = useRef<HTMLDivElement | null>(null);
  const [cityPopover, setCityPopover] = useState<{
    group: ScoutCityPlaceGroup;
    left: number;
    top: number;
  } | null>(null);

  const zoneActiveTrips = useMemo(
    () => (activeScoutTrips ?? []).filter((trip) => trip.zone_id === zone.id),
    [activeScoutTrips, zone.id],
  );
  const tripActiveHere = zoneActiveTrips.length > 0;
  const primaryActiveTrip = zoneActiveTrips[0];

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
            tripActiveHere ? primaryActiveTrip?.target_club_id : null,
            mapViewBox,
          )
        : [],
    [layout, mapViewBox, primaryActiveTrip?.target_club_id, tripActiveHere, zone.clubs],
  );

  const cityPlaceGroups = useMemo(
    () => (layout ? cityPlaceGroupsOnMap(layout, zone.clubs) : []),
    [layout, zone.clubs],
  );

  const showCityPlaceHover = !routeMode && !tripActiveHere;

  const openCityPopover = (group: ScoutCityPlaceGroup, clientX: number, clientY: number) => {
    const wrap = mapWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    setCityPopover({
      group,
      left: clientX - rect.left + 8,
      top: clientY - rect.top + 8,
    });
  };

  const closeCityPopover = () => setCityPopover(null);

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

  const tripLayers = useMemo(
    () => tripsForZone(zone.id, activeScoutTrips ?? [], scoutTripQueue),
    [activeScoutTrips, scoutTripQueue, zone.id],
  );

  const tripDuration = useMemo(() => {
    const clubCount = Math.max(1, clubsOnPath(pathNodeIds, mapNodes).length);
    return scoutTripDurationFromClubStops(clubCount, zone.id);
  }, [mapNodes, pathNodeIds, zone.id]);

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
    setRouteMode((active) => {
      if (!active) closeCityPopover();
      return !active;
    });
  };

  const isCityMap = layout.mapMode === "city";

  const durationLabel =
    pathNodeIds.length > 0
      ? t("scouting.map.tripDuration", {
          days: tripDuration.totalWorkingDays,
          stops: tripDuration.clubStops ?? Math.max(1, clubsOnPath(pathNodeIds, mapNodes).length),
        })
      : null;

  return (
    <section className="scout-region-detail" aria-label={zoneLabel}>
      <header className="scout-region-detail-head">
        {tripActiveHere && primaryActiveTrip ? (
          <p className="scout-region-detail-speed">
            {t("scouting.map.tripInProgress", {
              done: primaryActiveTrip.working_days_done,
              total: primaryActiveTrip.duration.totalWorkingDays,
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
      <div
        className="scout-region-detail-map-wrap"
        ref={mapWrapRef}
        onMouseLeave={showCityPlaceHover ? closeCityPopover : undefined}
      >
        {showCityPlaceHover && cityPopover ? (
          <ScoutCityPlacePopover group={cityPopover.group} style={cityPopover} />
        ) : null}
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
          <ScoutTripMapOverlay layers={tripLayers} mapNodes={mapNodes} variant="detail" />
          {pathNodeIds.length > 1
            ? routeSegments.map((edge, index) => {
                const a = mapNodes.find((node) => node.id === edge.a);
                const b = mapNodes.find((node) => node.id === edge.b);
                if (!a || !b) return null;
                const used = pathEdgeIds.filter((id) => id === edge.id).length;
                return (
                  <line
                    key={`draft-${edge.a}-${edge.b}-${index}`}
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
            const nodeClass =
              stop != null
                ? "scout-route-node is-on-route"
                : node.discovered
                  ? "scout-route-node is-done"
                  : routeMode && node.scoutable
                    ? "scout-route-node"
                    : "scout-route-node is-muted";
            const placeGroup = showCityPlaceHover
              ? cityPlaceGroups.find((group) =>
                  group.clubs.some((club) => club.careerClubId === node.careerClubId),
                )
              : undefined;
            return (
              <g
                key={node.id}
                className={node.discovered ? "scout-route-club is-visited" : undefined}
                onClick={() => clickable && handleNodeClick(node.id)}
                onMouseEnter={
                  showCityPlaceHover && placeGroup
                    ? (event) => openCityPopover(placeGroup, event.clientX, event.clientY)
                    : undefined
                }
                onMouseMove={
                  showCityPlaceHover && placeGroup
                    ? (event) => openCityPopover(placeGroup, event.clientX, event.clientY)
                    : undefined
                }
                style={{ cursor: clickable ? "pointer" : undefined }}
              >
                {visited ? (
                  <ScoutRouteClubMarker
                    clubId={node.careerClubId!}
                    node={node}
                    mapNodes={mapNodes}
                    edges={layout.edges}
                    size={crestSize}
                    nodeClass={nodeClass}
                    stop={stop}
                  />
                ) : (
                  <>
                    <circle cx={node.x} cy={node.y} r={4.5} className={nodeClass} />
                    {stop != null ? (
                      <text x={node.x} y={node.y + 1} className="scout-route-stop-num" textAnchor="middle">
                        {stop}
                      </text>
                    ) : null}
                    <text x={node.x + 6} y={node.y + 2} className="scout-route-label">
                      {node.label}
                    </text>
                  </>
                )}
              </g>
            );
          })}
          {showCityPlaceHover
            ? cityPlaceGroups.map((group) => (
                <g
                  key={`city-hit-${group.place}`}
                  className="scout-city-place-hit"
                  onMouseEnter={(event) => openCityPopover(group, event.clientX, event.clientY)}
                  onMouseMove={(event) => openCityPopover(group, event.clientX, event.clientY)}
                  onFocus={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    openCityPopover(group, rect.left + rect.width / 2, rect.top + rect.height / 2);
                  }}
                  onBlur={closeCityPopover}
                  tabIndex={0}
                  role="button"
                  aria-label={t("scouting.map.cityPopover.aria", { place: group.place })}
                >
                  <circle cx={group.x} cy={group.y} r={layout.mapMode === "city" ? 14 : 10} />
                </g>
              ))
            : null}
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
