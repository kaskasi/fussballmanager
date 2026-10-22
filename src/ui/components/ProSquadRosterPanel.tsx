/** WIREFRAME: design.md §9.11 — Profikader-Tabelle on tc-table (design.md §4.3) */
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
import { formatCaDelta } from "../../player/ca-tracking.ts";
import { FilterChip, FilterToolbar } from "./primitives/index.ts";
import { SquadSortHeader } from "./SquadSortHeader.tsx";
import { PlayerPortrait } from "./PlayerPortrait.tsx";
import { formMark, stateMark } from "../player-profile.ts";
import { ratingBand } from "../design/rating-band.ts";
import { useT } from "../../i18n/react.ts";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";

const COLUMN_COUNT = 12;

/** Shape + colour + screen-reader word, never colour alone (design.md §2). */
function StateCell({ mark, tone, label }: { mark: string; tone: string; label: string }) {
  return (
    <>
      <span className={`tc-state tc-state--${tone}`} aria-hidden="true">
        {mark}
      </span>
      <span className="tc-sr">{label}</span>
    </>
  );
}

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
  const t = useT();
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

  const header = (key: ProSquadSortKey, label: string, title?: string, align?: "left") => (
    <SquadSortHeader
      label={label}
      title={title}
      sortKey={key}
      activeKey={sortKey}
      direction={sortDirection}
      onSort={toggleSort}
      align={align}
    />
  );

  return (
    <section className="tc-panel" aria-labelledby="squad-roster-title">
      <div className="tc-panel__head">
        <h2 className="tc-panel__title" id="squad-roster-title">
          {t("squad.title")}
        </h2>
        <span className="tc-panel__meta">
          {t("squad.summaryHead", { avgCa, value: formatMarketValueShort(totalValue) })}
        </span>
      </div>

      <FilterToolbar ariaLabel={t("youth.filter.aria")}>
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

      <div className="tc-table-wrap">
        <table className="tc-table tc-table--compact">
          <caption className="tc-sr">{t("squad.title")}</caption>
          <thead>
            <tr>
              {header("name", t("squad.col.name"), undefined, "left")}
              {header("position", t("squad.col.pos"))}
              {header("age", t("squad.col.age"))}
              {header("ca", t("squad.col.caShort"))}
              {header("caDelta", "Δ", t("squad.col.caDeltaTitle"))}
              {header("marketValue", t("squad.col.value"))}
              {header("seasonMinutes", t("squad.col.minutes"), t("squad.col.minutesTitle"))}
              {header("goals", t("squad.col.goals"), t("squad.col.goalsTitle"))}
              {header("assists", t("squad.col.assists"), t("squad.col.assistsTitle"))}
              {header("avgRating", t("squad.col.avgRating"), t("squad.col.avgRatingTitle"))}
              {header("form", t("squad.col.form"))}
              {header("fitness", t("squad.col.fit"), t("squad.col.fitTitle"))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={COLUMN_COUNT} className="tc-empty">
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
                    className="tc-row--link"
                    tabIndex={0}
                    role="button"
                    aria-label={t("squad.openProfile", { name: row.displayName })}
                    {...(rowIndex === 0 ? { "data-coach-target": COACH_TARGET.squadFirstRow } : {})}
                    onClick={() => onSelectPlayer(row.playerId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectPlayer(row.playerId);
                      }
                    }}
                  >
                    <td>
                      <span className="tc-namecell">
                        {player ? (
                          <PlayerPortrait seed={player.portrait_seed} clubId={player.club_id} size="sm" />
                        ) : null}
                        {row.displayName}
                      </span>
                    </td>
                    <td className="tc-num">{row.positionLabel}</td>
                    <td className="tc-num">{row.age}</td>
                    <td className="tc-num">
                      <span className={`tc-rating tc-rating--${ratingBand(row.ca)}`}>{row.ca}</span>
                    </td>
                    <td
                      className={`tc-num${row.caDelta && row.caDelta > 0 ? " tc-delta--up" : row.caDelta && row.caDelta < 0 ? " tc-delta--down" : ""}`}
                    >
                      {formatCaDelta(row.caDelta)}
                    </td>
                    <td className="tc-num">{formatMarketValueShort(row.marketValue)}</td>
                    <td className="tc-num">{row.seasonMinutes}</td>
                    <td className="tc-num">{row.goals}</td>
                    <td className="tc-num">{row.assists}</td>
                    <td className="tc-num">{row.avgRating?.toFixed(1) ?? "—"}</td>
                    <td className="tc-num">
                      <StateCell mark={form.mark} tone={form.tone} label={t(`squad.state.${form.tone}`)} />
                    </td>
                    <td className="tc-num">
                      {row.injuryWeeks !== null ? (
                        <span className="tc-state tc-state--low" title={t("squad.injuredHint")}>
                          {t("squad.injuredWeeks", { count: row.injuryWeeks })}
                        </span>
                      ) : (
                        <>
                          <StateCell mark={fit.mark} tone={fit.tone} label={t(`squad.state.${fit.tone}`)} />{" "}
                          {row.fitness}
                        </>
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
