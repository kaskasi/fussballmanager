import type { ScoutMapNode } from "../../scouting/scout-map-layout.ts";
import {
  routeColorIndex,
  scoutMarkerAtTripProgress,
  tripRouteSegments,
  type ZoneTripLayers,
} from "../../scouting/scout-trip-map-viz.ts";
import type { ActiveScoutTrip, ScoutTripPlan } from "../../scouting/scout-trip.ts";

function RouteLines({
  plan,
  mapNodes,
  colorIndex,
  variant,
  dashed,
}: {
  plan: ScoutTripPlan | ActiveScoutTrip;
  mapNodes: readonly ScoutMapNode[];
  colorIndex: number;
  variant: "detail" | "mini";
  dashed: boolean;
}) {
  const segments = tripRouteSegments(plan.path_node_ids, mapNodes);
  const strokeClass = `scout-trip-route is-color-${colorIndex}${dashed ? " is-queued" : " is-active"}${variant === "mini" ? " is-mini" : ""}`;
  return (
    <>
      {segments.map((seg, index) => (
        <line
          key={`${plan.id}-${index}`}
          x1={seg.a.x}
          y1={seg.a.y}
          x2={seg.b.x}
          y2={seg.b.y}
          className={strokeClass}
        />
      ))}
    </>
  );
}

export function ScoutTripMapOverlay({
  layers,
  mapNodes,
  variant,
  draftPathNodeIds,
}: {
  layers: ZoneTripLayers;
  mapNodes: readonly ScoutMapNode[];
  variant: "detail" | "mini";
  draftPathNodeIds?: readonly string[];
}) {
  const markerSize = variant === "mini" ? 6 : 10;

  return (
    <g className={`scout-trip-map-overlay is-${variant}`} aria-hidden={variant === "mini"}>
      {layers.queued.map((plan, index) => (
        <RouteLines
          key={plan.id}
          plan={plan}
          mapNodes={mapNodes}
          colorIndex={routeColorIndex(plan.id, index + 1)}
          variant={variant}
          dashed
        />
      ))}
      {layers.actives.map((trip, index) => (
        <RouteLines
          key={trip.id}
          plan={trip}
          mapNodes={mapNodes}
          colorIndex={routeColorIndex(trip.id, index)}
          variant={variant}
          dashed={false}
        />
      ))}
      {draftPathNodeIds && draftPathNodeIds.length > 1 ? (
        <RouteLines
          plan={{
            id: "draft",
            zone_id: "",
            path_node_ids: draftPathNodeIds,
            career_club_ids_on_path: [],
            target_club_id: "",
            progress_multiplier: 1,
            duration: {
              speedPct: 1,
              cityStops: 0,
              clubStops: 0,
              setupWorkingDays: 0,
              scoutingWorkingDays: 0,
              teardownWorkingDays: 0,
              totalWorkingDays: 0,
            },
            queued_at_week: 0,
          }}
          mapNodes={mapNodes}
          colorIndex={4}
          variant={variant}
          dashed
        />
      ) : null}
      {layers.actives.map((trip) => {
        const marker = scoutMarkerAtTripProgress(trip, mapNodes);
        if (!marker) return null;
        return (
          <g
            key={`marker-${trip.id}`}
            className="scout-trip-marker"
            transform={`translate(${marker.x}, ${marker.y})`}
          >
            <circle r={markerSize} className="scout-trip-marker-halo" />
            <circle r={variant === "mini" ? 3 : 4.5} className="scout-trip-marker-dot" />
          </g>
        );
      })}
    </g>
  );
}
