import { useMemo, useState } from "react";
import type { PositionPrimary } from "../../types/player.ts";
import type { BoardTarget } from "../../scouting/scout-board.ts";
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
import { formatMarketValueShort, type ProSquadSortKey } from "../../squad/pro-roster.ts";
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

export function ScoutingCenter({
  targets,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  onSelectTarget,
  onAssignScout,
  onBack,
}: {
  targets: BoardTarget[];
  filters: MarketFilters;
  onFiltersChange: (filters: MarketFilters) => void;
  sort: MarketSort;
  onSortChange: (sort: MarketSort) => void;
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

  const toggleSort = (key: ProSquadSortKey) => {
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
          <p className="scouting-scouts">🟢 {assigned} Scout-Ziele aktiv · {visible.length} Treffer</p>
        </div>
      </header>

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

