/** WIREFRAME: design.md §9.6 B — Transfermarkt-Karte (Scout-Hit-Layout) */
import { Eye, Star, User } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import { useT } from "../../i18n/react.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";

export type TransferMarketCardKind =
  | "rival_listing"
  | "own_listing"
  | "purchase_talk"
  | "sale_talk"
  | "inbound_offer";

export function TransferMarketGridCard({
  player,
  playerId,
  kind,
  clubLabel,
  priceLabel,
  detailLine,
  ca,
  scoutAssigned,
  showScoutAction,
  shortlisted,
  onOpen,
  onScout,
  onOpenProfile,
  onToggleShortlist,
}: {
  player: Player | undefined;
  playerId: string;
  kind: TransferMarketCardKind;
  clubLabel: string;
  priceLabel: string;
  detailLine?: string;
  ca?: number;
  scoutAssigned?: boolean;
  showScoutAction?: boolean;
  shortlisted?: boolean;
  onOpen: () => void;
  onScout?: () => void;
  onOpenProfile?: () => void;
  onToggleShortlist?: () => void;
}) {
  const t = useT();
  const badgeKey =
    kind === "purchase_talk" || kind === "sale_talk"
      ? "transfers.market.badgeNegotiation"
      : kind === "inbound_offer"
        ? "transfers.market.badgeInbound"
        : kind === "own_listing"
          ? "transfers.market.badgeOwnListing"
          : "transfers.market.badgeListed";

  return (
    <article className="scout-hit-card transfers-market-card">
      <button type="button" className="scout-hit-card-main" onClick={onOpen}>
        <div className="scout-hit-card-top">
          {player ? (
            <PlayerPortrait
              seed={player.portrait_seed}
              clubId={player.club_id}
              size="sm"
              variant="known"
              className="scout-hit-card-portrait"
            />
          ) : (
            <span className="scout-hit-card-portrait transfers-market-card-portrait-fallback" aria-hidden />
          )}
          <div className="scout-hit-card-head">
            <span className="scout-hit-card-name">
              {player ? formatPlayerName(player) : playerId}
            </span>
            {player ? (
              <span className="scout-hit-card-meta">
                {player.age} · {player.position}
                {ca != null ? ` · CA ${ca}` : ""}
              </span>
            ) : null}
            <span className="scout-hit-card-club">{clubLabel}</span>
            <span className="transfers-market-card-badge">{t(badgeKey)}</span>
          </div>
        </div>
        <div className="scout-hit-card-bottom transfers-market-card-bottom">
          <strong className="transfers-market-card-price">{priceLabel}</strong>
          {detailLine ? <span className="transfers-market-card-detail">{detailLine}</span> : null}
        </div>
      </button>
      {onToggleShortlist || onOpenProfile || showScoutAction ? (
        <div className="scout-hit-card-ctas transfers-market-card-ctas">
          {onToggleShortlist ? (
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
          ) : null}
          {showScoutAction ? (
            <button
              type="button"
              className={scoutAssigned ? "scout-hit-cta is-on" : "scout-hit-cta"}
              disabled={scoutAssigned}
              aria-label={scoutAssigned ? t("scouting.hits.scoutActive") : t("scouting.hits.scoutCta")}
              onClick={(event) => {
                event.stopPropagation();
                onScout?.();
              }}
            >
              <Eye size={15} strokeWidth={2.25} />
            </button>
          ) : null}
          {onOpenProfile ? (
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
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
