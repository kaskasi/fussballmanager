import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Player, PositionPrimary } from "../../types/player.ts";
import type { BoardTarget } from "../../scouting/scout-board.ts";
import type {
  ActiveClubScout,
  ActiveRegionScout,
  ScoutDiscoveryState,
} from "../../scouting/scout-discovery.ts";
import type { WorldClub, WorldDivisionId } from "../../world/world-generator.ts";
import {
  type ScoutAssignment,
} from "../../scouting/scout-assignments.ts";
import {
  scoutNetworkAccuracyModifier,
  scoutNetworkCapacity,
  scoutNetworkWeeklyWage,
  type HiredScout,
  type ScoutNetworkState,
} from "../../scouting/scout-network.ts";
import {
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
import { ScoutMapJobsPanel } from "../components/ScoutMapJobsPanel.tsx";
import { ScoutRegionMap } from "../components/ScoutRegionMap.tsx";
import { ScoutRegionDetailScreen } from "../components/ScoutRegionDetailScreen.tsx";
import { buildScoutDiscoveryMapModel } from "../../scouting/scout-region-map.ts";
import type { ScoutRouteScore } from "../../scouting/scout-route-puzzle.ts";
import { ScoutNetworkPanel } from "../components/ScoutNetworkPanel.tsx";
import { ScoutConfidenceIcon } from "../components/ScoutConfidenceIcon.tsx";
import { formatClubCash } from "../../economy/club-finances.ts";
import { Circle, ClipboardList, Pause, Search, Star } from "lucide-react";
import { ScreenEmptyState } from "../components/ScreenEmptyState.tsx";

type ScoutingTab = "network" | "hits" | "watchlist";
export type ScoutingInitialTab = "network" | "hits";

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
  activeScoutTrip,
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
  onRemoveAssignment,
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
}: {
  targets: BoardTarget[];
  rivalPlayers: readonly Player[];
  worldClubs: readonly WorldClub[];
  playerClub?: WorldClub | null;
  discovery: ScoutDiscoveryState | undefined;
  playerDivisionId: WorldDivisionId;
  activeClubScout?: ActiveClubScout | null;
  activeRegionScout?: ActiveRegionScout | null;
  activeScoutTrip?: import("../../scouting/scout-trip.ts").ActiveScoutTrip | null;
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
  onRemoveAssignment: (assignmentId: string) => void;
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
  /** When region detail map is open, shell header shows back (replaces crest). */
  onScoutMapDetailChange?: (open: boolean, onBack: () => void) => void;
}) {
  const t = useT();
  const [tab, setTab] = useState<ScoutingTab>("hits");
  const [detailZoneId, setDetailZoneId] = useState<string | null>(null);

  const notifyScoutMapDetailRef = useRef(onScoutMapDetailChange);
  notifyScoutMapDetailRef.current = onScoutMapDetailChange;
  const detailOpenedAtRef = useRef(0);

  useEffect(() => {
    const notify = notifyScoutMapDetailRef.current;
    if (!notify) return;
    if (detailZoneId == null) {
      notify(false, () => {});
      return undefined;
    }
    detailOpenedAtRef.current = Date.now();
    const closeDetail = () => {
      if (Date.now() - detailOpenedAtRef.current < 200) return;
      setDetailZoneId(null);
    };
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (!cancelled) notify(true, closeDetail);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [detailZoneId]);

  useEffect(() => {
    return () => notifyScoutMapDetailRef.current?.(false, () => {});
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

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
      onInitialTabApplied?.();
    }
  }, [initialTab, onInitialTabApplied]);
  const market = useMemo(
    () => targets.map((target) => ({ player: target.player, estimate: target.estimate })),
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
  const topHits = useMemo(() => visible.slice(0, 5), [visible]);
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
  const assigned = assignedIds.size;
  const networkCapacity = scoutNetworkCapacity(scoutNetwork);
  const networkAccuracy = scoutNetworkAccuracyModifier(scoutNetwork);

  const valueScale = useMemo(() => {
    let max = 1;
    for (const row of visible) {
      const bounds = scoutMarketValueBounds(row.player, row.estimate, season, false);
      if (bounds) max = Math.max(max, bounds.high);
    }
    return max;
  }, [visible, season]);

  const toggleSort = (key: MarketSortKey) => {
    if (sort.key === key) {
      onSortChange({ key, direction: sort.direction === "desc" ? "asc" : "desc" });
      return;
    }
    onSortChange({ key, direction: key === "name" || key === "position" ? "asc" : "desc" });
  };

  const scoutingTabs: { id: ScoutingTab; labelKey: string; suffix?: string }[] = [
    { id: "network", labelKey: "scouting.tab.network" },
    { id: "hits", labelKey: "scouting.tab.hits" },
    {
      id: "watchlist",
      labelKey: "scouting.tab.watchlist",
      suffix: shortlistIds.length > 0 ? ` · ${shortlistIds.length}` : undefined,
    },
  ];

  return (
    <main className="scouting club-shell-card-body">
      <div className="fm-tab-bar" role="tablist" aria-label={t("scouting.tabs.aria")}>
        {scoutingTabs.map(({ id, labelKey, suffix }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "fm-tab is-active" : "fm-tab"}
            onClick={() => setTab(id)}
          >
            {t(labelKey)}
            {suffix ?? ""}
          </button>
        ))}
      </div>

      {tab === "network" ? (
        <div className="fm-tab-panel">
          <p className="scouting-scouts">
            {t("scouting.network.meta", {
              scouts: scoutNetwork.scouts.length,
              capacity: networkCapacity,
              accuracy: networkAccuracy.toFixed(2),
            })}
            {" · "}
            {formatClubCash(scoutNetworkWeeklyWage(scoutNetwork))}/Woche
          </p>
          <section className="game-panel scouting-section" aria-label={t("scouting.network.aria")}>
            {detailZone ? (
              <ScoutRegionDetailScreen
                zone={detailZone}
                zoneLabel={detailZone.label}
                activeScoutTrip={activeScoutTrip}
                tripQueueLength={tripQueueLength}
                worldClubs={worldClubs}
                onEnqueueTrip={(input) => {
                  onEnqueueScoutTrip(detailZone.id, input);
                  setDetailZoneId(null);
                }}
              />
            ) : (
              <ScoutRegionMap
                clubs={worldClubs}
                targets={targets}
                rivalPlayers={rivalPlayers}
                discovery={discovery}
                playerDivisionId={playerDivisionId}
                playerClub={playerClub}
                activeRegionScout={activeRegionScout}
                onScoutRegion={onScoutRegion}
                onOpenRegionDetail={setDetailZoneId}
              />
            )}
          </section>
          <ScoutNetworkPanel
            network={scoutNetwork}
            season={season}
            week={week}
            masterSeed={masterSeed}
            cash={cash}
            onHire={onHireScout}
            onFire={onFireScout}
            showHead={false}
          />
        </div>
      ) : null}

      {tab === "hits" ? (
        <div className="fm-tab-panel">
          <ScoutMapJobsPanel
            activeTrip={activeScoutTrip}
            tripQueue={scoutTripQueue}
            scoutNetwork={scoutNetwork}
            worldClubs={worldClubs}
          />
          <section className="scouting-assignments game-panel scouting-section" aria-label={t("scouting.assignments.aria")}>
            <header className="scouting-assignments-head">
              <h2>{t("scouting.assignments.title")}</h2>
              <Hint text={t("scouting.assignments.hint")} block>
                <button type="button" className="scouting-chip" onClick={onAddAssignment}>
                  {t("scouting.assignments.add")}
                </button>
              </Hint>
            </header>
            {assignments.length === 0 ? (
              <ScreenEmptyState
                icon={ClipboardList}
                title={t("scouting.assignments.empty")}
                aria-label={t("scouting.assignments.aria")}
              />
            ) : (
              <ul className="scouting-assignments-list">
                {assignments.map((assignment) => (
                  <li key={assignment.id} className="scouting-assignment-row">
                    <button
                      type="button"
                      className={assignment.active ? "scouting-assignment-toggle is-on" : "scouting-assignment-toggle"}
                      onClick={() => onToggleAssignment(assignment.id)}
                      aria-pressed={assignment.active}
                    >
                      {assignment.active ? (
                        <Circle size={14} fill="var(--rasen)" strokeWidth={2.5} />
                      ) : (
                        <Pause size={14} strokeWidth={2.5} />
                      )}
                    </button>
                    <span className="scouting-assignment-label">{assignment.label}</span>
                    <button
                      type="button"
                      className="scouting-assignment-remove"
                      aria-label={t("scouting.assignments.remove")}
                      onClick={() => onRemoveAssignment(assignment.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Hint text={t("scouting.hint")} block>
            <p className="scouting-summary">
              <span>{t("scouting.summary.known", { count: counts.known })}</span>
              <span>{t("scouting.summary.unclear", { count: counts.unclear })}</span>
              <span>{t("scouting.summary.unknown", { count: counts.unknown })}</span>
            </p>
          </Hint>
          <p className="scouting-scouts">
            {t("scouting.headline", {
              assigned,
              capacity: scoutCapacity,
              orders: assignments.filter((entry) => entry.active).length,
              hits: visible.length,
            })}
          </p>

      <Hint text={t("scouting.search.hint")} block>
        <label className="scouting-search">
          <span className="sr-only">{t("scouting.search.placeholder")}</span>
          <input
            type="search"
            value={filters.query}
            placeholder={t("scouting.search.placeholder")}
            onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
          />
        </label>

        <div className="scouting-chips" role="toolbar" aria-label={t("scouting.filter.aria")}>
          <Chip active={filters.position === "all"} onClick={() => onFiltersChange({ ...filters, position: "all" })}>{t("scouting.filter.all")}</Chip>
          {POSITIONS.map((slot) => (
            <Chip
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
            </Chip>
          ))}
          {AGE_FILTERS.map((filter) => (
            <Chip
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
            </Chip>
          ))}
          {CONFIDENCE_FILTERS.map((filter) => (
            <Chip
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
            </Chip>
          ))}
          {REGIONS.map((region) => (
            <Chip
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
            </Chip>
          ))}
        </div>
      </Hint>

      {visible.length === 0 ? (
        <section className="squad-empty scouting-empty" aria-label={t("scouting.empty.aria")}>
          <span className="squad-empty-icon" aria-hidden="true">
            <Search size={28} strokeWidth={2.5} />
          </span>
          <p>{market.length === 0 ? t("scouting.pool.empty") : t("scouting.empty")}</p>
          {marketFiltersActive(filters) ? (
            <button
              type="button"
              className="scouting-chip"
              onClick={() => onFiltersChange(DEFAULT_MARKET_FILTERS)}
            >
              {t("scouting.empty.reset")}
            </button>
          ) : null}
        </section>
      ) : (
        <>
          <div className="scouting-sort" role="toolbar" aria-label={t("scouting.sort.aria")}>
            {(["name", "ca", "marketValue"] as const).map((key) => {
              const label =
                key === "name" ? t("squad.col.name") : key === "ca" ? "CA" : t("squad.col.value");
              const active = sort.key === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={active ? "scouting-chip is-active" : "scouting-chip"}
                  aria-pressed={active}
                  onClick={() => toggleSort(key)}
                >
                  {label}
                  {active ? (sort.direction === "asc" ? " ▲" : " ▼") : ""}
                </button>
              );
            })}
          </div>
          <ScoutingPlayerList
            rows={topHits}
            season={season}
            valueScale={valueScale}
            sectionTitle={t("scouting.hits.sectionTitle")}
            listAriaLabel={t("scouting.title")}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            onSelectTarget={onSelectTarget}
            onAssignScout={onAssignScout}
          />
        </>
      )}
        </div>
      ) : null}

      {tab === "watchlist" ? (
        <div className="fm-tab-panel">
          <Hint text={t("scouting.watchlist.hint")} block>
            <p className="scouting-scouts">{t("scouting.watchlist.summary", { count: shortlistIds.length })}</p>
          </Hint>
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
              <div className="scouting-sort" role="toolbar" aria-label={t("scouting.sort.aria")}>
                {(["name", "ca", "marketValue"] as const).map((key) => {
                  const label =
                    key === "name" ? t("squad.col.name") : key === "ca" ? "CA" : t("squad.col.value");
                  const active = sort.key === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={active ? "scouting-chip is-active" : "scouting-chip"}
                      aria-pressed={active}
                      onClick={() => toggleSort(key)}
                    >
                      {label}
                      {active ? (sort.direction === "asc" ? " ▲" : " ▼") : ""}
                    </button>
                  );
                })}
              </div>
              <ScoutingPlayerList
                rows={watchlistVisible}
                season={season}
                valueScale={watchlistValueScale}
                sectionTitle={t("scouting.watchlist.sectionTitle")}
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
      <h2 className="scouting-section-title">{sectionTitle}</h2>
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
                    <div className="scouting-bar-track" aria-label="Marktwert-Schätzung">
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

function Chip({
  active,
  onClick,
  title,
  hint,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  hint?: string;
  children: ReactNode;
}) {
  const chip = (
    <button
      type="button"
      className={active ? "scouting-chip is-active" : "scouting-chip"}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
  if (!hint) return chip;
  return <Hint text={hint}>{chip}</Hint>;
}

