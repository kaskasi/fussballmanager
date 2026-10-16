import {
  DEFAULT_PLAYER_PORTRAIT_POOL,
  PORTRAIT_SILHOUETTE_URL,
  portraitUrlFromSeed,
  type PortraitPool,
} from "../portraits/portrait-from-seed.ts";
import { usePortraitKitPrimary } from "../portraits/PortraitKitContext.tsx";
import { usePortraitKitImage } from "../portraits/usePortraitKitImage.ts";

export type PlayerPortraitSize = "sm" | "md" | "lg";
export type PlayerPortraitVariant = "known" | "silhouette";

export interface PlayerPortraitProps {
  seed: number;
  size?: PlayerPortraitSize;
  variant?: PlayerPortraitVariant;
  /** mens_squad = on-pitch players; mixed = staff and non-squad roles. */
  pool?: PortraitPool;
  /** Career club_id (e.g. cl_fc_nordstern) — applies PRD 26 kit shirt recolor when known. */
  clubId?: string | null;
  className?: string;
}

const SIZE_CLASS: Record<PlayerPortraitSize, string> = {
  sm: "player-portrait is-sm",
  md: "player-portrait is-md",
  lg: "player-portrait is-lg",
};

export function PlayerPortrait({
  seed,
  size = "md",
  variant = "known",
  pool = DEFAULT_PLAYER_PORTRAIT_POOL,
  clubId,
  className,
}: PlayerPortraitProps) {
  const kitPrimary = usePortraitKitPrimary(clubId);
  const baseUrl =
    variant === "silhouette" ? PORTRAIT_SILHOUETTE_URL : portraitUrlFromSeed(seed, pool);
  const src = usePortraitKitImage(baseUrl, variant === "silhouette" ? undefined : kitPrimary);
  const classes = [SIZE_CLASS[size], className].filter(Boolean).join(" ");
  return (
    <span className={classes} aria-hidden="true">
      <img className="player-portrait-img" src={src} alt="" decoding="async" draggable={false} />
    </span>
  );
}
