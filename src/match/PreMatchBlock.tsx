/** WIREFRAME: PRD 14.10 — pre-match facts + one color-commentary line before kickoff log. */
import type { PreMatchBrief } from "./pre-match-brief.ts";

export function PreMatchBlock({ brief }: { brief: PreMatchBrief }) {
  const venue = brief.isHome ? "Heim" : "Auswärts";
  const opponentFormation = brief.opponentFormation ?? "—";

  return (
    <section className="pre-match-block" aria-label="Vor dem Anpfiff">
      <p className="pre-match-kicker">
        Spieltag {brief.matchday}
        <span className="pre-match-kicker-sep" aria-hidden="true"> · </span>
        {venue} vs {brief.opponentShortName}
      </p>
      <div className="pre-match-formations">
        <span className="pre-match-club">{brief.playerClubShortName}</span>
        <span className="pre-match-formation" title="Eigene Formation">
          {brief.playerFormation}
        </span>
        <span className="pre-match-vs" aria-hidden="true">vs</span>
        <span className="pre-match-formation" title="Gegnerische Formation">
          {opponentFormation}
        </span>
        <span className="pre-match-club pre-match-club--away">{brief.opponentShortName}</span>
      </div>
      <blockquote className="pre-match-color">
        <span className="pre-match-color-label">Experte</span>
        <p>{brief.colorLine}</p>
      </blockquote>
    </section>
  );
}
