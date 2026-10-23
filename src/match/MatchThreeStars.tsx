/** design.md §9.14 — Drei Sterne, vertikal gestapelt; der 1. Stern als Reward-Moment. Klick → Profil. */
import { Star } from "lucide-react";
import type { MatchStarPick } from "./match-three-stars.ts";
import { useT } from "../i18n/react.ts";
import { PlayerPortrait } from "../ui/components/PlayerPortrait.tsx";
import { resolvePortraitSeed } from "../ui/portraits/portrait-seed-fallback.ts";
import { worldCareerClubId } from "../world/world-generator.ts";

function useStarLine() {
  const t = useT();
  return (star: MatchStarPick): string => {
    const parts: string[] = [];
    if (star.goals > 0) {
      parts.push(
        t(star.goals > 1 ? "match.report.star.goals.many" : "match.report.star.goals.one", { count: star.goals }),
      );
    }
    if (star.assists > 0) {
      parts.push(
        t(star.assists > 1 ? "match.report.star.assists.many" : "match.report.star.assists.one", {
          count: star.assists,
        }),
      );
    }
    if (parts.length > 0) return parts.join(" · ");
    return star.yellowCards > 0 ? t("match.report.star.solid") : t("match.report.star.strong");
  };
}

export function MatchThreeStars({
  stars,
  portraitSeedForPlayerId,
  onSelectPlayer,
}: {
  stars: readonly MatchStarPick[];
  portraitSeedForPlayerId?: (id: string) => number | undefined;
  onSelectPlayer?: (playerId: string) => void;
}) {
  const t = useT();
  const starLine = useStarLine();
  if (stars.length === 0) {
    return null;
  }

  const ordered = [...stars].sort((a, b) => a.rank - b.rank);

  return (
    <section className="tc-panel" aria-label={t("match.report.starsAria")}>
      <h2 className="tc-label tc-report__label">{t("match.report.stars")}</h2>
      <ol className="tc-stars">
        {ordered.map((star) => {
          const body = (
            <>
              <span className="tc-stars__rank">
                <Star className="tc-icon" strokeWidth={2.25} aria-hidden />
                <span>{star.rank}</span>
              </span>
              <PlayerPortrait
                seed={resolvePortraitSeed(star.playerId, portraitSeedForPlayerId)}
                clubId={worldCareerClubId(star.teamId)}
                size="sm"
              />
              <span className="tc-stars__body">
                <strong className="tc-stars__name">{star.name}</strong>
                <span className="tc-stars__meta">
                  {star.teamShortName} · {star.role}
                </span>
                <span className="tc-stars__line">{starLine(star)}</span>
              </span>
            </>
          );
          return (
            <li key={star.playerId} className={`tc-stars__item${star.rank === 1 ? " tc-stars__item--first" : ""}`}>
              {onSelectPlayer ? (
                <button type="button" className="tc-stars__card" onClick={() => onSelectPlayer(star.playerId)}>
                  {body}
                </button>
              ) : (
                <div className="tc-stars__card">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
