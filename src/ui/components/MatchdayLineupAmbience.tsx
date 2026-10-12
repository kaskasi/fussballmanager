import type { CareerMatchSetup } from "../../sim/career-match-setup.ts";
import type { FanbaseMood } from "../../stadium/fanbase.ts";
import { useT } from "../../i18n/react.ts";
import { matchAmbiencePhotoUrl } from "../assets/mood-photos.ts";
import { MoodPhotoBand } from "./MoodPhotoBand.tsx";

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
  const t = useT();
  const kind = setup.isHome ? "home" : "away";
  const photo = matchAmbiencePhotoUrl({
    isHome: setup.isHome,
    homeCapacity: homeStadiumCapacity,
    fanbaseMood,
    poorForm,
  });

  const sideLabel = setup.isHome ? t("match.career.side.home") : t("match.career.side.away");

  return (
    <MoodPhotoBand
      src={photo}
      className={`matchday-lineup-ambience matchday-lineup-ambience--${kind}`}
    >
      <section aria-label={t("match.ambience.matchdaySection", { matchday: setup.matchday })}>
        <div className="matchday-lineup-hero">
          <p className="matchday-lineup-kicker">
            <span className="matchday-lineup-dot" aria-hidden="true">
              ●
            </span>
            {t("match.lineup.matchday", { matchday: setup.matchday })}
          </p>
          <h2 className="matchday-lineup-title">
            {t("match.ambience.vsTitle", { side: sideLabel, opponent: setup.opponentShortName })}
          </h2>
          <p className="matchday-lineup-mood">
            {t(`match.ambience.${kind}.label`)}
            <span className="matchday-lineup-mood-hint"> · {t(`match.ambience.${kind}.hint`)}</span>
          </p>
        </div>
      </section>
    </MoodPhotoBand>
  );
}
