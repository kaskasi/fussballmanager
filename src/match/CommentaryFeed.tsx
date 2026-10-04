import type { MatchViewLine } from "@fussballmanager/shared";
import { useT } from "../i18n/react.ts";
import { latestPlayByPlayAndColor } from "./match-commentary-lines.ts";
import { localizeMatchLine } from "./localize-match-line.ts";

type CommentaryFeedProps = {
  lines: MatchViewLine[];
};

/** Live commentary under the pitch — PBP always; analyst color line when revealed. */
export function CommentaryFeed({ lines }: CommentaryFeedProps) {
  const t = useT();
  const { latestPbp, latestColor } = latestPlayByPlayAndColor(lines);

  return (
    <div className="commentary-ticker" aria-live="polite" aria-label={t("match.commentary.label")}>
      <span className="commentary-ticker-label" aria-hidden="true">📣</span>
      <div className="commentary-ticker-body">
        {latestPbp ? (
          <p key={`pbp-${latestPbp.seq}`} className="commentary-ticker-text">
            {localizeMatchLine(latestPbp)}
          </p>
        ) : (
          <p className="commentary-ticker-text commentary-ticker-placeholder">
            {t("match.commentary.kickoff")}
          </p>
        )}
        {latestColor ? (
          <p
            key={`color-${latestColor.seq}`}
            className="commentary-ticker-color"
          >
            <span className="commentary-ticker-color-label">{t("match.commentary.expert")}</span>
            {localizeMatchLine(latestColor)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
