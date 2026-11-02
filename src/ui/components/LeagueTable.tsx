import { TrendingUp } from "lucide-react";
import type { TableRow, TeamId } from "@fussballmanager/shared";
import type { LeagueState } from "../../persistence/league-state.ts";
import { teamFormPoints, teamFormSlots } from "../../sim/league-form.ts";
import { LeagueFormStrip, LeaguePointsSparkline } from "./LeagueFormVisuals.tsx";
import { divisionZones, tableZone, type DivisionId, type TableZone } from "../../sim/league-pyramid.ts";
import { clubDisplayName, clubPlaceName } from "../../sim/league-divisions.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import { useT } from "../../i18n/react.ts";

const ZONE_CLASS = {
  promoted: "tc-place--up",
  playoff: "tc-place--playoff",
  relegated: "tc-place--down",
  safe: "",
} as const;

/** WIREFRAME: docs/prd/design.md §9.7 — league table on tc-table (design.md §4.3). */
export function LeagueTable({
  divisionId,
  table,
  leagueSlice,
  playerClubId,
  worldClubs,
  onSelectClub,
  highlightTeamIds,
  caption,
  compact = false,
}: {
  /** Zones come from this division's boundaries (PRD 32 §3). */
  divisionId: DivisionId;
  table: TableRow[];
  leagueSlice: Pick<LeagueState, "club_ids" | "results">;
  playerClubId: TeamId;
  worldClubs?: readonly WorldClub[];
  onSelectClub?: (teamId: TeamId) => void;
  /** e.g. both sides before kickoff */
  highlightTeamIds?: readonly TeamId[];
  /** Screen-reader caption, e.g. the division and matchday. */
  caption?: string;
  compact?: boolean;
}) {
  const t = useT();
  const highlight = new Set(highlightTeamIds ?? []);
  return (
    <div className="tc-table-wrap">
      <table className="tc-table tc-table--compact">
        {caption ? <caption className="tc-sr">{caption}</caption> : null}
        <thead>
          <tr>
            <th scope="col" className="tc-num">
              #
            </th>
            {compact ? null : (
              <th scope="col" className="tc-hide-narrow">
                {t("leagues.table.place")}
              </th>
            )}
            <th scope="col">{t("leagues.table.club")}</th>
            <th scope="col" className="tc-num">
              {t("leagues.table.played")}
            </th>
            {compact ? (
              <>
                <th scope="col" className="tc-num">
                  {t("leagues.table.goals")}
                </th>
                <th scope="col" className="tc-num">
                  {t("leagues.table.points")}
                </th>
              </>
            ) : (
              <>
                <th scope="col" className="tc-num">
                  {t("leagues.table.wins")}
                </th>
                <th scope="col" className="tc-num">
                  {t("leagues.table.draws")}
                </th>
                <th scope="col" className="tc-num">
                  {t("leagues.table.losses")}
                </th>
                <th scope="col" className="tc-num">
                  {t("leagues.table.goals")}
                </th>
                <th scope="col" className="tc-num">
                  {t("leagues.table.diff")}
                </th>
                <th scope="col" title={t("leagues.table.formTitle")}>
                  {t("leagues.table.form")}
                </th>
                <th scope="col" title={t("leagues.table.trendTitle")}>
                  <TrendingUp className="tc-icon" aria-hidden="true" />
                  <span className="tc-sr">{t("leagues.table.trend")}</span>
                </th>
                <th scope="col" className="tc-num">
                  {t("leagues.table.points")}
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {table.map((row, index) => {
            const zone = tableZone(divisionId, index, table.length);
            const isOwn = row.teamId === playerClubId;
            const rowClass = isOwn ? "tc-row--own" : highlight.has(row.teamId) ? "tc-row--mark" : undefined;
            const name = clubDisplayName(row.teamId, worldClubs);
            return (
              <tr key={row.teamId} className={rowClass}>
                <td className="tc-num">
                  <span className={`tc-place ${ZONE_CLASS[zone]}`.trim()}>{index + 1}</span>
                </td>
                {compact ? null : <td className="tc-hide-narrow">{clubPlaceName(row.teamId, worldClubs) || "—"}</td>}
                <td>
                  {onSelectClub ? (
                    <button type="button" className="tc-linkbtn" onClick={() => onSelectClub(row.teamId)}>
                      {name}
                    </button>
                  ) : (
                    <span className="tc-strong">{name}</span>
                  )}
                </td>
                <td className="tc-num">{row.played}</td>
                {compact ? (
                  <>
                    <td className="tc-num">
                      {row.goalsFor}:{row.goalsAgainst}
                    </td>
                    <td className="tc-num tc-strong">{row.points}</td>
                  </>
                ) : (
                  <>
                    <td className="tc-num">{row.won}</td>
                    <td className="tc-num">{row.drawn}</td>
                    <td className="tc-num">{row.lost}</td>
                    <td className="tc-num">
                      {row.goalsFor}:{row.goalsAgainst}
                    </td>
                    <td className="tc-num">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                    <td>
                      <LeagueFormStrip slots={teamFormSlots(leagueSlice, row.teamId)} />
                    </td>
                    <td>
                      <LeaguePointsSparkline points={teamFormPoints(leagueSlice, row.teamId)} />
                    </td>
                    <td className="tc-num tc-strong">{row.points}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const ZONE_LEGEND_KEY: Record<Exclude<TableZone, "safe">, string> = {
  promoted: "leagues.legend.promotion",
  playoff: "leagues.legend.playoff",
  relegated: "leagues.legend.relegation",
};

/** Zone key under the table: the same place badges as the rank column, only the zones this division has. */
export function LeagueZoneLegend({ divisionId }: { divisionId: DivisionId }) {
  const t = useT();
  const items = divisionZones(divisionId).map((zone) => ({
    className: ZONE_CLASS[zone],
    label: t(ZONE_LEGEND_KEY[zone]),
  }));
  if (items.length === 0) return null;
  return (
    <ul className="tc-legend" aria-label={t("leagues.legendAria")}>
      {items.map((item) => (
        <li key={item.className} className="tc-legend__item">
          <span className={`tc-place tc-place--key ${item.className}`} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
