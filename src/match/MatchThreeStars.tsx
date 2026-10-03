import type { MatchStarPick } from "./match-three-stars.ts";
import { threeStarsDisplayOrder } from "./match-three-stars.ts";

export function MatchThreeStars({ stars }: { stars: readonly MatchStarPick[] }) {
  if (stars.length === 0) {
    return null;
  }

  const ordered = threeStarsDisplayOrder(stars);

  return (
    <section className="match-report-stars" aria-label="Drei Sterne des Spiels">
      <h2 className="match-report-stars-title">⭐ Drei Sterne des Spiels</h2>
      <ol className="match-report-stars-row">
        {ordered.map((star) => (
          <li
            key={star.playerId}
            className={[
              "match-report-star",
              star.rank === 1 ? "is-first" : "",
              `is-rank-${star.rank}`,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="match-report-star-rank" aria-hidden="true">
              {star.rank}
            </span>
            <span className="match-report-star-shirt" aria-hidden="true">
              {star.shirt > 0 ? star.shirt : "·"}
            </span>
            <strong className="match-report-star-name">{star.name}</strong>
            <span className="match-report-star-meta">
              {star.teamShortName} · {star.role}
            </span>
            <span className="match-report-star-line">{star.line}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
