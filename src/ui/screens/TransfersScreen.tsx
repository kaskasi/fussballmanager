import { useMemo, useState } from "react";
import type { Player } from "../../types/player.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import { listLoanedPlayers } from "../../transfers/loan-roster.ts";
import { canRecallLoan } from "../../transfers/loans.ts";
import { transferWindowLabel } from "../../sim/transfer-windows.ts";
import type { TransferRecord } from "../../transfers/transfer-history.ts";
import {
  availableTransferSeasons,
  recordsForSeason,
  transferKindIcon,
  transferKindLabel,
} from "../../transfers/transfer-history.ts";
import { Hint } from "../components/Hint.tsx";

/**
 * WIREFRAME: PRD 09 — Transfers & Ausleihen
 * ┌──────────────────────────────────────────────┐
 * │ ←  💰 Transfers · Saison 2                 │
 * │ [S2] [S1]                                   │
 * ├──────────────────────────────────────────────┤
 * │ 🔄 Aktive Ausleihen (diese Saison)           │
 * │ Müller · CM · TSV Heideweg · bis S2         │
 * ├──────────────────────────────────────────────┤
 * │ Saison 2                                     │
 * │ 🟢 Zugang Becker · 1.2M · Woche 8           │
 * │ 🔄 Verliehen Müller · TSV Heideweg · W8     │
 * │ ↩️ Rückkehr Schmidt · TSV Heideweg · W35    │
 * └──────────────────────────────────────────────┘
 */

export function TransfersScreen({
  players,
  season,
  week,
  history,
  onBack,
  onSelectPlayer,
  onRecallLoan,
}: {
  players: readonly Player[];
  season: number;
  week: number;
  history: readonly TransferRecord[];
  onBack: () => void;
  onSelectPlayer: (playerId: string) => void;
  onRecallLoan: (playerId: string) => void;
}) {
  const seasons = useMemo(() => availableTransferSeasons(history, season), [history, season]);
  const [selectedSeason, setSelectedSeason] = useState(season);
  const activeLoans = listLoanedPlayers(players);
  const seasonRecords = useMemo(
    () => recordsForSeason(history, selectedSeason),
    [history, selectedSeason],
  );
  const leagueTransfers = useMemo(
    () => seasonRecords.filter((record) => record.kind === "ai").slice(0, 8),
    [seasonRecords],
  );

  return (
    <main className="transfers">
      <header className="transfers-head">
        <button type="button" onClick={onBack} aria-label="Zurück zur Pipeline">
          ←
        </button>
        <div>
          <p className="eyebrow">Saison {season}</p>
          <h1>💰 Transfers</h1>
          <Hint
            text="Recall im Winterfenster (KW 2–4). Sonst Rückkehr zum Saisonende. Leihgebühr bei Verleih: ~15 % Marktwert."
            block
          >
            <p className="transfers-summary">
              {activeLoans.length > 0
                ? `${activeLoans.length} verliehen · ${seasonRecords.length} Einträge in S${selectedSeason}`
                : `${seasonRecords.length} Einträge in S${selectedSeason}`}
            </p>
          </Hint>
        </div>
      </header>

      <section className="transfers-section" aria-label="Aktive Ausleihen">
        <h2>🔄 Aktive Ausleihen</h2>
        <p className="transfers-window-hint">{transferWindowLabel(week)}</p>
        {activeLoans.length === 0 ? (
          <p className="transfers-empty-inline">Keine Spieler derzeit verliehen.</p>
        ) : (
          <div className="squad-table-wrap">
            <table className="squad-table transfers-loan-table" aria-label="Aktive Ausleihen">
              <thead>
                <tr>
                  <th scope="col" className="squad-col-name">Name</th>
                  <th scope="col">Pos</th>
                  <th scope="col">Alt</th>
                  <th scope="col">CA</th>
                  <th scope="col">Verein</th>
                  <th scope="col">Bis</th>
                  <th scope="col">Recall</th>
                </tr>
              </thead>
              <tbody>
                {activeLoans.map((row) => {
                  const player = players.find((entry) => entry.id === row.playerId);
                  const recall = player ? canRecallLoan(week, player) : { allowed: false };
                  return (
                  <tr
                    key={row.playerId}
                    className="squad-table-row"
                  >
                    <td className="squad-col-name" onClick={() => onSelectPlayer(row.playerId)}>{row.displayName}</td>
                    <td onClick={() => onSelectPlayer(row.playerId)}>{row.position}</td>
                    <td onClick={() => onSelectPlayer(row.playerId)}>{row.age}</td>
                    <td className="squad-col-ca" onClick={() => onSelectPlayer(row.playerId)}>{row.ca}</td>
                    <td onClick={() => onSelectPlayer(row.playerId)}>
                      {row.toClubName}
                      {row.hasOption ? " · Option" : ""}
                    </td>
                    <td onClick={() => onSelectPlayer(row.playerId)}>S{row.untilSeason}</td>
                    <td>
                      <button
                        type="button"
                        className="transfers-recall-btn"
                        disabled={!recall.allowed}
                        title={recall.allowed ? "Spieler zurückholen" : recall.reason}
                        onClick={() => onRecallLoan(row.playerId)}
                      >
                        ↩️ Recall
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

      <section className="transfers-section" aria-label="Liga-Markt">
        <h2>💱 Liga-Markt</h2>
        <Hint text="KI-Clubs handeln untereinander in Transferfenstern — dieselben Marktwert-Formeln wie du (F5.6)." block>
          <p className="transfers-window-hint">Aktuelle Liga-Deals dieser Saison</p>
        </Hint>
        {leagueTransfers.length === 0 ? (
          <p className="transfers-empty-inline">Noch keine Liga-Transfers in S{selectedSeason}.</p>
        ) : (
          <ul className="transfers-history transfers-league-feed">
            {leagueTransfers.map((record) => (
              <li key={record.id}>
                <button
                  type="button"
                  className="transfers-history-row"
                  onClick={() => onSelectPlayer(record.player_id)}
                >
                  <span className="transfers-history-icon" aria-hidden="true">💱</span>
                  <span className="transfers-history-main">
                    <strong>{record.player_name}</strong>
                    <small>
                      {record.other_club_name}
                      {record.fee != null ? ` · ${formatClubCash(record.fee)}` : ""}
                      {" · "}KW {record.week}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="transfers-section" aria-label="Transfer-Historie">
        <div className="transfers-season-head">
          <h2>Historie</h2>
          <div className="segmented-control transfers-season-picker" role="tablist" aria-label="Saison wählen">
            {seasons.map((entry) => (
              <button
                key={entry}
                type="button"
                role="tab"
                className={selectedSeason === entry ? "is-active" : undefined}
                aria-selected={selectedSeason === entry}
                onClick={() => setSelectedSeason(entry)}
              >
                S{entry}
              </button>
            ))}
          </div>
        </div>

        {seasonRecords.length === 0 ? (
          <p className="transfers-empty-inline">Keine Transfers in Saison {selectedSeason}.</p>
        ) : (
          <ul className="transfers-history">
            {seasonRecords.map((record) => (
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
                    <strong>{transferKindLabel(record.kind)} · {record.player_name}</strong>
                    <small>
                      {record.other_club_name}
                      {record.fee != null ? ` · ${formatClubCash(record.fee)}` : ""}
                      {" · "}Woche {record.week}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
