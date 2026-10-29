/** WIREFRAME: docs/prd/design.md §9.14 — Spiel Zusammenfassung */
import { useState } from "react";
import type { MatchView, PlayerSeasonStat, TeamId } from "@fussballmanager/shared";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { formatCalendarWeek } from "../sim/game-calendar.ts";
import { weekdayLabel } from "../sim/day-calendar.ts";
import { formatClubCash } from "../economy/club-finances.ts";
import type { MatchdayCashBreakdown } from "../stadium/matchday-commerce.ts";
import { MatchStats } from "./MatchStats.tsx";
import { MatchThreeStars } from "./MatchThreeStars.tsx";
import { pickMatchThreeStars } from "./match-three-stars.ts";
import { useT } from "../i18n/react.ts";
import { formatMatchWeatherDisplay } from "./match-weather-display.ts";
import { normalizeMatchView } from "./normalize-match-view.ts";
import { MatchEventLog } from "./MatchEventLog.tsx";
import { MatchScoreHead } from "./MatchScoreHead.tsx";
import { fullMatchLog } from "./live-match-log.ts";
import { PlayerPortrait } from "../ui/components/PlayerPortrait.tsx";
import { resolvePortraitSeed } from "../ui/portraits/portrait-seed-fallback.ts";
import { worldCareerClubId } from "../world/world-generator.ts";

export function MatchReportScreen({
  view,
  setup,
  week,
  weekday,
  kasse,
  portraitSeedForPlayerId,
  onSelectPlayer,
}: {
  view: MatchView;
  setup: CareerMatchSetup;
  week: number;
  weekday: number;
  kasse?: MatchdayCashBreakdown;
  portraitSeedForPlayerId?: (id: string) => number | undefined;
  onSelectPlayer?: (playerId: string) => void;
}) {
  const t = useT();
  const normalized = normalizeMatchView(view);
  const lastFrame = normalized.frames[normalized.frames.length - 1] ?? normalized.kickoff;
  const report = normalized.report;
  const threeStars = pickMatchThreeStars(normalized, report.playerStats);
  const ownTeamId = setup.isHome ? normalized.home.id : normalized.away.id;
  const [teamTab, setTeamTab] = useState<"home" | "away">(setup.isHome ? "home" : "away");
  const activeTeam = teamTab === "home" ? normalized.home : normalized.away;
  const log = fullMatchLog(report, normalized.home.id);
  const goals = log.filter((entry) => entry.kind === "goal");
  const cards = log.filter((entry) => entry.kind !== "goal");
  const cardsTitle = cards.some((entry) => entry.kind === "sub")
    ? t("match.report.cardsAndSubs")
    : t("match.report.cards");

  const metaLine = [
    formatMatchWeatherDisplay(normalized.seed),
    t("match.report.referee", { name: report.conditions.referee }),
    `${normalized.home.shortName} ${normalized.home.formation}`,
    `${normalized.away.shortName} ${normalized.away.formation}`,
  ].join(" · ");

  return (
    <section className="tc-report" aria-label={t("match.report.aria")}>
      <div className="tc-split tc-report__top">
        <div className="tc-stack">
          <MatchScoreHead
            size="lg"
            kicker={`${t("match.lineup.matchday", { matchday: setup.matchday })} · ${weekdayLabel(weekday)} · ${formatCalendarWeek(week)}`}
            home={normalized.home.name}
            away={normalized.away.name}
            center={`${normalized.finalScore.home} : ${normalized.finalScore.away}`}
            meta={metaLine}
          />
          <section className="tc-panel" aria-label={t("match.report.goals")}>
            <h2 className="tc-label tc-report__label">{t("match.report.goals")}</h2>
            <MatchEventLog
              entries={goals}
              homeShort={normalized.home.shortName}
              awayShort={normalized.away.shortName}
              emptyLabel={t("match.report.noGoals")}
              ariaLabel={t("match.report.goals")}
            />
          </section>
        </div>

        <div className="tc-stack">
          <MatchThreeStars
            stars={threeStars}
            portraitSeedForPlayerId={portraitSeedForPlayerId}
            onSelectPlayer={onSelectPlayer}
          />
          {cards.length > 0 ? (
            <section className="tc-panel" aria-label={cardsTitle}>
              <h2 className="tc-label tc-report__label">{cardsTitle}</h2>
              <MatchEventLog
                entries={cards}
                homeShort={normalized.home.shortName}
                awayShort={normalized.away.shortName}
                emptyLabel=""
                ariaLabel={cardsTitle}
              />
            </section>
          ) : null}
        </div>
      </div>

      <div className="tc-split tc-report__mid">
        <section className="tc-panel" aria-label={t("match.stats.aria")}>
          <h2 className="tc-label tc-report__label">{t("match.report.stats")}</h2>
          <MatchStats view={normalized} stats={lastFrame.stats} ownTeamId={ownTeamId} />
        </section>
        <MatchReportKasse kasse={kasse} />
      </div>

      <section className="tc-panel tc-report__rosters" aria-label={t("match.report.rostersAria")}>
        <div className="tc-tabs" role="tablist" aria-label={t("match.report.rostersAria")}>
          {(["home", "away"] as const).map((side) => {
            const team = side === "home" ? normalized.home : normalized.away;
            return (
              <button
                key={side}
                type="button"
                role="tab"
                className="tc-tab"
                aria-selected={teamTab === side}
                onClick={() => setTeamTab(side)}
              >
                {team.name}
              </button>
            );
          })}
        </div>
        <MatchReportRosterTable
          teamId={activeTeam.id as TeamId}
          teamLabel={activeTeam.name}
          view={normalized}
          playerStats={report.playerStats}
          portraitSeedForPlayerId={portraitSeedForPlayerId}
          onSelectPlayer={onSelectPlayer}
        />
      </section>
    </section>
  );
}

