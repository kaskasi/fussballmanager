import type { CareerMatchSetup } from "../../sim/career-match-setup.ts";

const ART = {
  home: {
    left: "/assets/matchday/home-left.png",
    label: "Heimspiel",
    hint: "Tunnel · Rasen · Flutlicht",
  },
  away: {
    left: "/assets/matchday/away-left.png",
    label: "Auswärtsspiel",
    hint: "Abend · Tribüne · Auswärts",
  },
} as const;

/**
 * WIREFRAME: pre-match lineup mood — cached img2img strip, not full-screen.
 */
export function MatchdayLineupAmbience({
  setup,
}: {
  setup: Pick<CareerMatchSetup, "isHome" | "opponentShortName" | "matchday">;
}) {
  const kind = setup.isHome ? "home" : "away";
  const art = ART[kind];

  return (
    <section
      className={`matchday-lineup-ambience matchday-lineup-ambience--${kind}`}
      aria-label={`Spieltag ${setup.matchday}`}
    >
      <img src={art.left} alt="" className="matchday-lineup-art matchday-lineup-art--left" />
      <img src={art.left} alt="" className="matchday-lineup-art matchday-lineup-art--right" />
      <div className="matchday-lineup-hero">
        <p className="matchday-lineup-kicker">
          <span className="matchday-lineup-dot" aria-hidden="true">●</span>
          Spieltag {setup.matchday}
        </p>
        <h2 className="matchday-lineup-title">
          {setup.isHome ? "Heim" : "Auswärts"} vs {setup.opponentShortName}
        </h2>
        <p className="matchday-lineup-mood">
          {art.label}
          <span className="matchday-lineup-mood-hint"> · {art.hint}</span>
        </p>
      </div>
    </section>
  );
}
