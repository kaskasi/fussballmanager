import type { PitchPosition } from "@fussballmanager/shared";

export type PitchThird = "defensive" | "middle" | "attacking";
export type PitchLateral = "left" | "center" | "right";

const THIRD_LABEL: Record<PitchThird, string> = {
  defensive: "Def",
  middle: "Mitte",
  attacking: "Angriff",
};

const LATERAL_LABEL: Record<PitchLateral, string> = {
  left: "Links",
  center: "Zentrum",
  right: "Rechts",
};

export function pitchThirdLabel(third: PitchThird): string {
  return THIRD_LABEL[third];
}

export function pitchLateralLabel(lateral: PitchLateral): string {
  return LATERAL_LABEL[lateral];
}

/** Ball depth in the attacking team's thirds (x: 0 home goal → 100 away goal). */
export function pitchThirdForTeam(
  ballX: number,
  teamId: string | null,
  homeTeamId: string,
): PitchThird {
  const relativeX =
    teamId === homeTeamId ? ballX : teamId ? 100 - ballX : ballX;
  if (relativeX < 33.34) return "defensive";
  if (relativeX < 66.67) return "middle";
  return "attacking";
}

export function pitchLateral(ballY: number): PitchLateral {
  if (ballY < 33.34) return "left";
  if (ballY < 66.67) return "center";
  return "right";
}

export function ballZone(
  ball: PitchPosition,
  possessionTeamId: string | null,
  homeTeamId: string,
): { third: PitchThird; lateral: PitchLateral } {
  return {
    third: pitchThirdForTeam(ball.x, possessionTeamId, homeTeamId),
    lateral: pitchLateral(ball.y),
  };
}
