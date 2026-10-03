import type { MatchViewLine } from "@fussballmanager/shared";
import { latestPlayByPlayAndColor } from "./match-commentary-lines.ts";

type CommentaryFeedProps = {
  lines: MatchViewLine[];
};

/** Live commentary under the pitch — PBP always; analyst color line when revealed. */
export function CommentaryFeed({ lines }: CommentaryFeedProps) {
  const { latestPbp, latestColor } = latestPlayByPlayAndColor(lines);

  return (
    <div className="commentary-ticker" aria-live="polite" aria-label="Live-Kommentar">
      <span className="commentary-ticker-label" aria-hidden="true">📣</span>
      <div className="commentary-ticker-body">
        {latestPbp ? (
          <p key={`pbp-${latestPbp.seq}`} className="commentary-ticker-text">
            {latestPbp.text}
          </p>
        ) : (
          <p className="commentary-ticker-text commentary-ticker-placeholder">Anpfiff…</p>
        )}
        {latestColor ? (
          <p
            key={`color-${latestColor.seq}`}
            className="commentary-ticker-color"
          >
            <span className="commentary-ticker-color-label">Experte</span>
            {latestColor.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
