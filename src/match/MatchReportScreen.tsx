/** WIREFRAME: docs/prd/design.md §9.14 — Spiel Zusammenfassung */
import { useState } from "react";
import { Square, Star } from "lucide-react";
import type { MatchReportCard, MatchView, PlayerSeasonStat, TeamId } from "@fussballmanager/shared";
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
import { MatchGoalTimeline } from "./MatchGoalTimeline.tsx";
import { PlayerPortrait } from "../ui/components/PlayerPortrait.tsx";
import { resolvePortraitSeed } from "../ui/portraits/portrait-seed-fallback.ts";
import { worldCareerClubId } from "../world/world-generator.ts";
export function MatchReportScreen({
  view,
  setup,
  week,
  weekday,
  kasse,
  stadiumPhotoUrl,
  portraitSeedForPlayerId,
  onSelectPlayer,
}: {
  view: MatchView;
  setup: CareerMatchSetup;
  week: number;
  weekday: number;
  kasse?: MatchdayCashBreakdown;
  stadiumPhotoUrl?: string;
  portraitSeedForPlayerId?: (id: string) => number | undefined;
  onSelectPlayer?: (playerId: string) => void;
}) {
  const t = useT();
  const normalized = normalizeMatchView(view);
  const lastFrame = normalized.frames[normalized.frames.length - 1] ?? normalized.kickoff;
  const stats = lastFrame.stats;
  const report = normalized.report;
  const threeStars = pickMatchThreeStars(normalized, report.playerStats);
  const [teamTab, setTeamTab] = useState<"home" | "away">("home");
  const activeTeamId = (teamTab === "home" ? normalized.home.id : normalized.away.id) as TeamId;
  const activeTeamLabel = teamTab === "home" ? normalized.home.shortName : normalized.away.shortName;

  const metaLine = [
    formatMatchWeatherDisplay(normalized.seed),
    t("match.report.referee", { name: report.conditions.referee }),
    `${normalized.home.shortName} ${normalized.home.formation}`,
    `${normalized.away.shortName} ${normalized.away.formation}`,
  ].join(" · ");

  return (
    <section className="match-report game-panel match-report--compact" aria-label="Spielbericht">
      <p className="match-report-kicker eyebrow">
        Spieltag {setup.matchday} · {weekdayLabel(weekday)} · {formatCalendarWeek(week)}
      </p>

      <h1 className="match-report-scoreline">
        <span>{normalized.home.shortName}</span>
        <strong>
          {normalized.finalScore.home} : {normalized.finalScore.away}
        </strong>
        <span>{normalized.away.shortName}</span>
      </h1>

      <div className="match-report-body-grid">
        <div className="match-report-main">
          <p className="match-report-meta-line">{metaLine}</p>

          <section className="match-report-stats-block" aria-label="Statistik">
            <p className="match-report-inline-label">Statistik</p>
            <MatchStats view={normalized} stats={stats} compact />
          </section>

          <div className="match-report-events-row">
            <section className="match-report-goals-col" aria-label="Tore">
              <p className="match-report-inline-label">Tore</p>
              <MatchGoalTimeline goals={report.goals} homeTeamId={normalized.home.id as TeamId} />
            </section>
            <MatchReportCardsColumn cards={report.cards} />
          </div>

          <MatchThreeStars
            stars={threeStars}
            portraitSeedForPlayerId={portraitSeedForPlayerId}
            onSelectPlayer={onSelectPlayer}
          />

          <details className="match-report-roster-details">
            <summary>Kader anzeigen</summary>
            <div className="match-report-roster" aria-label="Spielerlisten">
              <div className="match-report-roster-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={teamTab === "home"}
                  className={teamTab === "home" ? "is-active" : undefined}
                  onClick={() => setTeamTab("home")}
                >
                  {normalized.home.shortName}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={teamTab === "away"}
                  className={teamTab === "away" ? "is-active" : undefined}
                  onClick={() => setTeamTab("away")}
                >
                  {normalized.away.shortName}
                </button>
              </div>
              <MatchReportRosterTable
                teamId={activeTeamId}
                teamLabel={activeTeamLabel}
                view={normalized}
                playerStats={report.playerStats}
                portraitSeedForPlayerId={portraitSeedForPlayerId}
                onSelectPlayer={onSelectPlayer}
              />
            </div>
          </details>
        </div>

        <aside className="match-report-aside" aria-label="Spieltag">
          <MatchReportKasseCompact kasse={kasse} />
          {stadiumPhotoUrl ? (
            <figure className="match-report-ambience">
              <img
                src={stadiumPhotoUrl}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </figure>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function MatchReportCardsColumn({ cards }: { cards: readonly MatchReportCard[] }) {
  return (
    <section className="match-report-cards-col" aria-label="Karten">
      <p className="match-report-inline-label">Karten</p>
      {cards.length === 0 ? (
        <p className="match-report-cards-empty">Keine Karten.</p>
      ) : (
        <ul className="match-card-list">
          {cards.map((card, index) => (
            <li key={`${card.minuteLabel}-${card.playerName}-${index}`}>
              <span className="match-goal-minute">{card.minuteLabel}</span>
              {card.color === "red" ? (
                <Square size={14} strokeWidth={2.5} className="match-card-icon is-red" aria-hidden />
              ) : (
                <Square size={14} strokeWidth={2.5} className="match-card-icon is-yellow" aria-hidden />
              )}
              <strong>{card.playerName}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MatchReportKasseCompact({ kasse }: { kasse?: MatchdayCashBreakdown }) {
  if (!kasse) {
    return null;
  }
  if (!kasse.home) {
    return (
      <p className="match-report-kasse-away match-report-kasse-compact">
        Imbiss läuft über die Woche in Finanzen.
      </p>
    );
  }
  const line = [
    `Eintritt ${formatClubCash(kasse.tickets)}`,
    `Wurst ${formatClubCash(kasse.kiosk)}`,
    `Bier ${formatClubCash(kasse.beer)}`,
    "Merch → Menü",
    `Summe ${formatClubCash(kasse.total)}`,
  ].join(" · ");
  return (
    <section className="match-report-kasse-compact" aria-label="Kasse">
      <p className="match-report-inline-label">Kasse</p>
      <p className="match-report-kasse-oneline">{line}</p>
      <p className="match-report-kasse-hint">Details im Finanz-Screen.</p>
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
  const rows = view.roster
    .filter((entry) => entry.teamId === teamId && entry.starter)
    .slice()
    .sort((a, b) => a.shirt - b.shirt);

  return (
    <table className="match-report-roster-table">
      <caption className="sr-only">{teamLabel} — Startelf</caption>
      <thead>
        <tr>
          <th scope="col">Nr</th>
          <th scope="col">Name</th>
          <th scope="col">Pos</th>
          <th scope="col">Ereignisse</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const stat = playerStats.find((entry) => entry.playerId === row.id);
          return (
            <tr key={row.id}>
              <td>{row.shirt}</td>
              <td>
                {onSelectPlayer ? (
                  <button type="button" className="match-roster-name-btn" onClick={() => onSelectPlayer(row.id)}>
                    <PlayerPortrait
                      seed={resolvePortraitSeed(row.id, portraitSeedForPlayerId)}
                      clubId={worldCareerClubId(teamId)}
                      size="sm"
                    />
                    {row.name}
                  </button>
                ) : (
                  row.name
                )}
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
  );
}

function MatchEventBadges({ stat }: { stat?: PlayerSeasonStat }) {
  if (!stat || (stat.goals === 0 && stat.assists === 0 && stat.yellowCards === 0)) {
    return <span className="match-event-badge is-muted">—</span>;
  }
  return (
    <span className="match-event-badges">
      {stat.goals > 0 ? (
        <span className="match-event-badge" title="Tore">
          <Star size={12} strokeWidth={2.5} aria-hidden /> {stat.goals}
        </span>
      ) : null}
      {stat.assists > 0 ? (
        <span className="match-event-badge" title="Vorlagen">
          A {stat.assists}
        </span>
      ) : null}
      {stat.yellowCards > 0 ? (
        <span className="match-event-badge is-card" title="Gelbe Karten">
          K {stat.yellowCards}
        </span>
      ) : null}
    </span>
  );
}

