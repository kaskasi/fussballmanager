import { Star } from "lucide-react";
import type { MatchStarPick } from "./match-three-stars.ts";
import { PlayerPortrait } from "../ui/components/PlayerPortrait.tsx";

export function MatchThreeStars({
  stars,
  onSelectPlayer,
}: {
  stars: readonly MatchStarPick[];
  onSelectPlayer?: (playerId: string) => void;
}) {
  if (stars.length === 0) {
    return null;
  }

  const ordered = [...stars].sort((a, b) => a.rank - b.rank);

  return (
    <section className="match-report-stars" aria-label="Drei Sterne des Spiels">
      <h2 className="match-report-stars-title">
        <Star size={18} strokeWidth={2.5} aria-hidden />
        Drei Sterne
      </h2>
      <ol className="match-report-stars-col">
        {ordered.map((star) => {
          const body = (
            <>
              <span className="match-report-star-rank" aria-hidden="true">
                {star.rank}
              </span>
              <PlayerPortrait seed={portraitSeedFromId(star.playerId)} size="sm" />
              <div className="match-report-star-body">
                <strong className="match-report-star-name">{star.name}</strong>
                <span className="match-report-star-meta">
                  {star.teamShortName} · {star.role}
                </span>
                <span className="match-report-star-line">{star.line}</span>
              </div>
            </>
          );
          return (
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
              {onSelectPlayer ? (
                <button type="button" className="match-report-star-btn" onClick={() => onSelectPlayer(star.playerId)}>
                  {body}
                </button>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function portraitSeedFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 9999) + 1;
}
