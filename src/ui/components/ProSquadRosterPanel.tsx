/** WIREFRAME: design.md §9.11 — Profikader-Tabelle (Layout wie Jugendliste) */
import { useMemo, useState } from "react";
import type { Player, PositionPrimary } from "../../types/player.ts";
import {
  formatMarketValueShort,
  positionsInProSquad,
  sortProSquadRows,
  type ProSquadRow,
  type ProSquadSortDirection,
  type ProSquadSortKey,
} from "../../squad/pro-roster.ts";
import { caDeltaClassName, caDeltaMark, formatCaDelta } from "../../player/ca-tracking.ts";
import { FilterChip, FilterToolbar } from "./primitives/index.ts";
import { SquadSortHeader } from "./SquadSortHeader.tsx";
import { PlayerPortrait } from "./PlayerPortrait.tsx";
import { formMark, stateMark } from "../player-profile.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";

export function ProSquadRosterPanel({
  rows,
  playersById,
  avgCa,
  totalValue,
  sortKey,
  sortDirection,
  onSortKeyChange,
  onSortDirectionChange,
  onSelectPlayer,
}: {
  rows: readonly ProSquadRow[];
  playersById: ReadonlyMap<string, Player>;
  avgCa: number;
  totalValue: number;
  sortKey: ProSquadSortKey;
  sortDirection: ProSquadSortDirection;
  onSortKeyChange: (key: ProSquadSortKey) => void;
  onSortDirectionChange: (direction: ProSquadSortDirection) => void;
  onSelectPlayer: (playerId: string) => void;
}) {
  useT();
  const [position, setPosition] = useState<PositionPrimary | "all">("all");

  const positions = useMemo(() => positionsInProSquad(rows), [rows]);
  const visible = useMemo(() => {
    const filtered =
      position === "all" ? rows : rows.filter((row) => row.positions.includes(position));
    return sortProSquadRows(filtered, sortKey, sortDirection);
  }, [rows, position, sortKey, sortDirection]);

  const toggleSort = (key: ProSquadSortKey) => {
    if (sortKey === key) {
      onSortDirectionChange(sortDirection === "desc" ? "asc" : "desc");
      return;
    }
    onSortKeyChange(key);
    onSortDirectionChange(key === "name" || key === "position" ? "asc" : "desc");
  };

  return (
    <section className="game-panel youth-roster-panel pro-roster-panel" aria-label={t("squad.title")}>
      <p className="squad-summary squad-summary--head">
        {t("squad.summaryHead", {
          avgCa,
          value: formatMarketValueShort(totalValue),
        })}
      </p>

      <FilterToolbar ariaLabel={t("youth.filter.aria")} className="squad-list-toolbar">
        <FilterChip active={position === "all"} onClick={() => setPosition("all")}>
          {t("scouting.filter.all")}
        </FilterChip>
        {positions.map((slot) => {
          const active = position === slot;
          return (
            <FilterChip key={slot} active={active} onClick={() => setPosition(active ? "all" : slot)}>
              {slot}
            </FilterChip>
          );
        })}
      </FilterToolbar>

      <div className="squad-table-wrap">
        <table className="squad-table youth-roster-table pro-roster-table">
          <thead>
            <tr>
              <SquadSortHeader
                label={t("squad.col.name")}
                sortKey="name"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={toggleSort}
                align="left"
              />
              <SquadSortHeader
                label={t("squad.col.pos")}
                sortKey="position"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SquadSortHeader
                label={t("squad.col.age")}
                sortKey="age"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SquadSortHeader label="CA" sortKey="ca" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SquadSortHeader
                label="Δ"
                sortKey="caDelta"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SquadSortHeader
                label={t("squad.col.value")}
                sortKey="marketValue"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SquadSortHeader
                label="Min"
                sortKey="seasonMinutes"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SquadSortHeader label="T" sortKey="goals" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SquadSortHeader label="A" sortKey="assists" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              <SquadSortHeader
                label="Ø"
                sortKey="avgRating"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SquadSortHeader
                label={t("squad.col.form")}
                sortKey="form"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SquadSortHeader
                label={t("squad.col.fit")}
                sortKey="fitness"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={toggleSort}
              />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={12} className="youth-report-empty">
                  {t("squad.emptyFiltered")}
                </td>
              </tr>
            ) : (
              visible.map((row, rowIndex) => {
                const player = playersById.get(row.playerId);
                const fit = stateMark(row.fitness, 75, 50);
                const form = formMark(row.form);
                return (
                  <tr
                    key={row.playerId}
                    className="squad-table-row"
                    tabIndex={0}
                    role="button"
                    {...(rowIndex === 0 ? { "data-coach-target": COACH_TARGET.squadFirstRow } : {})}
                    onClick={() => onSelectPlayer(row.playerId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectPlayer(row.playerId);
                      }
                    }}
                  >
                    <td className="squad-col-name">
                      <span className="youth-report-badge">
                        {player ? (
                          <PlayerPortrait
                            seed={player.portrait_seed}
                            clubId={player.club_id}
                            size="sm"
                            className="campus-portrait"
                          />
                        ) : null}
                        {row.displayName}
                      </span>
                    </td>
                    <td>{row.positionLabel}</td>
                    <td>{row.age}</td>
                    <td className="squad-col-ca">{row.ca}</td>
                    <td className={caDeltaClassName(row.caDelta)}>
                      <span className="squad-delta-mark" aria-hidden="true">
                        {caDeltaMark(row.caDelta)}
                      </span>
                      {formatCaDelta(row.caDelta)}
                    </td>
                    <td className="squad-col-value">{formatMarketValueShort(row.marketValue)}</td>
                    <td>{row.seasonMinutes}</td>
                    <td>{row.goals}</td>
                    <td>{row.assists}</td>
                    <td>{row.avgRating?.toFixed(1) ?? "—"}</td>
                    <td className={`squad-form is-${form.tone}`}>
                      <span className="squad-shape-mark" aria-hidden="true">
                        {form.mark}
                      </span>
                    </td>
                    <td>
                      {row.injuryWeeks !== null ? (
                        <span className="squad-injury" title={t("squad.injuredHint")}>
                          {row.injuryWeeks} Wo.
                        </span>
                      ) : (
                        <span className={`squad-fitness is-${fit.tone}`}>
                          {fit.mark} {row.fitness}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
