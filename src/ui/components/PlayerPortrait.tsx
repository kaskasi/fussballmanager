import {
  DEFAULT_PLAYER_PORTRAIT_POOL,
  PORTRAIT_SILHOUETTE_URL,
  portraitUrlFromSeed,
  type PortraitPool,
} from "../portraits/portrait-from-seed.ts";

export type PlayerPortraitSize = "sm" | "md" | "lg";
export type PlayerPortraitVariant = "known" | "silhouette";

export interface PlayerPortraitProps {
  seed: number;
  size?: PlayerPortraitSize;
  variant?: PlayerPortraitVariant;
  /** mens_squad = on-pitch players; mixed = staff and non-squad roles. */
  pool?: PortraitPool;
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
  className,
}: PlayerPortraitProps) {
  const src =
    variant === "silhouette" ? PORTRAIT_SILHOUETTE_URL : portraitUrlFromSeed(seed, pool);
  const classes = [SIZE_CLASS[size], className].filter(Boolean).join(" ");
  return (
    <span className={classes} aria-hidden="true">
      <img className="player-portrait-img" src={src} alt="" decoding="async" draggable={false} />
    </span>
  );
}
