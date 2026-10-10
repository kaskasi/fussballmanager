import type { Player } from "../types/player.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { roundStat } from "../types/player-display.ts";
import { stateMark } from "../ui/player-profile.ts";
import { useT } from "../i18n/react.ts";
import { LineupFatigueBars } from "./LineupFatigueBars.tsx";
import { LineupFormValue } from "./LineupFormValue.tsx";
import { matchPlayerWeakFoot } from "./player-match-icons.ts";

export interface LineupStatusView {
  careerForm: number;
  fitness: number;
  ca: number;
  weakFootShow?: boolean;
  weakFootTitle?: string;
}

export function lineupStatusFromPlayer(player: Player): LineupStatusView {
  const weakFoot = matchPlayerWeakFoot(player);
  return {
    careerForm: player.state.form,
    fitness: player.state.fitness,
    ca: roundStat(estimateCa(player.attributes, player.position)),
    weakFootShow: weakFoot.show,
    weakFootTitle: weakFoot.title,
  };
}

/** Form · Müdigkeit · Fit-Zahl · WA · CA — gleiches Band auf Feld und Bank (F1.1). */
export function LineupPlayerStatusStrip({
  status,
  variant = "bench",
}: {
  status: LineupStatusView;
  variant?: "pitch" | "bench";
}) {
  const t = useT();
  const fit = stateMark(status.fitness, 75, 50);

  return (
    <span className={`lineup-status-strip is-${variant}`}>
      <LineupFormValue careerForm={status.careerForm} compact />
      <LineupFatigueBars fitness={status.fitness} compact />
      <span
        className={`lineup-fitness-pill is-${fit.tone}`}
        title={t("match.lineup.fitnessValueTitle", { value: Math.round(status.fitness) })}
      >
        <span className="lineup-shape-mark" aria-hidden>
          {fit.mark}
        </span>
        <span className="lineup-fitness-num">{Math.round(status.fitness)}</span>
      </span>
      {status.weakFootShow ? (
        <span className="lineup-icon lineup-icon-wa" title={status.weakFootTitle}>
          WA
        </span>
      ) : null}
      <span className="lineup-status-ca" title="Current Ability">
        {status.ca}
      </span>
    </span>
  );
}
