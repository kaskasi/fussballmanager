import { useEffect, useMemo, useState } from "react";
import type { Player } from "../../types/player.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import { listLoanedPlayers } from "../../transfers/loan-roster.ts";
import { canRecallLoan } from "../../transfers/loans.ts";
import { isTransferWindowOpen } from "../../sim/transfer-windows.ts";
import { transferWindowDisplay } from "../../i18n/calendar-display.ts";
import type { TransferRecord } from "../../transfers/transfer-history.ts";
import {
  availableClubTransferSeasons,
  clubArrivalRecords,
  clubDepartureRecords,
  clubRecordsForSeason,
  displayTransferOtherClubs,
  transferKindLabel,
  type TransferKind,
} from "../../transfers/transfer-history.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import { formatSeasonLabel, seasonCalendarYear } from "../../sim/season-label.ts";
import { formatCalendarWeek } from "../../sim/game-calendar.ts";
import { listExpiringClubContracts } from "../../transfers/expiring-contracts.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ChevronLeft, ChevronRight, Repeat, Undo2 } from "lucide-react";
import { ratingBand } from "../design/rating-band.ts";
import { PlayerPortrait } from "../components/PlayerPortrait.tsx";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";
import { TransferMarketPanel } from "../components/TransferMarketPanel.tsx";
import type { TransferState } from "../../transfers/negotiations.ts";

/**
 * WIREFRAME: PRD 14.8 — Transfers (design.md §9.6 "Umsetzung")
 * Page head with the window state → market (tc-panel, deal cards) → contract talks · loans · history.
 */

const KIND_ICON: Record<TransferKind, typeof ArrowDownLeft> = {
  in: ArrowDownLeft,
  out: ArrowUpRight,
  loan_out: Repeat,
  loan_return: Undo2,
  ai: ArrowLeftRight,
};

const HISTORY_PAGE_SIZE = 5;

function TransferHistoryList({
  records,
  worldClubs,
  onSelectPlayer,
  emptyKey,
  pagerLabelKey,
}: {
  records: readonly TransferRecord[];
  worldClubs?: readonly WorldClub[];
  onSelectPlayer: (playerId: string) => void;
  emptyKey: string;
  pagerLabelKey: string;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(records.length / HISTORY_PAGE_SIZE));

  useEffect(() => {
    setPage(0);
  }, [records]);

  if (records.length === 0) {
    return <p className="tc-empty">{t(emptyKey)}</p>;
  }
  const pageRecords = records.slice(page * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE + HISTORY_PAGE_SIZE);
  return (
    <>
      <ul className="tc-list">
        {pageRecords.map((record) => {
          const Icon = KIND_ICON[record.kind] ?? ArrowLeftRight;
          return (
            <li key={record.id} className="tc-list__item tc-list__item--wide">
              <button type="button" className="tc-transfers__row" onClick={() => onSelectPlayer(record.player_id)}>
                <Icon className="tc-icon" aria-hidden />
                <span className="tc-list__main">
                  <span className="tc-list__name">{record.player_name}</span>
                  <span className="tc-list__meta">
                    {transferKindLabel(record.kind)} · {displayTransferOtherClubs(record.other_club_name, worldClubs)} ·{" "}
                    {formatCalendarWeek(record.week)}
                  </span>
                </span>
              </button>
              <span className="tc-list__value">{record.fee != null ? formatClubCash(record.fee) : "—"}</span>
            </li>
          );
        })}
      </ul>
      {pageCount > 1 ? (
        <nav className="tc-chips tc-transfers__pages" aria-label={t(pagerLabelKey)}>
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              className="tc-chip tc-chip--dense"
              aria-pressed={index === page}
              aria-current={index === page ? "page" : undefined}
              onClick={() => setPage(index)}
            >
              {index + 1}
            </button>
          ))}
        </nav>
      ) : null}
    </>
  );
}

