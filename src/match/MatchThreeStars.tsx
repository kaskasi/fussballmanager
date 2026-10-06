import type { MatchStarPick } from "./match-three-stars.ts";
import { PlayerPortrait } from "../ui/components/PlayerPortrait.tsx";
import { resolvePortraitSeed } from "../ui/portraits/portrait-seed-fallback.ts";

export function MatchThreeStars({
  stars,
  portraitSeedForPlayerId,
  onSelectPlayer,
}: {
  stars: readonly MatchStarPick[];
  portraitSeedForPlayerId?: (id: string) => number | undefined;
  onSelectPlayer?: (playerId: string) => void;
}) {
  if (stars.length === 0) {
    return null;
  }

  const ordered = [...stars].sort((a, b) => a.rank - b.rank);

  return (
    <section className="match-report-stars" aria-label="Drei Sterne des Spiels">
      <p className="match-report-inline-label match-report-stars-label">Drei Sterne</p>
      <ol className="match-report-stars-col">
        {ordered.map((star) => {
          const body = (
            <>
              <span className="match-report-star-rank" aria-hidden="true">
                {star.rank}
              </span>
              <PlayerPortrait
                seed={resolvePortraitSeed(star.playerId, portraitSeedForPlayerId)}
                size="sm"
              />
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
                <div className="match-report-star-btn">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

