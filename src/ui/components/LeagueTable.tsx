import { TrendingUp } from "lucide-react";
import type { TableRow, TeamId } from "@fussballmanager/shared";
import type { LeagueState } from "../../persistence/league-state.ts";
import { teamFormPoints, teamFormSlots } from "../../sim/league-form.ts";
import { LeagueFormStrip, LeaguePointsSparkline } from "./LeagueFormVisuals.tsx";
import { promotionZoneRank } from "../../sim/promotion-relegation.ts";
import { clubDisplayName, clubPlaceName } from "../../sim/league-divisions.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import { useT } from "../../i18n/react.ts";

export function LeagueTable({
  table,
  leagueSlice,
  playerClubId,
  worldClubs,
  onSelectClub,
  highlightTeamIds,
  compact = false,
}: {
  table: TableRow[];
  leagueSlice: Pick<LeagueState, "club_ids" | "results">;
  playerClubId: TeamId;
  worldClubs?: readonly WorldClub[];
  onSelectClub?: (teamId: TeamId) => void;
  /** e.g. both sides before kickoff */
  highlightTeamIds?: readonly TeamId[];
  compact?: boolean;
}) {
  const t = useT();
  const highlight = new Set(highlightTeamIds ?? []);
  return (
    <div className="league-table-wrap">
      <table className={`league-table${compact ? " league-table--compact" : ""}`}>
        <thead>
          <tr>
            <th>#</th>
            {compact ? null : <th>{t("leagues.table.place")}</th>}
            <th>{t("leagues.table.club")}</th>
            <th>{t("leagues.table.played")}</th>
            {compact ? (
              <>
                <th>{t("leagues.table.goals")}</th>
                <th>{t("leagues.table.points")}</th>
              </>
            ) : (
              <>
                <th>{t("leagues.table.wins")}</th>
                <th>{t("leagues.table.draws")}</th>
                <th>{t("leagues.table.losses")}</th>
                <th>{t("leagues.table.goals")}</th>
                <th>{t("leagues.table.diff")}</th>
                <th title={t("leagues.table.formTitle")}>{t("leagues.table.form")}</th>
                <th className="league-th-trend" title={t("leagues.table.trendTitle")}>
                  <TrendingUp size={14} strokeWidth={2.5} aria-hidden="true" />
                  <span className="sr-only">{t("leagues.table.trend")}</span>
                </th>
                <th>{t("leagues.table.points")}</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {table.map((row, index) => {
            const zone = promotionZoneRank(index, table.length);
            const formSlots = teamFormSlots(leagueSlice, row.teamId);
            const formPoints = teamFormPoints(leagueSlice, row.teamId);
            const rowClass = [
              row.teamId === playerClubId ? "is-player-club" : "",
              highlight.has(row.teamId) ? "is-matchday-club" : "",
              zone ? `league-zone-${zone}` : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <tr key={row.teamId} className={rowClass || undefined}>
                <td>{index + 1}</td>
                {compact ? null : (
                  <td className="league-place-cell">{clubPlaceName(row.teamId, worldClubs) || "—"}</td>
                )}
                <td>
                  {onSelectClub ? (
                    <button
                      type="button"
                      className="league-club-link"
                      onClick={() => onSelectClub(row.teamId)}
                    >
                      {clubDisplayName(row.teamId, worldClubs)}
                    </button>
                  ) : (
                    clubDisplayName(row.teamId, worldClubs)
                  )}
                </td>
                <td>{row.played}</td>
                {compact ? (
                  <>
                    <td>
                      {row.goalsFor}:{row.goalsAgainst}
                    </td>
                    <td>
                      <strong>{row.points}</strong>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{row.won}</td>
                    <td>{row.drawn}</td>
                    <td>{row.lost}</td>
                    <td>
                      {row.goalsFor}:{row.goalsAgainst}
                    </td>
                    <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                    <td className="league-form-cell">
                      <LeagueFormStrip slots={formSlots} />
                    </td>
                    <td className="league-trend-cell">
                      <LeaguePointsSparkline points={formPoints} />
                    </td>
                    <td>
                      <strong>{row.points}</strong>
                    </td>
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
