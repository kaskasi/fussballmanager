/** WIREFRAME: design.md §9.4 — Postfach: Kachel-Queue, Jugend inline, Camp/Gegner-Report Modal, Archiv unten */
import type { SandboxPlan } from "@fussballmanager/shared";
import type { Player } from "../../types/player.ts";
import type { CampLeaderCandidate } from "../../youth/camp-leader-hire.ts";
import type { YouthCamp } from "../../youth/satellite-camps.ts";
import type { DecisionAction, YouthInboxState } from "../../youth/decision-inbox.ts";
import type { StoryCast } from "../../narrative/story-state.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { ClubEvent } from "../../inbox/club-events.ts";
import type { KickerEdition, TreterEdition } from "../../media/kicker-digest.ts";
import type { TransferRecord } from "../../transfers/transfer-history.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import type { GameSession } from "../../persistence/game-session.ts";
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
  masterSeed,
  initialItemId,
  onDecision,
  onSelectPlayer,
  onHireCampLeader,
  scoutBoard,
  onDismissScoutJob,
  onOpenScoutingNetwork,
  onOpenScoutingHits,
  onApplyOpponentScoutPlan,
  clubEvents,
  kickerEdition = null,
  kickerEditionArchive = [],
  transferHistory = [],
  rivalPlayers = [],
  worldClubs = [],
  treterSession = null,
}: {
  players: Player[];
  youthInbox: YouthInboxState;
  youthCamps: readonly YouthCamp[];
  clubId: string;
  season: number;
  week: number;
  storyCast: StoryCast;
  masterSeed: number;
  initialItemId?: string | null;
  onDecision: (itemId: string, action: DecisionAction) => void;
  onSelectPlayer: (playerId: string) => void;
  onHireCampLeader: (campId: string, candidate: CampLeaderCandidate) => void;
  scoutBoard: ScoutBoard;
  onDismissScoutJob: (itemId: string) => void;
  onOpenScoutingNetwork: () => void;
  onOpenScoutingHits: () => void;
  onApplyOpponentScoutPlan?: (plan: SandboxPlan) => void;
  clubEvents: readonly ClubEvent[];
  kickerEdition?: KickerEdition | null;
  kickerEditionArchive?: readonly TreterEdition[];
  transferHistory?: readonly TransferRecord[];
  rivalPlayers?: readonly Player[];
  worldClubs?: readonly WorldClub[];
  treterSession?: GameSession | null;
}) {
  useT();

  return (
    <main className="club-shell-card-body postfach-screen">
      <section
        className="game-panel postfach-decisions"
        aria-label={t("postfach.open.panelAria")}
      >
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
          youthCamps={youthCamps}
          masterSeed={masterSeed}
          onHireCampLeader={onHireCampLeader}
          scoutBoard={scoutBoard}
          onDismissScoutJob={onDismissScoutJob}
          onOpenScoutingNetwork={onOpenScoutingNetwork}
          onOpenScoutingHits={onOpenScoutingHits}
          onApplyOpponentScoutPlan={onApplyOpponentScoutPlan}
          clubEvents={clubEvents}
          kickerEdition={kickerEdition}
          kickerEditionArchive={kickerEditionArchive}
          transferHistory={transferHistory}
          rivalPlayers={rivalPlayers}
          worldClubs={worldClubs}
          treterSession={treterSession}
        />
      </section>
    </main>
  );
}
