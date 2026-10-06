/** WIREFRAME: docs/prd/design.md §9.4 — Postfach (voller Screen; Zurück im Shell-Header) */
import { UserRound } from "lucide-react";
import type { Player } from "../../types/player.ts";
import { campsAwaitingLeaderChoice } from "../../youth/camp-leader-hire.ts";
import { campNationById, type YouthCamp } from "../../youth/satellite-camps.ts";
import type { DecisionAction, YouthInboxState } from "../../youth/decision-inbox.ts";
import type { StoryCast } from "../../narrative/story-state.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { DecisionInboxPanel } from "../components/DecisionInboxPanel.tsx";

export function PostfachScreen({
  players,
  youthInbox,
  youthCamps,
  clubId,
  season,
  week,
  storyCast,
  initialItemId,
  onDecision,
  onSelectPlayer,
  onOpenCampLeaderHire,
}: {
  players: Player[];
  youthInbox: YouthInboxState;
  youthCamps: readonly YouthCamp[];
  clubId: string;
  season: number;
  week: number;
  storyCast: StoryCast;
  initialItemId?: string | null;
  onDecision: (itemId: string, action: DecisionAction) => void;
  onSelectPlayer: (playerId: string) => void;
  onOpenCampLeaderHire: (campId: string) => void;
}) {
  useT();
  const campHires = campsAwaitingLeaderChoice(youthCamps);

  return (
    <main className="club-shell-card-body postfach-screen">
      <div className="postfach-layout">
        <section className="postfach-decisions" aria-label={t("hub.inbox.decisions")}>
          <DecisionInboxPanel
            inbox={youthInbox}
            players={players}
            clubId={clubId}
            season={season}
            week={week}
            onDecision={onDecision}
            storyCast={storyCast}
            initialItemId={initialItemId}
            onSelectPlayer={onSelectPlayer}
          />
        </section>

        {campHires.length > 0 ? (
          <section className="design-panel postfach-camp-staff" aria-label="Camp-Personal">
            <header className="hub-decisions-head">
              <UserRound size={18} aria-hidden="true" />
              <strong>Camp-Personal</strong>
            </header>
            <p className="postfach-camp-lead">Kandidaten stehen bereit — wähle einen Camp-Leiter.</p>
            <ul className="hub-inbox-list">
              {campHires.map((camp) => {
                const nation = campNationById(camp.id);
                return (
                  <li key={camp.id}>
                    <button
                      type="button"
                      className="hub-inbox-row postfach-camp-row"
                      onClick={() => onOpenCampLeaderHire(camp.id)}
                    >
                      <span className="hub-inbox-row-text">
                        <strong>Leiter wählen</strong>
                        <span className="hub-inbox-row-detail">{nation?.label ?? camp.id}</span>
                      </span>
                      <span className="hub-inbox-row-cta" aria-hidden="true">
                        →
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
