import type { CareerMatchSetup } from "../../sim/career-match-setup.ts";
import type { FanbaseMood } from "../../stadium/fanbase.ts";
import { matchAmbiencePhotoUrl } from "../assets/mood-photos.ts";
import { MoodPhotoBand } from "./MoodPhotoBand.tsx";

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

/** WIREFRAME: PRD 14.10 — pre-match lineup mood (PD photo + gradient fallback). */
export function MatchdayLineupAmbience({
  setup,
  homeStadiumCapacity = 8_000,
  fanbaseMood = "steady",
  poorForm = false,
}: {
  setup: Pick<CareerMatchSetup, "isHome" | "opponentShortName" | "matchday">;
  homeStadiumCapacity?: number;
  fanbaseMood?: FanbaseMood;
  poorForm?: boolean;
}) {
  const kind = setup.isHome ? "home" : "away";
  const mood = MOOD[kind];
  const photo = matchAmbiencePhotoUrl({
    isHome: setup.isHome,
    homeCapacity: homeStadiumCapacity,
    fanbaseMood,
    poorForm,
  });

  return (
    <MoodPhotoBand
      src={photo}
      className={`matchday-lineup-ambience matchday-lineup-ambience--${kind}`}
    >
      <section aria-label={`Spieltag ${setup.matchday}`}>
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
    </MoodPhotoBand>
  );
}
