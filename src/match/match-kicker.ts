import { t } from "../i18n/index.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";

/** "Matchday 12" for a league match, "Meisterpokal · Round of 32" for a cup tie (PRD 36). */
export function matchKicker(setup: Pick<CareerMatchSetup, "matchday" | "cup">): string {
  if (setup.cup) {
    return `${t(`cup.name.${setup.cup.id}`)} · ${t(`cup.round.${setup.cup.key}`)}`;
  }
  return t("match.lineup.matchday", { matchday: setup.matchday });
}
