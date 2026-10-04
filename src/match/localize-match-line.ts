import type { MatchViewLine } from "@fussballmanager/shared";
import { t } from "../i18n/index.ts";

export function localizeMatchLine(line: MatchViewLine): string {
  if (line.i18nKey) {
    const translated = t(line.i18nKey, line.i18nParams);
    if (translated !== line.i18nKey) {
      return line.voice === "color" && line.text.includes("  ")
        ? `${line.text.split("  ")[0]}  ${translated}`
        : translated;
    }
  }
  return line.text;
}
