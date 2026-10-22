/**
 * WIREFRAME: PRD 14.7 — Gelände-v2
 *
 * Palette (Gebäude-Icons) + Straße
 * 18×12 · 2×6-Plättchen L/R
 * Straße ziehen · autoverbinden · Klick auf Warnung legt Weg zum Netz
 * Start: Straße Stadt → Arena. Gebäude ohne Netz: Warnsymbol
 */
import { formatClubCash } from "../../economy/club-finances.ts";
import { infrastructureCostForWeek } from "../../economy/early-pacing.ts";
import type { HospitalityPreview } from "../../stadium/hospitality.ts";
import { HospitalityBuildingLiveStat } from "./HospitalitySummaryBand.tsx";
import { PrecinctStatus } from "./PrecinctStatus.tsx";
import {
  PRECINCT_BUILDINGS,
  PRECINCT_CITY_LINK,
  PRECINCT_EXPANSION_COST,
  PRECINCT_STADIUM,
  PRECINCT_STREET_COST,
  isStreetCell,
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
  manhattanStreetCells,
  patchAt,
  patchDocksStreetNetwork,
  patchIsMinSize,
  pathArenaToCity,
  pathFootprintToCity,
  precinctBuildingDef,
  precinctBuildingHint,
  precinctBuildingLabel,
  precinctBuildingLevel,
  precinctBuildingStageLabel,
  precinctExpansionLabel,
  precinctPatchRefund,
  precinctExpansionAt,
  precinctExpansionOwned,
  precinctNextUpgradeLabel,
  precinctPlacementCost,
  streetLinks,
  type PrecinctBuilding,
  type PrecinctEdge,
  type PrecinctPatch,
  type PrecinctState,
} from "../../stadium/precinct.ts";
import { careerWeekIndex } from "../../stadium/hospitality.ts";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  HardHat,
  Landmark,
  Puzzle,
  Route,
  SquareMinus,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useMobileNarrow } from "../hooks/use-mobile-narrow.ts";
import { usePrecinctMobileTileSize } from "../hooks/use-precinct-mobile-tile-size.ts";
import { createRoot } from "react-dom/client";
import { useT } from "../../i18n/react.ts";
import { PrecinctBuildingIcon, PrecinctWarnIcon } from "../icons/precinct-status-icons.tsx";

const DRAG_TYPE = "application/x-fc-precinct";

type PrecinctBuildingDef = (typeof PRECINCT_BUILDINGS)[number];

function attachBuildingDragImage(
  event: DragEvent<HTMLButtonElement>,
  building: PrecinctBuildingDef,
  tilePx: number,
) {
  const ghost = document.createElement("div");
  ghost.className = "stadium-precinct-drag-ghost";
  ghost.style.setProperty("--drag-w", String(building.minW));
  ghost.style.setProperty("--drag-h", String(building.minH));
  const iconHost = document.createElement("span");
  iconHost.className = "stadium-precinct-drag-ghost-icon";
  ghost.appendChild(iconHost);
  document.body.appendChild(ghost);
  const root = createRoot(iconHost);
  root.render(<PrecinctBuildingIcon building={building.id} size={22} />);
  event.dataTransfer.setDragImage(ghost, tilePx * 0.5, tilePx * 0.5);
  window.setTimeout(() => {
    root.unmount();
    ghost.remove();
  }, 0);
}

type PalettePick = PrecinctBuilding | "street";

