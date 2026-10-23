/** Shared DecisionInboxPanel props for Postfach screen and Manager Desk AA column. */
import type { SandboxPlan } from "@fussballmanager/shared";
import type { Player } from "../../types/player.ts";
import type { CampLeaderCandidate } from "../../youth/camp-leader-hire.ts";
import type { OrthopedistCandidate, OrthopedistHireState } from "../../medical/orthopedist-hire.ts";
import type { YouthCamp } from "../../youth/satellite-camps.ts";
import type { DecisionAction, YouthInboxState } from "../../youth/decision-inbox.ts";
import type { StoryCast } from "../../narrative/story-state.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { ClubEvent } from "../../inbox/club-events.ts";
import type { KickerEdition, TreterEdition } from "../../media/kicker-digest.ts";
import type { TransferRecord } from "../../transfers/transfer-history.ts";
import type { WorldClub } from "../../world/world-generator.ts";
import type { GameSession } from "../../persistence/game-session.ts";

export interface PostfachPanelProps {
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
  orthopedistHire?: OrthopedistHireState;
  hasOrthopedist?: boolean;
  onHireOrthopedist?: (candidate: OrthopedistCandidate) => void;
  scoutBoard: ScoutBoard;
  onDismissScoutJob: (itemId: string) => void;
  onOpenScoutingNetwork?: () => void;
  onOpenScoutingHits?: () => void;
  onApplyOpponentScoutPlan?: (plan: SandboxPlan) => void;
  clubEvents: readonly ClubEvent[];
  kickerEdition?: KickerEdition | null;
  kickerEditionArchive?: readonly TreterEdition[];
  transferHistory?: readonly TransferRecord[];
  rivalPlayers?: readonly Player[];
  worldClubs?: readonly WorldClub[];
  treterSession?: GameSession | null;
  /** Hub teaser → full Postfach (optional item focus). */
  onOpenPostfach?: (itemId?: string) => void;
}
