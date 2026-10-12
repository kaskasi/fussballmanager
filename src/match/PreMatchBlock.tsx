/** WIREFRAME: PRD 14.10 — pre-match facts + one color-commentary line before kickoff log. */
import { useT } from "../i18n/react.ts";
import type { PreMatchBrief } from "./pre-match-brief.ts";

export function PreMatchBlock({ brief }: { brief: PreMatchBrief }) {
  const t = useT();
  const venue = brief.isHome ? t("match.career.side.home") : t("match.career.side.away");
  const opponentFormation = brief.opponentFormation ?? "—";

  return (
    <section className="pre-match-block" aria-label={t("match.preMatch.aria")}>
      <p className="pre-match-kicker">
        {t("match.lineup.matchday", { matchday: brief.matchday })}
        <span className="pre-match-kicker-sep" aria-hidden="true">
          {" "}
          ·{" "}
        </span>
        {t("match.preMatch.venueVs", { venue, opponent: brief.opponentShortName })}
      </p>
      <div className="pre-match-formations">
        <span className="pre-match-club">{brief.playerClubShortName}</span>
        <span className="pre-match-formation" title={t("match.preMatch.ownFormationTitle")}>
          {brief.playerFormation}
        </span>
        <span className="pre-match-vs" aria-hidden="true">
          vs
        </span>
        <span className="pre-match-formation" title={t("match.preMatch.opponentFormationTitle")}>
          {opponentFormation}
        </span>
        <span className="pre-match-club pre-match-club--away">{brief.opponentShortName}</span>
      </div>
      <blockquote className="pre-match-color">
        <span className="pre-match-color-label">{t("match.commentary.expert")}</span>
        <p>{brief.colorLine}</p>
      </blockquote>
    </section>
  );
}
