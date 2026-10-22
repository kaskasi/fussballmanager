/** WIREFRAME: design.md §9.6 B — Transfermarkt-Karte (tc-deal: portrait, name, club, price and state; quick actions below) */
import { Eye, Star, User } from "lucide-react";
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
  const badgeTone =
    kind === "purchase_talk" || kind === "sale_talk" ? "talk" : kind === "inbound_offer" ? "offer" : "listed";

  return (
    <article className="tc-deal">
      <button type="button" className="tc-deal__main" onClick={onOpen}>
        <PlayerPortrait
          seed={player?.portrait_seed ?? 0}
          nationality={player?.nationality}
          clubId={player?.club_id}
          size="sm"
          variant={player ? "known" : "silhouette"}
        />
        <span className="tc-deal__id">
          <span className="tc-deal__name">{player ? formatPlayerName(player) : playerId}</span>
          {player ? (
            <span className="tc-deal__meta">
              {player.position} · {t("profile.age", { age: player.age })}
              {ca != null ? ` · CA ${ca}` : ""}
            </span>
          ) : null}
          <span className="tc-deal__meta">{clubLabel}</span>
        </span>
        <span className="tc-deal__price">
          <strong>{priceLabel}</strong>
          <span className={`tc-deal__badge tc-deal__badge--${badgeTone}`}>{t(badgeKey)}</span>
        </span>
        {detailLine ? <span className="tc-deal__detail tc-caption">{detailLine}</span> : null}
      </button>
      {onToggleShortlist || onOpenProfile || showScoutAction ? (
        <div className="tc-deal__actions">
          {onToggleShortlist ? (
            <button
              type="button"
              className="tc-iconbtn"
              aria-pressed={shortlisted}
              aria-label={shortlisted ? t("scouting.watchlist.remove") : t("scouting.watchlist.add")}
              onClick={(event) => {
                event.stopPropagation();
                onToggleShortlist();
              }}
            >
              <Star className="tc-icon" aria-hidden fill={shortlisted ? "currentColor" : "none"} />
            </button>
          ) : null}
          {showScoutAction ? (
            <button
              type="button"
              className="tc-iconbtn"
              aria-pressed={scoutAssigned}
              disabled={scoutAssigned}
              aria-label={scoutAssigned ? t("scouting.hits.scoutActive") : t("scouting.hits.scoutCta")}
              onClick={(event) => {
                event.stopPropagation();
                onScout?.();
              }}
            >
              <Eye className="tc-icon" aria-hidden />
            </button>
          ) : null}
          {onOpenProfile ? (
            <button
              type="button"
              className="tc-iconbtn"
              aria-label={t("scouting.hits.profileCta")}
              onClick={(event) => {
                event.stopPropagation();
                onOpenProfile();
              }}
            >
              <User className="tc-icon" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
