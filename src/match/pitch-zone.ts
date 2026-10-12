import type { PitchPosition } from "@fussballmanager/shared";
import { t } from "../i18n/index.ts";

export type PitchThird = "defensive" | "middle" | "attacking";
export type PitchLateral = "left" | "center" | "right";

export function pitchThirdLabel(third: PitchThird): string {
  return t(`match.hud.third.${third}`);
}

export function pitchLateralLabel(lateral: PitchLateral): string {
  return t(`match.hud.lateral.${lateral}`);
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
