import { useMemo, useState } from "react";
import type { Player } from "../../types/player.ts";
import {
  formatMarketValueShort,
  listProSquad,
  sortProSquadRows,
  type ProSquadSortDirection,
  type ProSquadSortKey,
} from "../../squad/pro-roster.ts";
import { Hint } from "../components/Hint.tsx";

/**
 * WIREFRAME: PRD 09 — Profikader
 * ┌──────────────────────────────────────────────┐
 * │ ←  ⭐ Profikader · 14 Spieler                │
 * │ Ø CA 74 · Marktwert 18.2M                    │
 * ├──────────────────────────────────────────────┤
 * │ Neuer · GK · 28 J. · CA 81 · 2.1M · ●       │
 * │ Hummels · CB · 27 J. · CA 78 · 1.8M · ▲     │
 * └──────────────────────────────────────────────┘
 */

const DEFAULT_SORT: { key: ProSquadSortKey; direction: ProSquadSortDirection } = {
  key: "position",
  direction: "asc",
};

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
  const [sortKey, setSortKey] = useState<ProSquadSortKey>(DEFAULT_SORT.key);
  const [sortDirection, setSortDirection] = useState<ProSquadSortDirection>(DEFAULT_SORT.direction);

  const rows = useMemo(() => {
    const baseRows = listProSquad(players, clubId);
    return sortProSquadRows(baseRows, sortKey, sortDirection);
  }, [players, clubId, sortKey, sortDirection]);

  const avgCa =
    rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.ca, 0) / rows.length) : 0;
  const totalValue = rows.reduce((sum, row) => sum + row.marketValue, 0);

  const toggleSort = (key: ProSquadSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "name" || key === "position" ? "asc" : "desc");
  };

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
        <div className="squad-table-wrap">
          <table className="squad-table">
            <thead>
              <tr>
                <SortHeader label="Name" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} align="left" />
                <SortHeader label="Pos" sortKey="position" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortHeader label="Alt" sortKey="age" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortHeader label="CA" sortKey="ca" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortHeader label="Wert" sortKey="marketValue" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortHeader label="Min" sortKey="seasonMinutes" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortHeader label="T" sortKey="goals" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortHeader label="A" sortKey="assists" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortHeader label="K" sortKey="yellowCards" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortHeader label="Tkl" sortKey="tackles" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortHeader label="Kop" sortKey="headers" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortHeader label="Ø" sortKey="avgRating" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SortHeader label="Form" sortKey="form" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.playerId} className="squad-table-row" onClick={() => onSelectPlayer(row.playerId)}>
                  <td className="squad-col-name">{row.displayName}</td>
                  <td>{row.position}</td>
                  <td>{row.age}</td>
                  <td className="squad-col-ca">{row.ca}</td>
                  <td className="squad-col-value">{formatMarketValueShort(row.marketValue)}</td>
                  <td>{row.seasonMinutes}</td>
                  <td>{row.goals}</td>
                  <td>{row.assists}</td>
                  <td>{row.yellowCards}</td>
                  <td>{row.tackles}</td>
                  <td>{row.headers}</td>
                  <td>{row.avgRating?.toFixed(1) ?? "—"}</td>
                  <td className={`squad-form is-${formTone(row.form)}`} title={`Form ${row.form}`}>
                    {formMark(row.form)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = "right",
}: {
  label: string;
  sortKey: ProSquadSortKey;
  activeKey: ProSquadSortKey;
  direction: ProSquadSortDirection;
  onSort: (key: ProSquadSortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === activeKey;
  return (
    <th
      scope="col"
      className={align === "left" ? "squad-col-name" : undefined}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        className={`squad-sort-header${active ? " is-active" : ""}${align === "left" ? " is-left" : ""}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onSort(sortKey);
        }}
      >
        <span>{label}</span>
        <span className="squad-sort-icons" aria-hidden="true">
          <span className={active && direction === "asc" ? "is-active" : ""}>▲</span>
          <span className={active && direction === "desc" ? "is-active" : ""}>▼</span>
        </span>
      </button>
    </th>
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
