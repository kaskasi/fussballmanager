/** WIREFRAME: design.md §9 — Treffer-Karte (Split-Layout + Mini-CTAs) */
import { Eye, Star, User } from "lucide-react";
import type { MarketRow } from "../../scouting/market-roster.ts";
import { scoutDisplayName } from "../../scouting/scout-player-assignment.ts";
import { scoutReveal } from "../../scouting/scout-visibility.ts";
import type { ScoutNetworkState } from "../../scouting/scout-network.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";
import { ScoutHitCardGlyphs } from "./ScoutHitCardGlyphs.tsx";
import { useT } from "../../i18n/react.ts";

export function ScoutHitGridCard({
  row,
  season,
  scoutNetwork,
  shortlisted,
  onOpenProfile,
  onAssignScout,
  onToggleShortlist,
}: {
  row: MarketRow;
  season: number;
  scoutNetwork: ScoutNetworkState;
  shortlisted: boolean;
  onOpenProfile: () => void;
  onAssignScout: () => void;
  onToggleShortlist: () => void;
}) {
  const t = useT();
  const reveal = scoutReveal(row.estimate.uncertaintyRange);
  const scoutName = scoutDisplayName(scoutNetwork, row.assignedScoutId);

  return (
    <article className="scout-hit-card">
      <button type="button" className="scout-hit-card-main" onClick={onOpenProfile}>
        <div className="scout-hit-card-top">
          <PlayerPortrait
            seed={row.player.portrait_seed}
            clubId={row.player.club_id}
            size="sm"
            variant={reveal.showExactCa ? "known" : "silhouette"}
            className="scout-hit-card-portrait"
          />
          <div className="scout-hit-card-head">
            <span className="scout-hit-card-name">{row.displayName}</span>
            <span className="scout-hit-card-meta">
              {row.age} · {row.position}
            </span>
            {row.clubName ? <span className="scout-hit-card-club">{row.clubName}</span> : null}
            {row.assigned && scoutName ? (
              <span className="scout-hit-card-scout" title={t("scouting.hits.scoutActive")}>
                {scoutName}
              </span>
            ) : null}
          </div>
        </div>
        <div className="scout-hit-card-bottom">
          <ScoutHitCardGlyphs row={row} season={season} />
        </div>
      </button>
      <div className="scout-hit-card-ctas">
        <button
          type="button"
          className={shortlisted ? "scout-hit-cta is-on" : "scout-hit-cta"}
          aria-pressed={shortlisted}
          aria-label={
            shortlisted ? t("scouting.watchlist.remove") : t("scouting.watchlist.add")
          }
          onClick={(event) => {
            event.stopPropagation();
            onToggleShortlist();
          }}
        >
          <Star size={15} strokeWidth={2.25} fill={shortlisted ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          className={row.assigned ? "scout-hit-cta is-on" : "scout-hit-cta"}
          disabled={row.assigned}
          aria-label={row.assigned ? t("scouting.hits.scoutActive") : t("scouting.hits.scoutCta")}
          onClick={(event) => {
            event.stopPropagation();
            onAssignScout();
          }}
        >
          <Eye size={15} strokeWidth={2.25} />
        </button>
        <button
          type="button"
          className="scout-hit-cta"
          aria-label={t("scouting.hits.profileCta")}
          onClick={(event) => {
            event.stopPropagation();
            onOpenProfile();
          }}
        >
          <User size={15} strokeWidth={2.25} />
        </button>
      </div>
    </article>
  );
}
