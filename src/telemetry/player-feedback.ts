import * as Sentry from "@sentry/react";
import { cloudSaveFunctionUrl, readCloudSaveConfig } from "../persistence/cloud-save-config.ts";
import { getOrCreateDeviceId } from "./context.ts";

export interface PlayerFeedbackInput {
  text: string;
  season: number;
  week: number;
  screen: string;
  locale: string;
  saveVersion: number;
}

export type PlayerFeedbackResult = "supabase" | "sentry" | "failed";

function feedbackFunctionUrl(): string | null {
  const config = readCloudSaveConfig();
  if (!config) return null;
  return cloudSaveFunctionUrl(config).replace(/\/cloud-save$/, "/player-feedback");
}

async function sendToSupabase(input: PlayerFeedbackInput): Promise<boolean> {
  const config = readCloudSaveConfig();
  const url = feedbackFunctionUrl();
  if (!config || !url) return false;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
    body: JSON.stringify({
      text: input.text,
      season: input.season,
      week: input.week,
      screen: input.screen,
      locale: input.locale,
      save_version: input.saveVersion,
      device_id: getOrCreateDeviceId(),
    }),
  });
  return response.ok;
}

function sendToSentry(input: PlayerFeedbackInput): boolean {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return false;
  Sentry.captureMessage(input.text, {
    level: "info",
    tags: { kind: "player_feedback", screen: input.screen, locale: input.locale },
    extra: {
      season: input.season,
      week: input.week,
      saveVersion: input.saveVersion,
    },
  });
  return true;
}

/** Supabase when cloud config exists, otherwise Sentry. */
export async function submitPlayerFeedback(input: PlayerFeedbackInput): Promise<PlayerFeedbackResult> {
  const text = input.text.trim();
  if (!text) return "failed";
  try {
    if (await sendToSupabase({ ...input, text })) return "supabase";
  } catch {
    /* fall through */
  }
  if (sendToSentry({ ...input, text })) return "sentry";
  return "failed";
}
