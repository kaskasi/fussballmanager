import { NEUTRAL_TEAM_COLORS } from "../ui/portraits/face-from-seed.ts";
import { usePortraitTeamColors } from "../ui/portraits/PortraitKitContext.tsx";

/** Empty pitch slot: a shirt in the club's home kit with the position on its chest (design.md §9.1). */
export function LineupJersey({ clubId, label }: { clubId?: string | null; label: string }) {
  const [shirt, trim] = usePortraitTeamColors(clubId) ?? NEUTRAL_TEAM_COLORS;
  return (
    <svg className="lineup-jersey" viewBox="0 0 48 44" aria-hidden="true">
      <path
        className="lineup-jersey__body"
        d="M17 3 L8 6.5 L1.5 15 L8.5 21 L12 18.5 L12 41 L36 41 L36 18.5 L39.5 21 L46.5 15 L40 6.5 L31 3 Q24 9.5 17 3 Z"
        style={{ fill: shirt }}
      />
      <path
        className="lineup-jersey__trim"
        d="M17 3 Q24 9.5 31 3 L29.2 2.4 Q24 6.8 18.8 2.4 Z M1.5 15 L8.5 21 L9.6 20.1 L2.9 14.1 Z M46.5 15 L39.5 21 L38.4 20.1 L45.1 14.1 Z"
        style={{ fill: trim }}
      />
      <text className="lineup-jersey__label" x="24" y="29" textAnchor="middle">
        {label}
      </text>
    </svg>
  );
}
