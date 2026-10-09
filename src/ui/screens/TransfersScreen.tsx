import { useEffect, useMemo, useState } from "react";
import type { Player } from "../../types/player.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import { listLoanedPlayers } from "../../transfers/loan-roster.ts";
import { canRecallLoan } from "../../transfers/loans.ts";
import { isTransferWindowOpen, transferWindowLabel } from "../../sim/transfer-windows.ts";
import type { TransferRecord } from "../../transfers/transfer-history.ts";
import {
  availableClubTransferSeasons,
  clubArrivalRecords,
  clubDepartureRecords,
  clubRecordsForSeason,
  displayTransferOtherClubs,
  transferKindIcon,
  transferKindLabel,
} from "../../transfers/transfer-history.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import { Hint } from "../components/Hint.tsx";
import { formatSeasonLabel, seasonCalendarYear } from "../../sim/season-label.ts";
import { formatCalendarWeek } from "../../sim/game-calendar.ts";
import { listExpiringClubContracts } from "../../transfers/expiring-contracts.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { ChevronLeft, ChevronRight, FileSignature } from "lucide-react";
import { PlayerPortrait } from "../components/PlayerPortrait.tsx";

/**
 * WIREFRAME: PRD 14.8 — Transfers
 * ┌──────────────────────────────────────────────┐
 * │ Vertragsgespräche · Leihen · Historie (club) │
 * │ Zugänge | Abgänge · Saison-Pills             │
 * └──────────────────────────────────────────────┘
 */

