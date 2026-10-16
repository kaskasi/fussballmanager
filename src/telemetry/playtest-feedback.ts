import type { ClientPreferences } from "../ui/accessibility.ts";
import { Diag } from "./diagnostic-log.ts";
import { isAnalyticsActive, trackEvent } from "./analytics.ts";

export interface PlaytestFeedbackResult {
  ok: boolean;
  messageKey: "settings.feedback.sent" | "settings.feedback.sentLocal" | "settings.feedback.empty";
}

/** Playtest notes — always retained locally; PostHog when analytics is on. */
export function submitPlaytestFeedback(
  message: string,
  prefs: ClientPreferences,
  context?: { screen?: string; season?: number; week?: number },
): PlaytestFeedbackResult {
  const trimmed = message.trim();
  if (!trimmed) {
    return { ok: false, messageKey: "settings.feedback.empty" };
  }
  const snippet = trimmed.length > 500 ? `${trimmed.slice(0, 497)}…` : trimmed;
  Diag.verbose(`playtest_feedback ${snippet.replace(/\s+/g, " ")}`);
  if (prefs.analyticsEnabled && isAnalyticsActive()) {
    trackEvent("playtest_feedback", {
      length: trimmed.length,
      locale: prefs.locale,
      ...(context?.screen ? { screen: context.screen } : {}),
      ...(context?.season != null ? { season: context.season } : {}),
      ...(context?.week != null ? { week: context.week } : {}),
    });
    return { ok: true, messageKey: "settings.feedback.sent" };
  }
  return { ok: true, messageKey: "settings.feedback.sentLocal" };
}
