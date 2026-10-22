import { useMemo } from "react";
import { Face } from "facesjs/react";
import { faceFromSeed, type PortraitPool } from "../portraits/face-from-seed.ts";
import { usePortraitTeamColors } from "../portraits/PortraitKitContext.tsx";

export type PlayerPortraitSize = "sm" | "md" | "lg";
export type PlayerPortraitVariant = "known" | "silhouette";

export interface PlayerPortraitProps {
  seed: number;
  size?: PlayerPortraitSize;
  variant?: PlayerPortraitVariant;
  /** mens_squad = on-pitch players; mixed = staff (men and women, neutral shirt unless a club is given). */
  pool?: PortraitPool;
  /** Career club_id (e.g. cl_fc_nordstern) — the shirt takes the club's home kit (PRD 26). */
  clubId?: string | null;
  /** Nationality code (DE, TR, …) — picks the skin and hair palette mix (face-from-seed.ts). */
  nationality?: string;
  className?: string;
}

/**
 * WIREFRAME: design.md §5 — faces.js portrait in a tc-face circle (sm 32 · md 56 · lg 88 px).
 * Decorative: the player's name always sits next to it, so it is hidden from screen readers.
 */
export function PlayerPortrait({
  seed,
  size = "md",
  variant = "known",
  pool = "mens_squad",
  clubId,
  nationality,
  className,
}: PlayerPortraitProps) {
  const teamColors = usePortraitTeamColors(clubId);
  const face = useMemo(
    () => (variant === "silhouette" ? null : faceFromSeed({ seed, nationality, pool, teamColors })),
    [variant, seed, nationality, pool, teamColors],
  );
  const classes = ["tc-face", `tc-face--${size}`, className].filter(Boolean).join(" ");
  return (
    <span className={classes} aria-hidden="true">
      {face ? (
        <Face face={face} lazy={size === "sm"} className="tc-face__art" />
      ) : (
        <svg className="tc-face__unknown" viewBox="0 0 56 56">
          <circle className="tc-portrait__fg" cx="28" cy="22" r="10" />
          <path className="tc-portrait__fg" d="M9 56c1.5-12 9-19 19-19s17.5 7 19 19z" />
        </svg>
      )}
    </span>
  );
}
