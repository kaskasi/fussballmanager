import type { CareerMatchSetup } from "../../sim/career-match-setup.ts";

const MOOD = {
  home: {
    label: "Heimspiel",
    hint: "Tunnel · Rasen · Flutlicht",
  },
  away: {
    label: "Auswärtsspiel",
    hint: "Abend · Tribüne · Auswärts",
  },
} as const;

/** WIREFRAME: pre-match lineup mood — CSS gradient + text, no raster art. */
export function MatchdayLineupAmbience({
  setup,
}: {
  setup: Pick<CareerMatchSetup, "isHome" | "opponentShortName" | "matchday">;
}) {
  const kind = setup.isHome ? "home" : "away";
  const mood = MOOD[kind];

  return (
    <section
      className={`matchday-lineup-ambience matchday-lineup-ambience--${kind}`}
      aria-label={`Spieltag ${setup.matchday}`}
    >
      <div className="matchday-lineup-hero">
        <p className="matchday-lineup-kicker">
          <span className="matchday-lineup-dot" aria-hidden="true">●</span>
          Spieltag {setup.matchday}
        </p>
        <h2 className="matchday-lineup-title">
          {setup.isHome ? "Heim" : "Auswärts"} vs {setup.opponentShortName}
        </h2>
        <p className="matchday-lineup-mood">
          {mood.label}
          <span className="matchday-lineup-mood-hint"> · {mood.hint}</span>
        </p>
      </div>
    </section>
  );
}
