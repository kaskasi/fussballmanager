/** WIREFRAME: docs/prd/design.md §9.14 — Spiel Zusammenfassung */
import { useState } from "react";
import { Beer, CircleDot, Shirt, Square, Ticket, Utensils, Star } from "lucide-react";
import type { MatchView, PlayerSeasonStat, TeamId } from "@fussballmanager/shared";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { formatCalendarWeek } from "../sim/game-calendar.ts";
import { weekdayLabel } from "../sim/day-calendar.ts";
import { formatClubCash } from "../economy/club-finances.ts";
import type { MatchdayCashBreakdown } from "../stadium/matchday-commerce.ts";
import { MatchStats } from "./MatchStats.tsx";
import { MatchThreeStars } from "./MatchThreeStars.tsx";
import { pickMatchThreeStars } from "./match-three-stars.ts";
import { normalizeMatchView } from "./normalize-match-view.ts";
import { MatchGoalTimeline } from "./MatchGoalTimeline.tsx";
import { PlayerPortrait } from "../ui/components/PlayerPortrait.tsx";

export function MatchReportScreen({
  view,
  setup,
  week,
  weekday,
  kasse,
  onSelectPlayer,
}: {
  view: MatchView;
  setup: CareerMatchSetup;
  week: number;
  weekday: number;
  kasse?: MatchdayCashBreakdown;
  onSelectPlayer?: (playerId: string) => void;
}) {
  const normalized = normalizeMatchView(view);
  const lastFrame = normalized.frames[normalized.frames.length - 1] ?? normalized.kickoff;
  const stats = lastFrame.stats;
  const report = normalized.report;
  const threeStars = pickMatchThreeStars(normalized, report.playerStats);
  const [teamTab, setTeamTab] = useState<"home" | "away">("home");
  const activeTeamId = (teamTab === "home" ? normalized.home.id : normalized.away.id) as TeamId;
  const activeTeamLabel = teamTab === "home" ? normalized.home.shortName : normalized.away.shortName;

  return (
    <section className="match-report game-panel" aria-label="Spielbericht">
      <p className="match-report-kicker eyebrow">
        Spieltag {setup.matchday} · {weekdayLabel(weekday)} · {formatCalendarWeek(week)}
      </p>

      <div className="match-report-hero-grid">
        <div className="match-report-hero">
          <h1 className="match-report-scoreline">
            <span>{normalized.home.shortName}</span>
            <strong>
              {normalized.finalScore.home} : {normalized.finalScore.away}
            </strong>
            <span>{normalized.away.shortName}</span>
          </h1>
          <p className="match-report-atmosphere">
            {report.conditions.weather} · Schiri: {report.conditions.referee}
          </p>
          <p className="match-report-formations">
            <span className="match-formation-chip">{normalized.home.shortName} {normalized.home.formation}</span>
            <span className="match-formation-chip">{normalized.away.shortName} {normalized.away.formation}</span>
          </p>
          <div className="match-report-timeline-box game-panel-inner">
            <h2 className="match-report-section-title">Tor-Zeitstrahl</h2>
            <MatchGoalTimeline goals={report.goals} homeTeamId={normalized.home.id as TeamId} />
          </div>
        </div>

        <div className="match-report-hero-aside">
          <MatchThreeStars stars={threeStars} onSelectPlayer={onSelectPlayer} />
          {report.cards.length > 0 ? (
            <section className="match-report-cards-box game-panel-inner" aria-label="Karten">
              <h2 className="match-report-section-title">Karten</h2>
              <ul className="match-card-list">
                {report.cards.map((card, index) => (
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
            </section>
          ) : null}
        </div>
      </div>

      <div className="match-report-stats-row">
        <section className="match-report-stats-main" aria-label="Statistik">
          <h2 className="match-report-section-title">Statistik</h2>
          <MatchStats view={normalized} stats={stats} compact />
        </section>
        {kasse?.home ? (
          <section className="match-report-kasse-widget" aria-label="Kasse">
            <h2 className="match-report-section-title">Kasse</h2>
            <ul>
              <li>
                <Ticket size={14} strokeWidth={2.5} aria-hidden />
                <span>Eintritt</span>
                <strong>{formatClubCash(kasse.tickets)}</strong>
              </li>
              <li>
                <Utensils size={14} strokeWidth={2.5} aria-hidden />
                <span>Wurst</span>
                <strong>{formatClubCash(kasse.kiosk)}</strong>
              </li>
              <li>
                <Beer size={14} strokeWidth={2.5} aria-hidden />
                <span>Bier</span>
                <strong>{formatClubCash(kasse.beer)}</strong>
              </li>
              <li>
                <Shirt size={14} strokeWidth={2.5} aria-hidden />
                <span>Shop</span>
                <strong>{formatClubCash(kasse.shop)}</strong>
              </li>
              <li className="match-report-kasse-total">
                <CircleDot size={14} strokeWidth={2.5} aria-hidden />
                <span>Summe</span>
                <strong>{formatClubCash(kasse.total)}</strong>
              </li>
            </ul>
            <p className="match-report-kasse-hint">Details im Finanz-Screen.</p>
          </section>
        ) : kasse && !kasse.home ? (
          <p className="match-report-kasse-away">Imbiss läuft über die Woche in Finanzen.</p>
        ) : null}
      </div>

      <section className="match-report-roster" aria-label="Spielerlisten">
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
          onSelectPlayer={onSelectPlayer}
        />
      </section>
    </section>
  );
}

function MatchReportRosterTable({
  teamId,
  teamLabel,
  view,
  playerStats,
  onSelectPlayer,
}: {
  teamId: TeamId;
  teamLabel: string;
  view: MatchView;
  playerStats: readonly PlayerSeasonStat[];
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
                    <PlayerPortrait seed={portraitSeedFromId(row.id)} size="sm" />
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

function portraitSeedFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 9999) + 1;
}
