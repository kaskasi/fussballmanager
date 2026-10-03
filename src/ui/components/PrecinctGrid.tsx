/**
 * WIREFRAME: PRD 14.7 — Gelände-Raster
 *
 * Palette 🌭👕🅿️🚇  (Kachel = Rastergröße)
 * Mitte: 🏟️ Stadion vorbelegt
 */
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  PRECINCT_BUILDINGS,
  PRECINCT_STADIUM,
  buildingAt,
  findBuildingCell,
  isPrecinctStadiumCell,
  precinctPlacementCost,
  type PrecinctBuilding,
  type PrecinctState,
} from "../../stadium/precinct.ts";
import { useState } from "react";

const DRAG_TYPE = "application/x-fc-precinct";

export function PrecinctGrid({
  precinct,
  cash,
  stadiumName,
  onPlace,
}: {
  precinct: PrecinctState;
  cash: number;
  stadiumName: string;
  onPlace: (building: PrecinctBuilding, x: number, y: number) => void;
}) {
  const [picked, setPicked] = useState<PrecinctBuilding | null>(null);

  function tryPlace(x: number, y: number, building: PrecinctBuilding) {
    if (isPrecinctStadiumCell(x, y)) return;
    const occupant = buildingAt(precinct, x, y);
    if (occupant && occupant !== building) return;
    const cost = precinctPlacementCost(precinct, building);
    if (cost > cash) return;
    onPlace(building, x, y);
    setPicked(null);
  }

  return (
    <section className="stadium-precinct" aria-label="Gelände">
      <aside className="stadium-precinct-palette" aria-label="Gebäude">
        {PRECINCT_BUILDINGS.map((building) => {
          const owned = findBuildingCell(precinct, building.id) != null;
          const cost = building.cost;
          const locked = !owned && cash < cost;
          const tooltip = locked
            ? `${building.label} · ${formatClubCash(cost)} · zu wenig Cash`
            : owned
              ? `${building.label} · bereits gebaut · Umsetzen frei`
              : `${building.label} · ${formatClubCash(cost)}`;
          return (
            <button
              key={building.id}
              type="button"
              className={
                locked
                  ? "stadium-precinct-tile is-locked"
                  : picked === building.id
                    ? "stadium-precinct-tile is-picked"
                    : owned
                      ? "stadium-precinct-tile is-owned"
                      : "stadium-precinct-tile"
              }
              draggable={!locked}
              disabled={locked}
              data-tooltip={tooltip}
              aria-label={tooltip}
              onDragStart={(event) => {
                if (locked) {
                  event.preventDefault();
                  return;
                }
                event.dataTransfer.setData(DRAG_TYPE, building.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              onClick={() => {
                if (locked) return;
                setPicked((current) => (current === building.id ? null : building.id));
              }}
            >
              <span aria-hidden="true">{building.icon}</span>
            </button>
          );
        })}
        <p className="stadium-precinct-hint">Erstplatzieren kostet Cash. Umsetzen ist frei.</p>
      </aside>
      <div
        className="stadium-precinct-grid"
        style={{
          gridTemplateColumns: `repeat(${precinct.width}, 3.75rem)`,
          gridTemplateRows: `repeat(${precinct.height}, 3.75rem)`,
        }}
        role="grid"
        aria-label="Stadiongelände"
      >
        {Array.from({ length: precinct.height }, (_, y) =>
          Array.from({ length: precinct.width }, (_, x) => {
            if (isPrecinctStadiumCell(x, y)) {
              if (x !== PRECINCT_STADIUM.x || y !== PRECINCT_STADIUM.y) return null;
              return (
                <div
                  key="arena"
                  className="stadium-precinct-arena"
                  role="gridcell"
                  aria-label={`${stadiumName}, festes Stadion`}
                  data-tooltip={`${stadiumName} · steht`}
                  style={{
                    gridColumn: `${PRECINCT_STADIUM.x + 1} / span ${PRECINCT_STADIUM.w}`,
                    gridRow: `${PRECINCT_STADIUM.y + 1} / span ${PRECINCT_STADIUM.h}`,
                  }}
                >
                  <span aria-hidden="true">🏟️</span>
                  <strong>{stadiumName}</strong>
                </div>
              );
            }
            const occupant = buildingAt(precinct, x, y);
            const meta = PRECINCT_BUILDINGS.find((entry) => entry.id === occupant);
            return (
              <button
                key={`${x},${y}`}
                type="button"
                role="gridcell"
                className={occupant ? "stadium-precinct-tile is-filled" : "stadium-precinct-tile is-cell"}
                style={{ gridColumn: x + 1, gridRow: y + 1 }}
                aria-label={meta ? `${meta.label} auf ${x + 1},${y + 1}` : `Leere Zelle ${x + 1},${y + 1}`}
                data-tooltip={meta ? `${meta.label} · Umsetzen frei` : "Frei"}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData(DRAG_TYPE) as PrecinctBuilding;
                  if (PRECINCT_BUILDINGS.some((entry) => entry.id === id)) {
                    tryPlace(x, y, id);
                  }
                }}
                onClick={() => {
                  if (picked) {
                    tryPlace(x, y, picked);
                    return;
                  }
                  if (occupant) setPicked(occupant);
                }}
              >
                {meta ? <span aria-hidden="true">{meta.icon}</span> : null}
              </button>
            );
          }),
        )}
      </div>
    </section>
  );
}
