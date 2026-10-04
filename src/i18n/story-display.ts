import type { FanFeedBeat, StoryCast, StoryInboxPayload } from "../narrative/story-state.ts";
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
  const beatId = payload.beatId;
  const title = localizedStoryTitle(beatId, cast, payload.title);
  const body = localizedStoryBody(beatId, cast, context, payload.body);
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
      return cast.journalist_hostile_name;
    case "press_ally_support":
      return cast.journalist_ally_name;
    case "assistant_low_morale":
      return cast.assistant_name;
    case "captain_speak":
      return t("story.beat.captain_speak.title");
    case "derby_week":
      return cast.fan_rep_label;
    default: {
      const key = `story.beat.${beatId}.title`;
      let value = t(key);
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
    default: {
      let value = t(key);
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
