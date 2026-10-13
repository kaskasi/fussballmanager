import type { CareerOrigin } from "../narrative/story-state.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { formatPlayerName } from "../types/player-display.ts";
import type { TutorialStepId } from "./tutorial-types.ts";

function captainName(session: GameSession): string {
  const id = session.storyState.cast.captain_player_id;
  if (!id) return "";
  const player = session.players.find((p) => p.id === id);
  return player ? formatPlayerName(player) : "";
}

export function originRecapBodyKey(origin: CareerOrigin | null): string {
  switch (origin) {
    case "raffle":
      return "tutorial.origin.recap.raffle";
    case "passionate_letter":
      return "tutorial.origin.recap.passionate_letter";
    case "community_takeover":
    default:
      return "tutorial.origin.recap.community_takeover";
  }
}

export function tutorialBodyForStep(
  stepId: TutorialStepId,
  session: GameSession,
  fallbackBodyKey?: string,
): { bodyKey: string; bodyParams: Record<string, string | number> } {
  const managerName = session.managerName;
  const captain = captainName(session);
  const fanRep = session.storyState.cast.fan_rep_label;

  switch (stepId) {
    case "hub.intro_origin":
      return {
        bodyKey: originRecapBodyKey(session.storyState.career_origin),
        bodyParams: {
          managerName,
          captainName: captain,
          fanRep,
        },
      };
    case "hub.click_next":
      return {
        bodyKey: "tutorial.hub.clickNext.body",
        bodyParams: { managerName },
      };
    case "hub.open_training":
      return {
        bodyKey: "tutorial.hub.openTraining.body",
        bodyParams: { managerName },
      };
    case "training.set_plan":
      return {
        bodyKey: "tutorial.training.setPlan.body",
        bodyParams: {},
      };
    case "training.use_next":
      return {
        bodyKey: "tutorial.training.useNext.body",
        bodyParams: {},
      };
    case "training.load_preset":
      return {
        bodyKey: "tutorial.training.loadPreset.body",
        bodyParams: {},
      };
    case "training.save_preset":
      return {
        bodyKey: "tutorial.training.savePreset.body",
        bodyParams: {},
      };
    case "hub.answer_board":
      return {
        bodyKey: "tutorial.hub.answerBoard.body",
        bodyParams: { managerName },
      };
    case "hub.progress_time":
      return {
        bodyKey: "tutorial.hub.progressTime.body",
        bodyParams: {},
      };
    case "hub.heatmaps":
      return {
        bodyKey: "tutorial.hub.heatmaps.body",
        bodyParams: {},
      };
    case "hub.top_development":
      return {
        bodyKey: "tutorial.hub.topDevelopment.body",
        bodyParams: {},
      };
    default:
      return {
        bodyKey: fallbackBodyKey ?? stepId,
        bodyParams: { managerName },
      };
  }
}
