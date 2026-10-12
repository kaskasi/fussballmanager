import type { MatchViewLine } from "@fussballmanager/shared";
import { t } from "../i18n/index.ts";

function clockPrefix(text: string): string | null {
  const split = text.indexOf("  ");
  return split >= 0 ? text.slice(0, split) : null;
}

export function localizeMatchLine(line: MatchViewLine): string {
  if (line.i18nKey) {
    const translated = t(line.i18nKey, line.i18nParams);
    if (translated !== line.i18nKey) {
      const prefix = clockPrefix(line.text);
      if (prefix && line.voice !== "color") {
        return `${prefix}  ${translated}`;
      }
      if (line.voice === "color" && line.text.includes("  ")) {
        return `${line.text.split("  ")[0]}  ${translated}`;
      }
      return translated;
    }
  }
  return line.text;
}
