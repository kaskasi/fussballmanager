import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilterChip, FilterToolbar } from "../components/primitives/index.ts";
import type { Player, PositionPrimary } from "../../types/player.ts";
import type { BoardTarget } from "../../scouting/scout-board.ts";
import type {
  ActiveClubScout,
  ActiveRegionScout,
  ScoutDiscoveryState,
} from "../../scouting/scout-discovery.ts";
import type { WorldClub, WorldDivisionId } from "../../world/world-generator.ts";
import {
  assignmentLabel,
  DEFAULT_ASSIGNMENT_CRITERIA,
  type ScoutAssignment,
} from "../../scouting/scout-assignments.ts";
import {
  MAX_HIRED_SCOUTS,
  scoutNetworkAccuracyModifier,
  scoutNetworkCapacity,
  scoutNetworkWeeklyWage,
  type HiredScout,
  type ScoutNetworkState,
} from "../../scouting/scout-network.ts";
import {
  confidenceBucket,
  filterMarket,
  headlineCounts,
  targetLabel,
  barBand,
  barTrackPercents,
  marketFiltersActive,
  CA_BAR_MAX,
  DEFAULT_MARKET_FILTERS,
  type ConfidenceBucket,
  type MarketFilters,
  type MarketSort,
  type MarketSortKey,
} from "../../scouting/market-list.ts";
import { listMarketRows, sortMarketRows, type MarketRow } from "../../scouting/market-roster.ts";
import { scoutMarketValueBounds, scoutReveal } from "../../scouting/scout-visibility.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { Hint } from "../components/Hint.tsx";
import { RowMenu } from "../components/RowMenu.tsx";
import { PlayerPortrait } from "../components/PlayerPortrait.tsx";
import { ScoutWorkGrid } from "../components/ScoutWorkGrid.tsx";
import { ScoutHitGridCard } from "../components/ScoutHitGridCard.tsx";
import { ScoutHitFilterAssignmentCard } from "../components/ScoutHitFilterAssignmentCard.tsx";
import { ScoutRegionMap } from "../components/ScoutRegionMap.tsx";
import { ScoutRegionDetailScreen } from "../components/ScoutRegionDetailScreen.tsx";
import { buildScoutDiscoveryMapModel } from "../../scouting/scout-region-map.ts";
import type { ScoutRouteScore } from "../../scouting/scout-route-puzzle.ts";
import { ScoutNetworkPanel } from "../components/ScoutNetworkPanel.tsx";
import { ScoutConfidenceIcon } from "../components/ScoutConfidenceIcon.tsx";
import { formatClubCash } from "../../economy/club-finances.ts";
import { Circle, ClipboardList, Pause, Search, Star } from "lucide-react";
import { ScreenEmptyState } from "../components/ScreenEmptyState.tsx";

type ScoutingTab = "map" | "staff" | "orders" | "pool" | "watchlist";
export type ScoutingInitialTab =
  | "network"
  | "hits"
  | "map"
  | "staff"
  | "orders"
  | "pool"
  | "watchlist";

function resolveInitialScoutingTab(initial: ScoutingInitialTab): ScoutingTab {
  if (initial === "network") return "map";
  if (initial === "hits") return "pool";
  return initial;
}

const POSITIONS: PositionPrimary[] = [
  "GK",
  "CB",
  "LB",
  "RB",
  "DM",
  "CM",
  "AM",
  "LM",
  "RM",
  "LW",
  "RW",
  "CF",
];

const CONFIDENCE_FILTERS: {
  bucket: ConfidenceBucket;
  titleKey: string;
  hintKey: string;
}[] = [
  { bucket: "known", titleKey: "scouting.confidence.known.title", hintKey: "scouting.confidence.known.hint" },
  { bucket: "unclear", titleKey: "scouting.confidence.unclear.title", hintKey: "scouting.confidence.unclear.hint" },
  { bucket: "unknown", titleKey: "scouting.confidence.unknown.title", hintKey: "scouting.confidence.unknown.hint" },
];

