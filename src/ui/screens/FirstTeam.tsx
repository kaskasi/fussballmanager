import type { Player } from "../../types/player.ts";
import type { PositionPrimary } from "../../types/player.ts";
import { formatMarketValueShort, listProSquad } from "../../squad/pro-roster.ts";
import { Hint } from "../components/Hint.tsx";

/**
 * WIREFRAME: PRD 09 — Profikader
 * ┌──────────────────────────────────────────────┐
 * │ ←  ⭐ Profikader · 14 Spieler                │
 * │ Ø CA 74 · Marktwert 18.2M                    │
 * ├──────────────────────────────────────────────┤
 * │ 🧤 Neuer · GK · 28 J. · CA 81 · 2.1M · ●    │
 * │ 🛡️ Hummels · CB · 27 J. · CA 78 · 1.8M · ▲  │
 * └──────────────────────────────────────────────┘
 */

export function FirstTeam({
  players,
  clubId,
  season,
  onBack,
  onSelectPlayer,
}: {
  players: readonly Player[];
  clubId: string;
  season: number;
  onBack: () => void;
  onSelectPlayer: (playerId: string) => void;
}) {
  const rows = listProSquad(players, clubId);
  const avgCa =
    rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.ca, 0) / rows.length) : 0;
  const totalValue = rows.reduce((sum, row) => sum + row.marketValue, 0);

  return (
    <main className="squad">
      <header className="squad-head">
        <button type="button" onClick={onBack} aria-label="Zurück zur Pipeline">
          ←
        </button>
        <div>
          <p className="eyebrow">Saison {season}</p>
          <h1>⭐ Profikader</h1>
          <Hint text="Alle Spieler im Ersten Team. Klick öffnet das Profil." block>
            <p className="squad-summary">
              {rows.length} Spieler · Ø CA {avgCa} · {formatMarketValueShort(totalValue)} Kaderwert
            </p>
          </Hint>
        </div>
      </header>

      {rows.length === 0 ? (
        <section className="squad-empty" aria-label="Leerer Profikader">
          <span className="squad-empty-icon" aria-hidden="true">⭐</span>
          <p>Noch kein Profikader.</p>
          <p className="squad-empty-hint">Talente aus U19 über die 📥 Inbox hochziehen.</p>
        </section>
      ) : (
        <div className="campus-table squad-table" role="table" aria-label="Profikader">
          <div className="campus-table-head squad-table-head" role="row">
            <span role="columnheader" className="campus-col-icon" aria-hidden="true" />
            <span role="columnheader">Name</span>
            <span role="columnheader">Pos</span>
            <span role="columnheader">Alter</span>
            <span role="columnheader">CA</span>
            <span role="columnheader">Wert</span>
            <span role="columnheader">Min</span>
            <span role="columnheader">Form</span>
          </div>
          <ul className="campus-list" role="rowgroup">
            {rows.map((row) => (
              <li key={row.playerId} role="none">
                <button type="button" className="campus-row squad-row" onClick={() => onSelectPlayer(row.playerId)}>
                  <span className="campus-portrait" aria-hidden="true">{positionGlyph(row.position)}</span>
                  <span className="campus-player-name">{row.displayName}</span>
                  <span className="campus-meta">{row.position}</span>
                  <span className="campus-meta">{row.age} J.</span>
                  <span className="campus-ca">{row.ca}</span>
                  <span className="squad-value">{formatMarketValueShort(row.marketValue)}</span>
                  <span className="campus-meta">{row.seasonMinutes}</span>
                  <span className={`squad-form is-${formTone(row.form)}`} title={`Form ${row.form}`}>
                    {formMark(row.form)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

function formMark(form: number): string {
  if (form >= 2) return "●";
  if (form >= -1) return "▲";
  return "◆";
}

function formTone(form: number): "good" | "mid" | "low" {
  if (form >= 2) return "good";
  if (form >= -1) return "mid";
  return "low";
}

function positionGlyph(position: PositionPrimary): string {
  if (position === "GK") return "🧤";
  if (position === "CB" || position === "LB" || position === "RB") return "🛡️";
  if (position === "CF") return "⚽";
  return "👟";
}