function TransferHistoryList({
  records,
  worldClubs,
  onSelectPlayer,
  emptyKey,
}: {
  records: readonly TransferRecord[];
  worldClubs?: readonly WorldClub[];
  onSelectPlayer: (playerId: string) => void;
  emptyKey: string;
}) {
  if (records.length === 0) {
    return <p className="transfers-empty-inline">{t(emptyKey)}</p>;
  }
  return (
    <ul className="transfers-history">
      {records.map((record) => (
        <li key={record.id}>
          <button
            type="button"
            className="transfers-history-row"
            onClick={() => onSelectPlayer(record.player_id)}
          >
            <span className="transfers-history-icon" aria-hidden="true">
              {transferKindIcon(record.kind)}
            </span>
            <span className="transfers-history-main">
              <strong>
                {transferKindLabel(record.kind)} · {record.player_name}
              </strong>
              <small>
                {displayTransferOtherClubs(record.other_club_name, worldClubs)}
                {record.fee != null ? ` · ${formatClubCash(record.fee)}` : ""}
                {" · "}
                {formatCalendarWeek(record.week)}
              </small>
            </span>
          </button>
        </li>
      ))}
    </ul>
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
}: {
  players: readonly Player[];
  clubId: string;
  season: number;
  week: number;
  history: readonly TransferRecord[];
  worldClubs?: readonly WorldClub[];
  onSelectPlayer: (playerId: string) => void;
  onRecallLoan: (playerId: string) => void;
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
    <main className="transfers club-shell-card-body">
      <div className="fm-tab-panel">
        <header className="transfers-meta" aria-label={t("transfers.windowAria")}>
          <p className={windowOpen ? "transfers-window-chip" : "transfers-window-chip is-closed"}>
            {transferWindowLabel(week)}
          </p>
          <Hint text={t("transfers.windowHint")} block>
            <p className="transfers-summary">
              {activeLoans.length > 0 ? t("transfers.loanedCount", { count: activeLoans.length }) : null}
            </p>
          </Hint>
        </header>

        <section className="transfers-section transfers-contracts" aria-label={t("transfers.contractTalksTitle")}>
          <h2>{t("transfers.contractTalksTitle")}</h2>
          <Hint text={t("transfers.contractTalksHint")} block>
            <p className="transfers-window-hint">{t("transfers.contractTalksLead")}</p>
          </Hint>
          {expiringContracts.length === 0 ? (
            <p className="transfers-empty-inline">{t("transfers.contractTalksEmpty")}</p>
          ) : (
            <ul className="transfers-contract-list">
              {expiringContracts.map((entry) => {
                const player = players.find((row) => row.id === entry.playerId);
                return (
                  <li key={entry.playerId}>
                    <button
                      type="button"
                      className="transfers-contract-card"
                      onClick={() => onSelectPlayer(entry.playerId)}
                    >
                      {player ? (
                        <PlayerPortrait seed={player.portrait_seed} size="sm" variant="known" />
                      ) : (
                        <span className="transfers-contract-icon" aria-hidden>
                          <FileSignature size={22} strokeWidth={2.25} />
                        </span>
                      )}
                      <span className="transfers-contract-copy">
                        <strong>{entry.displayName}</strong>
                        <small>
                          {entry.position} · CA {entry.ca} ·{" "}
                          {t("transfers.contractUntilSummer", {
                            season: formatSeasonLabel(entry.untilSeason),
                          })}
                        </small>
                        <small className="transfers-contract-urgency">
                          {entry.monthsRemaining === 1
                            ? t("transfers.monthsRemainingOne")
                            : t("transfers.monthsRemaining", { count: entry.monthsRemaining })}
                        </small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="transfers-section" aria-label={t("transfers.loansTitle")}>
          <h2>{t("transfers.loansTitle")}</h2>
          {activeLoans.length === 0 ? (
            <p className="transfers-empty-inline">{t("transfers.loansEmpty")}</p>
          ) : (
            <div className="squad-table-wrap">
              <table className="squad-table transfers-loan-table" aria-label={t("transfers.loansTitle")}>
                <thead>
                  <tr>
                    <th scope="col" className="squad-col-name">
                      {t("squad.col.name")}
                    </th>
                    <th scope="col">{t("squad.col.pos")}</th>
                    <th scope="col">{t("squad.col.age")}</th>
                    <th scope="col">CA</th>
                    <th scope="col">{t("transfers.loanClub")}</th>
                    <th scope="col">{t("transfers.loanUntil")}</th>
                    <th scope="col">{t("transfers.recall")}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLoans.map((row) => {
                    const player = players.find((entry) => entry.id === row.playerId);
                    const recall = player ? canRecallLoan(week, player) : { allowed: false };
                    return (
                      <tr key={row.playerId} className="squad-table-row">
                        <td className="squad-col-name" onClick={() => onSelectPlayer(row.playerId)}>
                          {row.displayName}
                        </td>
                        <td onClick={() => onSelectPlayer(row.playerId)}>{row.position}</td>
                        <td onClick={() => onSelectPlayer(row.playerId)}>{row.age}</td>
                        <td className="squad-col-ca" onClick={() => onSelectPlayer(row.playerId)}>
                          {row.ca}
                        </td>
                        <td onClick={() => onSelectPlayer(row.playerId)}>
                          {row.toClubName}
                          {row.hasOption ? ` · ${t("transfers.loanOption")}` : ""}
                        </td>
                        <td onClick={() => onSelectPlayer(row.playerId)}>S{row.untilSeason}</td>
                        <td>
                          <button
                            type="button"
                            className="transfers-recall-btn"
                            disabled={!recall.allowed}
                            title={recall.allowed ? t("transfers.recallTitle") : recall.reason}
                            onClick={() => onRecallLoan(row.playerId)}
                          >
                            {t("transfers.recall")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="transfers-section" aria-label={t("transfers.historyTitle")}>
          <div className="transfers-season-head">
            <h2>{t("transfers.historyTitle")}</h2>
            <div className="transfers-season-nav">
              {showSeasonArrows ? (
                <button
                  type="button"
                  className="transfers-season-chevron"
                  disabled={seasonIndex >= seasons.length - 1}
                  aria-label={t("transfers.seasonOlder")}
                  onClick={() => shiftSeason(1)}
                >
                  <ChevronLeft size={18} aria-hidden />
                </button>
              ) : null}
              <div
                className="segmented-control transfers-season-picker"
                role="tablist"
                aria-label={t("transfers.seasonPickerAria")}
              >
                {(showSeasonArrows ? seasons.slice(Math.max(0, seasonIndex - 2), seasonIndex + 3) : seasons).map(
                  (entry) => (
                    <button
                      key={entry}
                      type="button"
                      role="tab"
                      className={selectedSeason === entry ? "is-active" : undefined}
                      aria-selected={selectedSeason === entry}
                      onClick={() => setSelectedSeason(entry)}
                    >
                      {seasonCalendarYear(entry)}
                    </button>
                  ),
                )}
              </div>
              {showSeasonArrows ? (
                <button
                  type="button"
                  className="transfers-season-chevron"
                  disabled={seasonIndex <= 0}
                  aria-label={t("transfers.seasonNewer")}
                  onClick={() => shiftSeason(-1)}
                >
                  <ChevronRight size={18} aria-hidden />
                </button>
              ) : null}
            </div>
          </div>

          {clubSeasonRecords.length === 0 ? (
            <p className="transfers-empty-inline">
              {t("transfers.historyEmptySeason", { season: formatSeasonLabel(selectedSeason) })}
            </p>
          ) : (
            <div className="transfers-history-columns">
              <div className="transfers-history-column">
                <h3>{t("transfers.arrivalsTitle")}</h3>
                <TransferHistoryList
                  records={arrivals}
                  worldClubs={worldClubs}
                  onSelectPlayer={onSelectPlayer}
                  emptyKey="transfers.arrivalsEmpty"
                />
              </div>
              <div className="transfers-history-column">
                <h3>{t("transfers.departuresTitle")}</h3>
                <TransferHistoryList
                  records={departures}
                  worldClubs={worldClubs}
                  onSelectPlayer={onSelectPlayer}
                  emptyKey="transfers.departuresEmpty"
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