const AGE_FILTERS: Array<{ value: MarketFilters["age"]; label: string }> = [
  { value: "u21", label: "U21" },
  { value: "22-27", label: "22–27" },
  { value: "28+", label: "28+" },
];

const REGIONS = ["Schleswig-Holstein", "Fördeküste", "Hansestadt", "Nordfriesland"];

const HITS_GRID_COLUMNS = 5;
const HITS_GRID_CAPACITY = HITS_GRID_COLUMNS * 2;

/**
 * WIREFRAME: PRD 14.9 / 09 Screen 3
 *
 * ScoutConfidenceIcon: known · unclear · unknown
 * [Portrait] Name            [CA ▓░CI░] [€ ▓░CI░]
 *            19 · CM · Club
 */
/** WIREFRAME: docs/prd/design.md §9.13 — Scouting (list v1) */
export function ScoutingCenter({
  targets,
  rivalPlayers,
  worldClubs,
  playerClub,
  discovery,
  playerDivisionId,
  activeClubScout,
  activeRegionScout,
  activeOpponentScout,
  activeScoutTrips,
  scoutTripQueue,
  tripQueueLength,
  onEnqueueScoutTrip,
  onScoutRegion,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  assignments,
  onAddAssignment,
  onCancelScoutWork,
  onToggleAssignment,
  onSelectTarget,
  onAssignScout,
  scoutNetwork,
  scoutCapacity,
  season,
  week,
  masterSeed,
  cash,
  onHireScout,
  onFireScout,
  shortlistIds,
  onToggleShortlist,
  initialTab,
  onInitialTabApplied,
  onScoutMapDetailChange,
  opponentLabel,
  matchSetup,
}: {
  targets: BoardTarget[];
  rivalPlayers: readonly Player[];
  worldClubs: readonly WorldClub[];
  playerClub?: WorldClub | null;
  discovery: ScoutDiscoveryState | undefined;
  playerDivisionId: WorldDivisionId;
  activeClubScout?: ActiveClubScout | null;
  activeRegionScout?: ActiveRegionScout | null;
  activeOpponentScout?: import("../../scouting/opponent-scout-job.ts").ActiveOpponentScout | null;
  activeScoutTrips?: readonly import("../../scouting/scout-trip.ts").ActiveScoutTrip[];
  scoutTripQueue?: readonly import("../../scouting/scout-trip.ts").ScoutTripPlan[];
  tripQueueLength?: number;
  onEnqueueScoutTrip: (
    zoneId: string,
    input: { pathNodeIds: string[]; targetClubId: string; score: ScoutRouteScore },
  ) => void;
  onScoutRegion: (zoneId: string) => void;
  filters: MarketFilters;
  onFiltersChange: (filters: MarketFilters) => void;
  sort: MarketSort;
  onSortChange: (sort: MarketSort) => void;
  assignments: ScoutAssignment[];
  onAddAssignment: () => void;
  onCancelScoutWork: (target: import("../../scouting/scout-work-cancel.ts").ScoutWorkCancelTarget) => void;
  onToggleAssignment: (assignmentId: string) => void;
  onSelectTarget: (playerId: string) => void;
  onAssignScout: (playerId: string) => void;
  scoutNetwork: ScoutNetworkState;
  scoutCapacity: number;
  season: number;
  week: number;
  masterSeed: number;
  cash: number;
  onHireScout: (scout: HiredScout) => void;
  onFireScout: (scoutId: string) => void;
  shortlistIds: readonly string[];
  onToggleShortlist: (playerId: string) => void;
  initialTab?: ScoutingInitialTab | null;
  onInitialTabApplied?: () => void;
  /** When region detail map is open, shell header shows back + zone title (replaces crest). */
  onScoutMapDetailChange?: (open: boolean, onBack: () => void, title?: string) => void;
  opponentLabel?: string;
  matchSetup?: import("../../sim/career-match-setup.ts").CareerMatchSetup | null;
}) {
  const t = useT();
  const [tab, setTab] = useState<ScoutingTab>("pool");
  const [detailZoneId, setDetailZoneId] = useState<string | null>(null);

  const notifyScoutMapDetailRef = useRef(onScoutMapDetailChange);
  notifyScoutMapDetailRef.current = onScoutMapDetailChange;

  const closeRegionDetail = useCallback(() => {
    setDetailZoneId(null);
  }, []);

  const mapModel = useMemo(
    () =>
      buildScoutDiscoveryMapModel({
        clubs: worldClubs,
        targets,
        rivalPlayers,
        discovery,
        playerDivisionId,
        playerClub,
        activeClubScout,
        activeRegionScout,
      }),
    [
      activeClubScout,
      activeRegionScout,
      discovery,
      playerClub,
      playerDivisionId,
      rivalPlayers,
      targets,
      worldClubs,
    ],
  );
  const detailZone = detailZoneId
    ? mapModel.zones.find((zone) => zone.id === detailZoneId)
    : undefined;

  const detailZoneLabel = detailZone?.label;

  useEffect(() => {
    const notify = notifyScoutMapDetailRef.current;
    if (!notify) return;
    if (detailZoneId == null || detailZoneLabel == null) {
      notify(false, () => {});
      return undefined;
    }
    notify(true, closeRegionDetail, detailZoneLabel);
    return () => {
      notify(false, () => {});
    };
  }, [closeRegionDetail, detailZoneId, detailZoneLabel]);

  useEffect(() => {
    if (detailZoneId != null && !detailZone) setDetailZoneId(null);
  }, [detailZoneId, detailZone]);

  useEffect(() => {
    if (initialTab) {
      setTab(resolveInitialScoutingTab(initialTab));
      onInitialTabApplied?.();
    }
  }, [initialTab, onInitialTabApplied]);
  const market = useMemo(
    () =>
      targets.map((target) => ({
        player: target.player,
        estimate: target.estimate,
        assigned: target.assigned,
        assigned_scout_id: target.assigned_scout_id,
        clubName: target.clubName,
      })),
    [targets],
  );
  const assignedIds = useMemo(
    () => new Set(targets.filter((target) => target.assigned).map((target) => target.player.id)),
    [targets],
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const counts = headlineCounts(market);
  const visible = useMemo(() => {
    const filtered = filterMarket(market, filters);
    const rows = listMarketRows(filtered, assignedIds, season);
    return sortMarketRows(rows, sort.key, sort.direction);
  }, [market, filters, assignedIds, sort, season]);
  const gridHits = useMemo(
    () => visible.slice(0, HITS_GRID_CAPACITY - 1),
    [visible],
  );
  const filterOrderSummary = useMemo(
    () =>
      assignmentLabel({
        ...DEFAULT_ASSIGNMENT_CRITERIA,
        position: filters.position,
        age: filters.age,
        query: filters.query,
        confidence: filters.confidence,
      }),
    [filters],
  );
  const allMarketRows = useMemo(
    () => listMarketRows(market, assignedIds, season),
    [market, assignedIds, season],
  );
  const watchlistRows = useMemo(() => {
    if (shortlistIds.length === 0) return [];
    const byId = new Map(allMarketRows.map((row) => [row.playerId, row]));
    return shortlistIds
      .map((id) => byId.get(id))
      .filter((row): row is MarketRow => row != null);
  }, [allMarketRows, shortlistIds]);
  const watchlistVisible = useMemo(
    () => sortMarketRows(watchlistRows, sort.key, sort.direction),
    [watchlistRows, sort],
  );
  const watchlistValueScale = useMemo(() => {
    let max = 1;
    for (const row of watchlistVisible) {
      const bounds = scoutMarketValueBounds(row.player, row.estimate, season, false);
      if (bounds) max = Math.max(max, bounds.high);
    }
    return max;
  }, [watchlistVisible, season]);
  const networkCapacity = scoutNetworkCapacity(scoutNetwork);
  const networkAccuracy = scoutNetworkAccuracyModifier(scoutNetwork);

  const toggleSort = (key: MarketSortKey) => {
    if (sort.key === key) {
      onSortChange({ key, direction: sort.direction === "desc" ? "asc" : "desc" });
      return;
    }
    onSortChange({ key, direction: key === "name" || key === "position" ? "asc" : "desc" });
  };

  const inRegionDetail = tab === "map" && detailZone != null;

  const scoutingTabs: { id: ScoutingTab; labelKey: string; suffix?: string }[] = [
    { id: "map", labelKey: "scouting.subtab.networkMap" },
    { id: "staff", labelKey: "scouting.subtab.networkStaff" },
    { id: "orders", labelKey: "scouting.subtab.hitsOrders" },
    { id: "pool", labelKey: "scouting.subtab.hitsPool" },
    { id: "watchlist", labelKey: "scouting.tab.watchlist" },
  ];

  return (
    <main
      className={
        inRegionDetail
          ? "scouting club-shell-card-body scouting-region-detail-screen"
          : "scouting club-shell-card-body scouting-has-primary-tabs"
      }
    >
      {inRegionDetail ? null : (
        <div
          className="fm-tab-bar scouting-primary-tab-bar"
          role="tablist"
          aria-label={t("scouting.tabs.aria")}
        >
          {scoutingTabs.map(({ id, labelKey }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "fm-tab is-active" : "fm-tab"}
              onClick={() => setTab(id)}
            >
              {t(labelKey)}
              {id === "watchlist" && shortlistIds.length > 0 ? (
                <span className="fm-tab-count"> · {shortlistIds.length}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {tab === "map" ? (
        inRegionDetail && detailZone ? (
          <ScoutRegionDetailScreen
            zone={detailZone}
            zoneLabel={detailZone.label}
            activeScoutTrips={activeScoutTrips}
            scoutTripQueue={scoutTripQueue}
            tripQueueLength={tripQueueLength}
            worldClubs={worldClubs}
            onEnqueueTrip={(input) => {
              onEnqueueScoutTrip(detailZone.id, input);
            }}
          />
        ) : (
          <div className="fm-tab-panel">
            <p className="scouting-scouts">
              {t("scouting.network.meta", {
                scouts: scoutNetwork.scouts.length,
                max: MAX_HIRED_SCOUTS,
                capacity: networkCapacity,
                accuracy: networkAccuracy.toFixed(2),
              })}
              {" · "}
              {formatClubCash(scoutNetworkWeeklyWage(scoutNetwork))}/Woche
            </p>
            <section className="game-panel scouting-section" aria-label={t("scouting.network.aria")}>
              <ScoutRegionMap
                clubs={worldClubs}
                targets={targets}
                rivalPlayers={rivalPlayers}
                discovery={discovery}
                playerDivisionId={playerDivisionId}
                playerClub={playerClub}
                activeRegionScout={activeRegionScout}
                activeScoutTrips={activeScoutTrips}
                scoutTripQueue={scoutTripQueue}
                onScoutRegion={onScoutRegion}
                onOpenRegionDetail={setDetailZoneId}
              />
            </section>
          </div>
        )
      ) : null}

      {tab === "staff" ? (
        <div className="fm-tab-panel scouting-network-screen">
          <section className="game-panel scouting-section" aria-label={t("scouting.network.aria")}>
            <ScoutNetworkPanel
              network={scoutNetwork}
              season={season}
              week={week}
              masterSeed={masterSeed}
              cash={cash}
              onHire={onHireScout}
              onFire={onFireScout}
              showHead
            />
          </section>
        </div>
      ) : null}

      {tab === "orders" ? (
        <div className="fm-tab-panel">
          <ScoutWorkGrid
            targets={targets}
            assignments={assignments}
            activeTrips={activeScoutTrips ?? []}
            tripQueue={scoutTripQueue}
            activeClubScout={activeClubScout}
            activeRegionScout={activeRegionScout}
            activeOpponentScout={activeOpponentScout}
            opponentLabel={opponentLabel}
            season={season}
            matchSetup={matchSetup}
            scoutNetwork={scoutNetwork}
            worldClubs={worldClubs}
            onToggleAssignment={onToggleAssignment}
            onCancelScoutWork={onCancelScoutWork}
          />
        </div>
      ) : null}

      {tab === "pool" ? (
        <div className="fm-tab-panel">
          <Hint text={t("scouting.hint")} block>
            <p className="scouting-summary">
              <span>{t("scouting.summary.known", { count: counts.known })}</span>
              <span>{t("scouting.summary.unclear", { count: counts.unclear })}</span>
              <span>{t("scouting.summary.unknown", { count: counts.unknown })}</span>
            </p>
          </Hint>

      <div className="scouting-filter-toolbar">
        <FilterToolbar ariaLabel={t("scouting.filter.aria")} className="scouting-chips">
          <FilterChip active={filters.position === "all"} onClick={() => onFiltersChange({ ...filters, position: "all" })}>{t("scouting.filter.all")}</FilterChip>
          {POSITIONS.map((slot) => (
            <FilterChip
              key={slot}
              active={filters.position === slot}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  position: filters.position === slot ? "all" : slot,
                })
              }
            >
              {slot}
            </FilterChip>
          ))}
          {AGE_FILTERS.map((filter) => (
            <FilterChip
              key={filter.value}
              active={filters.age === filter.value}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  age: filters.age === filter.value ? "all" : filter.value,
                })
              }
            >
              {filter.label}
            </FilterChip>
          ))}
          {CONFIDENCE_FILTERS.map((filter) => (
            <FilterChip
              key={filter.bucket}
              active={filters.confidence === filter.bucket}
              title={t(filter.titleKey)}
              hint={t(filter.hintKey)}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  confidence: filters.confidence === filter.bucket ? "all" : filter.bucket,
                })
              }
            >
              <ScoutConfidenceIcon bucket={filter.bucket} size={16} />
            </FilterChip>
          ))}
          {REGIONS.map((region) => (
            <FilterChip
              key={region}
              active={filters.query.toLowerCase() === region.toLowerCase()}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  query: filters.query.toLowerCase() === region.toLowerCase() ? "" : region,
                })
              }
            >
              {region}
            </FilterChip>
          ))}
        </FilterToolbar>
        <FilterToolbar ariaLabel={t("scouting.sort.aria")} className="scouting-sort">
          {(["name", "ca", "marketValue"] as const).map((key) => {
            const label =
              key === "name" ? t("squad.col.name") : key === "ca" ? "CA" : t("squad.col.value");
            const active = sort.key === key;
            return (
              <FilterChip key={key} active={active} onClick={() => toggleSort(key)}>
                {label}
                {active ? (sort.direction === "asc" ? " ▲" : " ▼") : ""}
              </FilterChip>
            );
          })}
        </FilterToolbar>
      </div>

      {visible.length === 0 ? (
        <section className="squad-empty scouting-empty" aria-label={t("scouting.empty.aria")}>
          <span className="squad-empty-icon" aria-hidden="true">
            <Search size={28} strokeWidth={2.5} />
          </span>
          <p>{market.length === 0 ? t("scouting.pool.empty") : t("scouting.empty")}</p>
          {marketFiltersActive(filters) ? (
            <FilterChip active={false} onClick={() => onFiltersChange(DEFAULT_MARKET_FILTERS)}>
              {t("scouting.empty.reset")}
            </FilterChip>
          ) : null}
        </section>
      ) : (
        <ScoutingHitsGrid
          rows={gridHits}
          season={season}
          scoutNetwork={scoutNetwork}
          shortlistIds={shortlistIds}
          hitCount={visible.length}
          filterSummary={filterOrderSummary}
          filterMatchCount={visible.length}
          onAddAssignment={onAddAssignment}
          onSelectTarget={onSelectTarget}
          onAssignScout={onAssignScout}
          onToggleShortlist={onToggleShortlist}
        />
      )}
        </div>
      ) : null}

      {tab === "watchlist" ? (
        <div className="fm-tab-panel scouting-watchlist-only">
          {watchlistVisible.length === 0 ? (
            <ScreenEmptyState
              icon={Star}
              title={t("scouting.watchlist.empty")}
              hint={t("scouting.watchlist.hint")}
              aria-label={t("scouting.watchlist.empty.aria")}
              className="scouting-empty"
            />
          ) : (
            <>
              <FilterToolbar ariaLabel={t("scouting.sort.aria")} className="scouting-sort">
                {(["name", "ca", "marketValue"] as const).map((key) => {
                  const label =
                    key === "name" ? t("squad.col.name") : key === "ca" ? "CA" : t("squad.col.value");
                  const active = sort.key === key;
                  return (
                    <FilterChip key={key} active={active} onClick={() => toggleSort(key)}>
                      {label}
                      {active ? (sort.direction === "asc" ? " ▲" : " ▼") : ""}
                    </FilterChip>
                  );
                })}
              </FilterToolbar>
              <ScoutingPlayerList
                rows={watchlistVisible}
                season={season}
                valueScale={watchlistValueScale}
                sectionTitle=""
                listAriaLabel={t("scouting.watchlist.aria")}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                onSelectTarget={onSelectTarget}
                onAssignScout={onAssignScout}
                starred
                onToggleShortlist={onToggleShortlist}
              />
            </>
          )}
        </div>
      ) : null}
    </main>
  );
}

