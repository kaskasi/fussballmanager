import { useEffect, useRef } from "react";
import type { MatchViewLine } from "@fussballmanager/shared";

type CommentaryFeedProps = {
  lines: MatchViewLine[];
};

export function CommentaryFeed({ lines }: CommentaryFeedProps) {
  const end = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [lines.length]);

  return (
    <section className="feed" aria-live="polite">
      <h2>Commentary</h2>
      <ol>
        {lines.map((line) => (
          <li key={line.seq}>{line.text}</li>
        ))}
        <li ref={end} className="feed-end" aria-hidden="true" />
      </ol>
    </section>
  );
}
