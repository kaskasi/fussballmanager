import { SaveVersionMismatchError, SAVE_VERSION } from "./savegame-model.ts";

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

/** User-facing message for import / cloud pull failures (PRD 08.10). */
export function saveLoadErrorMessage(error: unknown, t: TranslateFn): string {
  if (error instanceof SaveVersionMismatchError) {
    if (error.kind === "too_new") {
      return t("save.versionMismatch.new", { version: error.foundVersion });
    }
    return t("save.versionMismatch.old", {
      version: error.foundVersion,
      current: SAVE_VERSION,
    });
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return t("save.importFailed");
}

export function isSaveVersionMismatch(error: unknown): error is SaveVersionMismatchError {
  return error instanceof SaveVersionMismatchError;
}