function ScoutingHitsGrid({
  rows,
  season,
  scoutNetwork,
  shortlistIds,
  hitCount,
  filterSummary,
  filterMatchCount,
  onAddAssignment,
  onSelectTarget,
  onAssignScout,
  onToggleShortlist,
}: {
  rows: readonly MarketRow[];
  season: number;
  scoutNetwork: ScoutNetworkState;
  shortlistIds: readonly string[];
  hitCount: number;
  filterSummary: string;
  filterMatchCount: number;
  onAddAssignment: () => void;
  onSelectTarget: (playerId: string) => void;
  onAssignScout: (playerId: string) => void;
  onToggleShortlist: (playerId: string) => void;
}) {
  const t = useT();
  const shortlisted = useMemo(() => new Set(shortlistIds), [shortlistIds]);
  return (
    <section className="scouting-hits-grid-wrap" aria-label={t("scouting.hits.gridAria")}>
      <h2 className="scouting-section-title">
        {t("scouting.hits.header", { count: hitCount })}
      </h2>
      <ul
        className="scouting-hits-grid"
        style={{ gridTemplateColumns: `repeat(${HITS_GRID_COLUMNS}, minmax(0, 1fr))` }}
      >
        <li className="scouting-hits-grid-cell">
          <ScoutHitFilterAssignmentCard
            filterSummary={filterSummary}
            matchCount={filterMatchCount}
            onAddAssignment={onAddAssignment}
          />
        </li>
        {rows.map((row) => (
          <li key={row.playerId} className="scouting-hits-grid-cell">
            <ScoutHitGridCard
              row={row}
              season={season}
              scoutNetwork={scoutNetwork}
              shortlisted={shortlisted.has(row.playerId)}
              onOpenProfile={() => onSelectTarget(row.playerId)}
              onAssignScout={() => onAssignScout(row.playerId)}
              onToggleShortlist={() => onToggleShortlist(row.playerId)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ScoutingPlayerList({
  rows,
  season,
  valueScale,
  sectionTitle,
  listAriaLabel,
  openMenuId,
  setOpenMenuId,
  onSelectTarget,
  onAssignScout,
  starred = false,
  onToggleShortlist,
}: {
  rows: readonly MarketRow[];
  season: number;
  valueScale: number;
  sectionTitle: string;
  listAriaLabel: string;
  openMenuId: string | null;
  setOpenMenuId: (value: string | null | ((current: string | null) => string | null)) => void;
  onSelectTarget: (playerId: string) => void;
  onAssignScout: (playerId: string) => void;
  starred?: boolean;
  onToggleShortlist?: (playerId: string) => void;
}) {
  return (
    <>
      {sectionTitle ? <h2 className="scouting-section-title">{sectionTitle}</h2> : null}
      <ul className="scouting-list" aria-label={listAriaLabel}>
        {rows.map((row) => {
          const band = barBand(row.estimate);
          const caTrack = barTrackPercents(band.low, band.high, band.value, CA_BAR_MAX);
          const bounds = scoutMarketValueBounds(row.player, row.estimate, season, false);
          const valueTrack = bounds
            ? barTrackPercents(bounds.low, bounds.high, (bounds.low + bounds.high) / 2, valueScale)
            : null;
          return (
            <li key={row.playerId} className="scouting-item">
              <button
                type="button"
                className="scouting-item-main"
                onClick={() => onSelectTarget(row.playerId)}
              >
                <PlayerPortrait
                  seed={row.player.portrait_seed}
                  size="sm"
                  variant={scoutReveal(row.estimate.uncertaintyRange).showExactCa ? "known" : "silhouette"}
                  className="scouting-portrait"
                />
                <span className="scouting-player-card">
                  <span className="scouting-player-name">
                    {!starred && row.assigned ? (
                      <span className="scouting-active" title="Scout aktiv">
                        <Circle size={12} fill="var(--rasen)" strokeWidth={2.5} />
                      </span>
                    ) : null}
                    {starred ? (
                      <Star size={14} fill="var(--sonnengelb)" strokeWidth={2.5} className="scouting-watchlist-star" aria-hidden />
                    ) : null}
                    {row.displayName}
                  </span>
                  <span className="scouting-player-meta">
                    {row.age} · {row.position}
                    {row.clubName ? ` · ${row.clubName}` : ""}
                  </span>
                </span>
                <span className="scouting-label">{targetLabel({ player: row.player, estimate: row.estimate })}</span>
                <div className="scouting-item-bars">
                  <div className="scouting-bar">
                    <small>CA</small>
                    <div
                      className="scouting-bar-track"
                      aria-label={`CA ${Math.round(band.low)} bis ${Math.round(band.high)}`}
                    >
                      <span
                        className="scouting-bar-ci"
                        style={{ left: `${caTrack.ciLeft}%`, width: `${caTrack.ciWidth}%` }}
                      />
                      <span className="scouting-bar-fill" style={{ width: `${caTrack.fill}%` }} />
                    </div>
                  </div>
                  <div className="scouting-bar">
                    <small>€</small>
                    <div className="scouting-bar-track" aria-label={t("scouting.estimateBar.aria")}>
                      {valueTrack ? (
                        <>
                          <span
                            className="scouting-bar-ci"
                            style={{ left: `${valueTrack.ciLeft}%`, width: `${valueTrack.ciWidth}%` }}
                          />
                          <span className="scouting-bar-fill" style={{ width: `${valueTrack.fill}%` }} />
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
              <div className="scouting-item-actions" onClick={(event) => event.stopPropagation()}>
                {starred && onToggleShortlist ? (
                  <button
                    type="button"
                    className="scouting-watchlist-star-btn"
                    aria-label={t("scouting.watchlist.remove")}
                    onClick={() => onToggleShortlist(row.playerId)}
                  >
                    <Star size={16} fill="var(--sonnengelb)" strokeWidth={2.5} />
                  </button>
                ) : null}
                <RowMenu
                  open={openMenuId === row.playerId}
                  assigned={row.assigned}
                  onToggle={() => setOpenMenuId((current) => (current === row.playerId ? null : row.playerId))}
                  onClose={() => setOpenMenuId(null)}
                  onScout={() => onAssignScout(row.playerId)}
                  onOpenProfile={() => onSelectTarget(row.playerId)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

