import type { MatchViewLine } from "@fussballmanager/shared";
import { t } from "../i18n/index.ts";

export function localizeMatchLine(line: MatchViewLine): string {
  if (line.i18nKey) {
    const translated = t(line.i18nKey, line.i18nParams);
    if (translated !== line.i18nKey) {
      if (
        (line.voice === "color" || line.voice === "moment") &&
        line.text.includes("  ")
      ) {
        return `${line.text.split("  ")[0]}  ${translated}`;
      }
      return translated;
    }
  }
  return line.text;
}
