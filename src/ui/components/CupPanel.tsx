/**
 * WIREFRAME: docs/prd/design/09.07-tabellen.md — Pokale (PRD 36 slice 3).
 * Rounds of one cup (left) and the manager's cup run with prize money (right).
 */
import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { TeamId } from "@fussballmanager/shared";
import type { WorldClub } from "../../world/world-generator.ts";
import { useT } from "../../i18n/react.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import { formatCalendarWeek } from "../../sim/game-calendar.ts";
import { clubShortName } from "../../sim/league-week.ts";
import { divisionOfClub, tierOf } from "../../sim/league-pyramid.ts";
import {
  cupDefinition,
  cupPrizeForWin,
  cupRoundCount,
  cupRoundKey,
  cupRoundWeek,
} from "../../competitions/cup-definition.ts";
import type { CupCompetition, CupTie, Pools } from "../../competitions/cup-season.ts";
import { cupRunSummary } from "../../competitions/cup-run.ts";
import { cupRunText } from "../cup-run-text.ts";

function defaultRound(cup: CupCompetition, playerClubId: TeamId): number {
  const own = [...cup.rounds]
    .reverse()
    .find((round) => round.ties.some((tie) => tie.home === playerClubId || tie.away === playerClubId));
  return (own ?? cup.rounds[cup.rounds.length - 1])?.round ?? 1;
}

export function CupPanel({
  cup,
  holder,
  playerClubId,
  pools,
  worldClubs,
  onSelectClub,
}: {
  cup: CupCompetition;
  /** Last season's winner, if archived. */
  holder: TeamId | null;
  playerClubId: TeamId;
  pools: Pools;
  worldClubs: readonly WorldClub[];
  onSelectClub: (teamId: TeamId) => void;
}) {
  const t = useT();
  const [selected, setSelected] = useState(() => defaultRound(cup, playerClubId));
  const round = cup.rounds.find((entry) => entry.round === selected);
  const run = useMemo(() => cupRunSummary(cup, playerClubId), [cup, playerClubId]);
  const name = t(`cup.name.${cup.id}`);
  const label = (teamId: TeamId) => clubShortName(teamId, worldClubs);
  const tier = (teamId: TeamId) => {
    const division = divisionOfClub(pools, teamId);
    return division ? tierOf(division) : null;
  };

  const clubCell = (teamId: TeamId, tie: CupTie) => (
    <span className="tc-cup__club">
      <button
        type="button"
        className={`tc-linkbtn${tie.result?.winner === teamId ? " tc-cup__winner" : ""}`}
        onClick={() => onSelectClub(teamId)}
      >
        {label(teamId)}
      </button>
      {tier(teamId) != null ? (
        <span className="tc-cup__tier" title={t("cup.panel.tierTitle", { tier: tier(teamId)! })}>
          {tier(teamId)}
        </span>
      ) : null}
    </span>
  );

  const score = (tie: CupTie) => {
    if (!tie.result) return "—";
    const base = `${tie.result.homeGoals}:${tie.result.awayGoals}`;
    return tie.result.penalties
      ? `${base} ${t("cup.result.penalties", { score: `${tie.result.penalties[0]}:${tie.result.penalties[1]}` })}`
      : base;
  };

  const runLine = cupRunText(run, label);

  return (
    <div className="tc-split">
      <section className="tc-panel" aria-label={name}>
        <div className="tc-panel__head">
          <span className="tc-label">
            {t("cup.panel.entrants", { count: cup.entrants.length })}
            {cup.winner ? ` · ${t("cup.panel.winner", { club: label(cup.winner) })}` : ""}
            {holder ? ` · ${t("cup.panel.holder", { club: label(holder) })}` : ""}
          </span>
        </div>
        <div className="tc-cup__rounds" role="group" aria-label={t("cup.panel.roundsAria")}>
          {Array.from({ length: cupRoundCount(cup.id) }, (_, index) => index + 1).map((number) => {
            const drawn = cup.rounds.some((entry) => entry.round === number);
            return (
              <button
                key={number}
                type="button"
                className="tc-chip tc-chip--dense"
                aria-pressed={selected === number}
                disabled={!drawn}
                title={drawn ? undefined : t("cup.panel.notDrawn")}
                onClick={() => setSelected(number)}
              >
                {t(`cup.round.${cupRoundKey(cup.id, number)}`)}
              </button>
            );
          })}
        </div>
        <p className="tc-label tc-cup__round-head">
          {t(`cup.round.${cupRoundKey(cup.id, selected)}`)} · {formatCalendarWeek(cupRoundWeek(cup.id, selected))}
          {round?.ties.some((tie) => tie.neutral) ? ` · ${t("cup.panel.neutral")}` : ""}
        </p>
        {round ? (
          <div className="tc-table-wrap">
            <table className="tc-table tc-table--compact">
              <caption className="tc-sr">
                {name} · {t(`cup.round.${round.key}`)}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t("cup.panel.home")}</th>
                  <th scope="col" className="tc-num">
                    {t("cup.panel.score")}
                  </th>
                  <th scope="col">{t("cup.panel.away")}</th>
                </tr>
              </thead>
              <tbody>
                {round.ties.map((tie) => (
                  <tr
                    key={`${tie.home}-${tie.away}`}
                    className={tie.home === playerClubId || tie.away === playerClubId ? "tc-row--own" : undefined}
                  >
                    <td>{clubCell(tie.home, tie)}</td>
                    <td className="tc-num">{score(tie)}</td>
                    <td>{clubCell(tie.away, tie)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="tc-empty">{t("cup.panel.notDrawn")}</p>
        )}
      </section>

      <aside className="tc-panel" aria-label={t("cup.run.title")}>
        <h2 className="tc-label">{t("cup.run.title")}</h2>
        <p className="tc-cup__run">{runLine}</p>
        <h3 className="tc-label">{t("cup.run.prizeTitle")}</h3>
        <ul className="tc-list">
          {cupDefinition(cup.id).rounds.map((spec, index) => {
            const won = run.roundsWon > index;
            return (
              <li key={spec.key} className="tc-list__item tc-list__item--wide">
                <span className="tc-cup__prize-round">
                  {won ? <Check className="tc-icon tc-cup__won" aria-label={t("cup.run.won")} /> : null}
                  {t(`cup.round.${spec.key}`)}
                </span>
                <span className="tc-list__value">{formatClubCash(cupPrizeForWin(cup.id, spec.key))}</span>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