/** WIREFRAME: docs/prd/design.md §9.6 — Transfers */
export function TransfersScreen({
  players,
  clubId,
  season,
  week,
  history,
  onSelectPlayer,
  onRecallLoan,
  worldClubs,
  rivalPlayers = [],
  transferState,
  onToggleListing,
  onOpenNegotiation,
  scoutBoard,
  onScoutPlayer,
  onToggleShortlist,
}: {
  players: readonly Player[];
  clubId: string;
  season: number;
  week: number;
  history: readonly TransferRecord[];
  worldClubs?: readonly WorldClub[];
  onSelectPlayer: (playerId: string) => void;
  onRecallLoan: (playerId: string) => void;
  rivalPlayers?: readonly Player[];
  transferState?: TransferState;
  onToggleListing?: (playerId: string) => void;
  onOpenNegotiation?: (playerId: string) => void;
  scoutBoard?: ScoutBoard;
  onScoutPlayer?: (playerId: string) => void;
  onToggleShortlist?: (playerId: string) => void;
}) {
  useT();
  const seasons = useMemo(() => availableClubTransferSeasons(history, season), [history, season]);
  const [selectedSeason, setSelectedSeason] = useState(season);
  useEffect(() => {
    if (!seasons.includes(selectedSeason)) {
      setSelectedSeason(seasons[0] ?? season);
    }
  }, [season, seasons, selectedSeason]);

  const seasonIndex = seasons.indexOf(selectedSeason);
  const windowOpen = isTransferWindowOpen(week);
  const expiringContracts = useMemo(
    () => listExpiringClubContracts(players, clubId, season, week),
    [players, clubId, season, week],
  );
  const activeLoans = listLoanedPlayers(players, worldClubs);
  const clubSeasonRecords = useMemo(
    () => clubRecordsForSeason(history, selectedSeason),
    [history, selectedSeason],
  );
  const arrivals = useMemo(() => clubArrivalRecords(clubSeasonRecords), [clubSeasonRecords]);
  const departures = useMemo(() => clubDepartureRecords(clubSeasonRecords), [clubSeasonRecords]);

  function shiftSeason(delta: number) {
    const nextIndex = seasonIndex + delta;
    if (nextIndex >= 0 && nextIndex < seasons.length) {
      setSelectedSeason(seasons[nextIndex]!);
    }
  }

  const showSeasonArrows = seasons.length > 6;

  return (
    <main className="club-shell-card-body" data-coach-target={COACH_TARGET.transfersMarket}>
      <header className="tc-page-head">
        <span className="tc-label">{t("transfers.eyebrow")}</span>
        <h1 className="tc-page-title">{t("transfers.title")}</h1>
        <p className="tc-page-sub" aria-label={t("transfers.windowAria")} title={t("transfers.windowHint")}>
          <span className={windowOpen ? "tc-state tc-state--good" : "tc-state tc-state--low"} aria-hidden="true">
            {windowOpen ? "●" : "◆"}
          </span>{" "}
          {transferWindowDisplay(week)}
          {activeLoans.length > 0 ? ` · ${t("transfers.loanedCount", { count: activeLoans.length })}` : ""}
        </p>
      </header>

      <div className="tc-stack">
        {transferState && onOpenNegotiation && scoutBoard && onScoutPlayer && onToggleShortlist ? (
          <TransferMarketPanel
            players={players}
            rivalPlayers={rivalPlayers}
            clubId={clubId}
            transferState={transferState}
            worldClubs={worldClubs}
            scoutBoard={scoutBoard}
            onOpenNegotiation={onOpenNegotiation}
            onScoutPlayer={onScoutPlayer}
            onOpenProfile={onSelectPlayer}
            onToggleShortlist={onToggleShortlist}
          />
        ) : null}

        <div className="tc-transfers__grid">
          <section className="tc-panel" aria-labelledby="transfers-contracts-title">
            <div className="tc-panel__head">
              <h2 className="tc-panel__title" id="transfers-contracts-title">
                {t("transfers.contractTalksTitle")}
              </h2>
            </div>
            <p className="tc-caption tc-transfers__lead" title={t("transfers.contractTalksHint")}>
              {t("transfers.contractTalksLead")}
            </p>
            {expiringContracts.length === 0 ? (
              <p className="tc-empty">{t("transfers.contractTalksEmpty")}</p>
            ) : (
              <ul className="tc-list">
                {expiringContracts.map((entry) => {
                  const player = players.find((row) => row.id === entry.playerId);
                  return (
                    <li key={entry.playerId} className="tc-list__item tc-list__item--wide">
                      <button type="button" className="tc-transfers__row" onClick={() => onSelectPlayer(entry.playerId)}>
                        <PlayerPortrait
                          seed={player?.portrait_seed ?? 0}
                          nationality={player?.nationality}
                          clubId={player?.club_id}
                          size="sm"
                          variant={player ? "known" : "silhouette"}
                        />
                        <span className="tc-list__main">
                          <span className="tc-list__name">{entry.displayName}</span>
                          <span className="tc-list__meta">
                            {entry.position} ·{" "}
                            {t("transfers.contractUntilSummer", { season: formatSeasonLabel(entry.untilSeason) })}
                          </span>
                        </span>
                      </button>
                      <span className="tc-transfers__end">
                        <span className={`tc-rating tc-rating--${ratingBand(entry.ca)}`}>{entry.ca}</span>
                        <span className={entry.monthsRemaining <= 3 ? "tc-caption tc-transfers__urgent" : "tc-caption"}>
                          {entry.monthsRemaining === 1
                            ? t("transfers.monthsRemainingOne")
                            : t("transfers.monthsRemaining", { count: entry.monthsRemaining })}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="tc-panel" aria-labelledby="transfers-loans-title">
            <div className="tc-panel__head">
              <h2 className="tc-panel__title" id="transfers-loans-title">
                {t("transfers.loansTitle")}
              </h2>
            </div>
            {activeLoans.length === 0 ? (
              <p className="tc-empty">{t("transfers.loansEmpty")}</p>
            ) : (
              <ul className="tc-list">
                {activeLoans.map((row) => {
                  const player = players.find((entry) => entry.id === row.playerId);
                  const recall = player ? canRecallLoan(week, player) : { allowed: false, reason: undefined };
                  return (
                    <li key={row.playerId} className="tc-list__item tc-list__item--wide">
                      <button type="button" className="tc-transfers__row" onClick={() => onSelectPlayer(row.playerId)}>
                        <span className={`tc-rating tc-rating--${ratingBand(row.ca)}`}>{row.ca}</span>
                        <span className="tc-list__main">
                          <span className="tc-list__name">{row.displayName}</span>
                          <span className="tc-list__meta">
                            {row.positionLabel} · {t("profile.age", { age: row.age })} · {row.toClubName}
                            {row.hasOption ? ` · ${t("transfers.loanOption")}` : ""} ·{" "}
                            {t("transfers.loanUntilSeason", { season: formatSeasonLabel(row.untilSeason) })}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="tc-btn tc-btn--sm"
                        disabled={!recall.allowed}
                        title={recall.allowed ? t("transfers.recallTitle") : recall.reason}
                        onClick={() => onRecallLoan(row.playerId)}
                      >
                        {t("transfers.recall")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="tc-panel tc-transfers__history" aria-labelledby="transfers-history-title">
            <div className="tc-panel__head">
              <h2 className="tc-panel__title" id="transfers-history-title">
                {t("transfers.historyTitle")}
              </h2>
              <div className="tc-transfers__seasons" role="group" aria-label={t("transfers.seasonPickerAria")}>
                {showSeasonArrows ? (
                  <button
                    type="button"
                    className="tc-iconbtn"
                    disabled={seasonIndex >= seasons.length - 1}
                    aria-label={t("transfers.seasonOlder")}
                    onClick={() => shiftSeason(1)}
                  >
                    <ChevronLeft className="tc-icon" aria-hidden />
                  </button>
                ) : null}
                {(showSeasonArrows ? seasons.slice(Math.max(0, seasonIndex - 2), seasonIndex + 3) : seasons).map(
                  (entry) => (
                    <button
                      key={entry}
                      type="button"
                      className="tc-chip tc-chip--dense"
                      aria-pressed={selectedSeason === entry}
                      onClick={() => setSelectedSeason(entry)}
                    >
                      {seasonCalendarYear(entry)}
                    </button>
                  ),
                )}
                {showSeasonArrows ? (
                  <button
                    type="button"
                    className="tc-iconbtn"
                    disabled={seasonIndex <= 0}
                    aria-label={t("transfers.seasonNewer")}
                    onClick={() => shiftSeason(-1)}
                  >
                    <ChevronRight className="tc-icon" aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>

            {clubSeasonRecords.length === 0 ? (
              <p className="tc-empty">
                {t("transfers.historyEmptySeason", { season: formatSeasonLabel(selectedSeason) })}
              </p>
            ) : (
              <>
                <section className="tc-section">
                  <h3 className="tc-label tc-section__title">{t("transfers.arrivalsTitle")}</h3>
                  <TransferHistoryList
                    records={arrivals}
                    worldClubs={worldClubs}
                    onSelectPlayer={onSelectPlayer}
                    emptyKey="transfers.arrivalsEmpty"
                    pagerLabelKey="transfers.arrivalsPages"
                  />
                </section>
                <section className="tc-section">
                  <h3 className="tc-label tc-section__title">{t("transfers.departuresTitle")}</h3>
                  <TransferHistoryList
                    records={departures}
                    worldClubs={worldClubs}
                    onSelectPlayer={onSelectPlayer}
                    emptyKey="transfers.departuresEmpty"
                    pagerLabelKey="transfers.departuresPages"
                  />
                </section>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
