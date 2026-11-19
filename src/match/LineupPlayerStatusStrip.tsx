import type { Player } from "../types/player.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { roundStat } from "../types/player-display.ts";
import { stateMark } from "../ui/player-profile.ts";
import { useT } from "../i18n/react.ts";
import { LineupFatigueBars } from "./LineupFatigueBars.tsx";
import { LineupFormValue } from "./LineupFormValue.tsx";
import { matchPlayerWeakFoot } from "./player-match-icons.ts";
import { LEAGUE_COMPETITION, competitionDiscipline, type CompetitionId } from "../discipline/suspensions.ts";

export interface LineupStatusView {
  careerForm: number;
  fitness: number;
  ca: number;
  weakFootShow?: boolean;
  weakFootTitle?: string;
  /** PRD 34 — not available for the next league match (ban matches or injury weeks left). */
  unavailable?: { kind: "suspended" | "injured"; count: number };
}

export function lineupStatusFromPlayer(
  player: Player,
  competition: CompetitionId = LEAGUE_COMPETITION,
): LineupStatusView {
  const weakFoot = matchPlayerWeakFoot(player);
  const banMatches = competitionDiscipline(player, competition).ban_matches;
  const injury = player.state.injury;
  const unavailable =
    banMatches > 0
      ? ({ kind: "suspended", count: banMatches } as const)
      : injury
        ? ({ kind: "injured", count: injury.weeks_remaining } as const)
        : null;
  return {
    ...(unavailable ? { unavailable } : {}),
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
      {/* Unavailable: fitness and weak foot do not matter, the ban/injury pill takes their place. */}
      {status.unavailable ? null : (
        <>
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
        </>
      )}
      {status.unavailable ? (
        <span
          className={`lineup-unavailable is-${status.unavailable.kind}`}
          title={t(status.unavailable.kind === "suspended" ? "squad.suspendedHint" : "squad.injuredHint")}
        >
          {status.unavailable.kind === "suspended" ? (
            <span className="tc-eventlog__card tc-eventlog__card--red" aria-hidden="true" />
          ) : null}
          {status.unavailable.kind === "suspended"
            ? t("squad.suspendedMatches", { count: status.unavailable.count })
            : `${t("squad.injuredHint")} · ${t("squad.injuredWeeks", { count: status.unavailable.count })}`}
        </span>
      ) : null}
      <span className="lineup-status-ca" title="Current Ability">
        {status.ca}
      </span>
    </span>
  );
}
