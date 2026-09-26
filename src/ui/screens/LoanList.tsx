import type { Player } from "../../types/player.ts";
import type { PositionPrimary } from "../../types/player.ts";
import { listLoanedPlayers } from "../../transfers/loan-roster.ts";
import { Hint } from "../components/Hint.tsx";

/**
 * WIREFRAME: PRD 09 — Ausleihen-Übersicht
 * ┌──────────────────────────────────────────────┐
 * │ ←  🔄 Verliehene Spieler                     │
 * │ 3 aktiv · bis Saisonende                     │
 * ├──────────────────────────────────────────────┤
 * │ 🛡️ Müller · CM · 18 J. · CA 62 · TSV Heideweg│
 * │ 👟 Becker · LW · 17 J. · CA 58 · FC Altona   │
 * └──────────────────────────────────────────────┘
 */

export function LoanList({
  players,
  season,
  onBack,
  onSelectPlayer,
}: {
  players: readonly Player[];
  season: number;
  onBack: () => void;
  onSelectPlayer: (playerId: string) => void;
}) {
  const rows = listLoanedPlayers(players);

  return (
    <main className="loans">
      <header className="loans-head">
        <button type="button" onClick={onBack} aria-label="Zurück zur Pipeline">
          ←
        </button>
        <div>
          <p className="eyebrow">Saison {season}</p>
          <h1>🔄 Verliehene Spieler</h1>
          <Hint text="Spieler, die du per Inbox oder Leihe abgegeben hast. Rechte bleiben beim Verein." block>
            <p className="loans-summary">
              {rows.length === 0
                ? "Keine aktiven Ausleihen"
                : `${rows.length} aktiv · Klick öffnet Profil`}
            </p>
          </Hint>
        </div>
      </header>

      {rows.length === 0 ? (
        <section className="loans-empty" aria-label="Keine Ausleihen">
          <span className="loans-empty-icon" aria-hidden="true">🔄</span>
          <p>Noch niemand verliehen.</p>
          <p className="loans-empty-hint">
            In der 📥 Entscheidungs-Inbox kannst du Talente mit Spielzeit-Garantie ausleihen.
          </p>
        </section>
      ) : (
        <div className="campus-table loans-table" role="table" aria-label="Ausgeliehene Spieler">
          <div className="campus-table-head loans-table-head" role="row">
            <span role="columnheader" className="campus-col-icon" aria-hidden="true" />
            <span role="columnheader">Name</span>
            <span role="columnheader">Pos</span>
            <span role="columnheader">Alter</span>
            <span role="columnheader">CA</span>
            <span role="columnheader">Verein</span>
            <span role="columnheader">Bis</span>
          </div>
          <ul className="campus-list" role="rowgroup">
            {rows.map((row) => (
              <li key={row.playerId} role="none">
                <button type="button" className="campus-row loans-row" onClick={() => onSelectPlayer(row.playerId)}>
                  <span className="campus-portrait" aria-hidden="true">{positionGlyph(row.position)}</span>
                  <span className="campus-player-name">{row.displayName}</span>
                  <span className="campus-meta">{row.position}</span>
                  <span className="campus-meta">{row.age} J.</span>
                  <span className="campus-ca">{row.ca}</span>
                  <span className="loans-club" title={row.toClubId}>
                    {row.toClubName}
                    {row.hasOption ? " · Kaufoption" : ""}
                  </span>
                  <span className="campus-meta">S{row.untilSeason}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

function positionGlyph(position: PositionPrimary): string {
  if (position === "GK") return "🧤";
  if (position === "CB" || position === "LB" || position === "RB") return "🛡️";
  if (position === "CF") return "⚽";
  return "👟";
}
