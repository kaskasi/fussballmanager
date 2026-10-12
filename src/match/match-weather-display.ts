import { matchWeatherIndex } from "@fussballmanager/shared";
import { t } from "../i18n/index.ts";

export function formatMatchWeatherDisplay(seed: number): string {
  return t(`match.weather.${matchWeatherIndex(seed)}`);
}
