import type { TableRow, TeamId } from "@fussballmanager/shared";
import type { LeagueState } from "../../persistence/league-state.ts";
import { teamFormPoints, teamFormSlots } from "../../sim/league-form.ts";
import { LeagueFormStrip, LeaguePointsSparkline } from "./LeagueFormVisuals.tsx";
import { promotionZoneRank } from "../../sim/promotion-relegation.ts";
import { clubDisplayName } from "../../sim/league-divisions.ts";
import type { WorldClub } from "../../world/world-generator.ts";

export function LeagueTable({
  table,
  leagueSlice,
  playerClubId,
  worldClubs,
  onSelectClub,
}: {
  table: TableRow[];
  leagueSlice: Pick<LeagueState, "club_ids" | "results">;
  playerClubId: TeamId;
  worldClubs?: readonly WorldClub[];
  onSelectClub?: (teamId: TeamId) => void;
}) {
  return (
    <div className="league-table-wrap">
      <table className="league-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Verein</th>
            <th>Sp</th>
            <th>S</th>
            <th>U</th>
            <th>N</th>
            <th>Tore</th>
            <th>Diff</th>
            <th title="Letzte 5 Spiele (▲ Sieg · ■ Remis · ▼ Niederlage)">Form</th>
            <th className="league-th-trend" title="Punkte der letzten 5 Spiele (0–3)">📈</th>
            <th>Pkt</th>
          </tr>
        </thead>
        <tbody>
          {table.map((row, index) => {
            const zone = promotionZoneRank(index, table.length);
            const formSlots = teamFormSlots(leagueSlice, row.teamId);
            const formPoints = teamFormPoints(leagueSlice, row.teamId);
            const rowClass = [
              row.teamId === playerClubId ? "is-player-club" : "",
              zone ? `league-zone-${zone}` : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <tr key={row.teamId} className={rowClass || undefined}>
                <td>{index + 1}</td>
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
                <td>{row.won}</td>
                <td>{row.drawn}</td>
                <td>{row.lost}</td>
                <td>{row.goalsFor}:{row.goalsAgainst}</td>
                <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                <td className="league-form-cell">
                  <LeagueFormStrip slots={formSlots} />
                </td>
                <td className="league-trend-cell">
                  <LeaguePointsSparkline points={formPoints} />
                </td>
                <td><strong>{row.points}</strong></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
