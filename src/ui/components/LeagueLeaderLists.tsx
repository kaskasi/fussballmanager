import { disciplinePoints } from "@fussballmanager/shared";
import type { PlayerSeasonStat } from "@fussballmanager/shared";
import type { LeagueState } from "../../persistence/league-state.ts";
import { clubPlaceName, clubShortLabel } from "../../sim/league-divisions.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import { useT } from "../../i18n/react.ts";

type LeaderKind = "goals" | "assists" | "discipline";

/** League side panel: scorers, assists and cards as tc-list sections (design.md §9.7). */
export function LeagueLeaderLists({
  scorers,
  assists,
  discipline,
  playerClubId,
  worldClubs,
  matchdaysPlayed = 0,
}: {
  scorers: readonly PlayerSeasonStat[];
  assists: readonly PlayerSeasonStat[];
  discipline: readonly PlayerSeasonStat[];
  playerClubId: LeagueState["player_club_id"];
  worldClubs?: readonly WorldClub[];
  matchdaysPlayed?: number;
}) {
  const t = useT();
  const shared = { matchdaysPlayed, playerClubId, worldClubs };
  return (
    <>
      <LeaderList title={t("leagues.tab.scorers")} rows={scorers} kind="goals" {...shared} />
      <LeaderList title={t("leagues.sidebar.assists")} rows={assists} kind="assists" {...shared} />
      <LeaderList
        title={t("leagues.sidebar.discipline")}
        hint={t("leagues.sidebar.disciplineHint")}
        rows={discipline}
        kind="discipline"
        {...shared}
      />
    </>
  );
}

function LeaderList({
  title,
  hint,
  rows,
  kind,
  matchdaysPlayed,
  playerClubId,
  worldClubs,
}: {
  title: string;
  hint?: string;
  rows: readonly PlayerSeasonStat[];
  kind: LeaderKind;
  matchdaysPlayed: number;
  playerClubId: LeagueState["player_club_id"];
  worldClubs?: readonly WorldClub[];
}) {
  const t = useT();
  const value = (row: PlayerSeasonStat) =>
    kind === "goals" ? row.goals : kind === "assists" ? row.assists : disciplinePoints(row);

  return (
    <section className="tc-section">
      <h2 className="tc-label tc-section__title">{title}</h2>
      {hint ? <p className="tc-caption tc-section__title">{hint}</p> : null}
      {rows.length > 0 ? (
        <ol className="tc-list">
          {rows.map((row, index) => (
            <li
              key={`${row.name}-${row.teamId}`}
              className={`tc-list__item${row.teamId === playerClubId ? " tc-list__item--own" : ""}`}
            >
              <span className="tc-list__rank">{index + 1}</span>
              <span className="tc-list__main">
                <span className="tc-list__name">{row.name}</span>
                <span className="tc-list__meta">
                  {clubPlaceName(row.teamId, worldClubs) || clubShortLabel(row.teamId, worldClubs)}
                </span>
              </span>
              <span className="tc-list__value">{value(row)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="tc-empty">{t(`leagues.leaders.empty.${kind}.${matchdaysPlayed === 0 ? "pre" : "none"}`)}</p>
      )}
    </section>
  );
}
