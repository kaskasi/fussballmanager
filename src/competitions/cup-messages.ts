import type { WorldClub } from "../world/world-generator.ts";
import { t } from "../i18n/index.ts";
import { clubShortName } from "../sim/league-week.ts";
import type { PlayedCupTie } from "./cup-season.ts";

/** Club-event line for one of the manager's cup ties (PRD 36 slice 1). */
export function cupResultMessage(played: PlayedCupTie, worldClubs?: readonly WorldClub[]): string {
  const { tie } = played;
  const line = t("cup.result.line", {
    cup: t(`cup.name.${played.cup}`),
    round: t(`cup.round.${played.key}`),
    home: clubShortName(tie.home, worldClubs),
    away: clubShortName(tie.away, worldClubs),
    score: `${tie.result.homeGoals}:${tie.result.awayGoals}`,
  });
  const penalties = tie.result.penalties
    ? ` ${t("cup.result.penalties", { score: `${tie.result.penalties[0]}:${tie.result.penalties[1]}` })}`
    : "";
  return `${line}${penalties}`;
}
