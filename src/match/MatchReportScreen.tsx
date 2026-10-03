/** WIREFRAME: PRD 16 — Spielbericht nach Abpfiff */
import type { MatchView } from "@fussballmanager/shared";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { formatCalendarWeek } from "../sim/game-calendar.ts";
import { weekdayLabel } from "../sim/day-calendar.ts";
import { MatchStats } from "./MatchStats.tsx";
import { MatchThreeStars } from "./MatchThreeStars.tsx";
import { pickMatchThreeStars } from "./match-three-stars.ts";
import { normalizeMatchView } from "./normalize-match-view.ts";

export function MatchReportScreen({
  view,
  setup,
  week,
  weekday,
}: {
  view: MatchView;
  setup: CareerMatchSetup;
  week: number;
  weekday: number;
}) {
  const normalized = normalizeMatchView(view);
  const lastFrame = normalized.frames[normalized.frames.length - 1] ?? normalized.kickoff;
  const stats = lastFrame.stats;
  const report = normalized.report;
  const homeStarters = normalized.roster.filter(
    (row) => row.teamId === normalized.home.id && row.starter,
  );
  const awayStarters = normalized.roster.filter(
    (row) => row.teamId === normalized.away.id && row.starter,
  );

  const threeStars = pickMatchThreeStars(normalized, report.playerStats);

  return (
    <section className="match-report" aria-label="Spielbericht">
      <header className="match-report-head">
        <p className="eyebrow">
          Spieltag {setup.matchday} · {weekdayLabel(weekday)} · {formatCalendarWeek(week)}
        </p>
        <h1 className="match-report-score">
          <span>{normalized.home.shortName}</span>
          <strong>{normalized.finalScore.home} : {normalized.finalScore.away}</strong>
          <span>{normalized.away.shortName}</span>
        </h1>
        <p className="match-report-meta">
          <span>🧑‍⚖️ {report.conditions.referee}</span>
          <span>🌤️ {report.conditions.weather}</span>
          <span>{normalized.home.formation} vs {normalized.away.formation}</span>
        </p>
      </header>

      <MatchThreeStars stars={threeStars} />

      <div className="match-report-grid">
        <section className="match-report-panel" aria-label="Tore">
          <h2>⚽ Tore</h2>
          {report.goals.length === 0 ? (
            <p className="match-report-empty">Torloses Spiel.</p>
          ) : (
            <ul className="match-report-events">
              {report.goals.map((goal, index) => (
                <li key={`${goal.minuteLabel}-${index}`}>
                  <span className="match-report-minute">{goal.minuteLabel}</span>
                  <span>
                    <strong>{goal.scorerName}</strong>
                    {goal.assistName ? ` · 🅰️ ${goal.assistName}` : ""}
                    <span className="match-report-team">
                      {goal.teamId === normalized.home.id
                        ? normalized.home.shortName
                        : normalized.away.shortName}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="match-report-panel" aria-label="Karten">
          <h2>🟨 Karten</h2>
          {report.cards.length === 0 ? (
            <p className="match-report-empty">Keine Karten.</p>
          ) : (
            <ul className="match-report-events">
              {report.cards.map((card, index) => (
                <li key={`${card.minuteLabel}-${card.playerName}-${index}`}>
                  <span className="match-report-minute">{card.minuteLabel}</span>
                  <span>
                    {card.color === "red" ? "🟥" : "🟨"} <strong>{card.playerName}</strong>
                    <span className="match-report-team">
                      {card.teamId === normalized.home.id
                        ? normalized.home.shortName
                        : normalized.away.shortName}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="match-report-panel match-report-panel--wide" aria-label="Teamstatistik">
          <h2>📊 Statistik</h2>
          <MatchStats view={normalized} stats={stats} compact />
        </section>

        <section className="match-report-panel" aria-label="Aufstellung Heim">
          <h2>👕 {normalized.home.shortName}</h2>
          <ol className="match-report-lineup">
            {homeStarters.map((player) => (
              <li key={player.id}>
                <span className="match-report-shirt">{player.shirt}</span>
                {player.name}
                <span className="match-report-role">{player.role}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="match-report-panel" aria-label="Aufstellung Auswärts">
          <h2>👕 {normalized.away.shortName}</h2>
          <ol className="match-report-lineup">
            {awayStarters.map((player) => (
              <li key={player.id}>
                <span className="match-report-shirt">{player.shirt}</span>
                {player.name}
                <span className="match-report-role">{player.role}</span>
              </li>
            ))}
          </ol>
        </section>

      </div>
    </section>
  );
}
