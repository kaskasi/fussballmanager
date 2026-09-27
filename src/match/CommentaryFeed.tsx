import type { MatchViewLine } from "@fussballmanager/shared";

type CommentaryFeedProps = {
  lines: MatchViewLine[];
};

/** Live commentary strip under the pitch — latest line only, ticker style. */
export function CommentaryFeed({ lines }: CommentaryFeedProps) {
  const latest = lines.at(-1);

  return (
    <div className="commentary-ticker" aria-live="polite" aria-label="Live-Kommentar">
      <span className="commentary-ticker-label" aria-hidden="true">📣</span>
      {latest ? (
        <p key={latest.seq} className="commentary-ticker-text">{latest.text}</p>
      ) : (
        <p className="commentary-ticker-text commentary-ticker-placeholder">Anpfiff…</p>
      )}
    </div>
  );
}
