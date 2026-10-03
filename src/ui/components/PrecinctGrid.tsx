/**
 * WIREFRAME: PRD 14.7 — Gelände-v2
 *
 * Palette 🌭🍺👕🅿️🚌🚇🏃🟩🌱♿🏠 + 🛣️
 * 12×10 · Kern owned · Ring 🔒 kaufbar
 * Gebäude = Rechteck (min. Größe), Kante +→ +↓
 */
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  PRECINCT_BUILDINGS,
  PRECINCT_PARCEL_COST,
  PRECINCT_STADIUM,
  PRECINCT_STREET_COST,
  canBuyPrecinctParcel,
  canPlaceStreet,
  canUpgradePrecinctBuilding,
  countBuilding,
  extraCellCost,
  isOwnedCell,
  isPrecinctStadiumCell,
  isStreetCell,
  patchAt,
  precinctBuildingLevel,
  precinctExpandCost,
  precinctPlacementCost,
  type PrecinctBuilding,
  type PrecinctPatch,
  type PrecinctState,
} from "../../stadium/precinct.ts";
import { useState } from "react";

const DRAG_TYPE = "application/x-fc-precinct";
const TILE_SIZE = "2.05rem";

type PalettePick = PrecinctBuilding | "street";

export function PrecinctGrid({
  precinct,
  cash,
  stadiumName,
  onPlace,
  onUpgrade,
  onBuyParcel,
  onPlaceStreet,
  onExpand,
}: {
  precinct: PrecinctState;
  cash: number;
  stadiumName: string;
  onPlace: (building: PrecinctBuilding, x: number, y: number, from?: { x: number; y: number }) => void;
  onUpgrade: (building: PrecinctBuilding) => void;
  onBuyParcel: (x: number, y: number) => void;
  onPlaceStreet: (x: number, y: number) => void;
  onExpand: (patchId: string, w: number, h: number) => void;
}) {
  const [picked, setPicked] = useState<PalettePick | null>(null);
  const [fromCell, setFromCell] = useState<{ x: number; y: number } | null>(null);
  const selected = fromCell ? patchAt(precinct, fromCell.x, fromCell.y) : undefined;

  function tryPlace(x: number, y: number, building: PrecinctBuilding) {
    if (isPrecinctStadiumCell(x, y)) return;
    if (!isOwnedCell(precinct, x, y)) return;
    const occupant = patchAt(precinct, x, y);
    if (occupant && occupant.building !== building) return;
    const from =
      fromCell && patchAt(precinct, fromCell.x, fromCell.y)?.building === building
        ? fromCell
        : undefined;
    const cost = precinctPlacementCost(precinct, building, from);
    if (cost > cash) return;
    onPlace(building, x, y, from);
    setPicked(null);
    setFromCell(null);
  }

  function grow(patch: PrecinctPatch, dw: number, dh: number) {
    const cost = precinctExpandCost(patch, patch.w + dw, patch.h + dh);
    if (cost > cash) return;
    onExpand(patch.id, patch.w + dw, patch.h + dh);
  }

  return (
    <section className="stadium-precinct" aria-label="Gelände">
      <aside className="stadium-precinct-palette" aria-label="Gebäude">
        {PRECINCT_BUILDINGS.map((building) => {
          const count = countBuilding(precinct, building.id);
          const owned = count > 0;
          const uniqueOwned = building.cap === "unique" && owned;
          const extraCost = uniqueOwned ? 0 : building.cost;
          const locked = extraCost > 0 && cash < extraCost;
          const level = precinctBuildingLevel(precinct, building.id);
          const upgrade = canUpgradePrecinctBuilding(precinct, building.id, cash);
          const tooltip = locked
            ? `${building.label} · ${formatClubCash(building.cost)} · zu wenig Cash`
            : uniqueOwned
              ? `${building.label}${level > 1 ? ` Lv${level}` : ""} · ${building.hint}`
              : owned
                ? `${building.label} · weitere ${formatClubCash(building.cost)}`
                : `${building.label} · ${formatClubCash(building.cost)} · ${building.hint}`;
          return (
            <div key={building.id} className="stadium-precinct-palette-item">
              <button
                type="button"
                className={
                  locked
                    ? "stadium-precinct-tile is-locked"
                    : picked === building.id && !fromCell
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
                  setFromCell(null);
                }}
                onClick={() => {
                  if (locked) return;
                  setFromCell(null);
                  setPicked((current) => (current === building.id ? null : building.id));
                }}
              >
                <span aria-hidden="true">{building.icon}</span>
                {count > 1 ? <span className="stadium-precinct-count">{count}</span> : null}
                {uniqueOwned && level > 1 ? (
                  <span className="stadium-precinct-level">Lv{level}</span>
                ) : null}
              </button>
              {upgrade.allowed || (owned && building.maxLevel > 1 && level < building.maxLevel) ? (
                <button
                  type="button"
                  className="stadium-precinct-upgrade"
                  disabled={!upgrade.allowed}
                  title={upgrade.reason ?? `${building.label} ausbauen`}
                  onClick={() => onUpgrade(building.id)}
                >
                  {building.id === "training_ground" && level === 1 ? "Halle" : `Lv${level + 1}`}
                </button>
              ) : null}
            </div>
          );
        })}
        <div className="stadium-precinct-palette-item">
          <button
            type="button"
            className={
              cash < PRECINCT_STREET_COST
                ? "stadium-precinct-tile is-locked"
                : picked === "street"
                  ? "stadium-precinct-tile is-picked"
                  : "stadium-precinct-tile"
            }
            disabled={cash < PRECINCT_STREET_COST}
            data-tooltip={`Straße · ${formatClubCash(PRECINCT_STREET_COST)} · Bus/Bahn docken hier an`}
            aria-label="Straße legen"
            onClick={() => {
              if (cash < PRECINCT_STREET_COST) return;
              setFromCell(null);
              setPicked((current) => (current === "street" ? null : "street"));
            }}
          >
            <span aria-hidden="true">🛣️</span>
          </button>
        </div>
        <p className="stadium-precinct-hint">
          Nur Bude und Park mehrfach. Rest einmal, aber größer ziehen. Äußerer Ring ist
          gesperrt — Parzelle {formatClubCash(PRECINCT_PARCEL_COST)}. Bus und Bahn brauchen eine
          Straßenkante.
        </p>
      </aside>
      <div
        className="stadium-precinct-grid"
        style={{
          gridTemplateColumns: `repeat(${precinct.width}, ${TILE_SIZE})`,
          gridTemplateRows: `repeat(${precinct.height}, ${TILE_SIZE})`,
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
            const patch = patchAt(precinct, x, y);
            if (patch && (patch.x !== x || patch.y !== y)) return null;
            if (patch) {
              const meta = PRECINCT_BUILDINGS.find((entry) => entry.id === patch.building);
              const movingHere = selected?.id === patch.id;
              const level = precinctBuildingLevel(precinct, patch.building);
              const growEast = extraCellCost(patch.building) * patch.h;
              const growSouth = extraCellCost(patch.building) * patch.w;
              return (
                <div
                  key={patch.id}
                  role="gridcell"
                  tabIndex={0}
                  className={
                    movingHere
                      ? "stadium-precinct-tile is-filled is-picked is-patch"
                      : "stadium-precinct-tile is-filled is-patch"
                  }
                  style={{
                    gridColumn: `${patch.x + 1} / span ${patch.w}`,
                    gridRow: `${patch.y + 1} / span ${patch.h}`,
                  }}
                  aria-label={meta ? `${meta.label} ${patch.w}×${patch.h}` : "Gebäude"}
                  data-tooltip={
                    meta
                      ? `${meta.label}${level > 1 ? ` Lv${level}` : ""} · ${patch.w}×${patch.h} · Klick zum Umsetzen`
                      : "Gebäude"
                  }
                  onDragOver={(event) => event.preventDefault()}
                  onClick={() => {
                    if (picked && picked !== "street") {
                      tryPlace(x, y, picked);
                      return;
                    }
                    setPicked(patch.building);
                    setFromCell({ x: patch.x, y: patch.y });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setPicked(patch.building);
                      setFromCell({ x: patch.x, y: patch.y });
                    }
                  }}
                >
                  {meta ? <span aria-hidden="true">{meta.icon}</span> : null}
                  {level > 1 ? <span className="stadium-precinct-level">Lv{level}</span> : null}
                  {movingHere ? (
                    <span className="stadium-precinct-grow">
                      <button
                        type="button"
                        className="stadium-precinct-grow-btn"
                        title={`Breiter · ${formatClubCash(growEast)}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          grow(patch, 1, 0);
                        }}
                      >
                        →
                      </button>
                      <button
                        type="button"
                        className="stadium-precinct-grow-btn"
                        title={`Länger · ${formatClubCash(growSouth)}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          grow(patch, 0, 1);
                        }}
                      >
                        ↓
                      </button>
                    </span>
                  ) : null}
                </div>
              );
            }

            const locked = !isOwnedCell(precinct, x, y);
            const street = isStreetCell(precinct, x, y);
            const parcel = canBuyPrecinctParcel(precinct, x, y, cash);
            const streetCheck = canPlaceStreet(precinct, x, y, cash);
            const label = locked
              ? parcel.allowed
                ? `Parzelle kaufen · ${formatClubCash(PRECINCT_PARCEL_COST)}`
                : (parcel.reason ?? "Gesperrt")
              : street
                ? "Straße"
                : "Frei";
            return (
              <button
                key={`${x},${y}`}
                type="button"
                role="gridcell"
                className={
                  locked
                    ? "stadium-precinct-tile is-cell is-parcel"
                    : street
                      ? "stadium-precinct-tile is-cell is-street"
                      : "stadium-precinct-tile is-cell"
                }
                style={{ gridColumn: x + 1, gridRow: y + 1 }}
                aria-label={`Zelle ${x + 1},${y + 1} · ${label}`}
                data-tooltip={label}
                onDragOver={(event) => {
                  if (locked) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (locked) return;
                  const id = event.dataTransfer.getData(DRAG_TYPE) as PrecinctBuilding;
                  if (PRECINCT_BUILDINGS.some((entry) => entry.id === id)) {
                    tryPlace(x, y, id);
                  }
                }}
                onClick={() => {
                  if (locked) {
                    if (parcel.allowed) onBuyParcel(x, y);
                    return;
                  }
                  if (picked === "street") {
                    if (streetCheck.allowed) {
                      onPlaceStreet(x, y);
                      setPicked(null);
                    }
                    return;
                  }
                  if (picked) {
                    tryPlace(x, y, picked);
                  }
                }}
              >
                {locked ? <span aria-hidden="true">🔒</span> : null}
                {street ? <span aria-hidden="true">🛣️</span> : null}
              </button>
            );
          }),
        )}
      </div>
    </section>
  );
}
