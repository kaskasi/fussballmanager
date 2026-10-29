import {
  storyBeatTemplateId,
  type FanFeedBeat,
  type StoryCast,
  type StoryInboxPayload,
} from "../narrative/story-state.ts";
import { t } from "./index.ts";

type StoryContext = Record<string, string | number | undefined>;

function localizedChoiceLabel(beatId: string, choiceId: string, fallback: string): string {
  const key = `story.beat.${beatId}.choice.${choiceId}`;
  const value = t(key);
  return value === key ? fallback : value;
}

export function localizeStoryInbox(
  payload: StoryInboxPayload,
  cast: StoryCast,
  context: StoryContext = {},
): StoryInboxPayload {
  const beatId = storyBeatTemplateId(payload.beatId);
  const merged: StoryContext = { ...payload.context, ...context };
  const title = localizedStoryTitle(beatId, cast, payload.title);
  const body = localizedStoryBody(beatId, cast, merged, payload.body);
  const choices = payload.choices.map((choice) => ({
    ...choice,
    label: localizedChoiceLabel(beatId, choice.id, choice.label),
  }));
  return { ...payload, title, body, choices };
}

function localizedStoryTitle(beatId: string, cast: StoryCast, fallback: string): string {
  switch (beatId) {
    case "press_hostile_bad_week":
    case "sell_star_press":
    case "morale_crisis_leak":
    case "press_crisis_campaign":
      return cast.journalist_hostile_name;
    case "press_ally_support":
    case "press_crisis_boycott":
      return cast.journalist_ally_name;
    case "assistant_low_morale":
    case "morale_crisis_assistant":
    case "press_crisis_papers":
      return cast.assistant_name;
    case "captain_speak":
      return t("story.beat.captain_speak.title");
    case "derby_week":
      return cast.fan_rep_label;
    default: {
      const key = `story.beat.${beatId}.title`;
      let value = t(key, {
        assistant: cast.assistant_name,
        chairman: cast.chairman_name ?? cast.assistant_name,
      });
      if (value === key) value = t("story.beat._default.title");
      return value === "story.beat._default.title" ? fallback : value;
    }
  }
}

function localizedStoryBody(
  beatId: string,
  cast: StoryCast,
  context: StoryContext,
  fallback: string,
): string {
  const key = `story.beat.${beatId}.body`;
  switch (beatId) {
    case "press_ally_support":
      return t(key, { allyName: cast.journalist_ally_name });
    case "assistant_low_morale":
      return t(key, { assistantName: cast.assistant_name });
    case "captain_speak":
      return context.captainName
        ? t("story.beat.captain_speak.bodyNamed", { captainName: String(context.captainName) })
        : t("story.beat.captain_speak.body");
    case "derby_week":
      return context.opponent
        ? t("story.beat.derby_week.bodyNamed", { opponent: String(context.opponent) })
        : t("story.beat.derby_week.body");
    case "morale_crisis_council":
      return context.captainName
        ? t("story.beat.morale_crisis_council.bodyNamed", { captainName: String(context.captainName) })
        : t(key);
    case "morale_crisis_assistant":
      return t(`story.beat.morale_crisis_assistant.body.${String(context.tier ?? "solid")}`, {
        assistantName: cast.assistant_name,
      });
    case "morale_crisis_requests":
      return context.players
        ? t("story.beat.morale_crisis_requests.bodyNamed", { players: String(context.players) })
        : t(key);
    case "press_crisis_boycott":
      return t(key, { allyName: cast.journalist_ally_name });
    default: {
      let value = t(key, {
        assistant: cast.assistant_name,
        chairman: cast.chairman_name ?? cast.assistant_name,
      });
      if (value === key) value = t("story.beat._default.body");
      return value === "story.beat._default.body" ? fallback : value;
    }
  }
}

export function fanFeedTemplateId(beatId: string): string {
  if (beatId.startsWith("fan_home_win_")) return "fan_home_win";
  if (beatId.startsWith("fan_derby_loss_")) return "fan_derby_loss";
  if (beatId.startsWith("fan_table_worry_") || beatId.startsWith("fan_ambient_")) {
    return "fan_ambient";
  }
  return beatId.replace(/_s\d+$/, "");
}

export function localizeFanFeedBeat(
  beat: FanFeedBeat,
  _cast: StoryCast,
  context: StoryContext = {},
): FanFeedBeat {
  const template = fanFeedTemplateId(beat.id);
  const messageKey = `story.fan.${template}.message`;
  let message = t(messageKey);
  if (message === messageKey) {
    message = beat.message;
  } else if (template === "fan_derby_loss" && context.opponent) {
    const namedKey = "story.fan.fan_derby_loss.messageNamed";
    const named = t(namedKey, { opponent: String(context.opponent) });
    if (named !== namedKey) message = named;
  }
  return { ...beat, message };
}
