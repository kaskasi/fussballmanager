import type { PlayerSeasonStat, TeamId } from "@fussballmanager/shared";
import type { LeagueState } from "../../persistence/league-state.ts";
import { clubPlaceName, clubShortLabel } from "../../sim/league-divisions.ts";
import type { WorldClub } from "../../world/world-generator.ts";

export function LeagueLeaderLists({
  scorers,
  assists,
  yellows,
  playerClubId,
  worldClubs,
  matchdaysPlayed = 0,
}: {
  scorers: readonly PlayerSeasonStat[];
  assists: readonly PlayerSeasonStat[];
  yellows: readonly PlayerSeasonStat[];
  playerClubId: LeagueState["player_club_id"];
  worldClubs?: readonly WorldClub[];
  matchdaysPlayed?: number;
}) {
  return (
    <div className="league-leaders" aria-label="Liga-Statistik">
      <LeaderList
        title="⚽ Torschützen"
        rows={scorers}
        field="goals"
        kind="goals"
        matchdaysPlayed={matchdaysPlayed}
        playerClubId={playerClubId}
        worldClubs={worldClubs}
      />
      <LeaderList
        title="🅰️ Assists"
        rows={assists}
        field="assists"
        kind="assists"
        matchdaysPlayed={matchdaysPlayed}
        playerClubId={playerClubId}
        worldClubs={worldClubs}
      />
      <LeaderList
        title="🟨 Gelbe Karten"
        rows={yellows}
        field="yellowCards"
        kind="yellows"
        matchdaysPlayed={matchdaysPlayed}
        playerClubId={playerClubId}
        worldClubs={worldClubs}
      />
    </div>
  );
}

type LeaderKind = "goals" | "assists" | "yellows";

const LEADER_EMPTY: Record<LeaderKind, { icon: string; line: (matchdays: number) => string }> = {
  goals: {
    icon: "⚽",
    line: (matchdays) =>
      matchdays === 0 ? "Noch kein Spieltag — Tore folgen nach Anpfiff." : "Noch keine Tore in dieser Liga.",
  },
  assists: {
    icon: "🅰️",
    line: (matchdays) =>
      matchdays === 0 ? "Noch kein Spieltag — Vorlagen folgen nach Anpfiff." : "Noch keine Vorlagen erfasst.",
  },
  yellows: {
    icon: "🟨",
    line: (matchdays) =>
      matchdays === 0 ? "Noch kein Spieltag — Karten folgen nach Anpfiff." : "Noch keine gelben Karten.",
  },
};

function LeaderList({
  title,
  rows,
  field,
  kind,
  matchdaysPlayed,
  playerClubId,
  worldClubs,
}: {
  title: string;
  rows: readonly PlayerSeasonStat[];
  field: "goals" | "assists" | "yellowCards";
  kind: LeaderKind;
  matchdaysPlayed: number;
  playerClubId: LeagueState["player_club_id"];
  worldClubs?: readonly WorldClub[];
}) {
  const empty = LEADER_EMPTY[kind];
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
              <span className="league-leader-club">
                {clubPlaceName(row.teamId, worldClubs) || clubShortLabel(row.teamId, worldClubs)}
              </span>
              <strong>{row[field]}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <div className="league-leader-empty-state">
          <div className="league-leader-podium" aria-hidden>
            <span className="league-leader-podium-slot is-second">{empty.icon}</span>
            <span className="league-leader-podium-slot is-first">{empty.icon}</span>
            <span className="league-leader-podium-slot is-third">{empty.icon}</span>
          </div>
          <p className="league-leader-empty-line">{empty.line(matchdaysPlayed)}</p>
        </div>
      )}
    </div>
  );
}
