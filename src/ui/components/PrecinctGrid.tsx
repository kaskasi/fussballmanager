/**
 * WIREFRAME: PRD 14.7 — Gelände-v2
 *
 * Palette 🌭🍺👕🅿️🚌🚇🏃🟩🌱♿🏠 + 🛣️
 * 14×10 · 10×10 Farm · 🧩 2×5-Plättchen L/R
 * 🛣️ Straße ziehen · autoverbinden · Klick auf ⚠️ legt Weg zum Netz
 * Start: Straße Stadt → Arena. Gebäude ohne Netz: ⚠️
 */
import { formatClubCash } from "../../economy/club-finances.ts";
import { PrecinctStatus } from "./PrecinctStatus.tsx";
import {
  PRECINCT_BUILDINGS,
  PRECINCT_CITY_LINK,
  PRECINCT_EXPANSION_COST,
  PRECINCT_STADIUM,
  PRECINCT_STREET_COST,
  arenaDocksStreetNetwork,
  canBuyPrecinctExpansion,
  canNudgePrecinctPatch,
  canUpgradePrecinctBuilding,
  classifyStreetRun,
  countBuilding,
  edgeTowardCell,
  isCityRampCell,
  isOwnedCell,
  isPrecinctStadiumCell,
  isStreetCell,
  manhattanStreetCells,
  patchAt,
  patchDocksStreetNetwork,
  patchIsMinSize,
  pathArenaToCity,
  pathFootprintToCity,
  precinctBuildingDef,
  precinctBuildingLevel,
  precinctExpansionAt,
  precinctExpansionOwned,
  precinctNudgeCost,
  precinctPlacementCost,
  streetLinks,
  type PrecinctBuilding,
  type PrecinctEdge,
  type PrecinctPatch,
  type PrecinctState,
} from "../../stadium/precinct.ts";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const DRAG_TYPE = "application/x-fc-precinct";
const TILE_SIZE = "1.85rem";

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
  onShrinkToMin,
}: {
  precinct: PrecinctState;
  cash: number;
  stadiumName: string;
  onPlace: (building: PrecinctBuilding, x: number, y: number, from?: { x: number; y: number }) => void;
  onUpgrade: (building: PrecinctBuilding) => void;
  onBuyParcel: () => void;
  onPlaceStreet: (cells: Array<{ x: number; y: number }>) => void;
  onExpand: (patchId: string, edge: PrecinctEdge, delta?: 1 | -1) => void;
  onShrinkToMin: (patchId: string) => void;
}) {
  const [picked, setPicked] = useState<PalettePick | null>(null);
  const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null);
  const [roadFrom, setRoadFrom] = useState<{ x: number; y: number } | null>(null);
  const [roadTo, setRoadTo] = useState<{ x: number; y: number } | null>(null);
  const roadMoved = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const selected = precinct.patches.find((patch) => patch.id === selectedPatchId);
  const arenaDocked = arenaDocksStreetNetwork(precinct);
  const expansion = canBuyPrecinctExpansion(precinct, cash);
  const roadPlan =
    picked === "street" && roadFrom && roadTo
      ? classifyStreetRun(precinct, manhattanStreetCells(roadFrom, roadTo), cash)
      : null;
  const roadPreview = new Map(
    (roadPlan?.cells ?? []).map((cell) => [`${cell.x},${cell.y}`, cell.kind] as const),
  );

  function tryPlace(x: number, y: number, building: PrecinctBuilding) {
    if (isPrecinctStadiumCell(x, y)) return;
    if (!isOwnedCell(precinct, x, y)) return;
    const occupant = patchAt(precinct, x, y);
    if (occupant && occupant.building !== building) return;
    const from =
      selected?.building === building ? { x: selected.x, y: selected.y } : undefined;
    const cost = precinctPlacementCost(precinct, building, from);
    if (cost > cash) return;
    onPlace(building, x, y, from);
    setPicked(null);
    setSelectedPatchId(null);
  }

  function nudge(patch: PrecinctPatch, edge: PrecinctEdge, delta: 1 | -1) {
    const check = canNudgePrecinctPatch(precinct, patch.id, edge, cash, delta);
    if (!check.allowed) return;
    onExpand(patch.id, edge, delta);
  }

  function focusBuilding(building: PrecinctBuilding) {
    const patch = precinct.patches.find((entry) => entry.building === building);
    if (patch) {
      setPicked(building);
      setSelectedPatchId(patch.id);
      return;
    }
    setSelectedPatchId(null);
    setPicked(building);
  }

  function cellFromPointer(event: ReactPointerEvent): { x: number; y: number } | null {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".stadium-precinct-city-link")) {
      return { x: PRECINCT_CITY_LINK.x, y: 0 };
    }
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      return null;
    }
    const x = Math.min(
      precinct.width - 1,
      Math.max(0, Math.floor((event.clientX - rect.left) / (rect.width / precinct.width))),
    );
    const y = Math.min(
      precinct.height - 1,
      Math.max(0, Math.floor((event.clientY - rect.top) / (rect.height / precinct.height))),
    );
    return { x, y };
  }

  function layRoad(from: { x: number; y: number }, to: { x: number; y: number }, dragged: boolean) {
    if (!dragged) {
      if (isPrecinctStadiumCell(from.x, from.y) && !arenaDocked) {
        const path = pathArenaToCity(precinct);
        if (path && path.length > 0) onPlaceStreet(path);
        return;
      }
      const patch = patchAt(precinct, from.x, from.y);
      if (patch && !patchDocksStreetNetwork(precinct, patch)) {
        const path = pathFootprintToCity(precinct, patch.x, patch.y, patch.w, patch.h);
        if (path && path.length > 0) onPlaceStreet(path);
        return;
      }
    }
    const paint = classifyStreetRun(precinct, manhattanStreetCells(from, to), cash)
      .cells.filter((cell) => cell.kind === "paint")
      .map((cell) => ({ x: cell.x, y: cell.y }));
    if (paint.length > 0) onPlaceStreet(paint);
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
                    : picked === building.id && !selectedPatchId
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
                  setSelectedPatchId(null);
                }}
                onClick={() => {
                  if (locked) return;
                  setSelectedPatchId(null);
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
            data-tooltip={`Straße · ${formatClubCash(PRECINCT_STREET_COST)}/Zelle · ziehen wie in Sim City`}
            aria-label="Straße legen"
            onClick={() => {
              if (cash < PRECINCT_STREET_COST) return;
              setSelectedPatchId(null);
              setPicked((current) => (current === "street" ? null : "street"));
            }}
          >
            <span aria-hidden="true">🛣️</span>
          </button>
        </div>
        <div className="stadium-precinct-hint">
          {roadPlan && roadPlan.cost > 0 ? (
            <p>Straße {formatClubCash(roadPlan.cost)}</p>
          ) : picked === "street" ? (
            <p>Ziehen baut die Straße. Klick auf ⚠️ legt den Weg zum Netz.</p>
          ) : null}
        </div>
      </aside>
      <div
        className={picked === "street" ? "stadium-precinct-map is-paving" : "stadium-precinct-map"}
        onPointerDown={(event) => {
          if (picked !== "street" || event.button !== 0) return;
          const cell = cellFromPointer(event);
          if (!cell) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          roadMoved.current = false;
          setRoadFrom(cell);
          setRoadTo(cell);
        }}
        onPointerMove={(event) => {
          if (!roadFrom) return;
          const cell = cellFromPointer(event);
          if (!cell) return;
          if (cell.x === roadTo?.x && cell.y === roadTo?.y) return;
          roadMoved.current = true;
          setRoadTo(cell);
        }}
        onPointerUp={() => {
          if (!roadFrom || !roadTo) {
            setRoadFrom(null);
            setRoadTo(null);
            return;
          }
          layRoad(roadFrom, roadTo, roadMoved.current);
          setRoadFrom(null);
          setRoadTo(null);
        }}
      >
        <div
          className="stadium-precinct-city-row"
          style={{ gridTemplateColumns: `repeat(${precinct.width}, ${TILE_SIZE})` }}
          aria-hidden="true"
        >
          {Array.from({ length: precinct.width }, (_, x) => {
            if (x === PRECINCT_CITY_LINK.x) {
              return (
                <div
                  key="city-link"
                  className="stadium-precinct-city-link"
                  style={{ gridColumn: `span ${PRECINCT_CITY_LINK.w}` }}
                  title="Stadtanschluss · Autobahn"
                >
                  <span>🛣️</span>
                  <strong>Stadt</strong>
                </div>
              );
            }
            if (x > PRECINCT_CITY_LINK.x && x < PRECINCT_CITY_LINK.x + PRECINCT_CITY_LINK.w) {
              return null;
            }
            return <div key={x} className="stadium-precinct-city-spacer" />;
          })}
        </div>
        <div
          ref={gridRef}
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
                  className={arenaDocked ? "stadium-precinct-arena" : "stadium-precinct-arena is-hungry"}
                  role="gridcell"
                  aria-label={
                    arenaDocked
                      ? `${stadiumName}, festes Stadion`
                      : `${stadiumName} · dockt nicht ans Straßennetz`
                  }
                  data-tooltip={
                    arenaDocked
                      ? `${stadiumName} · am Straßennetz`
                      : `${stadiumName} · dockt nicht · 🛣️-Klick legt die Straße`
                  }
                  style={{
                    gridColumn: `${PRECINCT_STADIUM.x + 1} / span ${PRECINCT_STADIUM.w}`,
                    gridRow: `${PRECINCT_STADIUM.y + 1} / span ${PRECINCT_STADIUM.h}`,
                  }}
                >
                  <span aria-hidden="true">🏟️</span>
                  <strong>{stadiumName}</strong>
                  {arenaDocked ? null : (
                    <span className="stadium-precinct-dock" aria-label="Braucht Straßennetz">
                      ⚠️
                    </span>
                  )}
                </div>
              );
            }
            const patch = patchAt(precinct, x, y);
            if (patch && (patch.x !== x || patch.y !== y)) return null;
            if (patch) {
              const meta = PRECINCT_BUILDINGS.find((entry) => entry.id === patch.building);
              const movingHere = selected?.id === patch.id;
              const level = precinctBuildingLevel(precinct, patch.building);
              const hungry = !patchDocksStreetNetwork(precinct, patch);
              const canShrink = !patchIsMinSize(patch);
              const def = precinctBuildingDef(patch.building);
              const growHandles: Array<{ edge: PrecinctEdge; icon: string; label: string }> = [
                { edge: "n", icon: "↑", label: "Nach oben" },
                { edge: "e", icon: "→", label: "Nach rechts" },
                { edge: "s", icon: "↓", label: "Nach unten" },
                { edge: "w", icon: "←", label: "Nach links" },
              ];
              const shrinkHandles: Array<{ edge: PrecinctEdge; icon: string; label: string }> = [
                { edge: "n", icon: "↓", label: "Oben einziehen" },
                { edge: "e", icon: "←", label: "Rechts einziehen" },
                { edge: "s", icon: "↑", label: "Unten einziehen" },
                { edge: "w", icon: "→", label: "Links einziehen" },
              ];
              return (
                <div
                  key={patch.id}
                  role="gridcell"
                  tabIndex={0}
                  className={
                    [
                      "stadium-precinct-tile is-filled is-patch",
                      movingHere ? "is-picked" : "",
                      hungry ? "is-hungry" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                  style={{
                    gridColumn: `${patch.x + 1} / span ${patch.w}`,
                    gridRow: `${patch.y + 1} / span ${patch.h}`,
                  }}
                  aria-label={meta ? `${meta.label} ${patch.w}×${patch.h}` : "Gebäude"}
                  data-tooltip={
                    meta
                      ? hungry
                        ? `${meta.label} · dockt nicht ans Straßennetz · 🛣️-Klick legt die Straße`
                        : `${meta.label}${level > 1 ? ` Lv${level}` : ""} · ${patch.w}×${patch.h}${canShrink ? " · ⊟ auf min, dann umsetzen" : " · Klick zum Umsetzen"}`
                      : "Gebäude"
                  }
                  onDragOver={(event) => event.preventDefault()}
                  onClick={() => {
                    if (picked === "street") return;
                    if (picked) {
                      tryPlace(x, y, picked);
                      return;
                    }
                    setPicked(patch.building);
                    setSelectedPatchId(patch.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setPicked(patch.building);
                      setSelectedPatchId(patch.id);
                    }
                  }}
                >
                  {meta ? <span aria-hidden="true">{meta.icon}</span> : null}
                  {level > 1 ? <span className="stadium-precinct-level">Lv{level}</span> : null}
                  {hungry ? (
                    <span className="stadium-precinct-dock" aria-label="Braucht Straßennetz">
                      ⚠️
                    </span>
                  ) : null}
                  {movingHere ? (
                    <>
                      {growHandles.map((handle) => {
                        const check = canNudgePrecinctPatch(precinct, patch.id, handle.edge, cash, 1);
                        const cost = precinctNudgeCost(patch, handle.edge, 1);
                        return (
                          <button
                            key={`grow-${handle.edge}`}
                            type="button"
                            className={`stadium-precinct-handle is-${handle.edge}${check.allowed ? "" : " is-blocked"}`}
                            disabled={!check.allowed}
                            title={
                              check.allowed
                                ? `${handle.label} · ${formatClubCash(cost)}`
                                : (check.reason ?? handle.label)
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              nudge(patch, handle.edge, 1);
                            }}
                          >
                            {handle.icon}
                          </button>
                        );
                      })}
                      {shrinkHandles.map((handle) => {
                        const check = canNudgePrecinctPatch(precinct, patch.id, handle.edge, cash, -1);
                        if (!check.allowed) return null;
                        return (
                          <button
                            key={`shrink-${handle.edge}`}
                            type="button"
                            className={`stadium-precinct-handle is-shrink is-${handle.edge}`}
                            title={`${handle.label} · frei`}
                            onClick={(event) => {
                              event.stopPropagation();
                              nudge(patch, handle.edge, -1);
                            }}
                          >
                            {handle.icon}
                          </button>
                        );
                      })}
                      {canShrink ? (
                        <button
                          type="button"
                          className="stadium-precinct-min"
                          title={`Auf Mindestgröße ${def.minW}×${def.minH}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onShrinkToMin(patch.id);
                          }}
                        >
                          ⊟
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              );
            }

            const expansionTile = precinctExpansionAt(x, y);
            if (expansionTile && !precinctExpansionOwned(precinct, expansionTile)) {
              if (x !== expansionTile.x || y !== expansionTile.y) return null;
              const isNext = expansion.tile?.id === expansionTile.id;
              return (
                <button
                  key={expansionTile.id}
                  type="button"
                  role="gridcell"
                  className={
                    isNext
                      ? "stadium-precinct-plate is-next"
                      : "stadium-precinct-plate"
                  }
                  style={{
                    gridColumn: `${expansionTile.x + 1} / span ${expansionTile.w}`,
                    gridRow: `${expansionTile.y + 1} / span ${expansionTile.h}`,
                  }}
                  disabled={!isNext || !expansion.allowed}
                  aria-label={
                    isNext
                      ? `Plättchen ${expansionTile.label} · ${formatClubCash(PRECINCT_EXPANSION_COST)}`
                      : `Plättchen ${expansionTile.label} · später`
                  }
                  data-tooltip={
                    isNext
                      ? `Erweiterung · ${expansionTile.label} · 2×5 · ${formatClubCash(PRECINCT_EXPANSION_COST)}`
                      : `Erst ${expansion.tile?.label ?? "die nächste Seite"} kaufen`
                  }
                  onClick={() => {
                    if (picked === "street") return;
                    if (isNext && expansion.allowed) onBuyParcel();
                  }}
                >
                  <span aria-hidden="true">🧩</span>
                  <strong>2×5</strong>
                  <em>{isNext ? formatClubCash(PRECINCT_EXPANSION_COST) : expansionTile.label}</em>
                </button>
              );
            }

            const locked = !isOwnedCell(precinct, x, y);
            const street = isStreetCell(precinct, x, y);
            const ramp = isCityRampCell(x, y);
            const previewKind = roadPreview.get(`${x},${y}`);
            const links = street ? streetLinks(precinct, x, y) : null;
            const label = street
              ? ramp
                ? "Straße · Stadtanschluss"
                : "Straße"
              : ramp
                ? "Anschluss zur Autobahn"
                : "Frei";
            return (
              <button
                key={`${x},${y}`}
                type="button"
                role="gridcell"
                className={
                  [
                    "stadium-precinct-tile is-cell",
                    street ? "is-street" : "",
                    ramp ? "is-ramp" : "",
                    previewKind === "paint" ? "is-road-preview" : "",
                    previewKind === "blocked" ? "is-road-blocked" : "",
                    previewKind === "exist" ? "is-road-exist" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                style={{ gridColumn: x + 1, gridRow: y + 1 }}
                aria-label={`Zelle ${x + 1},${y + 1} · ${label}`}
                data-tooltip={label}
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
                  if (picked === "street") return;
                  if (selected) {
                    const edge = edgeTowardCell(selected, x, y);
                    if (edge) {
                      nudge(selected, edge, 1);
                      return;
                    }
                  }
                  if (picked) {
                    tryPlace(x, y, picked);
                  }
                }}
              >
                {street && links ? <RoadGlyph links={links} /> : null}
                {!street && ramp ? <span aria-hidden="true">↑</span> : null}
              </button>
            );
          }),
        )}
        </div>
      </div>
      <PrecinctStatus
        precinct={precinct}
        picked={picked}
        selectedBuilding={selected?.building}
        onFocus={focusBuilding}
      />
    </section>
  );
}

function RoadGlyph({ links }: { links: { n: boolean; e: boolean; s: boolean; w: boolean } }) {
  return (
    <span className="stadium-precinct-road" aria-hidden="true">
      {links.n ? <i className="arm n" /> : null}
      {links.e ? <i className="arm e" /> : null}
      {links.s ? <i className="arm s" /> : null}
      {links.w ? <i className="arm w" /> : null}
      <i className="hub" />
    </span>
  );
}
