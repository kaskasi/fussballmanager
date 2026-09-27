import { useMemo, useState } from "react";
import type { Player } from "../../types/player.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import { listLoanedPlayers } from "../../transfers/loan-roster.ts";
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
  history,
  onBack,
  onSelectPlayer,
}: {
  players: readonly Player[];
  season: number;
  history: readonly TransferRecord[];
  onBack: () => void;
  onSelectPlayer: (playerId: string) => void;
}) {
  const seasons = useMemo(() => availableTransferSeasons(history, season), [history, season]);
  const [selectedSeason, setSelectedSeason] = useState(season);
  const activeLoans = listLoanedPlayers(players);
  const seasonRecords = useMemo(
    () => recordsForSeason(history, selectedSeason),
    [history, selectedSeason],
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
            text="Aktive Ausleihen laufen bis Saisonende — danach kehren Spieler zurück. Historie nach Saison filterbar."
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
                </tr>
              </thead>
              <tbody>
                {activeLoans.map((row) => (
                  <tr
                    key={row.playerId}
                    className="squad-table-row"
                    onClick={() => onSelectPlayer(row.playerId)}
                  >
                    <td className="squad-col-name">{row.displayName}</td>
                    <td>{row.position}</td>
                    <td>{row.age}</td>
                    <td className="squad-col-ca">{row.ca}</td>
                    <td>
                      {row.toClubName}
                      {row.hasOption ? " · Option" : ""}
                    </td>
                    <td>S{row.untilSeason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
