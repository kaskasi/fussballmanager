import type { MatchViewCue } from "@fussballmanager/shared";

/** Small pitch HUD icons — same assets as legacy banners. */
export const MOMENT_CUE_ICONS: Partial<
  Record<Exclude<MatchViewCue, null | "substitution" | "shot">, { src: string; alt: string }>
> = {
  offside: { src: "/match/offside-banner.svg", alt: "Abseits" },
  throw_in: { src: "/match/throw-in-banner.svg", alt: "Einwurf" },
  goal: { src: "/match/goal-banner.svg", alt: "Tor" },
  corner: { src: "/match/corner-banner.svg", alt: "Ecke" },
  penalty: { src: "/match/penalty-banner.svg", alt: "Elfmeter" },
  goal_kick: { src: "/match/throw-in-banner.svg", alt: "Abstoß" },
};

const BEAT_MOMENT_ICON: Record<string, keyof typeof MOMENT_CUE_ICONS> = {
  restart_corner: "corner",
  restart_throw_in: "throw_in",
  restart_penalty: "penalty",
  restart_goal_kick: "goal_kick",
  offside: "offside",
};

export function momentIconForBeat(beatId?: string): { src: string; alt: string } | null {
  if (!beatId) return null;
  const cue = BEAT_MOMENT_ICON[beatId];
  if (!cue) return null;
  return MOMENT_CUE_ICONS[cue] ?? null;
}