function MatchReportKasse({ kasse }: { kasse?: MatchdayCashBreakdown }) {
  const t = useT();
  if (!kasse) {
    return null;
  }
  return (
    <section className="tc-panel" aria-label={t("match.report.kasse")}>
      <h2 className="tc-label tc-report__label">{t("match.report.kasse")}</h2>
      {kasse.home ? (
        <>
          <dl className="tc-kv">
            <dt>{t("match.report.kasse.tickets")}</dt>
            <dd>{formatClubCash(kasse.tickets)}</dd>
            <dt>{t("match.report.kasse.kiosk")}</dt>
            <dd>{formatClubCash(kasse.kiosk)}</dd>
            <dt>{t("match.report.kasse.beer")}</dt>
            <dd>{formatClubCash(kasse.beer)}</dd>
            <dt className="tc-report__total">{t("match.report.kasse.total")}</dt>
            <dd className="tc-report__total">{formatClubCash(kasse.total)}</dd>
          </dl>
          <p className="tc-caption tc-report__hint">{t("match.report.kasse.hint")}</p>
        </>
      ) : (
        <p className="tc-caption">{t("match.report.kasse.away")}</p>
      )}
    </section>
  );
}

function MatchReportRosterTable({
  teamId,
  teamLabel,
  view,
  playerStats,
  portraitSeedForPlayerId,
  onSelectPlayer,
}: {
  teamId: TeamId;
  teamLabel: string;
  view: MatchView;
  playerStats: readonly PlayerSeasonStat[];
  portraitSeedForPlayerId?: (id: string) => number | undefined;
  onSelectPlayer?: (playerId: string) => void;
}) {
  const t = useT();
  const rows = view.roster
    .filter((entry) => entry.teamId === teamId && entry.starter)
    .slice()
    .sort((a, b) => a.shirt - b.shirt);

  return (
    <div className="tc-table-wrap">
      <table className="tc-table tc-table--compact">
        <caption className="tc-sr">{t("match.report.rosterCaption", { team: teamLabel })}</caption>
        <thead>
          <tr>
            <th scope="col" className="tc-num">
              {t("match.col.shirt")}
            </th>
            <th scope="col">{t("squad.col.name")}</th>
            <th scope="col">{t("squad.col.pos")}</th>
            <th scope="col">{t("match.report.col.events")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const stat = playerStats.find((entry) => entry.playerId === row.id);
            return (
              <tr key={row.id}>
                <td className="tc-num">{row.shirt}</td>
                <td>
                  <span className="tc-namecell">
                    <PlayerPortrait
                      seed={resolvePortraitSeed(row.id, portraitSeedForPlayerId)}
                      clubId={worldCareerClubId(teamId)}
                      size="sm"
                    />
                    {onSelectPlayer ? (
                      <button type="button" className="tc-linkbtn" onClick={() => onSelectPlayer(row.id)}>
                        {row.name}
                      </button>
                    ) : (
                      row.name
                    )}
                  </span>
                </td>
                <td>{row.role}</td>
                <td>
                  <MatchEventBadges stat={stat} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MatchEventBadges({ stat }: { stat?: PlayerSeasonStat }) {
  const t = useT();
  const reds = stat?.redCards ?? 0;
  if (!stat || (stat.goals === 0 && stat.assists === 0 && stat.yellowCards === 0 && reds === 0)) {
    return <span className="tc-caption">—</span>;
  }
  return (
    <span className="tc-report__badges">
      {stat.goals > 0 ? (
        <span className="tc-report__badge" title={t("match.report.badge.goals")}>
          {t("match.report.badge.goalsShort", { count: stat.goals })}
        </span>
      ) : null}
      {stat.assists > 0 ? (
        <span className="tc-report__badge" title={t("match.report.badge.assists")}>
          {t("match.report.badge.assistsShort", { count: stat.assists })}
        </span>
      ) : null}
      {stat.yellowCards > 0 ? (
        <span className="tc-report__badge" title={t("match.log.yellow")}>
          <span className="tc-eventlog__card tc-eventlog__card--yellow" aria-hidden="true" />
          {stat.yellowCards > 1 ? stat.yellowCards : null}
          <span className="tc-sr">{t("match.log.yellow")}</span>
        </span>
      ) : null}
      {reds > 0 ? (
        <span className="tc-report__badge" title={t("match.log.red")}>
          <span className="tc-eventlog__card tc-eventlog__card--red" aria-hidden="true" />
          <span className="tc-sr">{t("match.log.red")}</span>
        </span>
      ) : null}
    </span>
  );
}
