/** WIREFRAME: PRD 22 + design.md §9.5 / §9.1 — Gegner scouten CTA */
import { Radar } from "lucide-react";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { ScoutNetworkState } from "../../scouting/scout-network.ts";
import type { CareerMatchSetup } from "../../sim/career-match-setup.ts";
import {
  canStartOpponentScout,
  opponentScoutJobProgress,
} from "../../scouting/opponent-scout-job.ts";
import { opponentScoutMatchIdFromSetup } from "../../scouting/opponent-scout-match-id.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";

export function OpponentScoutMatchAction({
  setup,
  season,
  scoutBoard,
  scoutNetwork,
  onStart,
}: {
  setup: CareerMatchSetup | null;
  season: number;
  scoutBoard: ScoutBoard;
  scoutNetwork: ScoutNetworkState;
  onStart: () => void;
}) {
  useT();
  if (!setup) return null;

  const job = scoutBoard.active_opponent_scout;
  const matchId = opponentScoutMatchIdFromSetup(season, setup);
  const activeForFixture = job?.match_id === matchId ? job : null;
  const progressForFixture = opponentScoutJobProgress(activeForFixture);

  if (progressForFixture) {
    return (
      <div className="opponent-scout-action opponent-scout-action--progress" role="status">
        <Radar size={16} aria-hidden />
        <span>
          {t("scouting.opponent.progress", {
            done: progressForFixture.done,
            total: progressForFixture.total,
          })}
        </span>
      </div>
    );
  }

  const gate = canStartOpponentScout(scoutBoard, scoutNetwork, setup, season);
  const disabled = !gate.ok;
  let hint = "";
  if (gate.reason === "no_scout") hint = t("scouting.opponent.noScout");
  else if (gate.reason === "job_active") hint = t("scouting.opponent.jobElsewhere");
  else if (gate.reason === "not_match_week") hint = t("scouting.opponent.notMatchWeek");

  return (
    <div className="opponent-scout-action">
      <button
        type="button"
        className="inbox-action"
        disabled={disabled}
        title={hint || undefined}
        onClick={onStart}
      >
        <Radar size={16} aria-hidden />
        {t("scouting.opponent.start")}
      </button>
      {hint ? <p className="opponent-scout-action-hint">{hint}</p> : null}
    </div>
  );
}
