/** Map Edge Function / client errors to i18n keys (PRD 18). */
export function cloudSaveErrorCode(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    /* plain text from response.text() */
  }
  if (raw.includes("cloud_save_not_configured")) return "not_configured";
  if (raw.includes("sync_pepper_missing")) return "sync_pepper_missing";
  if (raw.includes("blob_too_large")) return "blob_too_large";
  if (raw.includes("rate_limited")) return "rate_limited";
  if (raw.includes("not_found")) return "not_found";
  return "unknown";
}

export function cloudSaveErrorMessage(
  error: unknown,
  t: (key: string, params?: Record<string, string>) => string,
): string {
  const code = cloudSaveErrorCode(error);
  switch (code) {
    case "not_configured":
      return t("save.cloud.disabled");
    case "sync_pepper_missing":
      return t("save.cloud.err.pepper");
    case "blob_too_large":
      return t("save.cloud.err.tooLarge");
    case "rate_limited":
      return t("save.cloud.err.rateLimited");
    case "not_found":
      return t("save.cloud.notFound");
    default:
      return t("save.cloud.err.detail", {
        detail: error instanceof Error ? error.message.slice(0, 120) : code,
      });
  }
}
