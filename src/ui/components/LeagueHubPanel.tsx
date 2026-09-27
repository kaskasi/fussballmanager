import type { PlayerSeasonStat } from "@fussballmanager/shared";
import { totalSeasonMatchdays, type LeagueState } from "../../persistence/league-state.ts";
import { divisionLabel } from "../../sim/league-divisions.ts";
import { formSparkline, teamForm } from "../../sim/league-form.ts";
import { promotionZoneRank } from "../../sim/promotion-relegation.ts";
import {
  clubShortName,
  leagueTable,
  topAssists,
  topScorers,
  topYellowCards,
} from "../../sim/league-week.ts";

/** WIREFRAME: PRD 09.2 — Liga-Übersicht im Hub */
export function LeagueHubPanel({ league }: { league: LeagueState }) {
  const table = leagueTable(league);
  const scorers = topScorers(league);
  const assists = topAssists(league);
  const yellows = topYellowCards(league);

  return (
    <section className="league-hub" aria-label="Ligaübersicht">
      <h3 className="league-hub-title">
        {divisionLabel(league.division_id)}
        <span className="league-hub-mode">
          {league.club_ids.length} Teams · {league.meetings_per_opponent ?? 6}× Hin- und Rückrunde · {totalSeasonMatchdays(league)} Spiele/Team
        </span>
      </h3>
      <div className="league-hub-grid">
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
                <th>Form</th>
                <th>Pkt</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row, index) => {
                const zone = promotionZoneRank(index, table.length);
                const form = formSparkline(teamForm(league, row.teamId));
                const rowClass = [
                  row.teamId === league.player_club_id ? "is-player-club" : "",
                  zone ? `league-zone-${zone}` : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                <tr
                  key={row.teamId}
                  className={rowClass || undefined}
                >
                  <td>{index + 1}</td>
                  <td>{clubShortName(row.teamId)}</td>
                  <td>{row.played}</td>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  <td>{row.goalsFor}:{row.goalsAgainst}</td>
                  <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                  <td className="league-form" title="Letzte 5 Spiele">{form || "—"}</td>
                  <td><strong>{row.points}</strong></td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
        <div className="league-leaders">
          <LeaderList title="⚽ Torschützen" rows={scorers} field="goals" playerClubId={league.player_club_id} />
          <LeaderList title="🅰️ Assists" rows={assists} field="assists" playerClubId={league.player_club_id} />
          <LeaderList title="🟨 Gelbe Karten" rows={yellows} field="yellowCards" playerClubId={league.player_club_id} />
        </div>
      </div>
    </section>
  );
}

function LeaderList({
  title,
  rows,
  field,
  playerClubId,
}: {
  title: string;
  rows: PlayerSeasonStat[];
  field: "goals" | "assists" | "yellowCards";
  playerClubId: LeagueState["player_club_id"];
}) {
  return (
    <div className="league-leader-card">
      <p className="league-leader-title">{title}</p>
      {rows.length > 0 ? (
        <ol className="league-leader-list">
          {rows.map((row) => (
            <li
              key={`${row.name}-${row.teamId}-${field}`}
              className={row.teamId === playerClubId ? "is-player-club" : undefined}
            >
              <span className="league-leader-name">{row.name}</span>
              <span className="league-leader-club">{clubShortName(row.teamId)}</span>
              <strong>{row[field]}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="league-leader-empty">Noch keine Daten</p>
      )}
    </div>
  );
}