export function PrecinctGrid({
  precinct,
  cash,
  stadiumName,
  hospitalityPreview,
  isHomeMatchWeek,
  onPlace,
  onUpgrade,
  onBuyParcel,
  onPlaceStreet,
  onExpand,
  onShrinkToMin,
  onRemovePatch,
  onRemoveStreet,
  seasonWeek,
  season,
  week,
}: {
  precinct: PrecinctState;
  cash: number;
  stadiumName: string;
  seasonWeek: number;
  season: number;
  week: number;
  hospitalityPreview: HospitalityPreview;
  isHomeMatchWeek: boolean;
  onPlace: (building: PrecinctBuilding, x: number, y: number, from?: { x: number; y: number }) => void;
  onUpgrade: (building: PrecinctBuilding) => void;
  onBuyParcel: () => void;
  onPlaceStreet: (cells: Array<{ x: number; y: number }>) => void;
  onExpand: (patchId: string, edge: PrecinctEdge, delta?: 1 | -1) => void;
  onShrinkToMin: (patchId: string) => void;
  onRemovePatch: (patchId: string) => void;
  onRemoveStreet: (x: number, y: number) => void;
}) {
  const t = useT();
  const mobileNarrow = useMobileNarrow();
  const mapHostRef = useRef<HTMLDivElement>(null);
  const { tileCss, tilePx } = usePrecinctMobileTileSize(
    mobileNarrow,
    mapHostRef,
    precinct.width,
  );
  const [picked, setPicked] = useState<PalettePick | null>(null);
  const [dragBuilding, setDragBuilding] = useState<PrecinctBuilding | null>(null);
  const [dragAnchor, setDragAnchor] = useState<{ x: number; y: number } | null>(null);
  const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null);
  const [selectedStreet, setSelectedStreet] = useState<{ x: number; y: number } | null>(null);
  const [roadFrom, setRoadFrom] = useState<{ x: number; y: number } | null>(null);
  const [roadTo, setRoadTo] = useState<{ x: number; y: number } | null>(null);
  const roadMoved = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const selected = precinct.patches.find((patch) => patch.id === selectedPatchId);
  const selectedDef = selected ? precinctBuildingDef(selected.building) : null;
  const selectedLevel = selected ? precinctBuildingLevel(precinct, selected.building) : 0;
  const selectedUpgrade = selected
    ? canUpgradePrecinctBuilding(precinct, selected.building, cash)
    : { allowed: false as const, cost: 0, reason: undefined as string | undefined };
  const selectedRefund =
    selected && selectedDef
      ? infrastructureCostForWeek(precinctPatchRefund(precinct, selected), seasonWeek)
      : 0;
  const streetRefund = infrastructureCostForWeek(PRECINCT_STREET_COST, seasonWeek);
  const canPaintStreet = cash >= PRECINCT_STREET_COST;
  const arenaDocked = arenaDocksStreetNetwork(precinct);
  const expansion = canBuyPrecinctExpansion(precinct, cash);
  const roadPlan =
    picked === "street" && roadFrom && roadTo
      ? classifyStreetRun(precinct, manhattanStreetCells(roadFrom, roadTo), cash)
      : null;
  const roadPreview = new Map(
    (roadPlan?.cells ?? []).map((cell) => [`${cell.x},${cell.y}`, cell.kind] as const),
  );

  function dragFootprintCells(anchor: { x: number; y: number }, building: PrecinctBuilding) {
    const def = precinctBuildingDef(building);
    const cells: Array<{ x: number; y: number }> = [];
    for (let dy = 0; dy < def.minH; dy += 1) {
      for (let dx = 0; dx < def.minW; dx += 1) {
        cells.push({ x: anchor.x + dx, y: anchor.y + dy });
      }
    }
    return cells;
  }

  function isDragPreviewCell(x: number, y: number): boolean {
    if (!dragBuilding || !dragAnchor) return false;
    return dragFootprintCells(dragAnchor, dragBuilding).some(
      (cell) => cell.x === x && cell.y === y,
    );
  }

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
    <section className="stadium-precinct" aria-label={t("precinct.aria")}>
      <div className="stadium-precinct-cluster">
      <aside className="stadium-precinct-palette" aria-label={t("precinct.palette.aria")}>
        {PRECINCT_BUILDINGS.map((building) => {
          const count = countBuilding(precinct, building.id);
          const owned = count > 0;
          const uniqueOwned = building.cap === "unique" && owned;
          const extraCost = uniqueOwned ? 0 : building.cost;
          const locked = extraCost > 0 && cash < extraCost;
          const level = precinctBuildingLevel(precinct, building.id);
          const upgrade = canUpgradePrecinctBuilding(precinct, building.id, cash);
          const label = precinctBuildingLabel(building.id);
          const hint = precinctBuildingHint(building.id);
          const price = formatClubCash(building.cost);
          const tooltip = locked
            ? t("precinct.palette.locked", { building: label, price })
            : uniqueOwned
              ? `${level > 1 ? t("precinct.palette.withLevel", { building: label, level }) : label} · ${hint}`
              : owned
                ? t("precinct.palette.another", { building: label, price })
                : `${label} · ${price} · ${hint}`;
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
                  setDragBuilding(building.id);
                  setDragAnchor(null);
                  attachBuildingDragImage(event, building, tilePx);
                }}
                onDragEnd={() => {
                  setDragBuilding(null);
                  setDragAnchor(null);
                }}
                onClick={() => {
                  if (locked) return;
                  setSelectedPatchId(null);
                  setPicked((current) => (current === building.id ? null : building.id));
                }}
              >
                <PrecinctBuildingIcon building={building.id} size={20} />
                {count > 1 ? <span className="stadium-precinct-count">{count}</span> : null}
                {uniqueOwned && level > 1 ? (
                  <span className="stadium-precinct-level">{t("precinct.levelShort", { level })}</span>
                ) : null}
              </button>
              {upgrade.allowed || (owned && building.maxLevel > 1 && level < building.maxLevel) ? (
                <button
                  type="button"
                  className="stadium-precinct-upgrade"
                  disabled={!upgrade.allowed}
                  title={upgrade.reason ?? t("precinct.palette.upgrade", { building: label })}
                  onClick={() => onUpgrade(building.id)}
                >
                  {precinctNextUpgradeLabel(building.id, level)}
                </button>
              ) : null}
            </div>
          );
        })}
        <div className="stadium-precinct-palette-item">
          <button
            type="button"
            className={
              picked === "street"
                ? "stadium-precinct-tile is-picked"
                : !canPaintStreet
                  ? "stadium-precinct-tile is-street-erase"
                  : "stadium-precinct-tile"
            }
            data-tooltip={
              canPaintStreet
                ? t("precinct.street.tooltip", { price: formatClubCash(PRECINCT_STREET_COST) })
                : t("precinct.street.tooltipNoCash", { price: formatClubCash(PRECINCT_STREET_COST) })
            }
            aria-label={t("precinct.street.aria")}
            onClick={() => {
              setSelectedPatchId(null);
              setSelectedStreet(null);
              setPicked((current) => (current === "street" ? null : "street"));
            }}
          >
            <Route size={20} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
        <div className="stadium-precinct-hint">
          {roadPlan && roadPlan.cost > 0 ? (
            <p>{t("precinct.street.cost", { price: formatClubCash(roadPlan.cost) })}</p>
          ) : picked === "street" ? (
            <p>
              {canPaintStreet ? t("precinct.street.hint") : t("precinct.street.hintNoCash")} ·{" "}
              {t("precinct.street.hintWarn")}
            </p>
          ) : null}
        </div>
      </aside>
      <div className="stadium-precinct-map-stack">
      <div className="stadium-precinct-playfield" ref={mapHostRef}>
      <div
        className={picked === "street" ? "stadium-precinct-map is-paving" : "stadium-precinct-map"}
        onPointerDown={(event) => {
          if (picked !== "street" || event.button !== 0) return;
          const target = event.target instanceof Element ? event.target : null;
          if (target?.closest(".stadium-precinct-tile.is-street")) return;
          const cell = cellFromPointer(event);
          if (!cell) return;
          if (isStreetCell(precinct, cell.x, cell.y)) return;
          if (!canPaintStreet) return;
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
          style={{ gridTemplateColumns: `repeat(${precinct.width}, ${tileCss})` }}
          aria-hidden="true"
        >
          {Array.from({ length: precinct.width }, (_, x) => {
            if (x === PRECINCT_CITY_LINK.x) {
              return (
                <div
                  key="city-link"
                  className="stadium-precinct-city-link"
                  style={{ gridColumn: `span ${PRECINCT_CITY_LINK.w}` }}
                  title={t("precinct.city.title")}
                >
                  <Route size={16} strokeWidth={2.5} aria-hidden="true" />
                  <strong>{t("precinct.city.label")}</strong>
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
            gridTemplateColumns: `repeat(${precinct.width}, ${tileCss})`,
            gridTemplateRows: `repeat(${precinct.height}, ${tileCss})`,
          }}
          role="grid"
          aria-label={t("precinct.grid.aria")}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
            setDragAnchor(null);
          }}
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
                      ? t("precinct.arena.aria", { stadium: stadiumName })
                      : t("precinct.undocked", { building: stadiumName })
                  }
                  data-tooltip={
                    arenaDocked
                      ? t("precinct.arena.docked", { stadium: stadiumName })
                      : t("precinct.arena.undockedTip", { stadium: stadiumName })
                  }
                  style={{
                    gridColumn: `${PRECINCT_STADIUM.x + 1} / span ${PRECINCT_STADIUM.w}`,
                    gridRow: `${PRECINCT_STADIUM.y + 1} / span ${PRECINCT_STADIUM.h}`,
                  }}
                >
                  <Landmark size={22} strokeWidth={2.5} aria-hidden="true" />
                  <strong>{stadiumName}</strong>
                  {arenaDocked ? null : (
                    <span className="stadium-precinct-dock" aria-label={t("precinct.needsNetwork")}>
                      <PrecinctWarnIcon size={12} aria-hidden="true" strokeWidth={2.5} />
                    </span>
                  )}
                </div>
              );
            }
            const patch = patchAt(precinct, x, y);
            if (patch && (patch.x !== x || patch.y !== y)) return null;
            if (patch) {
              const meta = PRECINCT_BUILDINGS.find((entry) => entry.id === patch.building);
              const name = precinctBuildingLabel(patch.building);
              const movingHere = selected?.id === patch.id;
              const level = precinctBuildingLevel(precinct, patch.building);
              const hungry = !patchDocksStreetNetwork(precinct, patch);
              const underConstruction = Boolean(patch.constructing);
              const buildWeeksLeft =
                underConstruction && patch.readyWeekIndex != null
                  ? Math.max(
                      0,
                      patch.readyWeekIndex - careerWeekIndex(season, week),
                    )
                  : 0;
              const canShrink = !patchIsMinSize(patch);
              const def = precinctBuildingDef(patch.building);
              const stageLabel = precinctBuildingStageLabel(patch.building, level);
              const growHandles: Array<{ edge: PrecinctEdge; Icon: LucideIcon; label: string }> = [
                { edge: "n", Icon: ArrowUp, label: t("precinct.handle.growN") },
                { edge: "e", Icon: ArrowRight, label: t("precinct.handle.growE") },
                { edge: "s", Icon: ArrowDown, label: t("precinct.handle.growS") },
                { edge: "w", Icon: ArrowLeft, label: t("precinct.handle.growW") },
              ];
              const shrinkHandles: Array<{ edge: PrecinctEdge; Icon: LucideIcon; label: string }> = [
                { edge: "n", Icon: ArrowDown, label: t("precinct.handle.shrinkN") },
                { edge: "e", Icon: ArrowLeft, label: t("precinct.handle.shrinkE") },
                { edge: "s", Icon: ArrowUp, label: t("precinct.handle.shrinkS") },
                { edge: "w", Icon: ArrowRight, label: t("precinct.handle.shrinkW") },
              ];
              return (
                <div
                  key={patch.id}
                  role="gridcell"
                  tabIndex={0}
                  className={
                    [
                      "stadium-precinct-tile is-filled is-patch",
                      `is-building-${patch.building}`,
                      patch.constructing ? "is-constructing" : "",
                      level > 0 ? `is-tier-${Math.min(level, 5)}` : "",
                      movingHere ? "is-picked" : "",
                      underConstruction ? "is-under-construction" : "",
                      hungry ? "is-hungry" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                  style={{
                    gridColumn: `${patch.x + 1} / span ${patch.w}`,
                    gridRow: `${patch.y + 1} / span ${patch.h}`,
                  }}
                  aria-label={meta ? `${name} ${patch.w}×${patch.h}` : t("precinct.building.fallback")}
                  data-tooltip={
                    meta
                      ? underConstruction
                        ? hungry
                          ? t("precinct.patch.buildingNoStreet", { building: name, weeks: buildWeeksLeft })
                          : t("precinct.patch.building", { building: name, weeks: buildWeeksLeft })
                        : hungry
                          ? t("precinct.patch.undocked", { building: name })
                          : `${name} · ${stageLabel} · ${patch.w}×${patch.h} · ${canShrink ? t("precinct.patch.shrinkThenMove") : t("precinct.patch.clickToMove")}`
                      : t("precinct.building.fallback")
                  }
                  onDragOver={(event) => event.preventDefault()}
                  onClick={() => {
                    if (picked === "street") return;
                    if (picked) {
                      tryPlace(x, y, picked);
                      return;
                    }
                    setSelectedStreet(null);
                    setPicked(patch.building);
                    setSelectedPatchId(patch.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedStreet(null);
                      setPicked(patch.building);
                      setSelectedPatchId(patch.id);
                    }
                  }}
                >
                  {meta ? <PrecinctBuildingIcon building={patch.building} size={18} /> : null}
                  {patch.constructing ? (
                    <HardHat className="stadium-constructing-icon" size={14} strokeWidth={2.5} aria-label={t("precinct.patch.constructing")} />
                  ) : null}
                  {stageLabel ? <em className="stadium-precinct-stage">{stageLabel}</em> : null}
                  {level > 1 ? <span className="stadium-precinct-level">{t("precinct.levelShort", { level })}</span> : null}
                  {hungry ? (
                    <span className="stadium-precinct-dock" aria-label={t("precinct.needsNetwork")}>
                      <PrecinctWarnIcon size={12} aria-hidden="true" strokeWidth={2.5} />
                    </span>
                  ) : null}
                  {movingHere ? (
                    <>
                      {growHandles.map((handle) => {
                        const check = canNudgePrecinctPatch(precinct, patch.id, handle.edge, cash, 1);
                        return (
                          <button
                            key={`grow-${handle.edge}`}
                            type="button"
                            className={`stadium-precinct-handle is-${handle.edge}${check.allowed ? "" : " is-blocked"}`}
                            disabled={!check.allowed}
                            title={check.allowed ? handle.label : (check.reason ?? handle.label)}
                            aria-label={handle.label}
                            onClick={(event) => {
                              event.stopPropagation();
                              nudge(patch, handle.edge, 1);
                            }}
                          >
                            <handle.Icon size={12} strokeWidth={2.5} aria-hidden="true" />
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
                            title={t("precinct.handle.free", { label: handle.label })}
                            aria-label={handle.label}
                            onClick={(event) => {
                              event.stopPropagation();
                              nudge(patch, handle.edge, -1);
                            }}
                          >
                            <handle.Icon size={12} strokeWidth={2.5} aria-hidden="true" />
                          </button>
                        );
                      })}
                      {canShrink ? (
                        <button
                          type="button"
                          className="stadium-precinct-min"
                          title={t("precinct.handle.min", { size: `${def.minW}×${def.minH}` })}
                          aria-label={t("precinct.handle.min", { size: `${def.minW}×${def.minH}` })}
                          onClick={(event) => {
                            event.stopPropagation();
                            onShrinkToMin(patch.id);
                          }}
                        >
                          <SquareMinus size={12} strokeWidth={2.5} aria-hidden="true" />
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
                      ? t("precinct.plate.aria", {
                          side: precinctExpansionLabel(expansionTile),
                          price: formatClubCash(PRECINCT_EXPANSION_COST),
                        })
                      : t("precinct.plate.ariaLater", { side: precinctExpansionLabel(expansionTile) })
                  }
                  data-tooltip={
                    isNext
                      ? t("precinct.plate.tooltip", {
                          side: precinctExpansionLabel(expansionTile),
                          price: formatClubCash(PRECINCT_EXPANSION_COST),
                        })
                      : expansion.tile
                        ? t("precinct.plate.buyFirst", { side: precinctExpansionLabel(expansion.tile) })
                        : t("precinct.plate.buyNextFirst")
                  }
                  onClick={() => {
                    if (picked === "street") return;
                    if (isNext && expansion.allowed) onBuyParcel();
                  }}
                >
                  <Puzzle size={18} strokeWidth={2.5} aria-hidden="true" />
                  <strong>2×6</strong>
                  <em>{isNext ? formatClubCash(PRECINCT_EXPANSION_COST) : precinctExpansionLabel(expansionTile)}</em>
                </button>
              );
            }

            const locked = !isOwnedCell(precinct, x, y);
            const street = isStreetCell(precinct, x, y);
            const ramp = isCityRampCell(x, y);
            const previewKind = roadPreview.get(`${x},${y}`);
            const links = street ? streetLinks(precinct, x, y) : null;
            const streetSelected =
              street && selectedStreet?.x === x && selectedStreet?.y === y;
            const label = street
              ? ramp
                ? t("precinct.cell.streetRamp")
                : t("precinct.cell.street")
              : ramp
                ? t("precinct.cell.ramp")
                : t("precinct.cell.free");
            return (
              <button
                key={`${x},${y}`}
                type="button"
                role="gridcell"
                className={
                  [
                    "stadium-precinct-tile is-cell",
                    street ? "is-street" : "",
                    streetSelected ? "is-picked" : "",
                    ramp ? "is-ramp" : "",
                    previewKind === "paint" ? "is-road-preview" : "",
                    previewKind === "blocked" ? "is-road-blocked" : "",
                    previewKind === "exist" ? "is-road-exist" : "",
                    isDragPreviewCell(x, y) ? "is-drag-footprint" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                style={{ gridColumn: x + 1, gridRow: y + 1 }}
                aria-label={t("precinct.cell.aria", { x: x + 1, y: y + 1, label })}
                data-tooltip={label}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dragBuilding) setDragAnchor({ x, y });
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData(DRAG_TYPE) as PrecinctBuilding;
                  setDragBuilding(null);
                  setDragAnchor(null);
                  if (PRECINCT_BUILDINGS.some((entry) => entry.id === id)) {
                    tryPlace(x, y, id);
                  }
                }}
                onClick={() => {
                  if (street) {
                    if (picked === "street") {
                      onRemoveStreet(x, y);
                      setSelectedStreet(null);
                      return;
                    }
                    setSelectedPatchId(null);
                    setPicked(null);
                    setSelectedStreet({ x, y });
                    return;
                  }
                  if (picked === "street") return;
                  setSelectedStreet(null);
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
                {!street && ramp ? (
                  <ArrowUp size={14} strokeWidth={2.5} aria-hidden="true" />
                ) : null}
              </button>
            );
          }),
        )}
        </div>
      </div>
      <div className="stadium-precinct-detail-slot">
        {selectedStreet && isStreetCell(precinct, selectedStreet.x, selectedStreet.y) ? (
          <div className="stadium-precinct-detail" aria-label={t("precinct.detail.selectedStreet")}>
            <div className="stadium-precinct-detail-main">
              <span className="stadium-precinct-detail-icon">
                <Route size={18} strokeWidth={2.5} aria-hidden="true" />
              </span>
              <p className="stadium-precinct-detail-line">
                <strong>{t("precinct.detail.street")}</strong>
                <span className="stadium-precinct-detail-meta">
                  {" · "}
                  {t("precinct.detail.streetCell", {
                    x: selectedStreet.x + 1,
                    y: selectedStreet.y + 1,
                    amount: formatClubCash(streetRefund),
                  })}
                </span>
              </p>
            </div>
            <button
              type="button"
              className="stadium-precinct-detail-remove"
              onClick={() => {
                onRemoveStreet(selectedStreet.x, selectedStreet.y);
                setSelectedStreet(null);
              }}
            >
              {t("precinct.detail.remove")} · {formatClubCash(streetRefund)}
            </button>
            <button
              type="button"
              className="stadium-precinct-detail-close"
              aria-label={t("precinct.detail.clearSelection")}
              onClick={() => setSelectedStreet(null)}
            >
              <X size={16} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        ) : selected && selectedDef ? (
          <div className="stadium-precinct-detail" aria-label={t("precinct.detail.selectedBuilding")}>
            <div className="stadium-precinct-detail-main">
              <span className="stadium-precinct-detail-icon">
                <PrecinctBuildingIcon building={selected.building} size={18} />
              </span>
              <p className="stadium-precinct-detail-line">
                <strong>{precinctBuildingLabel(selected.building)}</strong>
                <span className="stadium-precinct-detail-meta">
                  {" · "}
                  {precinctBuildingStageLabel(selected.building, selectedLevel)} · {selected.w}×{selected.h}
                  {!patchDocksStreetNetwork(precinct, selected)
                    ? ` · ${t("precinct.detail.noNetwork")}`
                    : null}
                  <HospitalityBuildingLiveStat
                    building={selected.building}
                    preview={hospitalityPreview}
                    isHomeMatchWeek={isHomeMatchWeek}
                  />
                </span>
              </p>
            </div>
            {selectedDef.maxLevel > 1 && selectedLevel < selectedDef.maxLevel ? (
              <button
                type="button"
                className="stadium-precinct-detail-upgrade"
                disabled={!selectedUpgrade.allowed}
                title={
                  selectedUpgrade.allowed
                    ? `${formatClubCash(selectedUpgrade.cost)} · ${precinctNextUpgradeLabel(selected.building, selectedLevel)}`
                    : (selectedUpgrade.reason ?? t("precinct.detail.upgradeBlocked"))
                }
                onClick={() => onUpgrade(selected.building)}
              >
                {precinctNextUpgradeLabel(selected.building, selectedLevel)} ·{" "}
                {formatClubCash(selectedUpgrade.cost)}
              </button>
            ) : selectedDef.maxLevel > 1 ? (
              <span className="stadium-precinct-detail-maxed">{t("precinct.detail.maxLevel")}</span>
            ) : null}
            <button
              type="button"
              className="stadium-precinct-detail-remove"
              title={t("precinct.detail.demolish", { amount: formatClubCash(selectedRefund) })}
              onClick={() => {
                onRemovePatch(selected.id);
                setSelectedPatchId(null);
                setPicked(null);
              }}
            >
              {t("precinct.detail.remove")} · {formatClubCash(selectedRefund)}
            </button>
            <button
              type="button"
              className="stadium-precinct-detail-close"
              aria-label={t("precinct.detail.clearSelection")}
              onClick={() => {
                setSelectedPatchId(null);
                setPicked(null);
              }}
            >
              <X size={16} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <p className="stadium-precinct-detail-hint">{t("precinct.detail.hint")}</p>
        )}
      </div>
      </div>
      </div>
      <PrecinctStatus
        precinct={precinct}
        layout={mobileNarrow ? "stack" : "rail"}
        picked={picked}
        selectedBuilding={selected?.building}
        hospitalityPreview={hospitalityPreview}
        onFocus={focusBuilding}
      />
      </div>
    </section>
  );
}

function RoadGlyph({ links }: { links: { n: boolean; e: boolean; s: boolean; w: boolean } }) {
  const degree = Number(links.n) + Number(links.e) + Number(links.s) + Number(links.w);
  const straight =
    (links.n && links.s && !links.e && !links.w) || (links.e && links.w && !links.n && !links.s);
  const shape =
    degree <= 1 ? "is-end" : straight ? "is-straight" : degree >= 3 ? "is-junction" : "is-corner";
  return (
    <span className={`stadium-precinct-road ${shape}`} aria-hidden="true">
      {links.n ? <i className="arm n" /> : null}
      {links.e ? <i className="arm e" /> : null}
      {links.s ? <i className="arm s" /> : null}
      {links.w ? <i className="arm w" /> : null}
      <i className="hub" />
    </span>
  );
}
