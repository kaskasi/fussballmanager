import { useMemo, useState } from "react";
import type { PositionPrimary } from "../../types/player.ts";
import type { BoardTarget } from "../../scouting/scout-board.ts";
import {
  DEFAULT_SCOUT_CAPACITY,
  type ScoutAssignment,
} from "../../scouting/scout-assignments.ts";
import {
  filterMarket,
  headlineCounts,
  targetLabel,
  type ConfidenceBucket,
  type MarketFilters,
  type MarketSort,
} from "../../scouting/market-list.ts";
import { listMarketRows, sortMarketRows } from "../../scouting/market-roster.ts";
import { formatScoutCa } from "../../scouting/scout-visibility.ts";
import { formatMarketValueShort } from "../../squad/pro-roster.ts";
import type { MarketSortKey } from "../../scouting/market-list.ts";
import { Hint } from "../components/Hint.tsx";
import { RowMenu } from "../components/RowMenu.tsx";
import { SquadSortHeader } from "../components/SquadSortHeader.tsx";

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

const CONFIDENCE_FILTERS: { bucket: ConfidenceBucket; label: string; title: string; hint: string }[] = [
  { bucket: "known", label: "✅", title: "Gut bekannt", hint: "Spieler mit enger Scout-Schätzung." },
  { bucket: "unclear", label: "🤷", title: "Unklar", hint: "Einige Infos, aber große Unsicherheit." },
  { bucket: "unknown", label: "❓", title: "Unbekannt", hint: "Kaum Wissen — erst scouten und Wochen simulieren." },
];

const AGE_FILTERS: Array<{ value: MarketFilters["age"]; label: string }> = [
  { value: "u21", label: "U21" },
  { value: "22-27", label: "22–27" },
  { value: "28+", label: "28+" },
];

const REGIONS = ["Schleswig-Holstein", "Fördeküste", "Hansestadt", "Nordfriesland"];

export function ScoutingCenter({
  targets,
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
  onBack,
}: {
  targets: BoardTarget[];
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
  onBack: () => void;
}) {
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
    const rows = listMarketRows(filtered, assignedIds);
    return sortMarketRows(rows, sort.key, sort.direction);
  }, [market, filters, assignedIds, sort]);
  const assigned = assignedIds.size;

  const toggleSort = (key: MarketSortKey) => {
    if (sort.key === key) {
      onSortChange({ key, direction: sort.direction === "desc" ? "asc" : "desc" });
      return;
    }
    onSortChange({ key, direction: key === "name" || key === "position" ? "asc" : "desc" });
  };

  return (
    <main className="scouting">
      <header className="scouting-head">
        <button type="button" onClick={onBack} aria-label="Zurück zur Pipeline">
          ←
        </button>
        <div>
          <p className="eyebrow">Scouting</p>
          <h1>👁️ Marktliste</h1>
          <Hint
            text="Übersicht wie gut dein Verein den Markt kennt. ✅ = genau, 🤷 = grob, ❓ = fast blind."
            block
          >
            <p className="scouting-summary">
              <span>✅ Gut bekannt: {counts.known}</span>
              <span>🤷 Unklar: {counts.unclear}</span>
              <span>❓ Unbekannt: {counts.unknown}</span>
            </p>
          </Hint>
          <p className="scouting-scouts">
            🟢 {assigned}/{DEFAULT_SCOUT_CAPACITY} Scout-Ziele · {assignments.filter((entry) => entry.active).length} Aufträge · {visible.length} Treffer
          </p>
        </div>
      </header>

      <section className="scouting-assignments" aria-label="Scout-Aufträge">
        <header className="scouting-assignments-head">
          <h2>📋 Scout-Aufträge</h2>
          <Hint text="Auftrag nutzt die Filter unten (Position, Alter, Region). Pro Woche werden passende Spieler automatisch beobachtet." block>
            <button type="button" className="scouting-chip" onClick={onAddAssignment}>
              + Auftrag aus Filtern
            </button>
          </Hint>
        </header>
        {assignments.length === 0 ? (
          <p className="scouting-assignments-empty">Noch keine Aufträge — Filter setzen und Auftrag anlegen.</p>
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
                  {assignment.active ? "🟢" : "⏸️"}
                </button>
                <span className="scouting-assignment-label">{assignment.label}</span>
                <button
                  type="button"
                  className="scouting-assignment-remove"
                  aria-label="Auftrag entfernen"
                  onClick={() => onRemoveAssignment(assignment.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Hint text="Suche nach Name, Position oder Region. ⋮ pro Zeile: scouten oder Profil. Zeile klicken = Profil." block>
        <label className="scouting-search">
          <span className="sr-only">Suche</span>
          <input
            type="search"
            value={filters.query}
            placeholder="Name, Position, Region"
            onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
          />
        </label>

        <div className="scouting-chips" role="toolbar" aria-label="Filter">
          <Chip active={filters.position === "all"} onClick={() => onFiltersChange({ ...filters, position: "all" })}>Alle</Chip>
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
              title={filter.title}
              hint={filter.hint}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  confidence: filters.confidence === filter.bucket ? "all" : filter.bucket,
                })
              }
            >
              {filter.label}
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
        <section className="squad-empty scouting-empty" aria-label="Leere Marktliste">
          <span className="squad-empty-icon" aria-hidden="true">👁️</span>
          <p>Keine Treffer für die aktuellen Filter.</p>
        </section>
      ) : (
        <div className="squad-table-wrap">
          <table className="squad-table scouting-table" aria-label="Marktliste">
            <thead>
              <tr>
                <SquadSortHeader label="Name" sortKey="name" activeKey={sort.key} direction={sort.direction} onSort={toggleSort} align="left" />
                <SquadSortHeader label="Pos" sortKey="position" activeKey={sort.key} direction={sort.direction} onSort={toggleSort} />
                <SquadSortHeader label="Alt" sortKey="age" activeKey={sort.key} direction={sort.direction} onSort={toggleSort} />
                <th scope="col">Verein</th>
                <SquadSortHeader label="CA" sortKey="ca" activeKey={sort.key} direction={sort.direction} onSort={toggleSort} />
                <SquadSortHeader label="Wert" sortKey="marketValue" activeKey={sort.key} direction={sort.direction} onSort={toggleSort} />
                <th scope="col">Kenntnis</th>
                <th scope="col" className="scouting-col-menu" aria-label="Aktionen" />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const ca = formatScoutCa(row.player, row.estimate, false);
                return (
                  <tr
                    key={row.playerId}
                    className="squad-table-row scouting-table-row"
                    onClick={() => onSelectTarget(row.playerId)}
                  >
                    <td className="squad-col-name">
                      {row.assigned ? <span className="scouting-active" title="Scout aktiv">🟢 </span> : null}
                      {row.displayName}
                    </td>
                    <td>{row.position}</td>
                    <td>{row.age}</td>
                    <td>{row.clubName ?? "—"}</td>
                    <td className="squad-col-ca">{ca}</td>
                    <td className="squad-col-value">{formatMarketValueShort(row.marketValue)}</td>
                    <td className="scouting-col-label">{targetLabel({ player: row.player, estimate: row.estimate })}</td>
                    <td className="scouting-col-menu" onClick={(event) => event.stopPropagation()}>
                      <RowMenu
                        open={openMenuId === row.playerId}
                        assigned={row.assigned}
                        onToggle={() => setOpenMenuId((current) => (current === row.playerId ? null : row.playerId))}
                        onClose={() => setOpenMenuId(null)}
                        onScout={() => onAssignScout(row.playerId)}
                        onOpenProfile={() => onSelectTarget(row.playerId)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
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
  children: string;
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

