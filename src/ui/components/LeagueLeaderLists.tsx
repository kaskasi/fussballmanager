import { disciplinePoints } from "@fussballmanager/shared";
import type { PlayerSeasonStat, TeamId } from "@fussballmanager/shared";
import type { LeagueState } from "../../persistence/league-state.ts";
import { clubPlaceName, clubShortLabel } from "../../sim/league-divisions.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import { useT } from "../../i18n/react.ts";

export function LeagueLeaderLists({
  scorers,
  assists,
  discipline,
  playerClubId,
  worldClubs,
  matchdaysPlayed = 0,
  layout = "full",
  yellows,
}: {
  scorers: readonly PlayerSeasonStat[];
  assists: readonly PlayerSeasonStat[];
  discipline: readonly PlayerSeasonStat[];
  yellows: readonly PlayerSeasonStat[];
  playerClubId: LeagueState["player_club_id"];
  worldClubs?: readonly WorldClub[];
  matchdaysPlayed?: number;
  layout?: "full" | "sidebar";
}) {
  const t = useT();
  const rootClass = layout === "sidebar" ? "league-leaders is-sidebar" : "league-leaders";

  if (layout === "sidebar") {
    return (
      <div className={rootClass} aria-label={t("leagues.sidebar.statsAria")}>
        <LeaderList
          title={t("leagues.tab.scorers")}
          rows={scorers}
          kind="goals"
          compact
          matchdaysPlayed={matchdaysPlayed}
          playerClubId={playerClubId}
          worldClubs={worldClubs}
        />
        <LeaderList
          title={t("leagues.sidebar.assists")}
          rows={assists}
          kind="assists"
          compact
          matchdaysPlayed={matchdaysPlayed}
          playerClubId={playerClubId}
          worldClubs={worldClubs}
        />
        <LeaderList
          title={t("leagues.sidebar.discipline")}
          rows={discipline}
          kind="discipline"
          compact
          matchdaysPlayed={matchdaysPlayed}
          playerClubId={playerClubId}
          worldClubs={worldClubs}
          scoreHint={t("leagues.sidebar.disciplineHint")}
        />
      </div>
    );
  }

  return (
    <div className={rootClass} aria-label="Liga-Statistik">
      <LeaderList
        title="⚽ Torschützen"
        rows={scorers}
        kind="goals"
        matchdaysPlayed={matchdaysPlayed}
        playerClubId={playerClubId}
        worldClubs={worldClubs}
      />
      <LeaderList
        title="🅰️ Assists"
        rows={assists}
        kind="assists"
        matchdaysPlayed={matchdaysPlayed}
        playerClubId={playerClubId}
        worldClubs={worldClubs}
      />
      <LeaderList
        title="🟨 Gelbe Karten"
        rows={yellows}
        kind="yellows"
        matchdaysPlayed={matchdaysPlayed}
        playerClubId={playerClubId}
        worldClubs={worldClubs}
      />
    </div>
  );
}

type LeaderKind = "goals" | "assists" | "yellows" | "discipline";

function leaderEmptyLine(
  kind: LeaderKind,
  matchdays: number,
  tr: (key: string, params?: Record<string, string | number>) => string,
): string {
  const phase = matchdays === 0 ? "pre" : "none";
  return tr(`leagues.leaders.empty.${kind}.${phase}`);
}

function LeaderList({
  title,
  rows,
  kind,
  matchdaysPlayed,
  playerClubId,
  worldClubs,
  compact = false,
  scoreHint,
}: {
  title: string;
  rows: readonly PlayerSeasonStat[];
  kind: LeaderKind;
  matchdaysPlayed: number;
  playerClubId: LeagueState["player_club_id"];
  worldClubs?: readonly WorldClub[];
  compact?: boolean;
  scoreHint?: string;
}) {
  const tr = useT();
  const emptyLine = leaderEmptyLine(kind, matchdaysPlayed, tr);
  const emptyIcon =
    kind === "goals" ? "⚽" : kind === "assists" ? "🅰️" : kind === "yellows" ? "🟨" : "▮";
  const displayScore = (row: PlayerSeasonStat) => {
    if (kind === "goals") return row.goals;
    if (kind === "assists") return row.assists;
    if (kind === "yellows") return row.yellowCards;
    return disciplinePoints(row);
  };

  return (
    <div className={compact ? "league-leader-card is-compact" : "league-leader-card"}>
      <p className="league-leader-title">{title}</p>
      {scoreHint && kind === "discipline" ? (
        <p className="league-leader-hint">{scoreHint}</p>
      ) : null}
      {rows.length > 0 ? (
        <ol className="league-leader-list">
          {rows.map((row) => (
            <li
              key={`${row.name}-${row.teamId}-${kind}`}
              className={row.teamId === playerClubId ? "is-player-club" : undefined}
            >
              <span className="league-leader-name">{row.name}</span>
              <span className="league-leader-club">
                {clubPlaceName(row.teamId, worldClubs) || clubShortLabel(row.teamId, worldClubs)}
              </span>
              <strong>{displayScore(row)}</strong>
            </li>
          ))}
        </ol>
      ) : compact ? (
        <p className="league-leader-empty-line is-compact">{emptyLine}</p>
      ) : (
        <div className="league-leader-empty-state">
          <div className="league-leader-podium" aria-hidden>
            <span className="league-leader-podium-slot is-second">{emptyIcon}</span>
            <span className="league-leader-podium-slot is-first">{emptyIcon}</span>
            <span className="league-leader-podium-slot is-third">{emptyIcon}</span>
          </div>
          <p className="league-leader-empty-line">{emptyLine}</p>
        </div>
      )}
    </div>
  );
}
